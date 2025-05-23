const express = require('express')
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middlewares/authMiddleware');
const {verifyToken} = require('../middlewares/authMiddleware')




router.post('/',verifyToken,bookingController.createBooking)


module.exports = router