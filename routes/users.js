var express = require('express');
var router = express.Router();
const db = require('../helpers/db_helpers');   

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


router.get('/:id', (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT user_id, first_name, email, mobile FROM user_detail WHERE user_id=?",
    [id],
    (err, rows) => {
      if (err) return res.json({ status: false, message: "DB error" });
      if (!rows.length) return res.json({ status: false, message: "Not found" });

      res.json({ status: true, data: rows[0] });
    }
  );
});


router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { first_name, email, mobile, password } = req.body;

  const sql = `
    UPDATE user_detail SET 
      first_name=?, 
      email=?, 
      mobile=?
      ${password ? ", password=?" : ""}
    WHERE user_id=?
  `;

  const params = password
      ? [first_name, email, mobile, password, id]
      : [first_name, email, mobile, id];

  db.query(sql, params, (err, result) => {
    if (err) return res.json({ status: false, message: "DB error" });
    res.json({ status: true, message: "User updated" });
  });
});

module.exports = router;
