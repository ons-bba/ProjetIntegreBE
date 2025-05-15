const Parking = require('../models/parking');
const Place = require('../models/place');
const Reservation = require('../models/booking');


//const { sendConfirmationEmail } = require('../services/emailService');

const reservationGestionController ={ 

    createBooking : async (req, res) => {
  try {
    const { placeId, dateDebut, dateFin, userId } = req.body;

    // 1. Vérifier la disponibilité
    const isAvailable = await Reservation.checkDisponibilite(placeId, dateDebut, dateFin);
    if (!isAvailable) {
      return res.status(400).json({ message: "La place n'est pas disponible pour cette période" });
    }

    // 2. Vérifier que la place existe avec son tarif
    const place = await Place.findById(placeId).populate('tarif');
    if (!place || !place.tarif) {
      return res.status(404).json({ message: "Place ou tarif introuvable" });
    }

    // 3. Créer la réservation (le middleware pré-save calculera le montant)
    const reservation = new Reservation({
      user: userId,
      place: placeId,
      dateDebut,
      dateFin,
      statut: 'CONFIRMEE'
    });

    await reservation.save();

    // 4. Mettre à jour le statut de la place
    place.statut = 'réservée';
    await place.save();

    // 5. Envoyer une confirmation (optionnel)
    const user = await User.findById(userId);
    await sendConfirmationEmail(user.email, reservation);

    res.status(201).json(reservation);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

getUserReservations : async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.params.userId })
      .populate('place')
      .populate('place.tarif');
    
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

cancelReservation : async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ message: "Réservation introuvable" });
    }

    // Vérifier que l'utilisateur peut annuler
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    // Annulation possible seulement si la réservation n'a pas commencé
    if (reservation.dateDebut < new Date()) {
      return res.status(400).json({ message: "Impossible d'annuler une réservation en cours" });
    }

    reservation.statut = 'ANNULEE';
    await reservation.save();

    // Libérer la place
    await Place.updateOne(
      { _id: reservation.place },
      { $set: { statut: 'libre' } }
    );

    res.json({ message: "Réservation annulée" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Pour les administrateurs
getAllReservations : async (req, res) => {
  try {
    const { parkingId, date } = req.query;
    let query = {};

    if (parkingId) {
      const places = await Place.find({ parking: parkingId }).select('_id');
      query.place = { $in: places.map(p => p._id) };
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.dateDebut = { $gte: startDate, $lt: endDate };
    }

    const reservations = await Reservation.find(query)
      .populate({
        path: 'place',
        populate: { path: 'parking' }
      })
      .populate('user');

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
}
module.exports = reservationGestionController;