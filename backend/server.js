const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { expressjwt } = require('express-jwt');
const path = require('path');
const Stripe = require('stripe');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const multer = require('multer');

dotenv.config();

const app = express();

// Initialize Stripe with the Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(compression());
app.use(helmet());
app.use(expressjwt({ secret: process.env.JWT_SECRET, algorithms: ['HS256'] }).unless({ 
  path: [
    '/api/auth/register', 
    '/api/auth/login',
    '/api/create-payment-intent',
    '/api/send-email',
    '/',
    '/users',
    '/api/prestations',
    '/api/parking',
    '/api/tarif'
  ] 
}));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const indexRouter = require('./routes/index');
//const usersRouter = require('./routes/users'); 
const prestationRouter = require('./routes/prestation'); 
const parkingRouter = require('./routes/parking'); 
const tarifRouter = require('./routes/tarif'); 

app.use('/', indexRouter);
//app.use('/users', usersRouter); 
app.use('/api/prestations', prestationRouter); 
app.use('/api/parking', parkingRouter); 
app.use('/api/tarif', tarifRouter); 

// Mobility-Core API Routes
const createPaymentIntent = require('./mc-api/create-payment-intent');
const sendEmail = require('./mc-api/send-email');
app.post('/api/create-payment-intent', createPaymentIntent.createPaymentIntent);
app.post('/api/send-email', sendEmail.sendEmail);

// Mobility-Core Routes
const authRoutes = require('./mc-routes/auth');
const bundlesRoutes = require('./mc-routes/bundles');
const couponsRoutes = require('./mc-routes/coupons');
const fuelCreditsRoutes = require('./mc-routes/fuelCredits');
const reservationsRoutes = require('./mc-routes/reservations');
const servicesRoutes = require('./mc-routes/services');
const subscriptionsRoutes = require('./mc-routes/subscriptions');
const usersMCRouter = require('./mc-routes/users'); // Renamed to avoid conflict
const monitoringRoutes = require('./mc-routes/monitoring');

app.use('/api/auth', authRoutes);
app.use('/api/bundles', bundlesRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/fuelCredits', fuelCreditsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/users', usersMCRouter);
app.use('/api/monitoring', monitoringRoutes);

// MongoDB Connection : can be changed to use:  configDb.mongo.uri 
mongoose.connect(process.env.MONGO_URI, { 
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;