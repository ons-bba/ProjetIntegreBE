var express = require('express');
var router = express.Router();
const {  validateUserRegistration, validateUserUpdate, validateResetPassword, validateForgotPassword} = require('../models/validator/userValidator');  // Import the middleware
const { registerUser, loginUser, deleteUser, getAllActiveUsers, getAllUsers, getUserById, verifyAccount, getFilteredUsers, suspendUser, updateUser, getUserStatistics,
  resetPassword,
  forgotPassword,
  changeUserImage
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

router.put('/:id', verifyToken,restrictToAdmin ,  suspendUser);

// Add this route
router.put(
    '/:id/update',
    verifyToken,
    // restrictToAdmin,
    upload.single('image'),
    handleUploadErrors,
    validateUserUpdate,  // Use update validator
    updateUser
  );


router.put(
    '/:id/image',
    verifyToken,
    upload.single('image'),
    handleUploadErrors,
    async (req, res, next) => {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized to change this image.' });
      }
      next();
    },
    changeUserImage
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
