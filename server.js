const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Setup VAPID Keys for Web Push
const VAPID_FILE = path.join(__dirname, 'vapid-keys.json');
let vapidKeys;
if (fs.existsSync(VAPID_FILE)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading VAPID file, generating new keys', e);
  }
}

if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
  console.log('Generated new VAPID keys');
}

webpush.setVapidDetails(
  'mailto:app@kids-toy-beep.local',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory subscription storage: room -> { bat: [sub1, ...], kitty: [sub2, ...] }
const subscriptions = {};

// Public VAPID key endpoint
app.get('/api/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Register Web Push subscription
app.post('/api/subscribe', (req, res) => {
  const { room = 'bat-and-kitty', role, subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  if (!subscriptions[room]) {
    subscriptions[room] = { bat: [], kitty: [] };
  }

  const roleKey = role === 'bat' ? 'bat' : 'kitty';
  // Check if subscription already exists
  const existingIdx = subscriptions[room][roleKey].findIndex(s => s.endpoint === subscription.endpoint);
  if (existingIdx >= 0) {
    subscriptions[room][roleKey][existingIdx] = subscription;
  } else {
    subscriptions[room][roleKey].push(subscription);
  }

  res.json({ success: true });
});

// Trigger beep via HTTP (optional, can also be triggered via Socket.io)
app.post('/api/beep', async (req, res) => {
  const { room = 'bat-and-kitty', senderRole = 'bat' } = req.body;
  const targetRole = senderRole === 'bat' ? 'kitty' : 'bat';

  // 1. Broadcast via Socket.IO
  io.to(room).emit('beep', {
    senderRole,
    targetRole,
    timestamp: Date.now()
  });

  // 2. Send Web Push to the other person's registered subscriptions
  const pushPayload = JSON.stringify({
    title: 'beep beep beep',
    body: '₍ᐢ. ̫ .ᐢ₎',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: 'beep-alert',
    timestamp: Date.now(),
    sound: '/assets/beep.wav',
    vibrate: [200, 100, 200, 100, 200]
  });

  if (subscriptions[room] && subscriptions[room][targetRole]) {
    const list = subscriptions[room][targetRole];
    const staleIndices = [];

    await Promise.all(list.map(async (sub, idx) => {
      try {
        await webpush.sendNotification(sub, pushPayload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          staleIndices.push(idx);
        }
      }
    }));

    // Remove expired subscriptions
    if (staleIndices.length > 0) {
      subscriptions[room][targetRole] = list.filter((_, idx) => !staleIndices.includes(idx));
    }
  }

  res.json({ success: true });
});

// Socket.io Realtime connection
io.on('connection', (socket) => {
  let currentRoom = 'bat-and-kitty';
  let currentRole = 'bat';

  socket.on('join', ({ room = 'bat-and-kitty', role = 'bat' }) => {
    socket.leave(currentRoom);
    currentRoom = room;
    currentRole = role;
    socket.join(room);
  });

  socket.on('beep', async (data) => {
    const room = data.room || currentRoom;
    const senderRole = data.role || currentRole;
    const targetRole = senderRole === 'bat' ? 'kitty' : 'bat';

    // Broadcast to everyone else in this room
    socket.to(room).emit('beep', {
      senderRole,
      targetRole,
      timestamp: Date.now()
    });

    // Also send Web Push in case partner app is in background or screen is off
    const pushPayload = JSON.stringify({
      title: 'beep beep beep',
      body: '₍ᐢ. ̫ .ᐢ₎',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: 'beep-alert',
      timestamp: Date.now(),
      sound: '/assets/beep.wav',
      vibrate: [200, 100, 200, 100, 200]
    });

    if (subscriptions[room] && subscriptions[room][targetRole]) {
      const list = subscriptions[room][targetRole];
      const staleIndices = [];

      await Promise.all(list.map(async (sub, idx) => {
        try {
          await webpush.sendNotification(sub, pushPayload);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            staleIndices.push(idx);
          }
        }
      }));

      if (staleIndices.length > 0) {
        subscriptions[room][targetRole] = list.filter((_, idx) => !staleIndices.includes(idx));
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cute Beep App running on http://localhost:${PORT}`);
});

