const express = require('express');
const router = express.Router();
const { auth } = require('../mc-middleware/auth');
const { validate, body, param } = require('../mc-middleware/auth'); // Add param here
const FuelCredit = require('../mc-models/fuelCredit');

// GET all fuel credits
router.get('/', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        const fuelCredits = await FuelCredit.find();
        res.json(fuelCredits);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fuel credits', error: error.message });
    }
});

// POST a new fuel credit
router.post('/', auth(['Customer', 'Admin']), validate([
    body('customerId').isMongoId().withMessage('Invalid customer ID'),
    body('credits').isInt({ min: 0 }).withMessage('Credits must be a non-negative integer'),
    body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date')
]), async (req, res) => {
    try {
        const { customerId, credits, date } = req.body;
        const fuelCredit = new FuelCredit({
            customerId,
            credits,
            date: new Date(date),
            amount: 0,
            createdAt: new Date()
        });
        await fuelCredit.save();
        res.status(201).json({ message: 'Fuel credit created', fuelCredit });
    } catch (error) {
        res.status(500).json({ message: 'Error creating fuel credit', error: error.message });
    }
});

// PUT a fuel credit
router.put('/:id', auth(['Customer', 'Admin']), validate([
    param('id').isMongoId().withMessage('Invalid fuel credit ID')
]), async (req, res) => {
    try {
        const fuelCredit = await FuelCredit.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!fuelCredit) return res.status(404).json({ message: 'Fuel credit not found' });
        res.json({ message: 'Fuel credit updated', fuelCredit });
    } catch (error) {
        res.status(500).json({ message: 'Error updating fuel credit', error: error.message });
    }
});

// DELETE a fuel credit (Admin only)
router.delete('/:id', auth(['Admin']), validate([
    param('id').isMongoId().withMessage('Invalid fuel credit ID')
]), async (req, res) => {
    try {
        const fuelCredit = await FuelCredit.findByIdAndDelete(req.params.id);
        if (!fuelCredit) return res.status(404).json({ message: 'Fuel credit not found' });
        res.json({ message: 'Fuel credit deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting fuel credit', error: error.message });
    }
});

// POST purchase fuel credit
router.post('/purchase', auth(['Customer', 'Admin']), validate([
    body('amount').isInt({ min: 1 }).withMessage('Amount must be positive'),
    body('couponCode').optional().notEmpty().withMessage('Coupon code cannot be empty')
]), async (req, res) => {
    try {
        const { amount, couponCode } = req.body;

        let totalCost = amount; // Assuming the cost is the same as the amount
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
                    itemType: 'fuelCredit',
                    amount
                })
            });
            const couponData = await couponResponse.json();
            if (couponResponse.status !== 200) return res.status(couponResponse.status).json(couponData);

            totalCost = couponData.newPrice;
            couponId = couponData.couponId;
        }

        // Create the fuel credit purchase
        const fuelCredit = new FuelCredit({
            customerId: req.user.id,
            credits: amount,
            amount: totalCost,
            date: new Date(),
            createdAt: new Date()
        });
        await fuelCredit.save();

        res.status(201).json({ message: 'Fuel credit purchased', fuelCredit });
    } catch (error) {
        res.status(500).json({ message: 'Error purchasing fuel credit', error: error.message });
    }
});

module.exports = router;