const express = require('express');
const router = express.Router();
const { auth } = require('../mc-middleware/auth');
const { validate, param, query, body } = require('../mc-middleware/auth');
const Bundle = require('../mc-models/bundle');
const Reservation = require('../mc-models/reservation');
const QRCode = require('qrcode');

// GET all bundles (Admin only)
router.get('/admin', auth(['Admin']), async (req, res) => {
    try {
        const bundles = await Bundle.find();
        res.json(bundles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bundles', error: error.message });
    }
});

// GET a single bundle by ID
router.get('/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid bundle ID')
]), async (req, res) => {
    try {
        const bundle = await Bundle.findById(req.params.id).populate('serviceIds');
        if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
        res.json(bundle);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bundle', error: error.message });
    }
});

// GET all bundles with filters
router.get('/', auth(['Customer', 'Admin']), validate([
    query('name').optional().trim(),
    query('minPrice').optional().isNumeric().withMessage('minPrice must be a number'),
    query('maxPrice').optional().isNumeric().withMessage('maxPrice must be a number'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]), async (req, res) => {
    try {
        const { name, minPrice, maxPrice, isActive } = req.query;
        const query = {};

        if (name) query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const bundles = await Bundle.find(query).populate('serviceIds');
        res.json(bundles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bundles', error: error.message });
    }
});

// POST a new bundle
router.post('/', auth(['Customer', 'Admin']), validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('serviceIds').isArray().withMessage('serviceIds must be an array'),
    body('serviceIds.*').isMongoId().withMessage('Each serviceId must be a valid ID'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('discount').isNumeric().withMessage('Discount must be a number'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
]), async (req, res) => {
    try {
        const bundle = new Bundle(req.body);
        await bundle.save();
        res.status(201).json({ message: 'Bundle created', bundle });
    } catch (error) {
        res.status(500).json({ message: 'Error creating bundle', error: error.message });
    }
});

// PUT a bundle
router.put('/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid bundle ID')
]), async (req, res) => {
    try {
        const bundle = await Bundle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
        res.json({ message: 'Bundle updated', bundle });
    } catch (error) {
        res.status(500).json({ message: 'Error updating bundle', error: error.message });
    }
});

// DELETE a bundle (Admin only)
router.delete('/:id', auth(['Admin']), validate([
    param('id').isMongoId().withMessage('Invalid bundle ID')
]), async (req, res) => {
    try {
        const bundle = await Bundle.findByIdAndDelete(req.params.id);
        if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
        res.json({ message: 'Bundle deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting bundle', error: error.message });
    }
});

// POST purchase a bundle (Customer)
router.post('/purchase/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid bundle ID'),
    body('couponCode').optional().notEmpty().withMessage('Coupon code cannot be empty')
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { couponCode } = req.body;

        // Fetch the bundle
        const bundle = await Bundle.findById(id);
        if (!bundle || !bundle.isActive) return res.status(404).json({ message: 'Bundle not found or inactive' });

        let totalCost = bundle.price - (bundle.discount || 0) - (bundle.timeLimitedDiscount || 0);
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
                    itemType: 'bundle',
                    itemId: id
                })
            });
            const couponData = await couponResponse.json();
            if (couponResponse.status !== 200) return res.status(couponResponse.status).json(couponData);

            totalCost = couponData.newPrice;
            couponId = couponData.couponId;
        }

        // Create a reservation for the bundle purchase
        const qrCode = await QRCode.toBuffer(`https://mobilitycore.com/verify/bundle/${bundle._id}`);
        const reservation = new Reservation({
            customerId: req.user.id,
            bundleId: bundle._id,
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
        res.status(201).json({ message: 'Bundle purchased', reservation: resObj });
    } catch (error) {
        res.status(500).json({ message: 'Error purchasing bundle', error: error.message });
    }
});

module.exports = router;