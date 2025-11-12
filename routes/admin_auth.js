// routes/admin_auth.js
const r = require('express').Router();
const c = require('../controllers/admin_auth_controller');
r.post('/login', c.login);
module.exports = r;
