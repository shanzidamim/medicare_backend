const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { q, err, getDivisionId } = require('./_admin_common');

exports.list = (req, res) =>
  q(
    `SELECT s.*, d.division_name
       FROM medical_shops s
       LEFT JOIN divisions d ON d.id = s.division_id
      ORDER BY s.id DESC`,
    (e, rows) =>
      e ? err(e, res) : res.json({ status: true, data: rows })
  );

exports.get = (req, res) =>
  q(
    `SELECT s.*, d.division_name
       FROM medical_shops s
       LEFT JOIN divisions d ON d.id = s.division_id
      WHERE s.id = ?
      LIMIT 1`,
    [req.params.id],
    (e, r) =>
      e
        ? err(e, res)
        : res.json({ status: true, data: r[0] || null })
  );

exports.create = (req, res) => {
  const b = req.body;

  const insert = (division_id) => {
    const row = {
      user_id: b.user_id ?? null,
      full_name: b.full_name || '',
      address: b.address || '',
      timing: b.timing || '',
      contact: b.contact || '',
      division_id,
      image_url: b.image_url || '',
      status: b.status ?? 1,
    };

    q(
      `INSERT INTO medical_shops SET ?, created_at = NOW(), updated_at = NOW()`,
      [row],
      (e2, r2) =>
        e2
          ? err(e2, res)
          : res.json({
              status: true,
              id: r2.insertId,
              message: 'Shop created',
            })
    );
  };

  if (b.division_id) return insert(b.division_id);

  getDivisionId(b.division_name, (e, id) =>
    e ? err(e, res) : insert(id)
  );
};

// -------------------- UPDATE SHOP --------------------
exports.update = (req, res) => {
  const id = req.params.id;
  const b = req.body;

  const doUpdate = (division_id) => {
    const allowed = [
      'user_id',
      'full_name',
      'address',
      'timing',
      'contact',
      'division_id',
      'image_url',
      'status',
    ];

    const data = {};
    allowed.forEach((k) => {
      if (b[k] !== undefined) data[k] = b[k];
    });

    if (division_id !== undefined) data.division_id = division_id;

    q(
      `UPDATE medical_shops SET ?, updated_at = NOW() WHERE id = ?`,
      [data, id],
      (e) =>
        e
          ? err(e, res)
          : res.json({ status: true, message: 'Shop updated' })
    );
  };

  if (b.division_name && !b.division_id) {
    return getDivisionId(b.division_name, (e, id2) =>
      e ? err(e, res) : doUpdate(id2)
    );
  }

  doUpdate(undefined);
};

exports.listByDivision = (req, res) => {
  const division = req.query.division?.trim();

  if (!division) {
    return res.json({ status: false, message: "division query missing" });
  }

  q(
    `SELECT s.*, d.division_name
       FROM medical_shops s
       LEFT JOIN divisions d ON d.id = s.division_id
      WHERE d.division_name LIKE ?
      ORDER BY s.full_name ASC`,
    [`%${division}%`],
    (e, rows) => {
      if (e) return err(e, res);
      return res.json({ status: true, data: rows });
    }
  );
};


// -------------------- DELETE SHOP --------------------
exports.remove = (req, res) =>
  q(
    `UPDATE medical_shops SET status = 0, updated_at = NOW() WHERE id = ?`,
    [req.params.id],
    (e) =>
      e
        ? err(e, res)
        : res.json({ status: true, message: 'Shop deleted' })
  );

  const UPLOAD_DIR = path.join(__dirname, '../public/shop_images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fname = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, fname);
  },
});
const upload = multer({ storage });

exports.upload = [
  upload.single('image'),
  (req, res) => {
    if (!req.file)
      return res.json({ status: false, message: "No image uploaded" });

    const host = process.env.PUBLIC_HOST || "http://localhost:3002";
    const fileUrl = `${host}/shop_images/${req.file.filename}`;

    const shopId = req.params.id;

    q(
      `UPDATE medical_shops SET image_url=?, updated_at=NOW() WHERE id=?`,
      [fileUrl, shopId],
      (e) =>
        e
          ? err(e, res)
          : res.json({
              status: true,
              image_url: fileUrl,
              message: "Shop image updated",
            })
    );
  },
];