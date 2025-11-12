const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

// ---------- Upload directory ----------
const UPLOAD_DIR = path.join(__dirname, '../public/shop_images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Multer Setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const fname = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fname);
  },
});
const upload = multer({ storage });

// ---------- Token Check ----------
function checkAccessToken(headerObj, res, onOk, requiredType = '') {
  helper.CheckParameterValid(res, headerObj, ['access_token'], () => {
    db.query(
      `SELECT user_id, first_name, middel_name, last_name, mobile_code, mobile, image, email,
              os_type, auth_token, user_type, status
         FROM user_detail
        WHERE auth_token = ?
        LIMIT 1`,
      [headerObj.access_token],
      (err, rows) => {
        if (err) return helper.ThrowHtmlError(err, res);
        if (!rows.length) {
          return res.json({
            status: false,
            message: 'Access denied. Unauthorized user.',
            code: '404',
          });
        }
        const u = rows[0];
        if (requiredType && String(u.user_type) !== String(requiredType)) {
          return res.json({
            status: false,
            message: 'Access denied. Unauthorized user type.',
            code: '404',
          });
        }
        onOk(u);
      }
    );
  });
}

// ---------- Helpers ----------
function getDivisionIdFromName(divisionName, cb) {
  if (!divisionName) return cb(null, null);
  db.query(
    `SELECT id FROM divisions WHERE LOWER(division_name)=LOWER(?) LIMIT 1`,
    [divisionName],
    (e, r) => {
      if (e) return cb(e);
      if (!r.length) return cb(null, null);
      cb(null, r[0].id);
    }
  );
}

function _getShopById(id, cb) {
  db.query(
    `SELECT s.*, d.division_name
       FROM medical_shops s
       LEFT JOIN divisions d ON d.id = s.division_id
      WHERE s.id=? AND s.status != 2
      LIMIT 1`,
    [id],
    (e, r) => {
      if (e) return cb(e, null);
      if (!r.length) return cb(null, null);
      return cb(null, r[0]);
    }
  );
}

// ===================================================================
// ===============  CONTROLLER EXPORTS  ==============================
// ===================================================================

// ---------- Get My Shop ----------
exports.getMyShop = (req, res) => {
  checkAccessToken(req.headers, res, (u) => {
    db.query(
      `SELECT s.*, d.division_name
         FROM medical_shops s
         LEFT JOIN divisions d ON d.id = s.division_id
        WHERE s.user_id=? AND s.status!=2
        LIMIT 1`,
      [u.user_id],
      (e, r) => {
        if (e) return helper.ThrowHtmlError(e, res);
        return res.json({ status: true, data: r.length ? r[0] : null });
      }
    );
  });
};

// ---------- Create or Update Shop ----------
exports.createOrUpdateShop = (req, res) => {
  checkAccessToken(req.headers, res, (u) => {
    if (String(u.user_type) !== '3') {
      return res.json({
        status: false,
        message: 'Only shop accounts can create/update shop profile.',
      });
    }

    const b = req.body;
    helper.CheckParameterValid(
      res,
      b,
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
              status: 1,
            };

            if (r.length) {
              // update existing
              db.query(
                `UPDATE medical_shops SET ?, updated_at=NOW() WHERE id=?`,
                [payload, r[0].id],
                (e2) => {
                  if (e2) return helper.ThrowHtmlError(e2, res);
                  _getShopById(r[0].id, (e3, shop) => {
                    if (e3) return helper.ThrowHtmlError(e3, res);
                    return res.json({
                      status: true,
                      message: 'Shop updated successfully',
                      data: shop,
                    });
                  });
                }
              );
            } else {
              // insert new
              db.query(
                `INSERT INTO medical_shops SET ?, created_at=NOW(), updated_at=NOW()`,
                [payload],
                (e2, r2) => {
                  if (e2) return helper.ThrowHtmlError(e2, res);
                  _getShopById(r2.insertId, (e3, shop) => {
                    if (e3) return helper.ThrowHtmlError(e3, res);
                    return res.json({
                      status: true,
                      message: 'Shop created successfully',
                      data: shop,
                    });
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

// ---------- Update Shop ----------
exports.updateShop = (req, res) => {
  checkAccessToken(req.headers, res, (u) => {
    const shopId = req.params.id;
    if (!shopId)
      return res.status(400).json({ status: false, message: 'Shop ID missing' });

    db.query(
      `SELECT id, user_id FROM medical_shops WHERE id=? LIMIT 1`,
      [shopId],
      (e, r) => {
        if (e) return helper.ThrowHtmlError(e, res);
        if (!r.length)
          return res.json({ status: false, message: 'Shop not found' });
        if (String(r[0].user_id) !== String(u.user_id)) {
          return res.json({
            status: false,
            message: 'Not allowed to update this shop',
          });
        }

        const allowed = [
          'full_name',
          'address',
          'timing',
          'contact',
          'division_id',
          'status',
        ];
        const data = {};
        allowed.forEach((k) => {
          if (req.body[k] !== undefined) data[k] = req.body[k];
        });
        if (!Object.keys(data).length) {
          return res.json({ status: false, message: 'Nothing to update' });
        }

        db.query(
          `UPDATE medical_shops SET ?, updated_at=NOW() WHERE id=?`,
          [data, shopId],
          (e2) => {
            if (e2) return helper.ThrowHtmlError(e2, res);
            _getShopById(shopId, (e3, shop) => {
              if (e3) return helper.ThrowHtmlError(e3, res);
              return res.json({ status: true, message: 'Updated', data: shop });
            });
          }
        );
      }
    );
  });
};

// ---------- Get Shop by ID ----------
exports.getShopById = (req, res) => {
  const id = req.params.id;
  if (!id)
    return res.status(400).json({ status: false, message: 'Shop ID missing' });

  _getShopById(id, (e, shop) => {
    if (e) return helper.ThrowHtmlError(e, res);
    if (!shop)
      return res.status(404).json({ status: false, message: 'Not found' });
    return res.json({ status: true, data: shop });
  });
};

// ---------- List by Division ----------
exports.listByDivision = (req, res) => {
  const divisionName = (req.query.division || '').trim();
  if (!divisionName) {
    return res.json({ status: true, data: [] });
  }

  getDivisionIdFromName(divisionName, (e, divisionId) => {
    if (e) return helper.ThrowHtmlError(e, res);
    if (!divisionId) return res.json({ status: true, data: [] });

    db.query(
      `SELECT s.*, d.division_name
         FROM medical_shops s
         LEFT JOIN divisions d ON d.id = s.division_id
        WHERE s.division_id=? AND s.status=1
        ORDER BY s.id DESC`,
      [divisionId],
      (e2, r) => {
        if (e2) return helper.ThrowHtmlError(e2, res);

        // Add fallback image & rating for UI consistency
        const host = process.env.PUBLIC_HOST || 'http://localhost:3002';
        const data = r.map((s) => ({
          ...s,
          image_url:
            s.image_url && s.image_url.trim() !== ''
              ? s.image_url
              : `${host}/shop_images/default_shop.png`,
          rating: s.rating || 4.0,
        }));

        return res.json({ status: true, data });
      }
    );
  });
};

// ---------- Upload Shop Image ----------
exports.uploadShopImage = [
  upload.single('image'),
  (req, res) => {
    checkAccessToken(req.headers, res, (u) => {
      const shopId = req.params.id;
      if (!shopId)
        return res.status(400).json({ status: false, message: 'Shop ID missing' });
      if (!req.file)
        return res.status(400).json({ status: false, message: 'No image uploaded' });

      db.query(
        `SELECT id, user_id FROM medical_shops WHERE id=? LIMIT 1`,
        [shopId],
        (e, r) => {
          if (e) return helper.ThrowHtmlError(e, res);
          if (!r.length)
            return res.json({ status: false, message: 'Shop not found' });
          if (String(r[0].user_id) !== String(u.user_id)) {
            return res.json({
              status: false,
              message: 'Not allowed to upload image for this shop',
            });
          }

          const host = process.env.PUBLIC_HOST || 'http://localhost:3002';
          const fileUrl = `${host}/shop_images/${req.file.filename}`;

          db.query(
            `UPDATE medical_shops SET image_url=?, updated_at=NOW() WHERE id=?`,
            [fileUrl, shopId],
            (e2) => {
              if (e2) return helper.ThrowHtmlError(e2, res);
              return res.json({
                status: true,
                message: 'Image uploaded successfully',
                image_url: fileUrl,
              });
            }
          );
        }
      );
    });
  },
];
