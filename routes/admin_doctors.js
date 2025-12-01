const express = require('express');
const router = express.Router();
const adminDoctorsController = require('../controllers/admin_doctors_controller');


router.get('/', adminDoctorsController.list);


router.get('/:id', adminDoctorsController.get);


router.post('/', adminDoctorsController.create);


router.put('/:id', adminDoctorsController.update);

router.delete('/:id', adminDoctorsController.remove);

router.post('/:id/upload', adminDoctorsController.uploadImage);

module.exports = router;
