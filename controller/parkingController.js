const Parking = require('../model/parking')




const parkingController = {
    createParking: async (req, res) => {
        try {
            const { longitude, latitude, ...rest } = req.body
            const parkingData = {
                ...rest,
                localisation: {
                    type: 'Point',
                    coordinates: [req.body.longitude, req.body.latitude]
                }
            }
            const parking = new Parking(parkingData)
            await parking.save();
            res.status(201).json(parking)

        } catch (err) {
            res.status(500).json({ error: err.message })

        }

    },
    getAllParkings: async (req, res) => {
        try {
            const parkings = await Parking.find().populate('prestations').populate('tarifParking');
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
            const update = await Parking.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!update) {
                res.status(404).json({ message: 'service non disponible' })
            }
            res.status(200).json(update)

        } catch (err) {
            res.status(500).json({ error: err.json })
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