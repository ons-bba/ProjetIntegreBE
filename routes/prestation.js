const express = require('express');
const router = express.Router();
const Prestation = require('../models/prestation');
const prestationController= require('../controllers/prestationController');





router.post('/', prestationController.createPrestation);
router.get('/',  prestationController.getAllPrestation);
router.get('/:id', prestationController.getprestationById);
router.put('/:id',prestationController.updatePrestationById );
router.delete('/:id', prestationController.deletePrestation);






module.exports = router


