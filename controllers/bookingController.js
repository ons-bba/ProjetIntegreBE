const Booking = require('../models/booking');
const Place = require('../models/place');
const Parking = require('../models/parking');
const User = require('../models/user');

exports.createBooking = async (req, res) => {
    try {
        const {
            userId,
            parkingId,
            placeId,
            dateDebut,
            dateFin,
            typeReservation
        } = req.body;

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        // Vérifier que le parking existe
        const parking = await Parking.findById(parkingId);
        if (!parking) {
            return res.status(404).json({ message: 'Parking introuvable' });
        }

        // Vérifier que la place existe et appartient bien au parking
        const place = await Place.findOne({ _id: placeId, parking: parkingId }).populate('tarifs');
        if (!place) {
            return res.status(404).json({ message: 'Place introuvable ou n\'appartient pas au parking' });
        }

        // Créer la réservation (le calcul du montant et du tarif se fait dans le pré-save du modèle)
        const booking = new Booking({
            user: userId,
            parking: parkingId,
            place: placeId,
            dateDebut: new Date(dateDebut),
            dateFin: new Date(dateFin),
            typeReservation
        });

        await booking.save();

        res.status(201).json({ message: 'Réservation créée avec succès', booking });
    } catch (error) {
        console.error('Erreur lors de la création de la réservation :', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
