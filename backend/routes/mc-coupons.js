const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/mc-auth');
const { body, param, validationResult } = require('express-validator');
const Coupon = require('../model/mc-coupon');
const Service = require('../model/mc-service');
const Bundle = require('../model/mc-bundle');

// Middleware to check for validation errors
const checkValidationResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// GET all coupons
router.get('/', auth(['Customer', 'Admin']), async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons', error: error.message });
    }
});

// POST a new coupon
router.post(
    '/',
    auth(['Customer', 'Admin']),
    [
        body('code').isLength({ min: 12 }).withMessage('Coupon code must be at least 12 characters'),
        body('type').isIn(['reduction', 'freeService', 'freeBundle', 'fuelCredit']).withMessage('Invalid coupon type'),
        body('discount').optional().isNumeric().withMessage('Discount must be a number')
            .custom((value, { req }) => {
                if (req.body.type === 'reduction') {
                    if (value <= 0) {
                        throw new Error('Discount must be greater than 0 for type "reduction"');
                    }
                    if (value > 100) {
                        throw new Error('Discount percentage cannot exceed 100');
                    }
                }
                return true;
            }),
        body('serviceId').optional().isMongoId().withMessage('Invalid service ID'),
        body('bundleId').optional().isMongoId().withMessage('Invalid bundle ID'),
        body('startDate').isISO8601().withMessage('Invalid start date'),
        body('endDate').isISO8601().withMessage('Invalid end date'),
        body('maxUses').isInt({ min: 1 }).withMessage('Max uses must be at least 1'),
        body('uses').optional().isInt({ min: 0 }).withMessage('Uses must be a non-negative integer'),checkValidationResult
    ],
    async (req, res) => {
        try {
            console.log('Received coupon create request:', req.body);

            // Validate serviceId and bundleId based on type
            const { type, serviceId, bundleId } = req.body;

            if (serviceId) {
                const service = await Service.findById(serviceId);
                if (!service) {
                    return res.status(400).json({ errors: [{ msg: 'Service not found', param: 'serviceId' }] });
                }
            }

            if (bundleId) {
                const bundle = await Bundle.findById(bundleId);
                if (!bundle) {
                    return res.status(400).json({ errors: [{ msg: 'Bundle not found', param: 'bundleId' }] });
                }
            }

            if (type === 'freeService') {
                if (!serviceId) {
                    return res.status(400).json({ errors: [{ msg: 'Service ID is required for type "freeService"', param: 'serviceId' }] });
                }
                if (bundleId) {
                    return res.status(400).json({ errors: [{ msg: 'Bundle ID should not be provided for type "freeService"', param: 'bundleId' }] });
                }
            } else if (type === 'freeBundle') {
                if (!bundleId) {
                    return res.status(400).json({ errors: [{ msg: 'Bundle ID is required for type "freeBundle"', param: 'bundleId' }] });
                }
                if (serviceId) {
                    return res.status(400).json({ errors: [{ msg: 'Service ID should not be provided for type "freeBundle"', param: 'serviceId' }] });
                }
            } else if (type === 'reduction') {
                if (!serviceId && !bundleId) {
                    return res.status(400).json({ errors: [{ msg: 'Either Service ID or Bundle ID is required for type "reduction"', param: 'serviceId' }] });
                }
                if (serviceId && bundleId) {
                    return res.status(400).json({ errors: [{ msg: 'Cannot provide both Service ID and Bundle ID for type "reduction"', param: 'bundleId' }] });
                }
            } else if (type === 'fuelCredit') {
                if (serviceId) {
                    return res.status(400).json({ errors: [{ msg: 'Service ID should not be provided for type "fuelCredit"', param: 'serviceId' }] });
                }
                if (bundleId) {
                    return res.status(400).json({ errors: [{ msg: 'Bundle ID should not be provided for type "fuelCredit"', param: 'bundleId' }] });
                }
            }

            const startDate = new Date(req.body.startDate);
            const endDate = new Date(req.body.endDate);
            if (endDate <= startDate) {
                return res.status(400).json({ errors: [{ msg: 'End date must be after start date', param: 'endDate' }] });
            }

            const coupon = new Coupon(req.body);
            await coupon.save();
            res.status(201).json({ message: 'Coupon created', coupon });
        } catch (error) {
            console.error('Error creating coupon:', error);
            if (error.code === 11000) {
                return res.status(400).json({ errors: [{ msg: 'Coupon code already exists', param: 'code' }] });
            }
            res.status(500).json({ message: 'Error creating coupon', error: error.message });
        }
    }
);

// PUT a coupon
router.put(
    '/:id',
    auth(['Customer', 'Admin']),
    [
        body('code').optional().isLength({ min: 12 }).withMessage('Coupon code must be at least 12 characters'),
        body('type').optional().isIn(['reduction', 'freeService', 'freeBundle', 'fuelCredit']).withMessage('Invalid coupon type'),
        body('discount')
            .optional()
            .isNumeric()
            .withMessage('Discount must be a number')
            .custom((value, { req }) => {
                if (req.body.type === 'reduction') {
                    if (value <= 0) {
                        throw new Error('Discount must be greater than 0 for type "reduction"');
                    }
                    if (value > 100) {
                        throw new Error('Discount percentage cannot exceed 100');
                    }
                }
                return true;
            }),
        body('serviceId').optional().isMongoId().withMessage('Invalid service ID'),
        body('bundleId').optional().isMongoId().withMessage('Invalid bundle ID'),
        body('startDate').optional().isISO8601().withMessage('Invalid start date'),
        body('endDate').optional().isISO8601().withMessage('Invalid end date'),
        body('maxUses').optional().isInt({ min: 1 }).withMessage('Max uses must be at least 1'),
        body('uses').optional().isInt({ min: 0 }).withMessage('Uses must be a non-negative integer'),
        checkValidationResult
    ],
    async (req, res) => {
        try {
            console.log('Received coupon update request:', req.body);

            const { type, serviceId, bundleId } = req.body;

            if (serviceId) {
                const service = await Service.findById(serviceId);
                if (!service) {
                    return res.status(400).json({ errors: [{ msg: 'Service not found', param: 'serviceId' }] });
                }
            }

            if (bundleId) {
                const bundle = await Bundle.findById(bundleId);
                if (!bundle) {
                    return res.status(400).json({ errors: [{ msg: 'Bundle not found', param: 'bundleId' }] });
                }
            }

            if (type) {
                if (type === 'freeService') {
                    if (!serviceId) {
                        return res.status(400).json({ errors: [{ msg: 'Service ID is required for type "freeService"', param: 'serviceId' }] });
                    }
                    if (bundleId) {
                        return res.status(400).json({ errors: [{ msg: 'Bundle ID should not be provided for type "freeService"', param: 'bundleId' }] });
                    }
                } else if (type === 'freeBundle') {
                    if (!bundleId) {
                        return res.status(400).json({ errors: [{ msg: 'Bundle ID is required for type "freeBundle"', param: 'bundleId' }] });
                    }
                    if (serviceId) {
                        return res.status(400).json({ errors: [{ msg: 'Service ID should not be provided for type "freeBundle"', param: 'serviceId' }] });
                    }
                } else if (type === 'reduction') {
                    if (!serviceId && !bundleId) {
                        return res.status(400).json({ errors: [{ msg: 'Either Service ID or Bundle ID is required for type "reduction"', param: 'serviceId' }] });
                    }
                    if (serviceId && bundleId) {
                        return res.status(400).json({ errors: [{ msg: 'Cannot provide both Service ID and Bundle ID for type "reduction"', param: 'bundleId' }] });
                    }
                } else if (type === 'fuelCredit') {
                    if (serviceId) {
                        return res.status(400).json({ errors: [{ msg: 'Service ID should not be provided for type "fuelCredit"', param: 'serviceId' }] });
                    }
                    if (bundleId) {
                        return res.status(400).json({ errors: [{ msg: 'Bundle ID should not be provided for type "fuelCredit"', param: 'bundleId' }] });
                    }
                }
            }

            if (req.body.startDate && req.body.endDate) {
                const startDate = new Date(req.body.startDate);
                const endDate = new Date(req.body.endDate);
                if (endDate <= startDate) {
                    return res.status(400).json({ errors: [{ msg: 'End date must be after start date', param: 'endDate' }] });
                }
            }

            const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
            res.json({ message: 'Coupon updated', coupon });
        } catch (error) {
            console.error('Error updating coupon:', error);
            if (error.code === 11000) {
                return res.status(400).json({ errors: [{ msg: 'Coupon code already exists', param: 'code' }] });
            }
            res.status(500).json({ message: 'Error updating coupon', error: error.message });
        }
    }
);

// DELETE a coupon (Admin only)
router.delete(
    '/:id',
    auth(['Admin']),
    [
        param('id').isMongoId().withMessage('Invalid coupon ID'),
        checkValidationResult
    ],
    async (req, res) => {
        try {
            const coupon = await Coupon.findByIdAndDelete(req.params.id);
            if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
            res.json({ message: 'Coupon deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting coupon', error: error.message });
        }
    }
);

// POST validate and apply a coupon (Customer and Admin) - Increments uses
router.post(
    '/apply',
    auth(['Customer', 'Admin']),
    [
        body('code').notEmpty().withMessage('Coupon code is required'),
        body('itemType').isIn(['service', 'bundle', 'fuelCredit', 'subscription']).withMessage('Invalid item type'),
        body('itemId')
            .if(body('itemType').isIn(['service', 'bundle', 'subscription']))
            .isMongoId()
            .withMessage('Item ID is required and must be a valid MongoDB ID for service, bundle, or subscription'),
        body('amount')
            .if(body('itemType').equals('fuelCredit'))
            .isNumeric()
            .withMessage('Amount is required and must be a number for fuel credit'),
        checkValidationResult
    ],
    async (req, res) => {
        try {
            console.log('Received coupon apply request:', req.body);
            const { code, itemType, itemId, amount } = req.body;
            const currentDate = new Date();

            // Atomically find and update the coupon to prevent race conditions
            const coupon = await Coupon.findOneAndUpdate(
                {
                    code,
                    $expr: { $lt: ['$uses', '$maxUses'] },
                    startDate: { $lte: currentDate },
                    endDate: { $gte: currentDate }
                },
                {
                    $inc: { uses: 1 }
                },
                { new: true }
            );
            console.log('Found and updated coupon:', coupon);
            if (!coupon) return res.status(404).json({ message: 'Invalid, expired, or fully used coupon' });

            // Validate coupon type against item type
            let expectedType;
            switch (itemType) {
                case 'service':
                    expectedType = coupon.type === 'freeService' || coupon.type === 'reduction' ? coupon.type : null;
                    break;
                case 'bundle':
                    expectedType = coupon.type === 'freeBundle' || coupon.type === 'reduction' ? coupon.type : null;
                    break;
                case 'fuelCredit':
                    expectedType = coupon.type === 'fuelCredit' || coupon.type === 'reduction' ? coupon.type : null;
                    break;
                case 'subscription':
                    expectedType = coupon.type === 'reduction' ? coupon.type : null;
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid item type' });
            }
            if (!expectedType) return res.status(400).json({ message: `Coupon type ${coupon.type} cannot be applied to ${itemType}` });

            // For reduction type, validate serviceId or bundleId if provided
            if (coupon.type === 'reduction') {
                if (itemType === 'service' && coupon.serviceId && coupon.serviceId.toString() !== itemId) {
                    return res.status(400).json({ message: 'Coupon is for a different service' });
                }
                if (itemType === 'bundle' && coupon.bundleId && coupon.bundleId.toString() !== itemId) {
                    return res.status(400).json({ message: 'Coupon is for a different bundle' });
                }
            }

            // Fetch the item to calculate the original price
            let originalPrice = 0;
            if (itemType === 'service') {
                const service = await Service.findById(itemId);
                console.log('Found service:', service);
                if (!service) return res.status(404).json({ message: 'Service not found' });
                originalPrice = service.price - (service.offerDiscount || 0);
            } else if (itemType === 'bundle') {
                const bundle = await Bundle.findById(itemId);
                console.log('Found bundle:', bundle);
                if (!bundle || !bundle.isActive) return res.status(404).json({ message: 'Bundle not found or inactive' });
                originalPrice = bundle.price - (bundle.discount || 0) - (bundle.timeLimitedDiscount || 0);
            } else if (itemType === 'fuelCredit') {
                if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount is required and must be a positive number for fuel credit' });
                originalPrice = amount;
            } else if (itemType === 'subscription') {
                const Subscription = require('../model/mc-subscription');
                const subscription = await Subscription.findById(itemId);
                console.log('Found subscription:', subscription);
                if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
                originalPrice = subscription.price - (subscription.offerDiscount || 0);
            }

            // Apply the coupon
            let newPrice = originalPrice;
            let isFree = false;
            if (coupon.type === 'reduction') {
                const discountAmount = (originalPrice * coupon.discount) / 100;
                newPrice = Math.max(0, originalPrice - discountAmount);
            } else if (['freeService', 'freeBundle', 'fuelCredit'].includes(coupon.type)) {
                if (coupon.type === 'freeService' && coupon.serviceId.toString() !== itemId) {
                    return res.status(400).json({ message: 'Coupon is for a different service' });
                }
                if (coupon.type === 'freeBundle' && coupon.bundleId.toString() !== itemId) {
                    return res.status(400).json({ message: 'Coupon is for a different bundle' });
                }
                newPrice = 0;
                isFree = true;
            }

            res.json({
                message: 'Coupon applied',
                couponId: coupon._id,
                originalPrice,
                newPrice,
                isFree
            });
        } catch (error) {
            console.error('Error applying coupon:', error);
            res.status(500).json({ message: 'Error applying coupon', error: error.message, stack: error.stack });
        }
    }
);

// POST verify a coupon (Customer and Admin) - Does NOT increment uses
router.post(
    '/verify',
    auth(['Customer', 'Admin']),
    [
        body('code').notEmpty().withMessage('Coupon code is required'),
        body('itemType').isIn(['service', 'bundle', 'fuelCredit', 'subscription']).withMessage('Invalid item type'),
        body('itemIds').if(body('itemType').isIn(['service', 'bundle', 'subscription']))
            .isArray({ min: 1 })
            .withMessage('Item IDs must be a non-empty array for service, bundle, or subscription'),
        body('itemIds.*').if(body('itemType').isIn(['service', 'bundle', 'subscription']))
            .isMongoId()
            .withMessage('Each item ID must be a valid MongoDB ID'),
        body('amount') .if(body('itemType').equals('fuelCredit')).isNumeric()
            .withMessage('Amount is required and must be a number for fuel credit'),
        checkValidationResult
    ],
    async (req, res) => {
        try {
            console.log('Received coupon verify request:', req.body);
            const { code, itemType, itemIds, amount } = req.body;
            const currentDate = new Date();

            // Find the coupon
            const coupon = await Coupon.findOne({
                code,
                $expr: { $lt: ['$uses', '$maxUses'] },
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });
            console.log('Found coupon:', coupon);
            if (!coupon) return res.status(404).json({ message: 'Invalid, expired, or fully used coupon' });

            // Validate coupon type against item type
            let expectedType;
            switch (itemType) {
                case 'service':
                    expectedType = coupon.type === 'freeService' || coupon.type === 'reduction' ? coupon.type : null;
                    break;
                case 'bundle':
                    expectedType = coupon.type === 'freeBundle' || coupon.type === 'reduction' ? coupon.type : null;
                    break;
                case 'fuelCredit':
                    expectedType = coupon.type === 'fuelCredit' || coupon.type === 'reduction' ? coupon.type : null;
                    break;
                case 'subscription':
                    expectedType = coupon.type === 'reduction' ? coupon.type : null;
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid item type' });
            }
            if (!expectedType) return res.status(400).json({ message: `Coupon type ${coupon.type} cannot be applied to ${itemType}` });

            // Process each item
            const results = [];
            if (itemType === 'fuelCredit') {
                // Handle fuel credit (single amount, no itemIds)
                if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount is required and must be a positive number for fuel credit' });
                const originalPrice = amount;
                let newPrice = originalPrice;
                let isFree = false;
                if (coupon.type === 'reduction') {
                    const discountAmount = (originalPrice * coupon.discount) / 100;
                    newPrice = Math.max(0, originalPrice - discountAmount);
                } else if (coupon.type === 'fuelCredit') {
                    newPrice = 0;
                    isFree = true;
                }
                results.push({
                    itemId: null,
                    originalPrice,
                    newPrice,
                    isFree,
                    isApplicable: true,
                    errorMessage: null
                });
            } else {
                // Handle service, bundle, or subscription (array of itemIds)
                for (const itemId of itemIds) {
                    let originalPrice = 0;
                    let isApplicable = true;
                    let errorMessage = null;

                    // Fetch the item to calculate the original price
                    if (itemType === 'service') {
                        const service = await Service.findById(itemId);
                        console.log('Found service:', service);
                        if (!service) {
                            isApplicable = false;
                            errorMessage = 'Service not found';
                        } else {
                            originalPrice = service.price - (service.offerDiscount || 0);
                        }
                    } else if (itemType === 'bundle') {
                        const bundle = await Bundle.findById(itemId);
                        console.log('Found bundle:', bundle);
                        if (!bundle || !bundle.isActive) {
                            isApplicable = false;
                            errorMessage = 'Bundle not found or inactive';
                        } else {
                            originalPrice = bundle.price - (bundle.discount || 0) - (bundle.timeLimitedDiscount || 0);
                        }
                    } else if (itemType === 'subscription') {
                        const Subscription = require('../model/mc-subscription');
                        const subscription = await Subscription.findById(itemId);
                        console.log('Found subscription:', subscription);
                        if (!subscription) {
                            isApplicable = false;
                            errorMessage = 'Subscription not found';
                        } else {
                            originalPrice = subscription.price - (subscription.offerDiscount || 0);
                        }
                    }

                    // For reduction type, validate serviceId or bundleId if provided
                    if (isApplicable && coupon.type === 'reduction') {
                        if (itemType === 'service') {
                            if (coupon.serviceId && coupon.serviceId.toString() !== itemId) {
                                isApplicable = false;
                                errorMessage = 'Coupon is for a different service';
                            } else if (coupon.bundleId) {
                                isApplicable = false;
                                errorMessage = 'Coupon is for a bundle, not a service';
                            }
                        } else if (itemType === 'bundle') {
                            if (coupon.bundleId && coupon.bundleId.toString() !== itemId) {
                                isApplicable = false;
                                errorMessage = 'Coupon is for a different bundle';
                            } else if (coupon.serviceId) {
                                isApplicable = false;
                                errorMessage = 'Coupon is for a service, not a bundle';
                            }
                        }
                    }

                    // Apply the coupon (without incrementing uses)
                    let newPrice = originalPrice;
                    let isFree = false;
                    if (isApplicable) {
                        if (coupon.type === 'reduction') {
                            const discountAmount = (originalPrice * coupon.discount) / 100;
                            newPrice = Math.max(0, originalPrice - discountAmount);
                        } else if (['freeService', 'freeBundle'].includes(coupon.type)) {
                            if (coupon.type === 'freeService' && coupon.serviceId.toString() !== itemId) {
                                isApplicable = false;
                                errorMessage = 'Coupon is for a different service';
                            }
                            if (coupon.type === 'freeBundle' && coupon.bundleId.toString() !== itemId) {
                                isApplicable = false;
                                errorMessage = 'Coupon is for a different bundle';
                            }
                            if (isApplicable) {
                                newPrice = 0;
                                isFree = true;
                            }
                        }
                    }

                    results.push({
                        itemId,
                        originalPrice: isApplicable ? originalPrice : 0,
                        newPrice: isApplicable ? newPrice : originalPrice,
                        isFree,
                        isApplicable,
                        errorMessage
                    });
                }
            }

            res.json({
                message: 'Coupons verified',
                couponId: coupon._id,
                results
            });
        } catch (error) {
            console.error('Error verifying coupon:', error);
            res.status(500).json({ message: 'Error verifying coupon', error: error.message, stack: error.stack });
        }
    }
);

module.exports = router;