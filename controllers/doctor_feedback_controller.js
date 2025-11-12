const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

exports.listFeedbacks = (req, res) => {
  const doctorId = req.params.id;
  if (!doctorId) return res.json({ status: false, message: 'Doctor ID missing' });

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

exports.addFeedback = (req, res) => {
  const doctorId = req.params.id;
  const { user_id, message } = req.body;

  if (!doctorId || !user_id || !message) {
    return res.json({ status: false, message: 'Missing parameters' });
  }

  const payload = { doctor_id: doctorId, user_id, message };
  db.query(`INSERT INTO doctor_feedbacks SET ?`, payload, (err, result) => {
    if (err) return helper.ThrowHtmlError(err, res);
    return res.json({ status: true, message: 'Feedback submitted' });
  });
};
