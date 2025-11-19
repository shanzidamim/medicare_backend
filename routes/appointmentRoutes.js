// routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment_controller');

router.post('/book', appointmentController.bookAppointment);
router.get('/user/:user_id', appointmentController.getUserAppointments);
router.get('/doctor/:doctor_id', appointmentController.getDoctorAppointments);
router.put('/:id/status',  appointmentController.updateStatus);

module.exports = router;
