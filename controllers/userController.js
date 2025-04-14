const User = require('../model/user');

exports.registerUser = async (req, res) => {
  try {
    // 1. Check if email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Cet email est déjà utilisé' 
      });
    }

    // 2. Create new user (password will be hashed automatically via pre-save hook)
    const user = new User(req.body);
    await user.save();

    // 3. Generate JWT token
    const token = user.generateAuthToken();

    // 4. Send response (password automatically removed via toJSON transform)
    res.status(201).json({
      success: true,
      user,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    });
  }
};

exports.
loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // 2. Check account status
    if (user.status !== 'ACTIF') {
      return res.status(403).json({
        success: false,
        message: `Votre compte est ${user.status.toLowerCase()}. Contactez l'administrateur.`
      });
    }

    // 3. Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // 4. Generate JWT token
    const token = user.generateAuthToken();

    // 5. Send response (excluding sensitive data)
    const userData = user.toObject();
    delete userData.mot_de_passe;
    delete userData.__v;

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

exports.getAllActiveUsers = async (req, res) => {
  try {
    // Active users filter
    const filter = { 
      status: 'ACTIF',
      role: { $ne: 'ADMIN' } // Exclude admins if needed
    };

    // Get all active users sorted by first name
    const users = await User.find(filter)
      .select('-mot_de_passe -__v')
      .sort({ prenom: 1 }) // 1 = ascending order
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs actifs'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Get all users sorted by first name
    const users = await User.find()
      .select('-mot_de_passe -__v')
      .sort({ prenom: 1 }) // 1 = ascending order
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de tous les utilisateurs'
    });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user; // From verifyToken middleware

    // 1. Check if target user exists
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // 2. Authorization check
    const isOwner = currentUser._id.toString() === id;
    const isAdmin = currentUser.role === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé - Vous ne pouvez pas supprimer ce compte'
      });
    }

    // 3. Soft delete (update status)
    const deletedUser = await User.findByIdAndUpdate(
      id,
      { status: 'SUPPRIMER' },
      { new: true }
    ).select('-mot_de_passe -__v');

    res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès',
      user: deletedUser
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user; // From verifyToken middleware

    // Find user by ID
    const user = await User.findById(id)
      .select('-mot_de_passe -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Special case for admin users
    if (user.role === 'ADMIN') {
      // Check if requester is admin
      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé aux administrateurs'
        });
      }
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};