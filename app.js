var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// prestation 
const prestationRouter = require('./routes/prestation');
const parkingRouter = require('./routes/parking');
const tarifRouter = require('./routes/tarif');
const placeRouter= require('./routes/place');
const reservationRouter = require('./routes/booking')

const mongoose = require("mongoose");
const configDb = require("./config/db.json");


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const multer = require('multer');

var app = express();
require('dotenv').config();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ dest: 'uploads/' }); // files will be stored in /uploads

app.use('/', indexRouter);
app.use('/users', usersRouter);

// prestation & parking endPoint
app.use('/api/prestations',prestationRouter);
app.use('/api/parking',parkingRouter);
app.use('/api/tarif',tarifRouter)
app.use('/api/place',placeRouter);
// reservation 




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


mongoose.connect(configDb.mongo.uri)

module.exports = app;
