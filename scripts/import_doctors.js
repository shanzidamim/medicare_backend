
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); 
const db = require('../helpers/db_helpers');

const FILE = path.join(__dirname, '..', 'merged_doctor_list_with_sheetname.csv');

const normalizeCategory = (raw) => {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.includes('cardiol')) return 'Cardiologist';
  if (s.includes('pulmon')) return 'Pulmonologist';
  if (s.includes('diabet')) return 'Diabetologist';
  if (s.includes('onco'))   return 'Oncologist';
  if (s.includes('child'))  return 'Child Specialist';
  return raw; 
};

const normalizeDivision = (raw) => {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('dhaka')) return 'Dhaka';
  if (s.includes('chat') || s.includes('chitt')) return 'Chattogram';
  if (s.includes('raj')) return 'Rajshahi';
  if (s.includes('khul')) return 'Khulna';
  if (s.includes('ran')) return 'Rangpur';
  if (s.includes('syl')) return 'Sylhet';
  if (s.includes('mym')) return 'Mymensingh';
  if (s.includes('bar')) return 'Barishal';
  return null;
};

const idCache = { cat: {}, div: {} };
const getCategoryId = (name) => new Promise((resolve, reject) => {
  if (!name) return resolve(null);
  if (idCache.cat[name]) return resolve(idCache.cat[name]);
  db.query('SELECT id FROM doctor_categories WHERE category_name=?', [name], (e,r)=>{
    if (e) return reject(e);
    if (r.length) { idCache.cat[name]=r[0].id; return resolve(r[0].id); }
    db.query('INSERT INTO doctor_categories(category_name) VALUES(?)', [name], (e2, r2)=>{
      if (e2) return reject(e2);
      idCache.cat[name]=r2.insertId; resolve(r2.insertId);
    });
  });
});
const getDivisionId = (name) => new Promise((resolve, reject) => {
  if (!name) return resolve(null);
  if (idCache.div[name]) return resolve(idCache.div[name]);
  db.query('SELECT id FROM divisions WHERE division_name=?', [name], (e,r)=>{
    if (e) return reject(e);
    if (r.length) { idCache.div[name]=r[0].id; return resolve(r[0].id); }
    db.query('INSERT INTO divisions(division_name) VALUES(?)', [name], (e2, r2)=>{
      if (e2) return reject(e2);
      idCache.div[name]=r2.insertId; resolve(r2.insertId);
    });
  });
});

const COL = {
  full_name: 'full_name',
  contact: 'contact',
  degrees: 'degrees',
  years_experience: 'years_experience',
  specialty_detail: 'specialty_detail',
  clinic_or_hospital: 'clinic_or_hospital',
  address: 'address',
  visit_days: 'visit_days',
  visiting_time: 'visiting_time',
  division: 'division',         
  image_url: 'image_url',
  category: 'category'        
};

(async () => {
  const rows = [];
  fs.createReadStream(FILE)
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      console.log(`Read ${rows.length} rows`);
      for (const row of rows) {
        try {
          const rawCat = normalizeCategory(row[COL.category]);
          const rawDiv = normalizeDivision(row[COL.division]);
          const category_id = await getCategoryId(rawCat);
          const division_id = await getDivisionId(rawDiv);

          if (!category_id || !division_id) {
            console.log('Skipping row due to missing category/division:', row[COL.full_name]);
            continue;
          }

          const doc = {
            category_id,
            division_id,
            full_name: row[COL.full_name] || '',
            contact: row[COL.contact] || '',
            degrees: row[COL.degrees] || '',
            years_experience: row[COL.years_experience] ? Number(row[COL.years_experience]) : null,
            specialty_detail: row[COL.specialty_detail] || '',
            clinic_or_hospital: row[COL.clinic_or_hospital] || '',
            address: row[COL.address] || '',
            visit_days: row[COL.visit_days] || '',
            visiting_time: row[COL.visiting_time] || '',
            image_url: row[COL.image_url] || ''
          };

          await new Promise((resolve, reject) => {
            db.query('INSERT INTO doctors SET ?', doc, (e) => e ? reject(e) : resolve());
          });
          console.log('Inserted:', doc.full_name);
        } catch (e) {
          console.error('Insert failed for row:', e);
        }
      }
      console.log('Done.');
      process.exit(0);
    });
})();
