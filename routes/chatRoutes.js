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
// SEND MESSAGE (TEXT + IMAGE)
// --------------------------------------------------
router.post("/send", (req, res) => {
  const { sender_id, receiver_id, message, image_url, message_type } = req.body;

  if (!sender_id || !receiver_id) {
    return res.json({ status: 0, message: "Missing sender/receiver" });
  }

  // =================== TEXT ===================
  if (message_type === "text") {
    if (!message || message.trim() === "") {
      return res.json({ status: 0, message: "Missing message" });
    }

    getType(sender_id, (senderType) => {
      getType(receiver_id, (receiverType) => {
        db.query(
          `INSERT INTO messages
           (sender_id, receiver_id, sender_type, receiver_type, message, message_type)
           VALUES (?, ?, ?, ?, ?, 'text')`,
          [sender_id, receiver_id, senderType, receiverType, message],
          (err) => {
            if (err) return res.json({ status: 0, message: "DB error" });
            return res.json({ status: 1, message: "text_saved" });
          }
        );
      });
    });

    return;
  }

  // =================== IMAGE (ALL TYPES SUPPORTED) ===================
  if (message_type === "image") {
    if (!image_url) return res.json({ status: 0, message: "Missing image" });

    let s_id = parseInt(sender_id);
    let r_id = parseInt(receiver_id);

    // ensure folder exists
    const chatFolder = path.join(__dirname, "../public/chat/");
    if (!fs.existsSync(chatFolder)) {
      fs.mkdirSync(chatFolder, { recursive: true });
    }

    // ================= Detect extension =================
    let ext = "jpg";

    if (image_url.startsWith("data:image/png")) ext = "png";
    if (image_url.startsWith("data:image/jpeg")) ext = "jpg";
    if (image_url.startsWith("data:image/jpg")) ext = "jpg";
    if (image_url.startsWith("data:image/webp")) ext = "webp";
    if (image_url.startsWith("data:image/heic")) ext = "heic";

    // remove base64 header
    let base64Data = image_url.replace(/^data:image\/\w+;base64,/, "");

    // create file name
    const fileName = Date.now() + "." + ext;
    const savePath = path.join(chatFolder, fileName);

    try {
      fs.writeFileSync(savePath, Buffer.from(base64Data, "base64"));
    } catch (err) {
      console.log("❌ Image Save Error:", err);
      return res.json({ status: 0, message: "Image save error" });
    }

    // save in DB
    getType(s_id, (senderType) => {
      getType(r_id, (receiverType) => {
        db.query(
          `INSERT INTO messages
           (sender_id, receiver_id, sender_type, receiver_type, message_type, file_url)
           VALUES (?, ?, ?, ?, 'image', ?)`,
          [s_id, r_id, senderType, receiverType, "/chat/" + fileName],
          (err) => {
            if (err) return res.json({ status: 0, message: "DB error" });

            return res.json({
              status: 1,
              message: "image_saved",
              file_url: "/chat/" + fileName,
            });
          }
        );
      });
    });

    return;
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

      return res.json({ status: 1, data: rows });
    }
  );
});

module.exports = router;
