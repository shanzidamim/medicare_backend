const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

exports.listAppointments = (req, res) => {
  db.query(
    `SELECT b.id, 
            b.booking_date, 
            b.booking_time, 
            b.status,
            u.first_name AS user_name,
            d.full_name AS doctor_name
     FROM booking_detail b
     LEFT JOIN user_detail u ON b.user_id = u.user_id
     LEFT JOIN doctors d ON b.doctor_id = d.id
     ORDER BY b.id DESC`,
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);
      return res.json({ status: true, data: rows });
    }
  );
};

exports.deleteAppointment = (req, res) => {
  const id = req.params.id;
  db.query(`DELETE FROM booking_detail WHERE id=?`, [id], (err) => {
    if (err) return helper.ThrowHtmlError(err, res);
    return res.json({ status: true, message: 'Appointment deleted successfully' });
  });
};
