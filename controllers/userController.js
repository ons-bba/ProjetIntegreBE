const User = require('../models/user');
const sendEmail = require('../tools/emailService');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    // 1. Check for existing user
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      // If user exists but has PENDING status, consider resending verification email
      return res.status(409).json({ 
        success: false,
        message: 'Cet email est déjà utilisé' 
      });
    }

    // 2. Handle image upload
    let imagePath = '/uploads/users/default-user.jpg';
    if (req.file) {
      imagePath = `/uploads/users/${req.file.filename}`;
    }

    // 3. Create new user with sanitized data
    const userData = {
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email.toLowerCase(),
      mot_de_passe: req.body.mot_de_passe,
      telephone: req.body.telephone,
      role: req.body.role || 'CONDUCTEUR',
      sex: req.body.sex || 'HOMME',
      image: imagePath
    };

    const user = new User(userData);
    await user.save();

    // 4. Generate verification token
    const verificationToken = user.generateVerificationToken();
    const verificationUrl = `http://localhost:3000/users/verifyaccount/${verificationToken}`;

    // 5. Send verification email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">Bienvenue sur Parking Esprit Business!</h2>
        <img src="${user.image}" alt="Profile" style="width: 100px; border-radius: 50%; margin-bottom: 20px;">
        <p>Bonjour ${user.prenom},</p>
        <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour activer votre compte :</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
           Activer mon compte
        </a>
        <p style="margin-top: 20px; color: #666;">
          Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
        </p>
      </div>
    `;

    // 6. Send email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Activez votre compte Parking Esprit Business',
      html: htmlContent,
      text: `Veuillez utiliser ce lien pour activer votre compte: ${verificationUrl}`
    });

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      // Consider cleaning up user if email fails
    }

    // 7. Prepare response
    const userResponse = user.toObject();
    delete userResponse.mot_de_passe;
    delete userResponse.__v;
    delete userResponse.historique_stationnement;

    res.status(201).json({
      success: true,
      user: userResponse,
      verificationLink: verificationUrl,
      message: 'Inscription réussie. Un lien de vérification a été envoyé à votre adresse email.'
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Cleanup uploaded file if registration fails
    if (req.file) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('File cleanup failed:', unlinkError);
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    });
  }
};

exports.loginUser = async (req, res) => {
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
    if (user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        message: 'Veuillez vérifier votre email pour activer votre compte avant de vous connecter.'
      });
    }

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

    // 5. Prepare user data for response
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
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Données de connexion invalides'
      });
    }

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



// Add this to your userController.js
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Prepare update data
    const updateData = {
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email?.toLowerCase(),
      telephone: req.body.telephone,
      role: req.body.role,
      sex: req.body.sex
    };

    // Handle image upload
    if (req.file) {
      updateData.image = `/uploads/users/${req.file.filename}`;
    }

    // Check email uniqueness
    if (updateData.email && updateData.email !== userToUpdate.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).select('-mot_de_passe -__v');

    res.status(200).json({
      success: true,
      message: 'Profil utilisateur mis à jour avec succès',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Handle cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};





exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userToSuspend = await User.findById(id);
    if (!userToSuspend) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Update status to suspended
    const suspendedUser = await User.findByIdAndUpdate(
      id,
      { status: 'ARCHIVE' },
      { new: true }
    ).select('-mot_de_passe -__v');

    res.status(200).json({
      success: true,
      message: 'Compte suspendu avec succès',
      user: suspendedUser
    });

  } catch (error) {
    console.error('Erreur de suspension:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suspension du compte'
    });
  }
};



// exports.deleteUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const currentUser = req.user; 

    
//     const userToDelete = await User.findById(id);
//     if (!userToDelete) {
//       return res.status(404).json({
//         success: false,
//         message: 'Utilisateur non trouvé'
//       });
//     }

    
//     const isOwner = currentUser._id.toString() === id;
//     const isAdmin = currentUser.role === 'ADMIN';
    
//     if (!isOwner && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: 'Non autorisé - Vous ne pouvez pas supprimer ce compte'
//       });
//     }

    
//     const deletedUser = await User.findByIdAndUpdate(
//       id,
//       { status: 'SUPPRIMER' },
//       { new: true }
//     ).select('-mot_de_passe -__v');

//     res.status(200).json({
//       success: true,
//       message: 'Compte supprimé avec succès',
//       user: deletedUser
//     });

//   } catch (error) {
//     console.error('Delete error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur lors de la suppression'
//     });
//   }
// };


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


exports.verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.purpose || decoded.purpose !== 'email_verification') {
      return res.status(400).json({ 
        success: false, 
        message: 'Lien de vérification invalide' 
      });
    }

    // Find user
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Check if already verified
    if (user.status === 'ACTIF') {
      return res.status(400).json({ 
        success: false, 
        message: 'Le compte est déjà activé' 
      });
    }

    // Activate account
    user.status = 'ACTIF';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Compte activé avec succès! Vous pouvez maintenant vous connecter.'
    });

  } catch (error) {
    console.error('Verification error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Le lien de vérification a expiré' 
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Lien de vérification invalide' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification du compte' 
    });
  }
};




// Advanced filtering endpoint
exports.getFilteredUsers = async (req, res) => {
  try {
    // 1. Build filter object
    const filter = {};
    
    // 2. Supported filters
    const { 
      status, 
      role, 
      email, 
      dateAfter, 
      minPoints,
      sex
    } = req.query;

    if (status) filter.status = { $in: status.split(',') };
    if (role) filter.role = { $in: role.split(',') };
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (dateAfter) filter.date_inscription = { $gte: new Date(dateAfter) };
    if (minPoints) filter.points_fidelite = { $gte: Number(minPoints) };
    if (sex) filter.sex = sex;

    // 3. Build query
    const query = User.find(filter)
      .select('-mot_de_passe -__v -historique_stationnement')
      .sort({ date_inscription: -1 });

    // 4. Execute query
    const users = await query.lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error('Filter users error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid filter parameters'
    });
  }
};


// In userController.js
exports.getUserStatistics = async (req, res) => {
  try {
    const stats = await Promise.all([
      // Basic counts
      User.aggregate([
        {
          $facet: {
            totalUsers: [{ $count: "count" }],
            roleDistribution: [
              { $group: { _id: "$role", count: { $sum: 1 } } }
            ],
            statusDistribution: [
              { $group: { _id: "$status", count: { $sum: 1 } } }
            ],
            genderDistribution: [
              { $group: { _id: "$sex", count: { $sum: 1 } } }
            ]
          }
        }
      ]),

      // Registration trends (last 12 months)
      User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$date_inscription" },
              month: { $month: "$date_inscription" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 }
      ]),

      // Loyalty points analysis
      User.aggregate([
        {
          $group: {
            _id: null,
            avgPoints: { $avg: "$points_fidelite" },
            maxPoints: { $max: "$points_fidelite" },
            minPoints: { $min: "$points_fidelite" }
          }
        }
      ]),

      // Phone number presence
      User.aggregate([
        {
          $facet: {
            withPhone: [
              { $match: { telephone: { $exists: true, $ne: null } } },
              { $count: "count" }
            ],
            withoutPhone: [
              { $match: { telephone: { $exists: false } } },
              { $count: "count" }
            ]
          }
        }
      ]),

      // Image usage
      User.aggregate([
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$image", "default-user.jpg"] },
                "default",
                "custom"
              ]
            },
            count: { $sum: 1 }
          }
        }
      ]),

      // Recent activity (users with parking history in last 30 days)
      User.aggregate([
        { $unwind: "$historique_stationnement" },
        { 
          $match: { 
            "historique_stationnement.date": { 
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
            } 
          } 
        },
        { $group: { _id: "$_id" } },
        { $count: "activeUsers" }
      ]),

      // Top loyal users
      User.find()
        .sort({ points_fidelite: -1 })
        .limit(10)
        .select('prenom nom points_fidelite image')
        .lean()
    ]);

    // Process all statistics
    const result = {
      totalUsers: stats[0][0].totalUsers[0]?.count || 0,
      roleDistribution: processDistribution(stats[0][0].roleDistribution),
      statusDistribution: processDistribution(stats[0][0].statusDistribution),
      genderDistribution: processDistribution(stats[0][0].genderDistribution),
      registrationTrends: stats[1].map(item => ({
        year: item._id.year,
        month: item._id.month,
        count: item.count
      })),
      loyaltyPoints: {
        average: stats[2][0]?.avgPoints || 0,
        maximum: stats[2][0]?.maxPoints || 0,
        minimum: stats[2][0]?.minPoints || 0,
        aboveAverageCount: await User.countDocuments({ 
          points_fidelite: { $gt: stats[2][0]?.avgPoints || 0 } 
        })
      },
      phoneUsage: {
        withPhone: stats[3][0].withPhone[0]?.count || 0,
        withoutPhone: stats[3][0].withoutPhone[0]?.count || 0
      },
      imageUsage: processDistribution(stats[4]),
      recentActivity: stats[5][0]?.activeUsers || 0,
      topLoyalUsers: stats[6]
    };

    res.status(200).json({
      success: true,
      statistics: result
    });

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// Helper function to format distribution data
const processDistribution = (data) => {
  return data.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});
};