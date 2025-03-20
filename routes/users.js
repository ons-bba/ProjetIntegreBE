var express = require('express');
var router = express.Router();
const User = require('../model/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});



/* POST création d'utilisateur */
router.post('/', async (req, res, next) => {
  try {
    const { prenom, nom, email, mot_de_passe, telephone } = req.body;

    
    const newUser = new User({
      prenom,
      nom,
      email,
      mot_de_passe, 
      telephone,
      
    });

   
    const savedUser = await newUser.save();

   
    const userResponse = savedUser.toObject();
    delete userResponse.mot_de_passe;

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userResponse
    });

  } catch (error) {
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(error.errors).map(err => err.message)
      });
    }
    
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Cet email est déjà utilisé'
      });
    }

    
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});





module.exports = router;
