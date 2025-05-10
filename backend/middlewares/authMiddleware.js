const jwt = require('jsonwebtoken');
const User = require('../model/user');

const verifyToken = async (req, res, next) => {
  try {

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé - Token manquant'
      });
    }

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide - Utilisateur non trouvé'
      });
    }

    
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Token expiré - Mot de passe modifié récemment'
      });
    }

    
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


const isAdmin = (user) => {
  return user.role === 'ADMIN';
};


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