// models/Tarif.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tarifSchema = new Schema({
  //Référence au parking (essentiel pour lier les tarifs)
  parking:{
    type:Schema.Types.ObjectId,
    ref: 'Parking',
    index:true
  },
  type: {
    type: String, 
    enum: ['standard', 'premium', 'handicape', 'electrique',],
    required: true,
    index:true
  },

  //Description optionnelle
  description:{
    type:String,
    maxlength:200
  },

    tarifHoraire: {
    type: Number,
     min: 0,
    validate : {
      validator : Number.isFinite,
      message: 'Le Tarif horaire doit étre un nombre valide'
    },
    
  },
  tarifJournalier: {
    type: Number,
    min: 0,
    validate : [
      {
        validator : Number.isFinite,
        message: 'Le Tarif journaliere doit etre un nombre valid'
      },
      {
        validator: function(v){
          return !v || v>= this.tarifHoraire; // Au moins 90% du tarif horaire x 24 
        },
        message: 'Le tarif journalier doit être au moins 90% du tarif horaire journalisé (tarifHoraire * 24 * 0.9)'
      }
    ]
  },
  tarifMensuel: {
    type: Number,
    min:0,
    validate: [
      {
        validator: Number.isFinite,
        message: 'Le tarif mensuel doit être un nombre valide'
      },
      {
        validator: function(v){
          return !v || !this.tarifJournalier || v>= this.tarifJournalier;
        },
        message: 'Le tarif mensuel doit etre cohérent avec le tarif journalier'
      }
    ]
  },
  tarifReduit: {
    type: Number,
    min:0,
    validate: [
      {
        validator: Number.isFinite,
      },
      {
        validator: function(v){
          return !v || v < this.tarifHoraire
        },
        message: 'Le tarif reduit doit etre inférieur au tarif horaire normale'
      }
    ]
  },
  dateDebut: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v){
        return !this.dateFin || v < this.dateFin;
      },
      message: 'La date de début doit etre antérieu à la date de fin'
    }
  },
  dateFin : {
    type: Date,
    validate: {
      validator : function(v){
        return !v || v> this.dateDebut;
      },
      message: 'La date de fin doit etre postérieur à la date de début'
    }
  },
  createdBy: {
    type:Schema.Types.ObjectId,
    ref: 'User',
    
  }

 
}, {
  timestamps: true, // Option correctement placée dans les options du schéma
  toJSON: {virtuals: true},
  toObject: {virtuals: true}
});

// Index composé pour les requetes fréquentes
tarifSchema.index({parking:1,type:1,dateDebut: -1});
//virtual pour verifier si le tarif est actif 
tarifSchema.virtual('estActif').get(function(){
  const now = new Date();
  return this.dateDebut<= now && (!this.dateFin || this.dateFin > now );
});

// methode statique pour trouver le tarif actif
tarifSchema.statics.findActiveTarif = function(parkingId,placeType){
  const now = new Date();
  return this.findOne({
    parking: parkingId,
    type: placeType,
    dateDebut:{$lt:now},
    $or:[
      {dateFin:null},
      {dateFin:{$gt:now}}
    ]
  }).sort({dateDebut: -1})
}

// validation des cohérences avant sauvgarde
tarifSchema.pre('save',function(next){
  if(this.dateFin && this.dateFin <= this.dateDebut){
    throw new Error('La date de fin  doit etre posterieur a date de debut')
  }
  next();
})

module.exports = mongoose.model('Tarif', tarifSchema);