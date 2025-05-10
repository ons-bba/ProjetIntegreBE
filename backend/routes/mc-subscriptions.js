const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/mc-auth');
const { body, param, validationResult } = require('express-validator');
const Subscription = require('../model/mc-subscription');
const Service = require('../model/mc-service');
const QRCode = require('qrcode');

// Middleware to check for validation errors
const checkValidationResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET all subscriptions
router.get('/', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        const subscriptions = await Subscription.find().populate('fuelCreditId');
        const subscriptionsWithBase64 = subscriptions.map(sub => {
            const subObj = sub.toObject();
            subObj.qrCode = sub.qrCode ? `data:image/png;base64,${sub.qrCode.toString('base64')}` : null;
            return subObj;
        });
        res.json(subscriptionsWithBase64);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscriptions', error: error.message });
    }
});

// GET subscriptions for the logged-in customer
router.get('/customer', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Customer') {
            query = { customerId: req.user.id };
        }
        const subscriptions = await Subscription.find(query).populate('fuelCreditId');
        const subscriptionsWithBase64 = subscriptions.map(subscription => {
            const subObj = subscription.toObject();
            subObj.qrCode = subscription.qrCode ? `data:image/png;base64,${subscription.qrCode.toString('base64')}` : null;
            return subObj;
        });
        res.json(subscriptionsWithBase64);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer subscriptions', error: error.message });
    }
});

// GET a single subscription by ID 
router.get('/:id', auth(['Customer', 'Admin']), [
    param('id').isMongoId().withMessage('Invalid subscription ID'),
    checkValidationResult
], async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id).populate('fuelCreditId');
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

        const subObj = subscription.toObject();
        subObj.qrCode = subscription.qrCode ? `data:image/png;base64,${sub.qrCode.toString('base64')}` : null;
        res.json(subObj);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscription', error: error.message });
    }
});

// POST a new subscription (Customer)
router.post('/', auth(['Customer', 'Admin']), [
    body('planName').notEmpty().withMessage('Plan name is required'),
    body('serviceIds').isArray().withMessage('serviceIds must be an array'),
    body('serviceIds.*').isMongoId().withMessage('Each serviceId must be a valid ID'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    body('offerStartDate').optional().isISO8601().withMessage('Offer start date must be a valid ISO 8601 date'),
    body('offerEndDate').optional().isISO8601().withMessage('Offer end date must be a valid ISO 8601 date'),
    body('status').isIn(['active', 'inactive', 'expired']).withMessage('Invalid status'),
    body('couponCode').optional().notEmpty().withMessage('Coupon code cannot be empty'),
    checkValidationResult
], async (req, res) => {
    try {
        const { planName, serviceIds, price, offerDiscount, offerStartDate, offerEndDate, startDate, endDate, status, fuelCreditId, couponCode } = req.body;

        // Convert ISO date strings to Date objects
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const offerStartDateObj = offerStartDate ? new Date(offerStartDate) : null;
        const offerEndDateObj = offerEndDate ? new Date(offerEndDate) : null;

        // Validate that dates are valid
        if (isNaN(startDateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid start date' });
        }
        if (isNaN(endDateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid end date' });
        }
        if (offerStartDate && isNaN(offerStartDateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid offer start date' });
        }
        if (offerEndDate && isNaN(offerEndDateObj.getTime())) {
            return res.status(400).json({ message: 'Invalid offer end date' });
        }

        // Calculate the base price (plan price + services)
        let totalCost = price - (offerDiscount || 0);
        let servicesCost = 0;
        let couponId = null;
        let appliedServiceId = null;

        // Fetch the services to calculate the base services cost
        if (serviceIds && serviceIds.length > 0) {
            const services = await Service.find({ _id: { $in: serviceIds } });
            servicesCost = services.reduce((sum, service) => sum + (service.price || 0), 0);
            totalCost += servicesCost;
        }

        // Apply coupon if provided (applies to only one service)
        if (couponCode) {
            let couponApplied = false;
            for (const serviceId of serviceIds) {
                const couponResponse = await fetch('http://localhost:3000/api/coupons/apply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization
                    },
                    body: JSON.stringify({
                        code: couponCode,
                        itemType: 'service',
                        itemId: serviceId
                    })
                });
                const couponData = await couponResponse.json();
                if (couponResponse.status === 200) {
                    const service = await Service.findById(serviceId);
                    if (!service) continue;

                    const originalServicePrice = service.price;
                    const discountAmount = originalServicePrice - couponData.newPrice;
                    totalCost -= discountAmount;
                    couponId = couponData.couponId;
                    appliedServiceId = serviceId;
                    couponApplied = true;
                    break;
                }
            }
            if (!couponApplied) {
                return res.status(400).json({ message: 'The coupon does not apply to any of the selected services.' });
            }
        }

        // Create the subscription
        const subscription = new Subscription({
            customerId: req.user.id,
            planName,
            serviceIds,
            price: totalCost,
            offerDiscount: offerDiscount || 0,
            offerStartDate: offerStartDateObj,
            offerEndDate: offerEndDateObj,
            startDate: startDateObj,
            endDate: endDateObj,
            status,
            fuelCreditId,
            couponId,
            createdAt: new Date()
        });

        const qrCodeData = `https://mobilitycore.com/verify/subscription/${subscription._id}`;
        subscription.qrCode = await QRCode.toBuffer(qrCodeData, { width: 200 });
        await subscription.save();

        const populatedSubscription = await Subscription.findById(subscription._id).populate('fuelCreditId');
        const subObj = populatedSubscription.toObject();
        subObj.qrCode = populatedSubscription.qrCode ? `data:image/png;base64,${populatedSubscription.qrCode.toString('base64')}` : null;
        res.status(201).json({ message: 'Subscription created', subscription: subObj });
    } catch (error) {
        res.status(500).json({ message: 'Error creating subscription', error: error.message });
    }
});

// PUT (update) a subscription
router.put('/:id', auth(['Customer', 'Admin']), [
    param('id').isMongoId().withMessage('Invalid subscription ID'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    body('offerStartDate').optional().isISO8601().withMessage('Offer start date must be a valid ISO 8601 date'),
    body('offerEndDate').optional().isISO8601().withMessage('Offer end date must be a valid ISO 8601 date'),
    checkValidationResult
], async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

        const { startDate, endDate, offerStartDate, offerEndDate, ...updateData } = req.body;

        // Convert ISO date strings to Date objects if provided
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);
        if (offerStartDate) updateData.offerStartDate = new Date(offerStartDate);
        if (offerEndDate) updateData.offerEndDate = new Date(offerEndDate);

        Object.assign(subscription, updateData);
        const qrCodeData = `https://mobilitycore.com/verify/subscription/${subscription._id}`;
        subscription.qrCode = await QRCode.toBuffer(qrCodeData, { width: 200 });
        await subscription.save();

        const populatedSubscription = await Subscription.findById(subscription._id).populate('fuelCreditId');
        const subObj = populatedSubscription.toObject();
        subObj.qrCode = populatedSubscription.qrCode ? `data:image/png;base64,${populatedSubscription.qrCode.toString('base64')}` : null;
        res.json({ message: 'Subscription updated', subscription: subObj });
    } catch (error) {
        res.status(500).json({ message: 'Error updating subscription', error: error.message });
    }
});

// DELETE a subscription (Admin only)
router.delete('/:id', auth(['Customer','Admin']), [
    param('id').isMongoId().withMessage('Invalid subscription ID'),
    checkValidationResult
], async (req, res) => {
    try {
        const subscription = await Subscription.findByIdAndDelete(req.params.id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        res.json({ message: 'Subscription deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting subscription', error: error.message });
    }
});

module.exports = router;