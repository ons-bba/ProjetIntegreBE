const mongoose = require('mongoose');
const { isValidCoordinates } = require('./validator/validators');
const Schema = mongoose.Schema;

const parkingSchema = new Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de parking est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  // Statut (enum pour controller les valeurs possible )
  statut: {
    type: String,
    enum: { values: ['OUVERT', 'FERME', 'COMPLET', 'MAINTENANCE'], message: 'Statut invalid' },
    default: 'OUVERT'

  },
  // Gestion des places 
  placesDisponible: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de place ne peut pas etre négatif']
  },
  placesTotal: {
    type: Number,
    required: true,
    validate: { validator: Number.isInteger, message: 'Le nombre total de places doit etre un entier' },
    min: [1, 'Le parking doit avoir aumoins une place']

  },
  // Localisation Géographique par recherche proches 
  localisation: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [Longitide, latitude]
      required: true,
      validate: isValidCoordinates // 'Les coordonnées doivent étre [longitude,latitude]'}


    }
  },

  prestations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestation',
    validate: {
      validator: async function (v) {
        const doc = await mongoose.model('Prestation').exists({ _id: v });
        return doc;
      },
      message: 'La prestation référence n\'existe pas'
    }
  }],
  // Métadonnées 
  horaires: {
    ouverture: {
      type: String,
      default: '08:00',
      match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format horaire invalid (HH:MM)']
    },
    fermeture: {
      type: String,
      default: '20:00',
      match: [/([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format horaire invalid (HH:MM)']
    }
  },

  dateCreation: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  dateMiseAJour: {
    type: Date
  }


},
  {
    toJSON: { virtuals: true }, // inclut les virtuals dans les conversions JSON
    toObject: { virtuals: true }
  }
);

// virtual pour calculer le taux d'occupation 
parkingSchema.virtual('tauxOccupation').get(function () {
  return ((this.placesTotal - this.placesDisponible) / this.placesTotal * 100).toFixed(2)
});

// Index Geospatial pour les requettes de proximite
parkingSchema.index({ localisation: '2dsphere' });

// middelware pour mettre a jour la date de mise a jour avant le sauvegarde
parkingSchema.pre('save', function (next) {
  this.dateMiseAJour = Date.now();
  // si nouveau parking, initialiser placesDisponible = placeTotal
  if (this.isNew) {
    this.placesDisponible = this.placesTotal
  }
  next();
});

// parkingSchema.pre('findOneAndUpdate', async function(next) {
//   const update = this.getUpdate(); 
//   if(update.$set?.prestations){
//     // 1. Parcourir toutes les prestations
//     for (const prestationId of update.$set.prestations) {
//       // 2. Vérifier chaque ID
//       const exists = await mongoose.model('Prestation').exists({ _id: prestationId });
//       if (!exists) {
//         throw new Error(`Prestation ${prestationId} non trouvée`);
//       }
//     }
//   }
//   next();
// });






module.exports = mongoose.model('Parking', parkingSchema)

