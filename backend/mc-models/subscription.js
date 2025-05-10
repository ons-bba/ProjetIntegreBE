const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    planName: { type: String, required: true },
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    price: { type: Number, required: true, min: 0 },
    offerDiscount: { type: Number, default: 0, min: 0 },
    offerStartDate: { type: Date, default: null },
    offerEndDate: { type: Date, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    status: { type: String, required: true, enum: ['active', 'inactive', 'expired'] },
    fuelCreditId: { type: mongoose.Schema.Types.ObjectId, ref: 'fuelCredit', default: null },
    qrCode: { type: Buffer },
    createdAt: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);