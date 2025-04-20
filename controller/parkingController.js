const { default: mongoose } = require('mongoose');
const Parking = require('../model/parking');
const { isValidObjectId } = require('../model/validator/validators');




const parkingController = {
    createParking: async (req, res) => {
        try {
            // Validation des coordonnées
            if (!req.body.localisation || !req.body.localisation.coordinates) {
                return res.status(400).json({ error: "Les coordonnées de localisation sont requises" });
            }
    
            const { longitude, latitude, ...rest } = req.body.localisation.coordinates
                ? {
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
            res.stauts(500).json({ error: err.json })
        }
    },

    updateParking: async (req, res) => {
        try {
            
            const {id}=req.params
            if(! mongoose.Types.ObjectId.isValid(id)){
                return res.status(400).json({message:"ID de parking invalid"})
            }
            if(Object.keys(req.body).length == 0){
                return res.status(400).json({message:"Aucun donnée fournie pour la mise ajour"})
            }
            const update = await Parking.findByIdAndUpdate(id, {$set : req.body}, { new: true, 
                runValidators: true
             });
            
            if (!update) {
                return res.status(404).json({ message: 'service non disponible' })
            }
            return res.status(200).json(update)

        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    },

    deleteParking: async (req, res) => {

        try {
            const deleted = await Parking.findByIdAndDelete(req.params.id);
            if (!deleted) return res.status(404).json({ message: 'Parking non trouvé' });
            res.status(200).json({ message: 'Parking supprimé avec succès' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }



    }
}


module.exports = parkingController