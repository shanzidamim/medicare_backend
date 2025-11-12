const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

// 🔹 GET /api/shops/:id/feedback
exports.listFeedbacks = (req, res) => {
  const shopId = req.params.id;
  if (!shopId) return res.json({ status: false, message: 'Shop ID missing' });

  db.query(
    `SELECT f.*, u.first_name
       FROM shop_feedbacks f
       LEFT JOIN user_detail u ON u.user_id = f.user_id
      WHERE f.shop_id = ?
      ORDER BY f.id DESC`,
    [shopId],
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);
      return res.json({ status: true, data: rows });
    }
  );
};

// 🔹 POST /api/shops/:id/feedback
exports.addFeedback = (req, res) => {
  const shopId = req.params.id;
  const { user_id, message } = req.body;

  if (!shopId || !user_id || !message) {
    return res.json({ status: false, message: 'Missing parameters' });
  }

  const payload = { shop_id: shopId, user_id, message };
  db.query(`INSERT INTO shop_feedbacks SET ?`, payload, (err, result) => {
    if (err) return helper.ThrowHtmlError(err, res);
    return res.json({ status: true, message: 'Feedback submitted successfully' });
  });
};
