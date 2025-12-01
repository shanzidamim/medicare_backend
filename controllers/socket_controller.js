const fs = require("fs");
const path = require("path");
const db = require("../helpers/db_helpers");

module.exports.controller = (app, io, socket_list) => {

  
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

  
  function makeRoom(a, b) {
    a = parseInt(a);
    b = parseInt(b);
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  
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
                console.log(" DB Text Msg Error:", err);
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

    
    socket.on("send_image", (data) => {

      let sender_id = parseInt(data.sender_id);
      let receiver_id = parseInt(data.receiver_id);
      let image_url = data.image_url;

      if (!sender_id || !receiver_id || !image_url) return;

      let ext = "jpg";

      if (image_url.startsWith("data:image/png")) ext = "png";
      if (image_url.startsWith("data:image/jpeg")) ext = "jpg";
      if (image_url.startsWith("data:image/jpg")) ext = "jpg";
      if (image_url.startsWith("data:image/webp")) ext = "webp";
      if (image_url.startsWith("data:image/heic")) ext = "heic";

      image_url = image_url.replace(/^data:image\/\w+;base64,/, "");

      const chatFolder = path.join(__dirname, "../public/chat/");
      if (!fs.existsSync(chatFolder)) {
        fs.mkdirSync(chatFolder, { recursive: true });
      }

      const fileName = Date.now() + "." + ext;
      const savePath = path.join(chatFolder, fileName);

      try {
        fs.writeFileSync(savePath, Buffer.from(image_url, "base64"));
      } catch (err) {
        console.log("❌ Image Save Error:", err);
        return;
      }

      getType(sender_id, (senderType) => {
        getType(receiver_id, (receiverType) => {

          db.query(
            `INSERT INTO messages
             (sender_id, receiver_id, sender_type, receiver_type, message_type, file_url)
             VALUES (?, ?, ?, ?, 'image', ?)`,
            [sender_id, receiver_id, senderType, receiverType, "/chat/" + fileName],
            (err, result) => {
              if (err) {
                console.log(" DB Image Msg Error:", err);
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

              console.log("🖼 IMAGE SAVED:", payload.file_url);
            }
          );

        });
      });
    });

  });
};
