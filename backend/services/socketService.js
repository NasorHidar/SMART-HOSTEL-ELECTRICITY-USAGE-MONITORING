const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a room based on the ESP device ID so users only receive their own device alerts
    socket.on('join_device', (esp_id) => {
      if (esp_id) {
        socket.join(esp_id);
        console.log(`[Socket.io] Socket ${socket.id} joined room/device: ${esp_id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

const sendAlert = (esp_id, alertData) => {
  if (io) {
    // Emit to the specific device room
    io.to(esp_id).emit('new_alert', alertData);
    console.log(`[Socket.io] Real-time alert sent to device room ${esp_id}:`, alertData.title || alertData.message);
  } else {
    console.warn('[Socket.io] Attempted to send alert but Socket.io is not initialized.');
  }
};

module.exports = {
  initSocket,
  getIO,
  sendAlert
};
