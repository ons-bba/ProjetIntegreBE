const express = require('express');
const router = express.Router();
const { auth, validate, param, query, body } = require('../middlewares/mc-auth');
const Service = require('../model/mc-service');
const Reservation = require('../model/mc-reservation');
const QRCode = require('qrcode');

// GET all services (Admin only)
router.get('/admin', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services', error: error.message });
    }
});

// GET all services (Customer) with filters
router.get('/', auth(['Customer', 'Admin']), validate([
    query('category').optional().trim(),
    query('name').optional().trim(),
    query('minPrice').optional().isNumeric().withMessage('minPrice must be a number'),
    query('maxPrice').optional().isNumeric().withMessage('maxPrice must be a number'),
    query('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
]), async (req, res) => {
    try {
        const { category, name, minPrice, maxPrice, status } = req.query;
        const query = {};

        if (category) query.category = { $regex: category, $options: 'i' };
        if (name) query.name = { $regex: name, $options: 'i' };
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (status) query.status = status;

        const services = await Service.find(query);
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching services', error: error.message });
    }
});

// NEW: GET a specific service by ID
router.get('/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid service ID')
]), async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: 'Service not found' });
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching service', error: error.message });
    }
});

// POST a new service (Admin only)
router.post('/', auth(['Customer', 'Admin']), validate([
    body('category').notEmpty().withMessage('Category is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('duration').isNumeric().withMessage('Duration must be a number'),
    body('isBundleOnly').isBoolean().withMessage('isBundleOnly must be a boolean')
]), async (req, res) => {
    try {
        const service = new Service(req.body);
        await service.save();
        res.status(201).json({ message: 'Service created', service });
    } catch (error) {
        res.status(500).json({ message: 'Error creating service', error: error.message });
    }
});

// PUT (update) a service 
router.put('/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid service ID')
]), async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!service) return res.status(404).json({ message: 'Service not found' });
        res.json({ message: 'Service updated', service });
    } catch (error) {
        res.status(500).json({ message: 'Error updating service', error: error.message });
    }
});

// DELETE a service (Admin only)
router.delete('/:id', auth(['Admin']), validate([
    param('id').isMongoId().withMessage('Invalid service ID')
]), async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) return res.status(404).json({ message: 'Service not found' });
        res.json({ message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting service', error: error.message });
    }
});

// POST make a service reservation 
router.post('/reserve/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid service ID'),
    body('couponCode').optional().notEmpty().withMessage('Coupon code cannot be empty')
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { couponCode } = req.body;

        // Fetch the service
        const service = await Service.findById(id);
        if (!service) return res.status(404).json({ message: 'Service not found' });
        if (service.status !== 'Active') return res.status(400).json({ message: 'Service is not active' });

        let totalCost = service.price - (service.offerDiscount || 0);
        let couponId = null;

        // Apply coupon if provided
        if (couponCode) {
            const couponResponse = await fetch('http://localhost:3000/api/coupons/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                },
                body: JSON.stringify({
                    code: couponCode,
                    itemType: 'service',
                    itemId: id
                })
            });
            const couponData = await couponResponse.json();
            if (couponResponse.status !== 200) return res.status(couponResponse.status).json(couponData);

            totalCost = couponData.newPrice;
            couponId = couponData.couponId;
        }

        // Create a reservation for the service
        const qrCode = await QRCode.toBuffer(`https://mobilitycore.com/verify/service/${service._id}`);
        const reservation = new Reservation({
            customerId: req.user.id,
            serviceId: service._id,
            status: 'En attente',
            bookingDate: new Date(),
            totalCost,
            qrCode,
            couponId,
            createdAt: new Date()
        });
        await reservation.save();

        const resObj = reservation.toObject();
        resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
        res.status(201).json({ message: 'Service reserved', reservation: resObj });
    } catch (error) {
        res.status(500).json({ message: 'Error reserving service', error: error.message });
    }
});

module.exports = router;