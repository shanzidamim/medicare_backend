var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:4200/",
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

var serverPort = 3002;
var user_socket_connect_list = [];

// ==================== MIDDLEWARE SETUP ====================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:4200" }));

// ==================== STATIC FILES ====================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/doctor_images', express.static(path.join(__dirname, 'public', 'doctor_images')));
app.use('/category_images', express.static(path.join(__dirname, 'public', 'category_images')));
app.use('/shop_images', express.static(path.join(__dirname, 'public', 'shop_images')));

// Debug log
console.log("📁 Serving doctor images from:", path.join(__dirname, 'public', 'doctor_images'));

// ==================== ROUTES ====================

// ✅ Remove this line (it’s wrong)
// app.use('/api/admin', require('./routes/admin_doctors'));

const adminAuth = require('./routes/admin_auth');
app.use('/api/admin', adminAuth);

const shopRoutes = require('./routes/shopRoutes');
const adminDoctors = require('./routes/admin_doctors');
const adminShops = require('./routes/admin_shops');
const adminUsers = require('./routes/admin_users');
const adminAppointments = require('./routes/admin_appointments');
const doctorRoutes = require('./routes/doctorRoutes');

// Admin routes
app.use('/api/admin/doctors', adminDoctors);
app.use('/api/admin/shops', adminShops);
app.use('/api/admin/users', adminUsers);
app.use('/api/admin/appointments', adminAppointments);

// Public routes
app.use('/api/shops', shopRoutes);  
app.use('/api/doctors', doctorRoutes);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/appointments', require('./routes/appointmentRoutes'));


// ==================== CONTROLLER AUTO-LOAD ====================

fs.readdirSync('./controllers').forEach((file) => {
  if (file.endsWith('.js')) {
    const route = require('./controllers/' + file);
    if (typeof route.controller === 'function') {
      route.controller(app, io, user_socket_connect_list);
    }
  }
});
// ==================== ERROR HANDLING ====================
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// ==================== SERVER START ====================
server.listen(serverPort, () => {
  console.log('Server Start : ' + serverPort);
 
});

// ==================== UTILITIES ====================
Array.prototype.swap = function (x, y) {
  var b = this[x];
  this[x] = this[y];
  this[y] = b;
  return this;
};

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

Array.prototype.replace_null = function (replace = '""') {
  return JSON.parse(JSON.stringify(this).replace(/null/g, replace));
};

String.prototype.replaceAll = function (search, replacement) {
  return this.replace(new RegExp(search, 'g'), replacement);
};

module.exports = app;
