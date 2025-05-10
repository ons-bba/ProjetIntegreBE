const express = require('express');
const router = express.Router();
const { auth } = require('../mc-middleware/auth');
const { body, param, validationResult } = require('express-validator');
const Reservation = require('../mc-models/reservation');
const Service = require('../mc-models/service');
const Bundle = require('../mc-models/bundle');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

// Middleware to check for validation errors
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET all reservations
router.get('/', auth(['Customer', 'Admin']), async (req, res) => {
  try {
    const reservations = await Reservation.find();
    const reservationsWithBase64 = reservations.map(reservation => {
      const resObj = reservation.toObject();
      resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
      return resObj;
    });
    res.json(reservationsWithBase64);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reservations', error: error.message });
  }
});

// GET reservations for the logged-in customer
router.get('/customer', auth(['Customer', 'Admin']), async (req, res) => {
  try {
    const reservations = await Reservation.find({ customerId: req.user.id });
    const reservationsWithBase64 = reservations.map(reservation => {
      const resObj = reservation.toObject();
      resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
      return resObj;
    });
    res.json(reservationsWithBase64);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer reservations', error: error.message });
  }
});

// GET a single reservation by ID
router.get(
  '/:id',
  auth(['Customer', 'Admin']),
  [
    param('id').isMongoId().withMessage('Invalid reservation ID'),
    checkValidationResult
  ],
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

      const resObj = reservation.toObject();
      resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
      res.json(resObj);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching reservation', error: error.message });
    }
  }
);

// POST a new reservation (Admin)
router.post(
  '/admin',
  auth(['Customer', 'Admin']),
  [
    body('customerId').isMongoId().withMessage('Invalid customer ID'),
    body('serviceId').optional().isMongoId().withMessage('Invalid service ID'),
    body('bundleId').optional().isMongoId().withMessage('Invalid bundle ID'),
    body('status').notEmpty().withMessage('Status is required'),
    body('bookingDate').isISO8601().withMessage('Invalid booking date'),
    body('totalCost').isNumeric().withMessage('Total cost must be a number'),
    checkValidationResult
  ],
  async (req, res) => {
    try {
      const reservation = new Reservation(req.body);
      const qrCodeData = `https://mobilitycore.com/verify/reservation/${reservation._id}`;
      reservation.qrCode = await QRCode.toBuffer(qrCodeData, { width: 200 });
      await reservation.save();

      const resObj = reservation.toObject();
      resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
      res.status(201).json({ message: 'Reservation created', reservation: resObj });
    } catch (error) {
      res.status(500).json({ message: 'Error creating reservation', error: error.message });
    }
  }
);

// POST a new reservation (Customer)
router.post(
  '/customer',
  auth(['Customer', 'Admin']),
  [
    body('serviceId').optional().isMongoId().withMessage('Invalid service ID'),
    body('bundleId').optional().isMongoId().withMessage('Invalid bundle ID'),
    body('bookingDate').isISO8601().withMessage('Invalid booking date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('couponCode').optional().notEmpty().withMessage('Coupon code cannot be empty'),
    body('totalCost').isNumeric().withMessage('Total cost must be a number'),
    checkValidationResult
  ],
  async (req, res) => {
    try {
      const { serviceId, bundleId, bookingDate, endDate, couponCode, totalCost } = req.body;

      // Validate that either serviceId or bundleId is provided
      if (!serviceId && !bundleId) {
        return res.status(400).json({ message: 'Service or bundle ID required' });
      }

      let itemType = '';
      let itemId = '';

      // Fetch the item (service or bundle)
      if (serviceId) {
        const service = await Service.findById(serviceId);
        if (!service) return res.status(404).json({ message: 'Service not found' });
        if (service.status !== 'Active') return res.status(400).json({ message: 'Service is not active' });
        itemType = 'service';
        itemId = serviceId;
      } else if (bundleId) {
        const bundle = await Bundle.findById(bundleId);
        if (!bundle || !bundle.isActive) return res.status(404).json({ message: 'Bundle not found or inactive' });
        itemType = 'bundle';
        itemId = bundleId;
      }

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
            itemType,
            itemId
          })
        });
        const couponData = await couponResponse.json();
        if (couponResponse.status !== 200) return res.status(couponResponse.status).json(couponData);

        couponId = couponData.couponId;
      }

      // Create the reservation using the provided bookingDate
      const reservation = new Reservation({
        customerId: req.user.id,
        serviceId,
        bundleId,
        status: 'Pending',
        bookingDate: new Date(bookingDate), // Use the provided bookingDate
        endDate: endDate ? new Date(endDate) : undefined, // Optionally store endDate
        totalCost,
        couponId,
        createdAt: new Date()
      });

      const qrCodeData = `https://mobilitycore.com/verify/reservation/${reservation._id}`;
      reservation.qrCode = await QRCode.toBuffer(qrCodeData, { width: 200 });
      await reservation.save();

      const resObj = reservation.toObject();
      resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
      res.status(201).json({ message: 'Reservation created', reservation: resObj });
    } catch (error) {
      res.status(500).json({ message: 'Error creating reservation', error: error.message });
    }
  }
);

// PUT (update) a reservation
router.put(
  '/:id',
  auth(['Customer', 'Admin']),
  [
    param('id').isMongoId().withMessage('Invalid reservation ID'),
    checkValidationResult
  ],
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

      Object.assign(reservation, req.body);
      const qrCodeData = `https://mobilitycore.com/verify/reservation/${reservation._id}`;
      reservation.qrCode = await QRCode.toBuffer(qrCodeData, { width: 200 });
      await reservation.save();

      const resObj = reservation.toObject();
      resObj.qrCode = reservation.qrCode ? `data:image/png;base64,${reservation.qrCode.toString('base64')}` : null;
      res.json({ message: 'Reservation updated', reservation: resObj });
    } catch (error) {
      res.status(500).json({ message: 'Error updating reservation', error: error.message });
    }
  }
);

// DELETE a reservation
router.delete(
  '/:id',
  auth(['Customer', 'Admin']),
  [
    param('id').isMongoId().withMessage('Invalid reservation ID'),
    checkValidationResult
  ],
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

      // Check if the user is a Customer trying to delete their own reservation
      if (req.user.role === 'Customer') {
        if (reservation.customerId.toString() !== req.user.id) {
          return res.status(403).json({ message: 'You can only delete your own reservations' });
        }
      }

      await Reservation.findByIdAndDelete(req.params.id);
      res.json({ message: 'Reservation deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting reservation', error: error.message });
    }
  }
);

module.exports = router;