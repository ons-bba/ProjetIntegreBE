const mongoose = require('mongoose');

const AdresseSchema = new mongoose.Schema({
  rue: {
    type: String,
    required: true,
  },
  ville: {
    type: String,
    required: true,
  },
  codePostal: {
    type: String,
    required: true,
  },
  localisation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
}, {
  timestamps: true
});

// Pour activer l’indexation géospatiale sur les coordonnées
AdresseSchema.index({ localisation: '2dsphere' });

module.exports = mongoose.model('Adresse', AdresseSchema);
