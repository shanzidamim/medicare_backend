const express = require('express');
const router = express.Router();

// FIXED IMPORT ⬇⬇⬇
const shopController = require('../controllers/shop_controller');

const shopFeedback = require('../controllers/shop_feedback_controller');

router.get('/me', shopController.getMyShop);

router.post('/create', shopController.createOrUpdateShop);

router.put('/:id', shopController.updateShop);

router.get('/by_division', shopController.listByDivision);

router.get('/:id', shopController.getShopById);

router.post('/:id/upload', shopController.uploadShopImage);

router.get('/:id/feedback', shopFeedback.listFeedbacks);
router.post('/:id/feedback', shopFeedback.addFeedback);
router.get('/:id/profile', shopController.getShopProfileStats);


module.exports = router;
