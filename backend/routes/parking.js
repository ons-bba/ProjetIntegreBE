
const express = require('express')
const router = express.Router();
const parkingController = require('../controller/parkingController');




router.post('/',parkingController.createParking);
router.get('/',parkingController.getAllParkings);
router.get('/:id',parkingController.getParkingById);
router.put('/:id',parkingController.updateParking)
router.delete('/:id',parkingController.deleteParking);
router.post('/upload-json',parkingController.importParkingFromJson);




module.exports=router