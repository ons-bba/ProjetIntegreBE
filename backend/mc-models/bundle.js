const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    timeLimitedDiscount: { type: Number, default: null, min: 0 },
    discountStartDate: { type: Date, default: null },
    discountEndDate: { type: Date, default: null },
    isActive: { type: Boolean, required: true },
    createdAt: { type: Date, required: true }
});

module.exports = mongoose.model('Bundle', bundleSchema);