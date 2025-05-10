const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    bundleId: { type: mongoose.Schema.Types.ObjectId, default: null },
    status: { type: String, required: true, enum: ['Pending', 'Completed', 'Cancelled'] },
    bookingDate: { type: Date, required: true },
    completionDate: { type: Date, default: null },
    totalCost: { type: Number, required: true, min: 0 },
    qrCode: { type: Buffer },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', reservationSchema);