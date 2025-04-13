const express = require('express');
const router = express.Router();
const Prestation = require('../model/prestation');
const prestationController= require('../controller/prestationController');





router.post('/', prestationController.createPrestation);
router.get('/',  prestationController.getAllPrestation);
router.get('/:id', prestationController.getprestationById);
router.put('/:id',prestationController.updatePrestationById );
router.delete('/:id', prestationController.deletePrestation);






module.exports = router


