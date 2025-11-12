const r = require('express').Router();
const c = require('../controllers/admin_appointments_controller');

r.get('/', c.listAppointments);
r.delete('/:id', c.deleteAppointment);

module.exports = r;
