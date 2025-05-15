const express = require('express');
const router = express.Router();
const placeController = require('../controllers/placeController');

// CRUD de base
router.post('/', placeController.createPlace);
router.get('/parking/:parkingId', placeController.getPlacesByParking);
router.get('/:id', placeController.getPlaceById);
router.patch('/:id', placeController.updatePlace);
router.delete('/:id', placeController.deletePlace);

// Statistiques
router.get('/stats/:parkingId', placeController.getParkingStats);

module.exports = router;