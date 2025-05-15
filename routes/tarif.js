const express = require('express');
const route = express.Router();
 const tarifController = require ('../controllers/tarifController');




route.post('/',tarifController.createTarif);
route.get('/',tarifController.getAlltarifs);
route.get('/:id',tarifController.getTarif);
route.put('/:id',tarifController.updateTarif);
route.delete('/:id',tarifController.deleteTarif);
route.get('parking/:parkingId/active',tarifController.getActiveTarifsForParking);


module.exports = route