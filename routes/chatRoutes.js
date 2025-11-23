// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../helpers/db_helpers");

// --------------------------------------------------
// Common helper – detect type from users.role
// --------------------------------------------------
function getType(userId, cb) {
  db.query(
    "SELECT role FROM users WHERE user_id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err || !rows.length) return cb("user");

      const role = rows[0].role;
      if (role == 2) return cb("doctor");
      if (role == 3) return cb("shop");
      return cb("user");
    }
  );
}

// --------------------------------------------------
// 1️⃣ SEND TEXT (same logic as socket send_message)
// --------------------------------------------------
router.post("/send", (req, res) => {
  const { sender_id, receiver_id, message, message_type } = req.body;

  if (!sender_id || !receiver_id || !message) {
    return res.json({ status: 0, message: "Missing sender/receiver/message" });
  }

  getType(sender_id, (senderType) => {
    getType(receiver_id, (receiverType) => {
      db.query(
        `INSERT INTO messages
         (sender_id, receiver_id, sender_type, receiver_type, message, message_type)
         VALUES (?,?,?,?,?,?)`,
        [
          sender_id,
          receiver_id,
          senderType,
          receiverType,
          message,
          message_type || "text",
        ],
        (err) => {
          if (err) {
            console.log("❌ CHAT SEND ERROR:", err);
            return res.json({ status: 0, message: "DB error" });
          }
          res.json({ status: 1, message: "sent" });
        }
      );
    });
  });
});

// --------------------------------------------------
// 2️⃣ LOAD CHAT HISTORY
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


// --------------------------------------------------
// 3️⃣ RECENT CHAT LIST (user / doctor / shop)
// --------------------------------------------------
router.get("/user_list/:user_id", (req, res) => {
  const userId = req.params.user_id;

  detectViewerType(userId, (viewerType) => {
    console.log("Viewer type:", viewerType);

    const sql = `
      SELECT 
          m1.id AS msg_id,
          m1.sender_id,
          m1.receiver_id,
          m1.sender_type,
          m1.receiver_type,
          m1.message,
          m1.message_type,
          m1.file_url,
          m1.created_at,

          CASE 
              WHEN m1.sender_id = ? THEN m1.receiver_id
              ELSE m1.sender_id
          END AS partner_id,

          CASE 
              WHEN m1.sender_id = ? THEN m1.receiver_type
              ELSE m1.sender_type
          END AS partner_type

      FROM messages m1
      INNER JOIN (
          SELECT 
              LEAST(sender_id, receiver_id) AS a,
              GREATEST(sender_id, receiver_id) AS b,
              MAX(id) AS max_id
          FROM messages
          GROUP BY a, b
      ) m2 
          ON m1.id = m2.max_id

      WHERE m1.sender_id = ? OR m1.receiver_id = ?
      ORDER BY m1.created_at DESC
    `;

    db.query(sql, [userId, userId, userId, userId], (err, rows) => {
      if (err) {
        console.log("❌ Recent Chats Error:", err);
        return res.json({ status: 0, message: "DB error" });
      }

      if (rows.length === 0) {
        return res.json({ status: 1, data: [] });
      }

      const finalList = [];
      let pending = rows.length;

      rows.forEach((item) => {
        const partnerId = item.partner_id;
        let partnerType = item.partner_type;

        // --------------------------------------------------
        // FINAL FIX → viewerType changes partner_type
        // --------------------------------------------------
        if (viewerType === "doctor" || viewerType === "shop") {
          partnerType = "user";
        }

        let table = "";
        let idField = "";
        let nameField = "";
        let imgField = "";

        if (partnerType === "doctor") {
          table = "doctors";
          idField = "id";
          nameField = "full_name";
          imgField = "image_url";
        } else if (partnerType === "shop") {
          table = "medical_shops";
          idField = "id";
          nameField = "full_name";
          imgField = "image_url";
        } else {
          table = "user_detail";
          idField = "user_id";
          nameField = "CONCAT(first_name, ' ', last_name)";
          imgField = "image_url";
        }

        const q = `
          SELECT ${nameField} AS name, ${imgField} AS image_url
          FROM ${table}
          WHERE ${idField} = ?
          LIMIT 1
        `;

        db.query(q, [partnerId], (err2, info) => {
          pending--;

          const name = info?.length ? info[0].name : "Unknown";
          const img = info?.length ? info[0].image_url : "";

          finalList.push({
            partner_id: partnerId,
            partner_type: partnerType,
            name,
            image_url: img,
            last_message: item.message_type === "text" ? item.message : "[Image]",
            message_type: item.message_type,
            file_url: item.file_url,
            created_at: item.created_at,
          });

          if (pending === 0) {
            return res.json({ status: 1, data: finalList });
          }
        });
      });
    });
  });
});


module.exports = router;
