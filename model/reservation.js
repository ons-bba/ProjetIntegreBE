const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({

    //référence
    user : {type:Schema.Type.objectId, ref : 'User', required : true },
    parking : {type: Schema.Type.objectId, ref : 'Parking', required: true},
    place : { type: Schema.Type.objectId,  ref : 'Place' },

    //plage horaire
    debut : { 
        type : Date, 
        required:true,
        validator : {validator : (v)=> {return v>new Date()}},
        message : 'La date de debut doit etre dans le futur'
    },
    fin : {
        type: Date,
         required : true,
         validator : {validate : (v)=>{ return v>this.debut}},
         message : 'La date de fin doit etre aprés le debut'
        },
    

    //Tarif (référence depuis la place )

    tarif: { 
        montant : {type: Number, required: true},
        details: {
            type : String,
            enum : ['horaire', 'journalier','abonnement'],
            required: true
        }
    },

    // Etat 

    statut: {
        type: String,
        enum : ['confirmée', 'annulée', 'en_cours', 'terminée'],
        default : true
    },
    // Paiement 
    paiementId: {type:String}, // Référence stripe / PayPal
    methodePaiement: {type:String, enum: ['carte', 'espece', 'wallet']},

    // Timestamps automatisés
    createdAt:{type: Date, default: Date.now},
    updateAt: {type:Date, default: Date.now}

}, {timestamps: true})