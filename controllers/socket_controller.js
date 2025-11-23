// controllers/socket_chat.js
const fs = require("fs");
const path = require("path");
const db = require("../helpers/db_helpers");

module.exports.controller = (app, io, socket_list) => {
  // --------------------------------------------------
  // Detect account type from users.role (1=user,2=doctor,3=shop)
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
  // Same room name for both sides
  // --------------------------------------------------
  function makeRoom(sender, receiver) {
    const a = parseInt(sender);
    const b = parseInt(receiver);
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  // --------------------------------------------------
  // SOCKET CONNECT
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
    // SEND TEXT (sender_type / receiver_type auto detect)
    // --------------------------------------------------
    socket.on("send_message", (data) => {
      const { sender_id, receiver_id, message } = data;
      if (!sender_id || !receiver_id || !message) return;

      getType(sender_id, (senderType) => {
        getType(receiver_id, (receiverType) => {
          const room = makeRoom(sender_id, receiver_id);

          db.query(
            `INSERT INTO messages
             (sender_id, receiver_id, sender_type, receiver_type, message, message_type)
             VALUES (?,?,?,?,?,'text')`,
            [sender_id, receiver_id, senderType, receiverType, message],
            (err, result) => {
              if (err) {
                console.log("❌ DB Text Msg Error:", err);
                return;
              }

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
    // SEND IMAGE (sender_type / receiver_type auto detect)
    // --------------------------------------------------
    socket.on("send_image", (data) => {
      const { sender_id, receiver_id, image_url } = data;
      if (!sender_id || !receiver_id || !image_url) return;

      getType(sender_id, (senderType) => {
        getType(receiver_id, (receiverType) => {
          const room = makeRoom(sender_id, receiver_id);

          const fileName = Date.now() + ".jpg";
          const savePath = path.join("public/chat/", fileName);

          try {
            fs.writeFileSync(savePath, Buffer.from(image_url, "base64"));
          } catch (err) {
            console.log("❌ Image Save Error:", err);
            return;
          }

          db.query(
            `INSERT INTO messages
             (sender_id, receiver_id, sender_type, receiver_type, message_type, file_url)
             VALUES (?,?,?,?, 'image', ?)`,
            [sender_id, receiver_id, senderType, receiverType, "chat/" + fileName],
            (err, result) => {
              if (err) {
                console.log("❌ DB Image Msg Error:", err);
                return;
              }

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
              console.log("🖼️ IMAGE SENT → Room:", room, payload);
            }
          );
        });
      });
    });
  });
};
