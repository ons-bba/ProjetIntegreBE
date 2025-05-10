const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const prestationSchema = Schema({
    nom : {
        type : String,
        unique : true,
        trim : true,
        maxLength : [50, 'le nom ne doit pa depasser 50 caractere'],
        required : true 
    },
    // description du prestation detaille 

    description : {
        type : String,
        maxLength : [500, 'La description ne peut dépasser 500 caractére']
    },
    // catégoristation
    categorie : {
        type : String,
        required : true,
        enum :  ['STATIONNEMENT','SECURITE','ELECTRIQUE','CONFORT','PREMIUM']
        
    },
    //Tarification 
    tarif : {
        type : String,
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
     dateCreation : {type : Date, default : Date.now()},
     dateMiseAJour : Date,


})

module.exports = mongoose.model('Prestation',prestationSchema)