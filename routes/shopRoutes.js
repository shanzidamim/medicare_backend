const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

const shopFeedback = require('../controllers/shop_feedback_controller');

router.get('/me', shopController.getMyShop);

router.post('/create', shopController.createOrUpdateShop);

router.put('/:id', shopController.updateShop);

router.get('/by_division', shopController.listByDivision);

router.get('/:id', shopController.getShopById);

router.post('/:id/upload', shopController.uploadShopImage);

router.get('/:id/feedback', shopFeedback.listFeedbacks);
router.post('/:id/feedback', shopFeedback.addFeedback);

module.exports = router;
