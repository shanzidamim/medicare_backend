const fs = require("fs");
const path = require("path");
const db = require("../helpers/db_helpers");

module.exports.controller = (app, io, socket_list) => {

  // =====================================================
  // IDENTIFY USER TYPE (doctor / shop / user)
  // =====================================================
 function getType(id, cb) {
  db.query("SELECT id FROM doctors WHERE id=?", [id], (e1, r1) => {
    if (r1.length) return cb("doctor");

    db.query("SELECT id FROM medical_shops WHERE id=?", [id], (e2, r2) => {
      if (r2.length) return cb("shop");

      return cb("user");
    });
  });
}
  // =====================================================
  // CREATE CONSISTENT ROOM (same for both sides)
  // =====================================================
  function makeRoom(sender, receiver) {
    const a = parseInt(sender);
    const b = parseInt(receiver);
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  // =====================================================
  // SOCKET CONNECT
  // =====================================================
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

    // =====================================================
    // SEND TEXT MESSAGE (AUTO sender_type + receiver_type)
    // =====================================================
    socket.on("send_message", (data) => {
  const { sender_id, receiver_id, message } = data;

  getType(sender_id, (senderType) => {
    getType(receiver_id, (receiverType) => {
      
      const room = makeRoom(sender_id, receiver_id);

      db.query(`
        INSERT INTO messages(sender_id, receiver_id, sender_type, receiver_type, message, message_type)
        VALUES (?,?,?,?,?,'text')
      `, 
      [sender_id, receiver_id, senderType, receiverType, message],
      (err, result) => {

        if (err) return;

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
      });

    });
  });
});

    // =====================================================
    // SEND IMAGE MESSAGE (AUTO sender_type)
    // =====================================================
    socket.on("send_image", (data) => {
      const { sender_id, receiver_id, image_url } = data;

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
