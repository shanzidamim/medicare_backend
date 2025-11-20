
const db = require('../helpers/db_helpers');

module.exports.controller = (app, io, socket_list) => {


  app.get('/api/categories', (req, res) => {
    db.query(
      'SELECT id, category_name, image_url FROM doctor_categories WHERE status=1 ORDER BY category_name',
      (e, r) =>
        e
          ? res.status(500).json({ status: false, message: 'DB error' })
          : res.json({ status: true, data: r })
    );
  });


  app.get('/api/divisions', (req, res) => {
    db.query(
      'SELECT id, division_name FROM divisions ORDER BY division_name',
      (e, r) =>
        e
          ? res.status(500).json({ status: false, message: 'DB error' })
          : res.json({ status: true, data: r })
    );
  });


  app.get('/api/doctors', (req, res) => {
    const { division_id, category_id } = req.query;
    let sql = `
      SELECT d.*, c.category_name, v.division_name
      FROM doctors d
      JOIN doctor_categories c ON d.category_id = c.id
      JOIN divisions v ON d.division_id = v.id
      WHERE d.status = 1
    `;
    const params = [];

    if (division_id) {
      sql += ' AND d.division_id = ?';
      params.push(division_id);
    }
    if (category_id) {
      sql += ' AND d.category_id = ?';
      params.push(category_id);
    }

    sql += ' ORDER BY d.id DESC';

    db.query(sql, params, (e, r) => {
      if (e) {
        console.error('DB error:', e);
        return res.status(500).json({ status: false, message: 'DB error' });
      }
      res.json({ status: true, data: r });
    });
  });



  app.get('/api/doctors/category/:categoryId', (req, res) => {
    const sql = `
      SELECT d.*, c.category_name, v.division_name
      FROM doctors d
      JOIN doctor_categories c ON d.category_id = c.id
      JOIN divisions v ON d.division_id = v.id
      WHERE d.status = 1 AND d.category_id = ?
    `;
    db.query(sql, [req.params.categoryId], (err, result) => {
      if (err) {
        return res.status(500).json({ status: false, message: 'Database error', error: err });
      }
      res.json({ status: true, data: result });
    });
  });

  // GET doctor feedbacks
  app.get('/api/doctors/:id/feedback', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM doctor_feedbacks WHERE doctor_id=?', [id], (err, rows) => {
      if (err) return res.status(500).json({ status: false, message: 'DB error' });
      res.json({ status: true, data: rows });
    });
  });





  app.get('/api/doctors/division/:divisionId', (req, res) => {
    const sql = `
      SELECT d.*, c.category_name, v.division_name
      FROM doctors d
      JOIN doctor_categories c ON d.category_id = c.id
      JOIN divisions v ON d.division_id = v.id
      WHERE d.status = 1 AND d.division_id = ?
    `;
    db.query(sql, [req.params.divisionId], (err, result) => {
      if (err) {
        return res.status(500).json({ status: false, message: 'Database error', error: err });
      }
      res.json({ status: true, data: result });
    });
  });
  // GET /api/doctors/filter?division_id=1&category_id=3
  app.get('/api/doctors/filter', (req, res) => {
    const { division_id, category_id } = req.query;

    if (!division_id || !category_id) {
      return res.status(400).json({
        status: false,
        message: 'division_id and category_id are required',
      });
    }

    const sql = `
    SELECT d.*, c.category_name, v.division_name
    FROM doctors d
    LEFT JOIN doctor_categories c ON d.category_id = c.id
    LEFT JOIN divisions v ON d.division_id = v.id
    WHERE d.status = 1 AND d.division_id = ? AND d.category_id = ?
    ORDER BY d.id DESC
  `;

    db.query(sql, [division_id, category_id], (err, result) => {
      if (err) {
        console.error("DB Error in /api/doctors/filter:", err);
        return res.status(500).json({ status: false, message: "DB error", error: err });
      }
      res.json({ status: true, data: result });
    });
  });


  // Get chat messages
  app.get('/api/chat/:doctorId/:userId', (req, res) => {
    db.query(
      'SELECT * FROM messages WHERE doctor_id=? AND user_id=? ORDER BY created_at ASC',
      [req.params.doctorId, req.params.userId],
      (err, rows) => {
        if (err) return res.status(500).json({ status: false });
        res.json({ status: true, data: rows });
      }
    );
  });

  // Send message
  app.post('/api/chat/send', (req, res) => {
    const { doctor_id, user_id, sender, message } = req.body;
    db.query(
      'INSERT INTO messages (doctor_id, user_id, sender, message) VALUES (?,?,?,?)',
      [doctor_id, user_id, sender, message],
      (err) => {
        if (err) return res.status(500).json({ status: false });
        res.json({ status: true });
      }
    );
  });

  app.post('/api/appointments', (req, res) => {
    const { doctor_id, user_id, date, reason, message } = req.body;
    db.query(
      'INSERT INTO appointments (doctor_id, user_id, date, reason, message) VALUES (?,?,?,?,?)',
      [doctor_id, user_id, date, reason, message],
      (err) => {
        if (err) return res.status(500).json({ status: false, message: 'Error' });
        res.json({ status: true, message: 'Appointment booked successfully' });
      }
    );
  });





  app.post('/api/admin/doctors', (req, res) => {
    const payload = req.body;
    db.query('INSERT INTO doctors SET ?', payload, (e) =>
      e
        ? res.status(500).json({ status: false, message: 'Insert failed' })
        : res.json({ status: true, message: 'Doctor added' })
    );
  });
  app.post('/api/doctors/:id/feedback', (req, res) => {
    const { user_id, message } = req.body;
    db.query('INSERT INTO doctor_feedbacks (doctor_id, user_id, message) VALUES (?, ?, ?)',
      [req.params.id, user_id, message],
      (err) => {
        if (err) return res.status(500).json({ status: false, message: 'Error saving feedback' });
        res.json({ status: true, message: 'Feedback submitted' });
      });
  });



  app.put('/api/admin/doctors/:id', (req, res) => {
    db.query('UPDATE doctors SET ? WHERE id=?', [req.body, req.params.id], (e, r) =>
      e
        ? res.status(500).json({ status: false, message: 'Update failed' })
        : res.json({
          status: true,
          message: r.affectedRows ? 'Doctor updated' : 'No change',
        })
    );
  });
  app.delete('/api/admin/doctors/:id', (req, res) => {
    db.query('UPDATE doctors SET status=2 WHERE id=?', [req.params.id], (e, r) =>
      e
        ? res.status(500).json({ status: false, message: 'Delete failed' })
        : res.json({
          status: true,
          message: r.affectedRows ? 'Doctor deleted' : 'Not found',
        })
    );
  });

  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  // Create upload folder if missing
  const uploadPath = path.join(__dirname, '../public/doctor_images');
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

  // Multer config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });
  const upload = multer({ storage });

 exports.getDoctorProfile = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT d.*,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM doctors d
    LEFT JOIN doctor_feedbacks f ON f.doctor_id = d.id
    WHERE d.id = ?
    GROUP BY d.id
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.json({ status: false, message: "Doctor not found" });
    }

    return res.json({ status: true, data: result[0] });
  });
};


  // ✅ Second function — update profile
  exports.updateDoctorProfile = (req, res) => {
    const {
      doctor_id, full_name, contact, degrees, specialty_detail,
      clinic_or_hospital, address, years_experience, fees,
      visit_days, visiting_time
    } = req.body;

    if (!doctor_id)
      return res.status(400).json({ status: false, message: "Doctor ID missing" });

    const sql = `
    UPDATE doctors 
    SET full_name = ?, contact = ?, degrees = ?, specialty_detail = ?,
        clinic_or_hospital = ?, address = ?, years_experience = ?, 
        fees = ?, visit_days = ?, visiting_time = ?
    WHERE id = ?
  `;

    const params = [
      full_name, contact, degrees, specialty_detail, clinic_or_hospital,
      address, years_experience, fees, visit_days, visiting_time, doctor_id
    ];

    const db = require('../helpers/db_helpers');
    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ status: false, message: "Database update error" });
      }

      if (result.affectedRows === 0)
        return res.json({ status: false, message: "Doctor not found" });

      return res.json({ status: true, message: "Doctor profile updated successfully" });
    });
  };
 
};