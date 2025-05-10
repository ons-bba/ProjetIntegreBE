const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({

    //référence
    user : {type:mongoose.Schema.Types.ObjectId, ref : 'User', required : true },
    parking : {type: mongoose.Schema.Types.ObjectId, ref : 'Parking', required: true},
    place : { type: mongoose.Schema.Types.ObjectId,  ref : 'Place' },

    //plage horaire
    debut : { 
        type : Date, 
        required:true,
        validate : {validator : (v)=> {return v>new Date()}},
        message : 'La date de debut doit etre dans le futur'
    },
    fin : {
        type: Date,
         required : true,
         validate : {validate : (v)=>{ return v>this.debut}},
         message : 'La date de fin doit etre aprés le debut'
        },
    

    


    // Etat 

    statut: {
        type: String,
        enum : ['confirmée', 'annulée', 'en_cours', 'terminée'],
        default : 'confirmée'
    },
    // Paiement 
    paiementId: {type:String}, // Référence stripe / PayPal
    methodePaiement: {type:String, enum: ['carte', 'espece', 'wallet']},

    // Timestamps automatisés
    createdAt:{type: Date, default: Date.now},
    updateAt: {type:Date, default: Date.now}

}, {timestamps: true})
module.exports= mongoose.model('Reservation',reservationSchema);