const helper = require('./../helpers/helpers');
const db = require('./../helpers/db_helpers');

module.exports.controller = (app, io, socket_list) => {
  function doctorRoom(userId, doctorId) {
    return `room:doctor:${userId}:${doctorId}`;
  }
  function shopRoom(userId, shopId) {
    return `room:shop:${userId}:${shopId}`;
  }

  io.on('connection', (socket) => {
    // client says: I am user X → store socket
    socket.on('UpdateSocket', (payload) => {
      try {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!data.user_id) {
          return socket.emit('UpdateSocket', { status:'0', message:'user_id required' });
        }
        socket_list['us_' + data.user_id] = { socket_id: socket.id };
        socket.emit('UpdateSocket', { status:'1', message:'success' });
      } catch {
        socket.emit('UpdateSocket', { status:'0', message:'bad payload' });
      }
    });

    // join a room (doctor or shop)
    // { room_type: 'doctor'|'shop', user_id, doctor_id? / shop_id? }
    socket.on('join_room', (data) => {
      const rt = data.room_type;
      if (rt === 'doctor' && data.user_id && data.doctor_id) {
        socket.join(doctorRoom(data.user_id, data.doctor_id));
      } else if (rt === 'shop' && data.user_id && data.shop_id) {
        socket.join(shopRoom(data.user_id, data.shop_id));
      }
    });

    // send message (persist + broadcast)
    // { room_type, user_id, doctor_id?|shop_id?, sender, message }
    socket.on('send_message', (data) => {
      const { room_type, user_id, doctor_id, shop_id, sender, message } = data || {};
      const rt = room_type || (doctor_id ? 'doctor' : 'shop');
      if (!user_id || !sender || !message) return;

      db.query(
        'INSERT INTO messages (room_type, doctor_id, shop_id, user_id, sender, message) VALUES (?,?,?,?,?,?)',
        [rt, doctor_id || null, shop_id || null, user_id, sender, message],
        (e, r) => {
          if (e) return;
          const payload = {
            id: r.insertId,
            room_type: rt,
            doctor_id: doctor_id || null,
            shop_id: shop_id || null,
            user_id,
            sender,
            message,
            created_at: new Date()
          };
          const room = rt === 'doctor'
            ? doctorRoom(user_id, doctor_id)
            : shopRoom(user_id, shop_id);
          io.to(room).emit('room_message', payload);
        }
      );
    });
  });
};
