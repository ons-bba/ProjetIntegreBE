const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const parkingSchema = new Schema({
  nom : {
    type:String,
    required : [true, 'Le nom de parking est obligatoire'],
    trim : true,
    maxlength : [100,'Le nom ne peut pas dépasser 100 caractères']
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
    min : [1,'Le parking doit avoir aumoins une place']
    
  },
  // Localisation Géographique par recherche proches 
  localisation : {
    type : {
      type : String,
      default : 'Point',
      enum: ['Point']
    },
    coordinates : {
      type : [Number], // [Longitide, latitude]
      required : true,
     // validate : {validator :(coords)=>{coords.length == 2} ,message : 'Les coordonnées doivent étre [longitude,latitude]'}


    }
  },
  // Tarif et serices
  tarifParking : {
    type : Schema.Types.ObjectId,
    ref : 'Tarif',
    

  },
  prestations : [ {type : Schema.Types.ObjectId, ref : 'prestation'}],
  // Métadonnées 
  horaires : { ouverture : { type : String , default : '08:00'} , fermeture : { type : String, default : '20:00'}} ,

  dateCreation : { type : Date , default : Date.now},
  dateMiseAJour : {type : Date}


});

// Index Geospatial pour les requettes de proximite
parkingSchema.index({localisation:'2dsphere'});
// middelware pour mettre a jour la date de mise a jour avant le sauvegarde
parkingSchema.pre('save',function(next){
  this.dateMiseAJour = Date.now();
  next();
});



module.exports = mongoose.model('Parking',parkingSchema)

