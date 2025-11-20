const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shop_controller');
const shopFeedback = require('../controllers/shop_feedback_controller');

// =====================
// FIXED ROUTE ORDER
// =====================

// 1️⃣ List shops by division
router.get('/by_division', shopController.listByDivision);

// 2️⃣ Get shop profile stats
router.get('/:id/profile', shopController.getShopProfileStats);

// 3️⃣ Upload image
router.post('/:id/upload', shopController.uploadShopImage);

// 4️⃣ Get shop feedback
router.get('/:id/feedback', shopFeedback.listFeedbacks);
router.post('/:id/feedback', shopFeedback.addFeedback);

// 5️⃣ Update shop profile
router.put('/:id', shopController.updateShop);
router.post('/update', shopController.updateShop);

// 6️⃣ Get shop by ID - MUST BE LAST
router.get('/:id', shopController.getShopById);

module.exports = router;
