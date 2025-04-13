const Prestation = require('../model/prestation')

const prestationController = {

    createPrestation: async function (req, res) {
        try {
            const prestation = new Prestation(req.body);
            await prestation.save();
            res.status(201).json(prestation)

        } catch (err) {
            res.status(400).json({ error: err.message })
        }


    },

    getAllPrestation: async function (req, res) {
        try {
            const prestation = await Prestation.find();
            res.json(prestation)

        } catch (err) {
            res.status(500).json({ error: err.message })
        }

    },

    getprestationById: async function (req, res) {
        try {
            const prestation = await Prestation.findById(req.params.id);

            if (!prestation) {
                return res.status(404).json({ message: 'prestation non touvée' })
            }
            res.json(prestation)

        } catch (err) {
            res.status(500).json({ error: err.message })

        }
    },

    updatePrestationById: async function () {
        try {
            const prestation = await Prestation.findByIdAndUpdate(req.params.id, req.body, { new: true })
            if (!prestation) {
                return res.status(404).json({ message: 'service non disponible' })
            }
            res.json(prestation)

        } catch (err) {
            res.status(500).json({ message: err.message })

        }
    },

    deletePrestation: async function (req, res) {
        try {
            const result = await Prestation.findByIdAndDelete(req.params.id);
            if (!result) {
                return res.status(404).json({ message: 'service non disponible' })
            }
            res.status(200).json({ message: 'service supprime' })

        } catch (err) {
            res.status(500).json({ error: err.message })
        }


    }


}







module.exports = prestationController