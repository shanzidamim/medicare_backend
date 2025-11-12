const express = require('express');
const router = express.Router();
const db = require('../helpers/db_helpers');
const doctorFeedback = require('../controllers/doctor_feedback_controller');
const doctorProfile = require('../controllers/doctor_profile_controller');

// ✅ 1. Get All Doctors
router.get('/', (req, res) => {
  const sql = `
    SELECT d.*, dc.category_name, divs.division_name
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    WHERE d.status = 1
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
    SELECT d.*, dc.category_name, divs.division_name
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    WHERE d.status = 1 AND d.category_id = ?
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
    res.json({ status: true, data: results });
  });
});

// ✅ 3. Filter by Division
router.get('/division/:id', (req, res) => {
  const sql = `
    SELECT d.*, dc.category_name, divs.division_name
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    WHERE d.status = 1 AND d.division_id = ?
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
    res.json({ status: true, data: results });
  });
});

// ✅ 4. Filter by Division + Category
router.get('/filter', (req, res) => {
  const { division_id, category_id } = req.query;
  if (!division_id || !category_id) {
    return res.status(400).json({ status: false, message: 'Missing division_id or category_id' });
  }

  const sql = `
    SELECT d.*, dc.category_name, divs.division_name
    FROM doctors d
    LEFT JOIN doctor_categories dc ON d.category_id = dc.id
    LEFT JOIN divisions divs ON d.division_id = divs.id
    WHERE d.status = 1 AND d.division_id = ? AND d.category_id = ?
    ORDER BY d.full_name ASC
  `;

  db.query(sql, [division_id, category_id], (err, results) => {
    if (err) {
      console.error("SQL Error in /api/doctors/filter:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
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

module.exports = router;
