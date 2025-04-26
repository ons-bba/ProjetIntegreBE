const yup = require('yup');

// Base validation middleware
const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate({
      body: req.body,
      file: req.file
    }, { abortEarly: false });
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      errors: err.inner.map(e => ({
        field: e.path.split('.')[1], // Extracts 'body.nom' → 'nom'
        message: e.message
      }))
    });
  }
};

// Registration Schema
const userRegistrationSchema = yup.object().shape({
  body: yup.object().shape({
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
      .matches(/^\+?[0-9]{10,15}$/, 'Numéro de téléphone invalide (format: +XXXXXXXXXXX)')
      .nullable(),

    role: yup.string()
      .oneOf(['CONDUCTEUR', 'OPERATEUR', 'ADMIN'], 'Rôle invalide')
      .default('CONDUCTEUR'),

    sex: yup.string()
      .oneOf(["HOMME", "FEMME"], 'Sexe invalide')
      .required()
  })
});

// Update Schema (All fields optional)
const userUpdateSchema = yup.object().shape({
  body: yup.object().shape({
    nom: yup.string()
      .trim()
      .max(100)
      .optional(),
    
    prenom: yup.string()
      .trim()
      .max(100)
      .optional(),

    email: yup.string()
      .email('Email invalide')
      .lowercase()
      .optional(),

    telephone: yup.string()
      .matches(/^\+?[0-9]{10,15}$/, 'Numéro de téléphone invalide (format: +XXXXXXXXXXX)')
      .nullable()
      .optional(),

    role: yup.string()
      .oneOf(['CONDUCTEUR', 'OPERATEUR', 'ADMIN'], 'Rôle invalide')
      .optional(),

    sex: yup.string()
      .oneOf(["HOMME", "FEMME"], 'Sexe invalide')
      .optional()
  })
});

module.exports = {
  validateUserRegistration: validate(userRegistrationSchema),
  validateUserUpdate: validate(userUpdateSchema)
};