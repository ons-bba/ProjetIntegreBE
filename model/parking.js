const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const parkingSchema = new Schema({
  nom : {
    type:String,
    required : [true, 'Le nom de parking est obligatoire'],
    trim : true,
    maxlength : [true,'Le nom ne peut pas dépasser 100 caractères']
  },
  // Statut (enum pour controller les valeurs possible )
  statut : {
    type : String,
    enum : {values : ['OUVERT','FERME','COMPLET','MAINTENANCE'], message : 'Statut invalid'},
    default : 'OUVERT'

  },
  // Gestion des places 
  placesDisponible : {
    type : Number,
    default : 0,
    min : [0, 'Le nombre de place ne peut pas etre négatif']
  },
  placesTotal :{
    type:Number,
    required : true,
    validate :{validator : Number.isInteger,message : 'Le nombre total de places doit etre un entier' },
    
  },
  // Localisation Géographique par recherche proches 
  localisation : {
    type : {
      type : String,
      default : 'Point',
      enum : ['Point']
    },
    coordinates : {
      type : [Number], // [Longitide, latitude]
      required : true,
      validate : {validator :(coords)=>{coords.length == 2} ,message : 'Les coordonnées doivent étre [longitude,latitude]'}


    }
  },
  // Tarif et serices
  tarifParking : {
    type : Schema.Types.ObjectId,
    ref : 'Tarif',
    required : true

  },
  prestations : [ {type : Schema.Types.ObjectId, ref : 'prestation'}],
  // Métadonnées 
  horaires : { ouverture : { type : String , default : '08:00'} , fermeture : { type : String, default : '20:00'}} ,

  dateCreation : { type : Date , default : Date.now()},
  dateMiseAJour : {type : Date}


});



module.exports = mongoose.model('Parking',parkingSchema)

