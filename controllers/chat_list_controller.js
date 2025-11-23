const db = require("../helpers/db_helpers");

exports.getRecentChats = (req, res) => {
  const userId = parseInt(req.params.userId);

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
      console.log(" Recent Chats DB Error:", err);
      return res.json({ status: 0, message: "DB error" });
    }

    if (rows.length === 0) {
      return res.json({ status: 1, data: [] });
    }

    const finalList = [];
    let pending = rows.length;

    rows.forEach((item) => {
      const partnerId = item.partner_id;
      const partnerType = item.partner_type;

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

        const name = info?.length ? info[0].name : "Unknown";
        const img = info?.length ? info[0].image_url : "";

        finalList.push({
          msg_id: item.msg_id,
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
};
