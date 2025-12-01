const db = require("../helpers/db_helpers");


function getType(userId, cb) {

 
  db.query("SELECT user_type FROM user_detail WHERE user_id=? LIMIT 1",
    [userId],
    (err, rows) => {
      if (!err && rows.length) {
        const t = rows[0].user_type;
        if (t == 2) return cb("doctor");
        if (t == 3) return cb("shop");
        return cb("user");
      }

      db.query("SELECT id FROM doctors WHERE id=? LIMIT 1",
        [userId],
        (err2, r2) => {
          if (!err2 && r2.length) return cb("doctor");

          db.query("SELECT id FROM medical_shops WHERE id=? LIMIT 1",
            [userId],
            (err3, r3) => {
              if (!err3 && r3.length) return cb("shop");

              return cb("user");
            });
        });
    });
}

exports.getRecentChats = (req, res) => {
  const userId = parseInt(req.params.userId);

  if (!userId) {
    return res.json({ status: 0, message: "Missing userId" });
  }

 getType(userId, (viewerType) => {
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
        console.log("Recent Chats DB Error:", err);
        return res.json({ status: 0, message: "DB error" });
      }

      if (!rows.length) {
        return res.json({ status: 1, data: [] });
      }

      const finalList = [];
      let pending = rows.length;

      rows.forEach((item) => {
        const partnerId = item.partner_id;
        let partnerType = item.partner_type;

       
        if (viewerType === "doctor") {
          partnerType = "user";
        } else if (viewerType === "shop") {
          partnerType = "user";
        } else {
          partnerType = item.partner_type; 
        }

       
        let table = "";
        let idField = "";
        let nameField = "";
        let imageField = "";

        if (partnerType === "doctor") {
          table = "doctors";
          idField = "id";
          nameField = "full_name";
          imageField = "image_url";
        } else if (partnerType === "shop") {
          table = "medical_shops";
          idField = "id";
          nameField = "full_name";
          imageField = "image_url";
        } else {
          table = "user_detail";
          idField = "user_id";
          nameField = "CONCAT(first_name, ' ', last_name)";
          imageField = "image"; 
        }

        const q = `
SELECT ${nameField} AS name, ${imageField} AS image_url
          FROM ${table}
          WHERE ${idField} = ?
          LIMIT 1
        `;

        db.query(q, [partnerId], (err2, info) => {
          pending--;

          const name = info && info.length ? info[0].name : "Unknown";
          const img = info && info.length ? info[0].image_url : ""; 

          finalList.push({
            msg_id: item.msg_id,
            partner_id: partnerId,
            partner_type: partnerType,
            name,
            image_url: img,
            last_message:
              item.message_type === "text" ? item.message : "[Image]",
            message_type: item.message_type,
            file_url: item.file_url,
            created_at: item.created_at,
          });

          if (pending === 0) {
            finalList.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );
            return res.json({ status: 1, data: finalList });
          }
        });
      });
    });
  });
};
