const express = require('express');
const router = express.Router();
const db = require('../helpers/db_helpers');
const doctorFeedback = require('../controllers/doctor_feedback_controller');
const doctorProfile = require('../controllers/doctor_profile_controller');
const doctorController = require("../controllers/doctor_controller");



// ✅ 1. Get All Doctors (with rating + feedback_count)
router.get('/', (req, res) => {
  const sql = `
    SELECT d.*, 
           dc.category_name, 
           divs.division_name,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    LEFT JOIN doctor_feedbacks f ON f.doctor_id = d.id
    WHERE d.status = 1
    GROUP BY d.id
    ORDER BY d.full_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
    res.json({ status: true, data: results });
  });
});

// ✅ 2. Filter by Category
router.get('/category/:id', (req, res) => {
  const sql = `
    SELECT d.*, dc.category_name, divs.division_name,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    LEFT JOIN doctor_feedbacks f ON f.doctor_id = d.id
    WHERE d.status = 1 AND d.category_id = ?
    GROUP BY d.id
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ status: false, message: err.message });
    res.json({ status: true, data: results });
  });
});


// ✅ 3. Filter by Division
router.get('/division/:id', (req, res) => {
  const sql = `
    SELECT d.*, dc.category_name, divs.division_name,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    LEFT JOIN doctor_feedbacks f ON f.doctor_id = d.id
    WHERE d.status = 1 AND d.division_id = ?
    GROUP BY d.id
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ status: false, message: err.message });
    res.json({ status: true, data: results });
  });
});


// ✅ 4. Filter by Division + Category
router.get('/filter', (req, res) => {
  const { division_id, category_id } = req.query;

  const sql = `
    SELECT d.*, dc.category_name, divs.division_name,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    LEFT JOIN doctor_feedbacks f ON f.doctor_id = d.id
    WHERE d.status = 1 
      AND d.division_id = ? 
      AND d.category_id = ?
    GROUP BY d.id
    ORDER BY d.full_name ASC
  `;

  db.query(sql, [division_id, category_id], (err, results) => {
    if (err) return res.status(500).json({ status: false, message: err.message });
    res.json({ status: true, data: results });
  });
});

// ✅ 5. Feedback
router.get('/:id/feedback', doctorFeedback.listFeedbacks);
router.post('/:id/feedback', doctorFeedback.addFeedback);
// ✅ 6. Doctor Profile (get/update)
router.get('/:id', doctorProfile.getDoctorProfile);
router.post('/update', doctorProfile.updateDoctorProfile);

// ✅ 7. Upload doctor image
router.post('/:id/upload', doctorProfile.uploadDoctorImage);
router.get('/:id/stats', doctorFeedback.getDoctorProfileStats);

module.exports = router;
