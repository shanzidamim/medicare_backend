
const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

exports.listUsers = (req, res) => {
  db.query(
    `SELECT user_id, first_name, last_name, email, mobile, user_type, status FROM user_detail ORDER BY user_id DESC`,
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);
      return res.json({ status: true, data: rows });
    }
  );
};

exports.deleteUser = (req, res) => {
  const id = req.params.id;
  db.query(`DELETE FROM user_detail WHERE user_id=?`, [id], (err) => {
    if (err) return helper.ThrowHtmlError(err, res);
    return res.json({ status: true, message: 'User deleted successfully' });
  });
};
