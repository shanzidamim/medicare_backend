const { q, err, getDivisionId } = require('./_admin_common');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadPath = path.join(__dirname, '../public/doctor_images');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[<>:"/\\|?*%]/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + cleanName);
  },
});

const upload = multer({ storage });

const IMAGE_BASE_URL = 'doctor_images';

exports.list = (req, res) => {
  const sql = `
    SELECT 
      d.id AS doctor_id,
      d.full_name,
      d.degrees,
      d.years_experience,
      d.specialty_detail,
      d.clinic_or_hospital,
      d.address,
      d.visit_days,
      d.visiting_time,
      d.contact,
      d.image_url,
      dv.division_name,
      dc.category_name
    FROM doctors d
    LEFT JOIN divisions dv ON dv.id = d.division_id
    LEFT JOIN doctor_categories dc ON dc.id = d.category_id
    WHERE d.status = 1
    ORDER BY d.id DESC
  `;
  q(sql, (e, rows) =>
    e ? err(e, res) : res.json({ status: true, data: rows })
  );
};

exports.get = (req, res) => {
  const sql = `
    SELECT 
      d.id AS doctor_id,
      d.full_name,
      d.degrees,
      d.years_experience,
      d.specialty_detail,
      d.clinic_or_hospital,
      d.address,
      d.visit_days,
      d.visiting_time,
      d.contact,
      d.image_url,
      dv.division_name,
      dc.category_name
    FROM doctors d
    LEFT JOIN divisions dv ON dv.id = d.division_id
    LEFT JOIN doctor_categories dc ON dc.id = d.category_id
    WHERE d.id = ?
    LIMIT 1
  `;
  q(sql, [req.params.id], (e, r) =>
    e ? err(e, res) : res.json({ status: true, data: r[0] || null })
  );
};

exports.create = (req, res) => {
  const b = req.body;
  const insert = (division_id) => {
    const row = {
      category_id: b.category_id ?? null,
      division_id,
      full_name: b.full_name || '',
      contact: b.contact || '',
      degrees: b.degrees || '',
      years_experience: b.years_experience ?? 0,
      specialty_detail: b.specialty_detail || '',
      clinic_or_hospital: b.clinic_or_hospital || '',
      address: b.address || '',
      visit_days: b.visit_days || '',
      visiting_time: b.visiting_time || '',
      image_url: b.image_url || '',
      status: 1,
    };
    q(
      `INSERT INTO doctors SET ?, created_at=NOW(), updated_at=NOW()`,
      [row],
      (e2, r2) =>
        e2
          ? err(e2, res)
          : res.json({
              status: true,
              id: r2.insertId,
              message: 'Doctor created successfully',
            })
    );
  };
  if (b.division_id) return insert(b.division_id);
  getDivisionId(b.division_name, (e, id) => (e ? err(e, res) : insert(id)));
};

exports.update = (req, res) => {
  const id = req.params.id;
  const b = req.body;
  const doUpdate = (division_id) => {
    const allowed = [
      'category_id',
      'division_id',
      'full_name',
      'contact',
      'degrees',
      'years_experience',
      'specialty_detail',
      'clinic_or_hospital',
      'address',
      'visit_days',
      'visiting_time',
      'image_url',
      'status',
    ];
    const data = {};
    allowed.forEach((k) => {
      if (b[k] !== undefined) data[k] = b[k];
    });
    if (division_id !== undefined) data.division_id = division_id;

    q(
      `UPDATE doctors SET ?, updated_at=NOW() WHERE id=?`,
      [data, id],
      (e) =>
        e
          ? err(e, res)
          : res.json({ status: true, message: 'Doctor updated successfully' })
    );
  };
  if (b.division_name && !b.division_id) {
    return getDivisionId(b.division_name, (e, id) =>
      e ? err(e, res) : doUpdate(id)
    );
  }
  doUpdate(undefined);
};

exports.remove = (req, res) => {
  q(`UPDATE doctors SET status=0 WHERE id=?`, [req.params.id], (e, r) =>
    e
      ? err(e, res)
      : res.json({
          status: true,
          message: r.affectedRows ? 'Doctor deleted' : 'Not found',
        })
  );
};


exports.uploadImage = [
  upload.single('image'),
  (req, res) => {
    console.log('📸 Upload request for doctor ID:', req.params.id);

    const id = req.params.id;
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: 'No image uploaded',
      });
    }

    const relativePath = `${IMAGE_BASE_URL}/${req.file.filename}`;

    const fullUrl = `${req.protocol}://${req.get('host')}/${relativePath}`;

    console.log('✅ Received file:', {
      original: req.file.originalname,
      stored_as: req.file.filename,
      saved_path: relativePath,
      full_url: fullUrl,
    });

    q(
      `UPDATE doctors SET image_url=?, updated_at=NOW() WHERE id=?`,
      [relativePath, id],
      (e) =>
        e
          ? err(e, res)
          : res.json({
              status: true,
              image_url: fullUrl, 
              message: 'Image uploaded successfully',
            })
    );
  },
];
