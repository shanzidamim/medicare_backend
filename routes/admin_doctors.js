const express = require('express');
const router = express.Router();
const adminDoctorsController = require('../controllers/admin_doctors_controller');

// ✅ Get all doctors
router.get('/', adminDoctorsController.list);

// ✅ Get single doctor
router.get('/:id', adminDoctorsController.get);

// ✅ Create new doctor
router.post('/', adminDoctorsController.create);

// ✅ Update doctor
router.put('/:id', adminDoctorsController.update);

// ✅ Delete (soft delete)
router.delete('/:id', adminDoctorsController.remove);

// ✅ Upload image (important!)
router.post('/:id/upload', adminDoctorsController.uploadImage);

module.exports = router;
