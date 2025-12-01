const db = require('../helpers/db_helpers');

// BOOK APPOINTMENT
exports.bookAppointment = (req, res) => {
  const { user_id, doctor_id, appointment_date, reason, message } = req.body;

  if (!user_id || !doctor_id || !appointment_date) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields",
    });
  }

  const sql = `
    INSERT INTO appointments 
    (user_id, doctor_id, appointment_date, reason, message, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;

  db.query(sql, [user_id, doctor_id, appointment_date, reason, message], (err, result) => {
    if (err) {
      console.error("❌ DB error while booking appointment:", err);
      return res.status(500).json({
        status: false,
        message: "Database error",
        error: err,
      });
    }

    return res.json({
      status: true,
      message: "Appointment booked successfully",
      data: { id: result.insertId },
    });
  });
};

// USER APPOINTMENTS
exports.getUserAppointments = (req, res) => {
  const { user_id } = req.params;

  db.query(
    "SELECT * FROM appointments WHERE user_id = ? ORDER BY id DESC",
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ status: false, error: err });

      res.json(rows); 
    }
  );
};

// DOCTOR APPOINTMENTS
exports.getDoctorAppointments = (req, res) => {
  const { doctor_id } = req.params;

  db.query(
    "SELECT * FROM appointments WHERE doctor_id = ? ORDER BY id DESC",
    [doctor_id],
    (err, rows) => {
      if (err) return res.status(500).json({ status: false, error: err });

      res.json(rows);
    }
  );
};

// UPDATE STATUS
exports.updateStatus = (req, res) => {
  const appointmentId = req.params.id;
  const { status } = req.body;

  if (!['approved', 'cancelled'].includes(status)) {
    return res.json({ status: false, message: "Invalid status" });
  }

  db.query(
    `UPDATE appointments SET status=?, updated_at=NOW() WHERE id=?`,
    [status, appointmentId],
    (err, result) => {
      if (err) return res.status(500).json({ status: false, message: "DB error" });

      if (result.affectedRows === 0) {
        return res.json({ status: false, message: "Appointment not found" });
      }

      res.json({ status: true, message: "Appointment status updated" });
    }
  );
};
