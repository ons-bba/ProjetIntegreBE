// models/Tarif.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tarifSchema = new Schema({
  type: {
    type: String, 
    enum: ['standard', 'premium', 'handicapé', 'electrique'],
    required: true
  },
  place: {
    type: Schema.Types.ObjectId, 
    ref: 'Place', 
    required: true
  },
  tarifHoraire: {
    type: Number,
    required: true
  },
  tarifJournalier: {
    type: Number
  },
  tarifMensuel: {
    type: Number
  },
  tarifReduit: {
    type: Number
  },
  dateDebut: {
    type: Date,
    default: Date.now
  },
  dateFin: {
    type: Date
  }
}, {
  timestamps: true  // Option correctement placée dans les options du schéma
});

module.exports = mongoose.model('Tarif', tarifSchema);