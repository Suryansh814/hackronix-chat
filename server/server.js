const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Store users
const users = {}; // { username: socketId }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User registration
  socket.on('register', (username) => {
    const trimmedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      socket.emit('error', 'Username must be 3-20 characters');
      return;
    }

    if (users[trimmedUsername]) {
      socket.emit('error', 'Username already taken');
      return;
    }

    users[trimmedUsername] = socket.id;
    socket.username = trimmedUsername;
    
    // Notify everyone
    io.emit('user-joined', { username: trimmedUsername, count: Object.keys(users).length });
    io.emit('user-list', Object.keys(users));
    
    console.log(`${trimmedUsername} joined. Total users: ${Object.keys(users).length}`);
  });

  // Private message
  socket.on('private-message', ({ to, message }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit('message-received', {
        from: socket.username,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      socket.emit('message-sent', {
        to,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } else {
      socket.emit('user-offline', { to });
    }
  });

  // File upload (base64)
  socket.on('file-upload', ({ to, fileName, fileData, size }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit('file-received', {
        from: socket.username,
        fileName,
        fileData,
        size,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      delete users[socket.username];
      io.emit('user-left', { username: socket.username, count: Object.keys(users).length });
      io.emit('user-list', Object.keys(users));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Hackronix Chat server running on http://localhost:${PORT}`);
});
