const mongoose = require('mongoose');
const Parking= require('../models/parking')

const placeSchema = mongoose.Schema({

  parking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: Parking,
    required: true
  },
  numero: {
    type: String,
    unique: true,
    validate: {
      validator: async function (numero) {
        const existing = await this.constructor.findOne({
          numero,
          parking: this.parking._id
        });
        return !existing
      },
      message: 'Le numero de place doit étre unique dans ce parking'
    }
  },
  tarif: { type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tarif' },

  statut: {
    type: String,
    enum: ['libre', 'réservée', 'occupée', 'maintenance'],
    default: 'libre'
  },
  type: {
    type: String,
    enum: ['standard', 'handicape', 'electrique', 'premium'],
    default: 'standard'
  }

});
module.exports = mongoose.model('Place', placeSchema)