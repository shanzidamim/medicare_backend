const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ status: false, message: 'Email & password required' });

  db.query(
    `SELECT * FROM admin_users WHERE email=? AND password=? AND status=1 LIMIT 1`,
    [email, password],
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);
      if (!rows.length)
        return res.json({ status: false, message: 'Invalid credentials' });
      return res.json({ status: true, data: rows[0] });
    }
  );
};
