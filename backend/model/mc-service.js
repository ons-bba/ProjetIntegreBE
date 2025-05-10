const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 0 }, 
    isBundleOnly: { type: Boolean, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    offerDiscount: { type: Number, default: 0, min: 0 },
    offerStartDate: { type: Date },
    offerEndDate: { type: Date },
    createdAt: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);