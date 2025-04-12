// models/Tarif.js
const mongoose = require('mongoose');

const tarifSchema = new mongoose.Schema({
  montant: Number,
  duree: String
});

module.exports = mongoose.model('Tarif', tarifSchema);
