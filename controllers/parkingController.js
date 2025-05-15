const { default: mongoose } = require('mongoose');
const Parking = require('../models/parking');
const Tarif = require('../models/tarif');
const Place = require('../models/place')
const { isValidObjectId } = require('../models/validator/validators');




const parkingController = {
  createParking: async (req, res) => {
    try {
      // Validation des coordonnées
      if (!req.body.localisation || !req.body.localisation.coordinates) {
        return res.status(400).json({ error: "Les coordonnées de localisation sont requises" });
      }

      const { longitude, latitude, ...rest } = req.body.localisation.coordinates ?
        {
          longitude: req.body.localisation.coordinates[0],
          latitude: req.body.localisation.coordinates[1],
          ...req.body
        }
        : req.body;

      const parkingData = {
        ...rest,
        localisation: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      };

      const parking = new Parking(parkingData);
      await parking.save();
      res.status(201).json(parking);

    } catch (err) {
      res.status(500).json({ error: err.message })

    }

  },
  getAllParkings: async (req, res) => {
    try {
      const parkings = await Parking.find().populate('prestations');
      if (!parkings) {
        return res.status(404).json({ message: 'service non disponible' })
      }
      res.json(parkings)

    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  getParkingById: async (req, res) => {

    try {
      const parking = await Parking.findById(req.params.id)
      if (!parking) {
        return res.status(404).json({ message: 'service non disponible' })
      }
      res.status(200).json(parking)

    } catch (err) {
      res.status(500).json({ error: err.json })
    }
  },

  updateParking: async (req, res) => {
    try {

      const { id } = req.params
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID de parking invalid" })
      }
      if (Object.keys(req.body).length == 0) {
        return res.status(400).json({ message: "Aucun donnée fournie pour la mise ajour" })
      }
      const update = await Parking.findByIdAndUpdate(id, { $set: req.body }, {
        new: true,
        runValidators: true
      });

      if (!update) {
        return res.status(404).json({ message: 'service non disponible' })
      }
      return res.status(200).json(update)

    } catch (err) {

      if (err.name === "ValidatorError") {
        return res.status(400).json({
          success: false,
          message: "Erreur de validation",
          error: "err.message"
        })
      };
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise a jour de parking",
        error: err.message
      })
    }
  },

  deleteParking: async (req, res) => {

    const { id } = req.params

    try {

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("id n'est pas un objectId")
      }
      const deleted = await Parking.findByIdAndDelete(id);

      if (!deleted) {

        throw new Error("Erreur serveur")
      }
      res.status(200).json({ message: 'Parking supprimé avec succès' });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise a jour de parking",
        error: err.message
      });
    }



  },
  rechercheParkingsProches: async (req, res) => {

    try {


      const { longitude, latitude } = req.query;
      //const userId = req.user.id
      

      // Validation
      if (!longitude || !latitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: 'Coordonnées GPS invalides' });
      };
      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude)

      // 1. Rechercher des parking dans un rayon de 2000 m 
      const parkings = await Parking.find({
        localisation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 10000
          },
         
        },
        statut: "OUVERT",
        placesDisponible: { $gt: 0 }
      })
        .populate('prestations')
       .lean();
      // Recupere tarifs et places Disponible 

     

      const parkingAvecDetails = await Promise.all(
        parkings.map(async (parking) => {
          // .trouver les tarif actifs groupés par type
          const tarifs = await Tarif.aggregate([
            {
              $match: {
                parking: parking._id,
                dateDebut: { $lte: new Date() },
                $or: [{ dateFin: null }, { dateFin: { $gt: new Date() } }]
              }
            },
            {
              $group: {
                _id: "$type",
                tarifHoraire: { $first: "$tarifHoraire" },
                tarifJournalier: { $first: "$tarifJournalier" },
                tarifMensuelle: { $first: "$tarifMensuelle" }
              }
            }
          ]);

          console.log("tarifs "+tarifs)
          // compter les places places  disponible par type 

          const places = await Place.aggregate([
            {
              $match: {
                parking: parking._id,
                statut: "libre"
              }
            },
            {
              $group: {
                _id: "$type",
                count: { $sum: 1 }
              }
            }

          ]);

          // Formater les données pour la reponse 
          const tarifsParType = {};
          tarifs.forEach(t => {
            tarifsParType[t._id] = {
              horaire: t.tarifHoraire,
              journalier: t.tarifJournalier,
              mensuelle: t.tarifMensuelle
            }
          });
          const placesParType = {};
          places.forEach(p => {
            placesParType[p._id] = p.count
          });
          return {
            ...parking,
            tarifs: tarifsParType,
            places: placesParType
          };

        })
      );

      res.status(200).json(parkingAvecDetails)



    } catch (error) {
      
      res.status(500).json({ message: 'Erreur serveur', error: error.message });

    }

  },
  // Fonction de validation des coordonnées (à mettre dans vos utils)
  isValidCoordinates: (coords) => {
    return (
      Array.isArray(coords) &&
      coords.length === 2 &&
      !isNaN(coords[0]) &&
      !isNaN(coords[1]) &&
      coords[0] >= -180 && coords[0] <= 180 &&
      coords[1] >= -90 && coords[1] <= 90
    );
  }
}


module.exports = parkingController