
const express = require('express')
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const upload = require('../middlewares/multer')






router.post('/',parkingController.createParking);
router.post('/upload',upload.single("pdfFile"),parkingController.uploadAndProcessParkingPdf)
router.get('/',parkingController.getAllParkings);
router.get('/search',parkingController.rechercheParkingsProches)
router.get('/:id',parkingController.getParkingById);
router.put('/:id',parkingController.updateParking)
router.delete('/:id',parkingController.deleteParking);





module.exports=router