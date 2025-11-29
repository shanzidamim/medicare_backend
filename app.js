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

// =========================================
//  FIXED: Only ONE server + ONE socket.io
// =========================================
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

// Global socket store
global.userSockets = {};

const serverPort = 3002;

// =========================================
// MIDDLEWARE
// =========================================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// =========================================
// STATIC FILES
// =========================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/doctor_images', express.static(path.join(__dirname, 'public', 'doctor_images')));
app.use('/category_images', express.static(path.join(__dirname, 'public', 'category_images')));
app.use('/shop_images', express.static(path.join(__dirname, 'public', 'shop_images')));
app.use('/chat', express.static(path.join(__dirname, 'public', 'chat')));


console.log("📁 Serving doctor images:", path.join(__dirname, "public/doctor_images"));

// =========================================
// ROUTES
// =========================================
const adminAuth = require('./routes/admin_auth');
const shopRoutes = require('./routes/shopRoutes');
const adminDoctors = require('./routes/admin_doctors');
const adminShops = require('./routes/admin_shops');
const adminUsers = require('./routes/admin_users');
const adminAppointments = require('./routes/admin_appointments');
const doctorRoutes = require('./routes/doctorRoutes');

app.use("/api/admin", adminAuth);

app.use('/api/admin/doctors', adminDoctors);
app.use('/api/admin/shops', adminShops);
app.use('/api/admin/users', adminUsers);
app.use('/api/admin/appointments', adminAppointments);

app.use('/api/shops', shopRoutes);
app.use('/api/doctors', doctorRoutes);

app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/recent_chats", require("./routes/chat_list_routes"));

app.use('/api/users', usersRouter);

app.use('/api/appointments', require('./routes/appointmentRoutes'));

app.use('/', indexRouter);

// =========================================
// SOCKET CONTROLLERS AUTO-LOAD
// =========================================
fs.readdirSync('./controllers').forEach((file) => {
  if (file.endsWith('.js')) {
    const route = require('./controllers/' + file);
    if (typeof route.controller === 'function') {
      route.controller(app, io, global.userSockets);
    }
  }
});

// =========================================
// ERROR HANDLER
// =========================================
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// =========================================
// START SERVER
// =========================================
server.listen(serverPort, () => {
  console.log("🚀 Server running on port:", serverPort);
});

// UTIL FUNCTIONS
Array.prototype.swap = function (x, y) { var b = this[x]; this[x] = this[y]; this[y] = b; return this; };
Array.prototype.insert = function (index, item) { this.splice(index, 0, item); };
Array.prototype.replace_null = function (replace = '""') { return JSON.parse(JSON.stringify(this).replace(/null/g, replace)); };
String.prototype.replaceAll = function (search, replacement) { return this.replace(new RegExp(search, 'g'), replacement); };

module.exports = app;
