const r = require('express').Router();
const c = require('../controllers/admin_users_controller');

r.get('/', c.listUsers);
r.delete('/:id', c.deleteUser);

module.exports = r;
