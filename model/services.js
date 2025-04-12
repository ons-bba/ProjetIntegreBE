const mongoose = require('mongoose');
const Schema = mongoose.Schema();


const serviceSchema = Schema({
    nom : {
        type : String,
        unique : true,
        trim : true,
        maxLenght : [50, 'le nom ne doit pa depasser 50 caractere'],
        required : true 
    },
    // description du service detaille 

    description : {
        type : String,
        maxLength : [500, 'La description ne peut dépasser 500 caractére']
    },
    // catégoristation
    categorie : {
        type : String,
        required : true,
        enum : 
        { value : ['STATIONNEMENT','SECURITE','ELECTRIQUE','CONFORT','PREMUIM'], message : 'catégorie de service invalid'}
    },
    //Tarification 
    tarif : {
        type : Number,
        enum : ['GRATUIT', 'HORAIRE','FORFAIT'],
        default: 'GRATUIT'
    },
    montant : {
        type : Number,
        min : 0,
        required : function(){return this.tarif !== 'GRATUIT'}
    },
    devise : {
        type : String,
        default : 'DT'
    },
    // disponibilite et contrainte 
    disponible : {
        type : Boolean,
        default : true
    },
    horaires : {
        ouverture : {type : String,match : /^([0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/},
        fermeture : {type : String,match :/^([0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    exigences : [String],  // Ex: ["Permis B", "Câble Type 2"]
     // Metadonnées 

     icone : String,
     dateCreation : {type : date, default : Date.now()},
     dateMiseAJour : Date,


})

module.exports = mongoose.model('Service',serviceSchema)