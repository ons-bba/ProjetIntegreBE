const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fuelCreditSchema = new Schema({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    credits: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'fuelCredits' }); 

module.exports = mongoose.model('fuelCredit', fuelCreditSchema);