
const express = require('express')
const router = express.Router();
const parkingController = require('../controller/parkingController');




router.post('/',parkingController.createParking);




module.exports=router