const express = require("express");
const router = express.Router();
const db = require("../helpers/db_helpers");


router.post("/add", (req, res) => {
  const {
    user_id,
    medicine_name,
    dose,
    time_of_day,
    reminder_time,   
    start_date,   
    end_date,       
    repeat_type
  } = req.body;

  if (!user_id || !medicine_name || !reminder_time || !start_date || !end_date) {
    return res.json({ status: 0, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO medicine_reminders
      (user_id, medicine_name, dose, time_of_day, reminder_time, start_date, end_date, repeat_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [user_id, medicine_name, dose, time_of_day, reminder_time, start_date, end_date, repeat_type],
    (err, result) => {
      if (err) {
        console.log(" DB ADD REMINDER ERROR:", err);
        return res.json({ status: 0, message: "DB error" });
      }

      return res.json({
        status: 1,
        message: "Reminder added",
        id: result.insertId
      });
    }
  );
});


router.get("/list/:user_id", (req, res) => {
  const user_id = req.params.user_id;

  if (!user_id) {
    return res.json({ status: 0, message: "Missing user_id" });
  }

  db.query(
    "SELECT * FROM medicine_reminders WHERE user_id=? AND active=1 ORDER BY reminder_time ASC",
    [user_id],
    (err, rows) => {
      if (err) {
        console.log(" DB LIST REMINDER ERROR:", err);
        return res.json({ status: 0, message: "DB error" });
      }

      return res.json({
        status: 1,
        data: rows || []
      });
    }
  );
});


router.post("/delete", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.json({ status: 0, message: "Missing reminder id" });
  }

  db.query(
    "UPDATE medicine_reminders SET active=0 WHERE id=?",
    [id],
    (err) => {
      if (err) {
        console.log(" DB DELETE REMINDER ERROR:", err);
        return res.json({ status: 0, message: "DB error" });
      }

      return res.json({ status: 1, message: "Reminder removed" });
    }
  );
});

module.exports = router;
