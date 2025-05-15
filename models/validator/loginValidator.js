const yup = require('yup');

const loginSchema = yup.object().shape({
  email: yup.string()
    .required("L'email est obligatoire")
    .email('Email invalide')
    .lowercase(),
  
  password: yup.string()
    .required('Le mot de passe est obligatoire')
});

const validateLogin = async (req, res, next) => {
  try {
    await loginSchema.validate(req.body, { abortEarly: false });
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
  loginSchema,
  validateLogin

};