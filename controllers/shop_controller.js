const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

// ===================================================================
// --------------------- UPLOAD DIRECTORY -----------------------------
// ===================================================================

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

// ===================================================================
// ---------------------- TOKEN CHECK --------------------------------
// ===================================================================

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

// ===================================================================
// ---------------------- INTERNAL HELPERS ----------------------------
// ===================================================================

function _getShopById(id, cb) {
  db.query(
    `SELECT s.*, d.division_name
       FROM medical_shops s
       LEFT JOIN divisions d ON d.id=s.division_id
      WHERE s.id=? AND s.status!=2
      LIMIT 1`,
    [id],
    (e, r) => {
      if (e) return cb(e, null);
      if (!r.length) return cb(null, null);

      const host = process.env.PUBLIC_HOST || "http://localhost:3002";

      const shop = r[0];
      shop.image_url =
        shop.image_url && shop.image_url.trim() !== ""
          ? shop.image_url
          : `${host}/shop_images/default_shop.png`;

      shop.rating = shop.rating || 4.0;

      cb(null, shop);
    }
  );
}

// ===================================================================
// ---------------------- GET MY SHOP --------------------------------
// ===================================================================

exports.getMyShop = (req, res) => {
  checkAccessToken(req.headers, res, (u) => {
    db.query(
      `SELECT s.*, d.division_name 
         FROM medical_shops s
         LEFT JOIN divisions d ON d.id=s.division_id
        WHERE s.user_id=? AND s.status!=2 LIMIT 1`,
      [u.user_id],
      (e, r) => {
        if (e) return helper.ThrowHtmlError(e, res);

        if (!r.length)
          return res.json({ status: true, data: null });

        const host = process.env.PUBLIC_HOST || "http://localhost:3002";
        const shop = r[0];

        shop.image_url =
          shop.image_url && shop.image_url.trim() !== ""
            ? shop.image_url
            : `${host}/shop_images/default_shop.png`;

        shop.rating = shop.rating || 4.0;

        res.json({ status: true, data: shop });
      }
    );
  });
};

// ===================================================================
// ---------------------- CREATE / UPDATE SHOP ------------------------
// ===================================================================

exports.createOrUpdateShop = (req, res) => {
  checkAccessToken(req.headers, res, (u) => {
    if (String(u.user_type) !== '3')
      return res.json({ status: false, message: "Only shop accounts allowed." });

    const b = req.body;

    helper.CheckParameterValid(res, b,
      ['full_name', 'address', 'timing', 'contact', 'division_id'],
      () => {
        db.query(
          `SELECT id FROM medical_shops WHERE user_id=? LIMIT 1`,
          [u.user_id],
          (e, r) => {
            if (e) return helper.ThrowHtmlError(e, res);

            const payload = {
              user_id: u.user_id,
              full_name: b.full_name,
              address: b.address,
              timing: b.timing,
              contact: b.contact,
              division_id: b.division_id,
              status: 1
            };

            if (r.length) {
              // UPDATE
              db.query(
                `UPDATE medical_shops SET ?, updated_at=NOW() WHERE id=?`,
                [payload, r[0].id],
                (e2) => {
                  if (e2) return helper.ThrowHtmlError(e2, res);
                  _getShopById(r[0].id, (e3, shop) => {
                    if (e3) return helper.ThrowHtmlError(e3, res);
                    res.json({ status: true, message: "Shop updated", data: shop });
                  });
                }
              );
            } else {
              // INSERT
              db.query(
                `INSERT INTO medical_shops SET ?, created_at=NOW(), updated_at=NOW()`,
                [payload],
                (e2, r2) => {
                  if (e2) return helper.ThrowHtmlError(e2, res);
                  _getShopById(r2.insertId, (e3, shop) => {
                    if (e3) return helper.ThrowHtmlError(e3, res);
                    res.json({ status: true, message: "Shop created", data: shop });
                  });
                }
              );
            }
          }
        );
      }
    );
  });
};

// ===================================================================
// ---------------------- UPDATE SHOP --------------------------------
// ===================================================================

exports.updateShop = (req, res) => {
  checkAccessToken(req.headers, res, (u) => {
    const shopId = req.params.id;

    db.query(`SELECT id, user_id FROM medical_shops WHERE id=? LIMIT 1`,
      [shopId],
      (e, r) => {
        if (e) return helper.ThrowHtmlError(e, res);
        if (!r.length)
          return res.json({ status: false, message: "Shop not found" });

        if (String(r[0].user_id) !== String(u.user_id))
          return res.json({ status: false, message: "Not your shop" });

        const allowed = ['full_name', 'address', 'timing', 'contact', 'division_id', 'status'];
        const data = {};

        allowed.forEach(k => {
          if (req.body[k] !== undefined) data[k] = req.body[k];
        });

        db.query(
          `UPDATE medical_shops SET ?, updated_at=NOW() WHERE id=?`,
          [data, shopId],
          (e2) => {
            if (e2) return helper.ThrowHtmlError(e2, res);
            _getShopById(shopId, (e3, shop) => {
              if (e3) return helper.ThrowHtmlError(e3, res);
              res.json({ status: true, message: "Updated", data: shop });
            });
          }
        );
      }
    );
  });
};

// ===================================================================
// ---------------------- GET SHOP BY ID ------------------------------
// ===================================================================

exports.getShopById = (req, res) => {
  const id = req.params.id;

  _getShopById(id, (e, shop) => {
    if (e) return helper.ThrowHtmlError(e, res);
    if (!shop)
      return res.status(404).json({ status: false, message: "Not found" });

    res.json({ status: true, data: shop });
  });
};

// ===================================================================
// ---------------------- LIST BY DIVISION (IMPORTANT FIX) ------------
// ===================================================================

exports.listByDivision = (req, res) => {
  const division = req.query.division?.trim() || '';

  db.query(
    `SELECT s.*, d.division_name
       FROM medical_shops s
       LEFT JOIN divisions d ON d.id = s.division_id
      WHERE LOWER(d.division_name) LIKE LOWER(?)
        AND s.status != 2
      ORDER BY s.full_name ASC`,
    [`%${division}%`],
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);

      const host = process.env.PUBLIC_HOST || "http://localhost:3002";

      rows.forEach(s => {
        s.image_url =
          s.image_url && s.image_url.trim() !== ""
            ? s.image_url
            : `${host}/shop_images/default_shop.png`;

        s.rating = s.rating || 4.0;
      });

      res.json({ status: true, data: rows });
    }
  );
};

exports.getShopProfileStats = (req, res) => {
  const shopId = req.params.id;

  db.query(
    `SELECT 
        COUNT(*) AS feedback_count,
        IFNULL(AVG(rating), 0) AS rating
     FROM shop_feedbacks
     WHERE shop_id = ?`,
    [shopId],
    (err, rows) => {
      if (err) return helper.ThrowHtmlError(err, res);

      return res.json({
        status: true,
        rating: Number(rows[0].rating.toFixed(1)),
        feedback_count: rows[0].feedback_count
      });
    }
  );
};


exports.uploadShopImage = [
  upload.single('image'),
  (req, res) => {
    checkAccessToken(req.headers, res, (u) => {
      const shopId = req.params.id;

      if (!req.file)
        return res.json({ status: false, message: "No image uploaded" });

      const host = process.env.PUBLIC_HOST || "http://localhost:3002";
      const fileUrl = `${host}/shop_images/${req.file.filename}`;

      db.query(
        `UPDATE medical_shops SET image_url=?, updated_at=NOW() WHERE id=?`,
        [fileUrl, shopId],
        (e2) => {
          if (e2) return helper.ThrowHtmlError(e2, res);
          res.json({
            status: true,
            message: "Image uploaded",
            image_url: fileUrl
          });
        }
      );
    });
  }
];
