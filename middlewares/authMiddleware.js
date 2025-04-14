const jwt = require('jsonwebtoken');
const User = require('../model/user');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // 1. Get token from headers
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé - Token manquant'
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Check if user still exists
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide - Utilisateur non trouvé'
      });
    }

    // 4. Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Token expiré - Mot de passe modifié récemment'
      });
    }

    // 5. Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalide',
      error: error.message
    });
  }
};

// Function to check if user is admin (returns boolean)
const isAdmin = (user) => {
  return user.role === 'ADMIN';
};

// Middleware to check admin status
const restrictToAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Droits insuffisants'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  restrictToAdmin
};