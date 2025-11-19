const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

// ==============================
// 📌 GET Doctor Feedback List
// ==============================
exports.listFeedbacks = (req, res) => {
  const doctorId = req.params.id;
  if (!doctorId)
    return res.json({ status: false, message: "Doctor ID missing" });

  db.query(
    `SELECT f.*, u.first_name
       FROM doctor_feedbacks f
  LEFT JOIN user_detail u ON u.user_id = f.user_id
      WHERE f.doctor_id = ?
   ORDER BY f.id DESC`,
    [doctorId],
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);
      return res.json({ status: true, data: rows });
    }
  );
};

exports.getDoctorProfileStats = (req, res) => {
  const doctorId = req.params.id;

  const sql = `
      SELECT 
        COUNT(*) AS feedback_count,
        IFNULL(AVG(rating), 0) AS rating
      FROM doctor_feedbacks
      WHERE doctor_id = ?
  `;

  db.query(sql, [doctorId], (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: err });

    return res.json({
      status: true,
      rating: Number(rows[0].rating).toFixed(1),
      feedback_count: rows[0].feedback_count,
    });
  });
};


exports.addFeedback = (req, res) => {
  const doctorId = req.params.id;
  const { user_id, message, rating } = req.body;

  if (!doctorId || !user_id || !message || rating === undefined)
    return res.status(400).json({
      status: false,
      message: "Missing required fields",
    });

  const sql =
    "INSERT INTO doctor_feedbacks (doctor_id, user_id, message, rating) VALUES (?, ?, ?, ?)";

  db.query(sql, [doctorId, user_id, message, rating], (err, result) => {
    if (err) return helper.ThrowHtmlError(err, res);

    // ⭐ Update doctor average rating
    db.query(
      `UPDATE doctors
          SET rating = (SELECT AVG(rating) FROM doctor_feedbacks WHERE doctor_id = ?)
        WHERE id = ?`,
      [doctorId, doctorId]
    );

    return res.json({
      status: true,
      message: "Feedback added successfully",
      inserted_id: result.insertId,
    });
  });
};
