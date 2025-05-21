var express = require('express');
var router = express.Router();
const {  validateUserRegistration, validateUserUpdate, validateResetPassword, validateForgotPassword} = require('../models/validator/userValidator');  // Import the middleware
const { registerUser, loginUser, deleteUser, getAllActiveUsers, getAllUsers, getUserById, verifyAccount, getFilteredUsers, suspendUser, updateUser, getUserStatistics,
  resetPassword,
  forgotPassword
} = require('../controllers/userController');
const { validateLogin } = require('../models/validator/loginValidator');
const { verifyToken, restrictToAdmin } = require('../middlewares/authMiddleware');
const { handleUploadErrors, upload } = require('../tools/uploads');


router.get(
    '/statistics',
    verifyToken,
    restrictToAdmin,
    getUserStatistics
  );

router.get('/', verifyToken, restrictToAdmin, getAllActiveUsers);
router.get('/active', verifyToken, restrictToAdmin ,  getAllUsers);
router.get('/filtered', verifyToken, restrictToAdmin , getFilteredUsers);

router.get('/verifyaccount/:token', verifyAccount);
router.get('/:id', verifyToken, getUserById);



router.post(
    '/register',
    upload.single('image'),
    handleUploadErrors,
    validateUserRegistration,  // Use registration validator
    registerUser
  );


router.post('/login', validateLogin, loginUser);


// router.delete('/:id', verifyToken, deleteUser);

router.put('/:id', verifyToken, suspendUser);

// Add this route
router.put(
    '/:id/update',
    verifyToken,
    restrictToAdmin,
    upload.single('image'),
    handleUploadErrors,
    validateUserUpdate,  // Use update validator
    updateUser
  );
router.post(
    '/forgot-password',
    validateForgotPassword,
    forgotPassword
);

router.post(
    '/reset-password',
    validateResetPassword,
    resetPassword
);
module.exports = router;
