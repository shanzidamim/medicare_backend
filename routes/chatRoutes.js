// routes/chatRoutes.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const db = require("../helpers/db_helpers");

// --------------------------------------------------
// Detect type
// --------------------------------------------------
function getType(userId, cb) {
  db.query(
    "SELECT user_type FROM user_detail WHERE user_id=? LIMIT 1",
    [userId],
    (err, rows) => {
      if (!err && rows.length) {
        const t = rows[0].user_type;
        if (t == 2) return cb("doctor");
        if (t == 3) return cb("shop");
        return cb("user");
      }

      db.query("SELECT id FROM doctors WHERE id=? LIMIT 1", [userId], (e2, r2) => {
        if (!e2 && r2.length) return cb("doctor");

        db.query("SELECT id FROM medical_shops WHERE id=? LIMIT 1", [userId], (e3, r3) => {
          if (!e3 && r3.length) return cb("shop");

          return cb("user");
        });
      });
    }
  );
}

// --------------------------------------------------
// SEND MESSAGE (text + image)
// --------------------------------------------------
router.post("/send", (req, res) => {
  const { sender_id, receiver_id, message, image_url, message_type } = req.body;

  if (!sender_id || !receiver_id) {
    return res.json({ status: 0, message: "Missing sender/receiver" });
  }

  // ---------------- TEXT ----------------
  if (message_type === "text") {
    if (!message || message.trim() === "") {
      return res.json({ status: 0, message: "Missing message" });
    }

    getType(sender_id, (senderType) => {
      getType(receiver_id, (receiverType) => {
        db.query(
          `INSERT INTO messages
           (sender_id, receiver_id, sender_type, receiver_type, message, message_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [sender_id, receiver_id, senderType, receiverType, message, "text"],
          (err) => {
            if (err) return res.json({ status: 0, message: "DB error" });
            res.json({ status: 1, message: "text_saved" });
          }
        );
      });
    });

    return;
  }

  // ---------------- IMAGE ----------------
  if (message_type === "image") {
    if (!image_url) return res.json({ status: 0, message: "Missing image" });

    const fileName = Date.now() + ".jpg";

    // FIXED ABSOLUTE PATH
    const savePath = path.join(__dirname, "../public/chat/", fileName);

    try {
      fs.writeFileSync(savePath, Buffer.from(image_url, "base64"));
    } catch (e) {
      console.log("❌ Image Save Error:", e);
      return res.json({ status: 0, message: "Image save error" });
    }

    getType(sender_id, (senderType) => {
      getType(receiver_id, (receiverType) => {
        db.query(
          `INSERT INTO messages
           (sender_id, receiver_id, sender_type, receiver_type, message_type, file_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          + [sender_id, receiver_id, senderType, receiverType, "image", "/chat/" + fileName],

          (err) => {
            if (err) return res.json({ status: 0, message: "DB error" });

            res.json({
              status: 1,
              message: "image_saved",
              file_url: "/chat/" + fileName,
            });
          }
        );
      });
    });
  }
});

// --------------------------------------------------
// LOAD CHAT HISTORY
// --------------------------------------------------
router.post("/load_messages", (req, res) => {
  const { user_id, other_id } = req.body;

  if (!user_id || !other_id) {
    return res.json({ status: 0, message: "Missing user_id or other_id" });
  }

  db.query(
    `SELECT *
     FROM messages
     WHERE (sender_id=? AND receiver_id=?)
        OR (sender_id=? AND receiver_id=?)
     ORDER BY created_at ASC`,
    [user_id, other_id, other_id, user_id],
    (err, rows) => {
      if (err) {
        console.log("❌ LOAD MESSAGE ERROR:", err);
        return res.json({ status: 0, message: "DB error" });
      }

      res.json({ status: 1, data: rows });
    }
  );
});

module.exports = router;
