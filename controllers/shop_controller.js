const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');



const UPLOAD_DIR = path.join(__dirname, '../public/shop_images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const fname = `${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`;
    cb(null, fname);
  }
});
const upload = multer({ storage });


function checkAccessToken(headerObj, res, onOk, requiredType = '') {
  helper.CheckParameterValid(res, headerObj, ['access_token'], () => {
    db.query(
      `SELECT * FROM user_detail WHERE auth_token=? LIMIT 1`,
      [headerObj.access_token],
      (err, rows) => {
        if (err) return helper.ThrowHtmlError(err, res);
        if (!rows.length)
          return res.json({ status: false, message: 'Access denied', code: '404' });

        const u = rows[0];

        if (requiredType && String(u.user_type) !== String(requiredType))
          return res.json({ status: false, message: 'Unauthorized user type', code: '404' });

        onOk(u);
      }
    );
  });
}



function _getShopById(id, cb) {
  const sql = `
    SELECT s.*, d.division_name,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM medical_shops s
    LEFT JOIN divisions d ON d.id = s.division_id
    LEFT JOIN shop_feedbacks f ON f.shop_id = s.id
    WHERE s.id = ?
    GROUP BY s.id
  `;

  db.query(sql, [id], (e, r) => {
    if (e) return cb(e, null);
    if (!r.length) return cb(null, null);

    const shop = r[0];
    cb(null, shop);
  });
}




exports.getMyShop = (req, res) => {
  helper.CheckParameterValid(res, req.headers, ['access_token'], () => {

    db.query(
      "SELECT * FROM user_detail WHERE auth_token=? LIMIT 1",
      [req.headers.access_token],
      (err, rows) => {
        if (err) return helper.ThrowHtmlError(err, res);
        if (!rows.length)
          return res.json({ status: false, message: "Invalid token" });

        const user = rows[0];

        // ---> REAL SHOP QUERY <---
        db.query(
          `SELECT s.*, 
                  d.division_name,
                  IFNULL(AVG(f.rating),0) AS rating,
                  COUNT(f.id) AS feedback_count
             FROM medical_shops s
             LEFT JOIN divisions d ON d.id=s.division_id
             LEFT JOIN shop_feedbacks f ON f.shop_id=s.id
            WHERE s.user_id=? AND s.status!=2
            GROUP BY s.id
            LIMIT 1`,
          [user.user_id],
          (e2, r2) => {
            if (e2) return helper.ThrowHtmlError(e2, res);

            if (!r2.length)
              return res.json({ status: false, message: "Shop not found" });

            res.json({ status: true, data: r2[0] });
          }
        );
      }
    );

  });
};



exports.updateShop = (req, res) => {
  const {
    shop_id,
    full_name,
    address,
    timing,
    contact,
    division_id
  } = req.body;

  if (!shop_id)
    return res.status(400).json({ status: false, message: "Shop ID missing" });

  const sql = `
    UPDATE medical_shops SET 
      full_name = ?, 
      address = ?, 
      timing = ?, 
      contact = ?, 
      division_id = ?
    WHERE id = ?
  `;

  const params = [
    full_name,
    address,
    timing,
    contact,
    division_id,
    shop_id
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database update error" });
    }

    if (result.affectedRows === 0)
      return res.json({ status: false, message: "Shop not found" });

    return res.json({ status: true, message: "Shop profile updated successfully" });
  });
};




exports.getShopById = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT s.*,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM medical_shops s
    LEFT JOIN shop_feedbacks f ON f.shop_id = s.id
    WHERE s.id = ?
    GROUP BY s.id
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "DB error" });
    if (!rows.length) return res.json({ status: false, message: "Shop not found" });

    res.json({ status: true, data: rows[0] });
  });
};




exports.listByDivision = (req, res) => {
  const { division_id } = req.query;

  const sql = `
    SELECT s.*, 
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM medical_shops s
    LEFT JOIN shop_feedbacks f ON f.shop_id = s.id
    WHERE s.status = 1
      ${division_id ? "AND s.division_id = ?" : ""}
    GROUP BY s.id
    ORDER BY s.full_name ASC
  `;

  const params = division_id ? [division_id] : [];

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "DB error" });
    res.json({ status: true, data: rows });
  });
};



exports.getShopProfileStats = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT s.*,
           IFNULL(AVG(f.rating), 0) AS rating,
           COUNT(f.id) AS feedback_count
    FROM medical_shops s
    LEFT JOIN shop_feedbacks f ON f.shop_id = s.id
    WHERE s.id = ?
    GROUP BY s.id
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "DB error" });

    res.json({ status: true, data: rows[0] });
  });
};



exports.uploadShopImage = [
  upload.single('image'),

  (req, res) => {
    const id = req.params.id;

    if (!req.file)
      return res.json({ status: false, message: "No image uploaded" });

    // Only relative URL
    const imageUrl = `/shop_images/${req.file.filename}`;

    db.query(
      `UPDATE medical_shops SET image_url=?, updated_at=NOW() WHERE id=?`,
      [imageUrl, id],
      (err) => {
        if (err) {
          console.error("DB Error:", err);
          return res.status(500).json({ status: false, message: "DB error" });
        }

        res.json({
          status: true,
          message: "Image uploaded",
          image_url: imageUrl
        });
      }
    );
  }
];
