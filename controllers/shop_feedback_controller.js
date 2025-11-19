const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

// ==============================
// 📌 GET Shop Feedback List
// ==============================
exports.listFeedbacks = (req, res) => {
  const shopId = req.params.id;
  if (!shopId)
    return res.json({ status: false, message: "Shop ID missing" });

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


exports.addFeedback = (req, res) => {
  const shopId = req.params.id;
  const { user_id, message, rating } = req.body;

  if (!shopId || !user_id || !message || rating === undefined)
    return res.json({
      status: false,
      message: "Missing parameters",
    });

  const sql =
    "INSERT INTO shop_feedbacks (shop_id, user_id, message, rating) VALUES (?, ?, ?, ?)";

  db.query(sql, [shopId, user_id, message, rating], (err, result) => {
    if (err) return helper.ThrowHtmlError(err, res);

    // ⭐ Update shop average rating
    db.query(
      `UPDATE shops
          SET rating = (SELECT AVG(rating) FROM shop_feedbacks WHERE shop_id = ?)
        WHERE id = ?`,
      [shopId, shopId]
    );


    return res.json({
      status: true,
      message: "Shop feedback submitted successfully",
      inserted_id: result.insertId,
    });
  });
};
