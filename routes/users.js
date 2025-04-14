var express = require('express');
var router = express.Router();
const User = require('../model/user');
const { validateUser } = require('../model/validator/userValidator');  // Import the middleware
const { registerUser, loginUser, deleteUser, getAllActiveUsers, getAllUsers, getUserById } = require('../controllers/userController');
const { validateLogin } = require('../model/validator/loginValidator');
const { verifyToken, restrictToAdmin } = require('../middlewares/authMiddleware');


router.get('/', verifyToken, restrictToAdmin, getAllActiveUsers);

router.get('/active', verifyToken, getAllUsers);



router.post('/register', validateUser, registerUser);  


router.post('/login', validateLogin, loginUser);

router.get('/:id', verifyToken, getUserById);

router.delete('/:id', verifyToken, deleteUser);

module.exports = router;