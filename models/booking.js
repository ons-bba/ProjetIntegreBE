const mongoose = require('mongoose');
const { validate } = require('./parking');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    //reference à l'utilisateur qui a fait la reservation

    user : {
        type: Schema.Types.ObjectId,
        ref : 'User'
       
    },

    // Référence parking 

    parking : {
        type : Schema.Types.ObjectId,
        ref : 'Parking',
        required : [true, 'Le parking est obligatoire']
    },


    //Référence a la place réservée 
    place : {
        type : Schema.Types.ObjectId,
        ref : 'Place',
        required : [true, 'le parking est obligatoire'],
        validate : {
            validator : async function(v){
                // verifie que la place appartient bien au parking spécifie
                const place = await mongoose.model('Place').findOne({_id:v,parking : this.parking});
                return place !== null;
            },
            message : 'La place spécidiée n\'est pas au parking indiqué'
        }
    },

   //Dates
   dateDebut : {
    type : Date,
    required : true,
    validate : {
        validator : function(v){
            return v > new Date();
        },
        message : 'La réservation doit commencer dans le future'
    }
   },
   dateFin : {
    type : Date,
    required : true,
    validate : {
        validator : function (v){
            return v > this.dateDebut;
        },
        message : 'la date de fin doit étre aprés le début'
    }
   },
   // Montant (calculé à partir du tarif de la place )

   montantTotal : {
    type : Number,
    default : 0
    
   },

   statut : {
    type : String,
    enum : ['CONFIRMEE', 'ANNULEE', 'EN COURS', 'TERMINEE'],
    default : 'CONFIRMEE'
   },

   // paiement 
   paiementId : {
    type : String,
    required : true //function(){
        //return this.statut === 'CONFIRMEE'
    //}
   }
},
{timestamps : true,
    toJSON : {virtuals : true}
}
);

// Middleware pour calculer le montant avant sauvgarde

bookingSchema.pre('save', async function(next){
    if(this.isModified('place') || this.isModified('dateDebut') || this.isModified('dateFin') || this.isNew){
        const place = await mongoose.model('Place').findById(this.place).populate('tarif');
        if(!place || !place.tarif){
            throw new Error('Tarif non trouvé pour cette place');
        }

        const dureeHeures = (this.dateFin - this.dateDebut)/(1000 * 60 * 60);
        this.montantTotal = dureeHeures * place.tarif.tarifHoraire;
    }
    next();

});


// verification de disponibilite (méthode statique)
 bookingSchema.statics.checkDisponibilite = async  function(placeId, dateDebut, dateFin){
    const existing = await this.find({
        place : placeId,
        statut : { $ne : 'ANNULEE'},
        $or : [
            {dateDebut : {$lt : dateFin}, dateFin : {$gt : dateDebut}},
            {dateDebut : {$gte : dateDebut, $lte: dateFin}}
        ]

    });
    return existing.length === 0; 
 }


 // virtual pour le parking (accés indirect via place)

 bookingSchema.virtual('placeparking',{
    ref : 'Place',
    localField : 'place',
    foreignField : '_id',
    justOne : true,
    options : {select : 'parking'}
 });


 module.exports = mongoose.model('Reservation',bookingSchema)