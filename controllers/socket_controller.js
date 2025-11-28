// controllers/socket_chat.js
const fs = require("fs");
const path = require("path");
const db = require("../helpers/db_helpers");

module.exports.controller = (app, io, socket_list) => {

  // --------------------------------------------------
  // DETECT USER TYPE
  // --------------------------------------------------
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
  // MAKE ROOM NAME
  // --------------------------------------------------
  function makeRoom(a, b) {
    a = parseInt(a);
    b = parseInt(b);
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  // --------------------------------------------------
  // SOCKET CONNECTION
  // --------------------------------------------------
  io.on("connection", (socket) => {
    console.log("⚡ User connected:", socket.id);

    socket.on("UpdateSocket", (data) => {
      socket_list["us_" + data.user_id] = socket.id;
      console.log("🔗 Socket Updated:", data.user_id);
    });

    // JOIN ROOM
    socket.on("join_room", (data) => {
      const room = makeRoom(data.sender_id, data.receiver_id);
      socket.join(room);
      console.log("🚪 Joined Room:", room);
    });

    // --------------------------------------------------
    // SEND TEXT MESSAGE
    // --------------------------------------------------
    socket.on("send_message", (data) => {
      const { sender_id, receiver_id, message } = data;
      if (!sender_id || !receiver_id || !message) return;

      getType(sender_id, (senderType) => {
        getType(receiver_id, (receiverType) => {

          db.query(
            `INSERT INTO messages
             (sender_id, receiver_id, sender_type, receiver_type, message, message_type)
             VALUES (?, ?, ?, ?, ?, 'text')`,
            [sender_id, receiver_id, senderType, receiverType, message],
            (err, result) => {
              if (err) {
                console.log("❌ DB Text Msg Error:", err);
                return;
              }

              const room = makeRoom(sender_id, receiver_id);

              const payload = {
                id: result.insertId,
                sender_id,
                receiver_id,
                sender_type: senderType,
                receiver_type: receiverType,
                message,
                message_type: "text",
                created_at: new Date(),
              };

              io.to(room).emit("room_message", payload);
            }
          );
        });
      });
    });

    // --------------------------------------------------
    // SEND IMAGE MESSAGE (FULL FIX)
    // --------------------------------------------------
    socket.on("send_image", (data) => {
      const { sender_id, receiver_id, image_url } = data;
      if (!sender_id || !receiver_id || !image_url) return;

      getType(sender_id, (senderType) => {
        getType(receiver_id, (receiverType) => {

          const fileName = Date.now() + ".jpg";

          // ⭐ FIX #4: Correct absolute path
          const savePath = path.join(__dirname, "../public/chat/", fileName);

          try {
            fs.writeFileSync(savePath, Buffer.from(image_url, "base64"));
          } catch (err) {
            console.log("❌ Image Save Error:", err);
            return;
          }

          db.query(
            `INSERT INTO messages
             (sender_id, receiver_id, sender_type, receiver_type, message_type, file_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
        + [sender_id, receiver_id, senderType, receiverType, "image", "/chat/" + fileName],

            (err, result) => {
              if (err) {
                console.log("❌ DB Image Msg Error:", err);
                return;
              }

              const room = makeRoom(sender_id, receiver_id);

              const payload = {
                id: result.insertId,
                sender_id,
                receiver_id,
                sender_type: senderType,
                receiver_type: receiverType,
                message_type: "image",
                file_url: "/chat/" + fileName,
                created_at: new Date(),
              };

              io.to(room).emit("room_message", payload);

              console.log("🖼️ IMAGE SENT:", payload.file_url);
            }
          );

        });
      });
    });

  });
};
