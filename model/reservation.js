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

    tarifApplique : { base : Number, ajustement: [{raison: String, }]
    }

})