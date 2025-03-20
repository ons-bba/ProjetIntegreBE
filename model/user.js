const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = new Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true
  },

  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true
  },
  
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  mot_de_passe: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères']
  },
  telephone: {
    type: String,
    match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Numéro de téléphone invalide']
  },
  role: {
    type: String,
    enum: ['CONDUCTEUR', 'OPERATEUR', 'ADMIN'],
    default: 'CONDUCTEUR'
  },
  preferences: {
    type: Schema.Types.Mixed,
    default: {}
  },
  historique_stationnement: [{
    stationnementId: { type: Schema.Types.ObjectId, ref: 'Stationnement' },
    date: { type: Date, default: Date.now }
  }],
  points_fidelite: {
    type: Number,
    default: 0,
    min: 0
  },
  date_inscription: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ACTIF', 'SUSPENDU', 'BLOQUE', 'SUPPRIME'],
    default: 'ACTIF'
  }
}, {
  timestamps: false,
  versionKey: false
});


module.exports = mongoose.model('User', userSchema);