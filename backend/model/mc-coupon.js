const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Le code du coupon est requis'],
        unique: true,
        trim: true,
        minlength: [12, 'Le code doit avoir au moins 12 caractères']
    },
    type: {
        type: String,
        enum: ['reduction', 'freeService', 'freeBundle', 'fuelCredit'],
        required: [true, 'Le type de coupon est requis']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'La réduction ne peut pas être négative'],
        required: function () { return this.type === 'reduction'; }
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        default: null,
        required: function () { return this.type === 'freeService'; }
    },
    bundleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bundle',
        default: null,
        required: function () { return this.type === 'freeBundle'; }
    },
    startDate: {
        type: Date,
        required: [true, 'La date de début est requise']
    },
    endDate: {
        type: Date,
        required: [true, 'La date de fin est requise'],
        validate: {
            validator: function (v) { return v > this.startDate; },
            message: 'La date de fin doit être postérieure à la date de début'
        }
    },
    maxUses: {
        type: Number,
        required: [true, 'Le nombre maximum d\'utilisations est requis'],
        min: [1, 'Le nombre maximum d\'utilisations doit être au moins 1']
    },
    uses: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Coupon', couponSchema);