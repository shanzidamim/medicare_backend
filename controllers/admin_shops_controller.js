
const { q, err, getDivisionId } = require('./_admin_common');

exports.list = (req, res) =>
  q(`SELECT s.*, d.division_name FROM medical_shops s
      LEFT JOIN divisions d ON d.id=s.division_id
     ORDER BY s.id DESC`, (e, rows) =>
    e ? err(e, res) : res.json({ status:true, data: rows })
  );

exports.get = (req, res) =>
  q(`SELECT * FROM medical_shops WHERE id=?`, [req.params.id], (e, r)=>
    e ? err(e, res) : res.json({ status:true, data:r[0]||null })
  );

exports.create = (req, res) => {
  const b = req.body; // full_name,address,timing,contact,division_id OR division_name,image_url,status,user_id?
  const insert = (division_id)=>{
    const row = {
      user_id: b.user_id ?? null,
      full_name: b.full_name || '',
      address: b.address || '',
      timing: b.timing || '',
      contact: b.contact || '',
      division_id,
      image_url: b.image_url || '',
      status: b.status ?? 1
    };
    q(`INSERT INTO medical_shops SET ?, created_at=NOW(), updated_at=NOW()`, [row], (e2,r2)=>
      e2 ? err(e2, res) : res.json({ status:true, id:r2.insertId, message:'Shop created' })
    );
  };
  if (b.division_id) return insert(b.division_id);
  getDivisionId(b.division_name, (e, id)=> e ? err(e, res) : insert(id));
};

exports.update = (req, res) => {
  const id = req.params.id;
  const b  = req.body;
  const doUpdate = (division_id) => {
    const allowed = ['user_id','full_name','address','timing','contact','division_id','image_url','status'];
    const data = {};
    allowed.forEach(k=>{ if (b[k] !== undefined) data[k]=b[k]; });
    if (division_id !== undefined) data.division_id = division_id;
    q(`UPDATE medical_shops SET ?, updated_at=NOW() WHERE id=?`, [data, id], (e)=>
      e ? err(e, res) : res.json({ status:true, message:'Shop updated' })
    );
  };
  if (b.division_name && !b.division_id) {
    return getDivisionId(b.division_name, (e, id)=> e ? err(e, res) : doUpdate(id));
  }
  doUpdate(undefined);
};

exports.remove = (req, res) =>
  q(`DELETE FROM medical_shops WHERE id=?`, [req.params.id], (e)=>
    e ? err(e, res) : res.json({ status:true, message:'Shop deleted' })
  );
