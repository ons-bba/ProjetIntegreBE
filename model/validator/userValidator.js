const yup = require('yup');

const userSchemaYup = yup.object().shape({
  nom: yup.string()
    .required('Le nom est obligatoire')
    .trim()
    .max(100),
  
  prenom: yup.string()
    .required('Le prénom est obligatoire')
    .trim()
    .max(100),

  email: yup.string()
    .required("L'email est obligatoire")
    .email('Email invalide')
    .lowercase(),

  mot_de_passe: yup.string()
    .required('Le mot de passe est obligatoire')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Doit contenir au moins une majuscule, un chiffre et un caractère spécial'
    ),

  telephone: yup.string()
    .matches(
      /^\+?[0-9]{10,15}$/,
      'Numéro de téléphone invalide (format: +XXXXXXXXXXX)'
    )
    .nullable(),

  role: yup.string()
    .oneOf(['CONDUCTEUR', 'OPERATEUR', 'ADMIN'], 'Rôle invalide')
    .default('CONDUCTEUR'), 
  sex : yup.string().oneOf(["HOMME" , "FEMME"])
    ,

  preferences: yup.mixed().default({}),

  points_fidelite: yup.number()
    .min(0)
    .default(0),

  status: yup.string()
    .oneOf(['ACTIF', 'PENDING','SUSPENDU', 'BLOQUE', 'SUPPRIMER'], 'Statut invalide')
    .default('ACTIF')
});

// Add this middleware function
const validateUser = async (req, res, next) => {
  try {
    await userSchemaYup.validate(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.inner.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
};

module.exports = {
  userSchemaYup,
  validateUser
};