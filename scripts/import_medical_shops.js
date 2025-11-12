// scripts/import_medical_shops.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../helpers/db_helpers');

const FILE = path.join(__dirname, '..', 'medical_shop_list.csv');

// csv-parser: normalize EVERY header -> trim + lowercase (removes BOM too)
const csvOpts = {
  mapHeaders: ({ header }) =>
    header ? header.replace(/^\uFEFF/, '').trim().toLowerCase() : header,
};

(async () => {
  const rows = [];

  fs.createReadStream(FILE)
    .pipe(csv(csvOpts))
    .on('data', row => rows.push(row))
    .on('end', async () => {
      if (!rows.length) {
        console.log('No rows found!');
        process.exit(0);
      }

      console.log('\n📦 Read', rows.length, 'medical shops from CSV');
      console.log('Detected columns:', Object.keys(rows[0]));

      let count = 0;

      for (const row of rows) {
        try {
          // All keys are now lowercase+trimmed, e.g. 'division_id', 'image_url'
          const division_id_raw = (row.division_id ?? row['division id'] ?? '').toString().trim();
          const division_id = division_id_raw === '' ? NaN : Number(division_id_raw);

          if (!Number.isFinite(division_id) || division_id <= 0) {
            console.log('⚠️  Skipping shop due to missing or invalid division_id:', row.full_name || row['full name']);
            continue;
          }

          const shop = {
            user_id: 0,
            full_name: (row.full_name ?? row['full name'] ?? '').toString().trim(),
            address: (row.address ?? '').toString().trim(),
            timing: (row.timing ?? '').toString().trim(),
            contact: (row.contact ?? '').toString().trim(),
            division_id,
            image_url: row.image_url ? `http://localhost:3002/${row.image_url.toString().trim()}` : '',
            status: 1,
          };

          // Insert
          await new Promise((resolve, reject) => {
            db.query('INSERT INTO medical_shops SET ?', shop, e => (e ? reject(e) : resolve()));
          });

          count++;
          console.log(`✅ [${count}/${rows.length}] Inserted: ${shop.full_name}`);
        } catch (e) {
          console.error('❌ Insert failed:', e.message);
        }
      }

      console.log(`\n🎯 Done! Successfully inserted ${count} shops.`);
      process.exit(0);
    });
})();
