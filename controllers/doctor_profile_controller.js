const db = require('../helpers/db_helpers');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ---------------- Image upload config ----------------
const uploadPath = path.join(__dirname, '../public/doctor_images');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// =====================================================
// 1️⃣ GET Doctor Profile
// =====================================================
exports.getDoctorProfile = (req, res) => {
  const { id } = req.params;
  if (!id)
    return res.status(400).json({ status: false, message: 'Doctor ID missing' });

  const sql = `
    SELECT id, full_name, contact, degrees, specialty_detail,
           clinic_or_hospital, address, years_experience, fees,
           visit_days, visiting_time, image_url
    FROM doctors
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err)
      return res.status(500).json({ status: false, message: 'DB error' });
    if (rows.length === 0)
      return res.json({ status: false, message: 'Doctor not found' });

    res.json({ status: true, data: rows[0] });
  });
};

// =====================================================
// 2️⃣ UPDATE Doctor Profile (text info only)
// =====================================================
exports.updateDoctorProfile = (req, res) => {
  const {
    doctor_id, full_name, contact, degrees, specialty_detail,
    clinic_or_hospital, address, years_experience, fees,
    visit_days, visiting_time
  } = req.body;

  if (!doctor_id)
    return res.status(400).json({ status: false, message: 'Doctor ID missing' });

  const sql = `
    UPDATE doctors
       SET full_name=?, contact=?, degrees=?, specialty_detail=?,
           clinic_or_hospital=?, address=?, years_experience=?,
           fees=?, visit_days=?, visiting_time=?, updated_at=NOW()
     WHERE id=?`;

  const params = [
    full_name, contact, degrees, specialty_detail,
    clinic_or_hospital, address, years_experience,
    fees, visit_days, visiting_time, doctor_id
  ];

  db.query(sql, params, (err, result) => {
    if (err)
      return res.status(500).json({ status: false, message: 'DB update error' });
    if (result.affectedRows === 0)
      return res.json({ status: false, message: 'Doctor not found' });
    res.json({ status: true, message: 'Doctor profile updated successfully' });
  });
};

// =====================================================
// 3️⃣ UPLOAD Doctor Image (Admin or Doctor App)
// =====================================================
exports.uploadDoctorImage = [
  upload.single('image'),
  (req, res) => {
    const id = req.params.id;
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'No image uploaded' });
    }

    // ✅ Save only relative path, not full URL
    const relativePath = `doctor_images/${req.file.filename}`;

    db.query(
      `UPDATE doctors SET image_url=?, updated_at=NOW() WHERE id=?`,
      [relativePath, id],
      (err) => {
        if (err)
          return res.status(500).json({ status: false, message: 'Database update failed' });
        res.json({
          status: true,
          image_url: relativePath,
          message: 'Image uploaded successfully',
        });
      }
    );
  },
];
