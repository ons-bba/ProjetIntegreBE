const express = require('express');
const router = express.Router();
const Prestation = require('../model/prestation');
const prestation = require('../model/prestation');



// create : Ajouter un nouveau service 

router.post('/', async (req, res) => {
    try {
        const prestation = new Prestation(req.body);
        await prestation.save();
        res.status(201).json(prestation)

    } catch (err) {
        res.status(400).json({ error: err.message })
    }
});

// Read : lister tous les services 
router.get('/', async (req, res) => {
    try {
        const prestation = await prestation.fin();
        res.json(prest)

    } catch (err) {
        res.status(500).json({ error: err.message })
    }

});

//Read One : obtenir un prestation par ID

router.get('/:id', async (req, res) => {
    try {
        const prestation = await Prestation.findById(req.params.id);

        if (!prestation) {
            return res.status(404).json({ message: 'prestation non touvée' })
        }
        res.json(prestation)

    } catch (err) {
        res.status(500).json({ error: err.message })

    }
});

router.put('/:id', async (req, res) => {
    try {
        const prestation = await Prestation.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!prestation) {
            return res.status(404).json({ message: 'service non disponible' })
        }
        res.json(prestation)

    } catch (err) {
        res.status(500).json({ message: err.message })

    }
});
//delete :supprimer une prestation 

router.delete('/:id', async (req, res) => {
    try {
        const result = await Prestation.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'service non disponible' })
        }
        res.status(200).json({ message: 'service supprime' })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
});






module.exports = router


