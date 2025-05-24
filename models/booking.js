const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    // Références
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'L\'utilisateur est obligatoire'],
        index: true
    },
    parking: {
        type: Schema.Types.ObjectId,
        ref: 'Parking',
        required: [true, 'Le parking est obligatoire'],
        index: true
    },
    place: {
        type: Schema.Types.ObjectId,
        ref: 'Place',
        required: [true, 'La place est obligatoire'],
        validate: {
            validator: async function(v) {
                if (!this.parking) return true;
                const place = await mongoose.model('Place').findOne({
                    _id: v,
                    parking: this.parking
                });
                return place !== null;
            },
            message: 'La place ne correspond pas au parking spécifié'
        }
    },

    // Période de réservation
    dateDebut: {
        type: Date,
        required: [true, 'La date de début est obligatoire'],
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'La réservation doit commencer dans le futur'
        }
    },
    dateFin: {
        type: Date,
        required: [true, 'La date de fin est obligatoire'],
        validate: {
            validator: function(v) {
                const dureeMin = {
                    HORAIRE: 15 * 60 * 1000,    // 15 min minimum
                    JOURNALIER: 60 * 60 * 1000,  // 1h minimum
                    MENSUEL: 24 * 60 * 60 * 1000 // 24h minimum
                };
                return v > this.dateDebut && 
                       (v - this.dateDebut) >= dureeMin[this.typeBooking];
            },
            message: function(props) {
                return `Durée trop courte pour une réservation ${this.typeBooking.toLowerCase()}`;
            }
        }
    },

    // Type et tarification
    typeBooking: {
        type: String,
        enum: {
            values: ['HORAIRE', 'JOURNALIER', 'MENSUEL'],
            message: 'Type de réservation invalide'
        },
        
        default: 'HORAIRE'
    },
    montantTotal: {
        type: Number,
        default: 0,
        min: [0, 'Le montant ne peut pas être négatif']
    },
    tarifApplique: {
        type: {
            valeur: Number,
            typeTarif: String,
            dateApplication: Date,
            tarifReference: { 
                type: Schema.Types.ObjectId, 
                ref: 'Tarif' 
            }
        }
    },
    historiqueTarifs: [{
        valeur: Number,
        typeTarif: String,
        dateApplication: Date,
        tarifReference: { 
            type: Schema.Types.ObjectId, 
            ref: 'Tarif' 
        },
        raisonChangement: {
            type: String,
            enum: ['AUTO', 'MANUEL', 'PROMOTION', 'AJUSTEMENT']
        }
    }],

    // Statut
    statut: {
        type: String,
        enum: {
            values: ['CONFIRMEE', 'ANNULEE', 'EN_COURS', 'TERMINEE'],
            message: 'Statut invalide'
        },
        default: 'CONFIRMEE'
    },

    // Paiement
    paiement: {
        id: String,
        method: {
            type: String,
            enum: ['CARTE', 'ESPECES', 'PORTEFEUILLE', 'COUPON']
        },
        status: {
            type: String,
            enum: ['EN_ATTENTE', 'PAYE', 'ERREUR', 'REMBOURSE'],
            default: 'EN_ATTENTE'
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});

// Middleware de pré-sauvegarde
bookingSchema.pre('save', async function(next) {
    if (this.isModified('typeBooking') || this.isModified('dateDebut') || 
        this.isModified('dateFin') || this.isNew) {
        
        const place = await mongoose.model('Place')
            .findById(this.place)
            .populate('tarif');
        
        if (!place?.tarif) {
            throw new Error('Tarifs non trouvés pour cette place');
        }

        // Calcul du nouveau tarif
        const nouveauTarif = {
            valeur: this.getTarifByType(place.tarif, this.typeBooking),
            typeTarif: this.typeBooking,
            dateApplication: new Date(),
            tarifReference: place.tarif._id
        };

        // Historique si modification de tarif
        if (this.tarifApplique && this.tarifApplique.valeur !== nouveauTarif.valeur) {
            this.historiqueTarifs.push({
                ...this.tarifApplique.toObject(),
                raisonChangement: this.isNew ? 'CREATION' : 'AUTO'
            });
        }

        // Calcul du montant
        this.tarifApplique = nouveauTarif;
        this.montantTotal = this.calculerMontant();
    }
    next();
});

// Méthodes helpers
bookingSchema.methods.getTarifByType = function(tarifs, type) {
    const mapping = {
        'HORAIRE': tarifs.tarifHoraire,
        'JOURNALIER': tarifs.tarifJournalier, 
        'MENSUEL': tarifs.tarifMensuel
    };
    return mapping[type];
};

bookingSchema.methods.calculerMontant = function() {
    const dureeMs = this.dateFin - this.dateDebut;
    let unite;
    
    switch (this.typeReservation) {
        case 'HORAIRE':
            unite = 1000 * 60 * 60; // 1h en ms
            break;
        case 'JOURNALIER':
            unite = 1000 * 60 * 60 * 24; // 1j en ms
            break;
        case 'MENSUEL':
            unite = 1000 * 60 * 60 * 24 * 30; // ~1mois en ms
            break;
    }

    const quantite = Math.ceil(dureeMs / unite);
    return parseFloat((quantite * this.tarifApplique.valeur).toFixed(2));
};

// Index
bookingSchema.index({ place: 1, dateDebut: 1, dateFin: 1 });
bookingSchema.index({ user: 1, dateDebut: 1 });

module.exports = mongoose.model('Booking', bookingSchema);