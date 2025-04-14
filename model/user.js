const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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







// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('mot_de_passe')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.mot_de_passe);
};

// JWT generation method
userSchema.methods.generateAuthToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT secret is not configured');
  }
  
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
      email: this.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};
// Add this method to your userSchema
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};


module.exports = mongoose.model('User', userSchema);