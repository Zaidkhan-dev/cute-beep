/* =========================================================
   Kids Toy App Logic & 24/7 Free Cloud Messaging Engine
   ========================================================= */

(function () {
  'use strict';

  // --- State ---
  let myRole = localStorage.getItem('toy_role') || 'bat';
  // Shared pair room - defaults to a cute shared secret channel
  let myRoom = localStorage.getItem('toy_room') || 'bat_and_kitty_forever_chime';
  let soundEnabled = localStorage.getItem('toy_sound') !== 'false';
  let audioCtx = null;
  let deferredInstallPrompt = null;
  let swRegistration = null;
  let cloudWs = null;
  let wsReconnectTimer = null;

  // --- DOM Elements ---
  const roleBatBtn = document.getElementById('role-bat');
  const roleKittyBtn = document.getElementById('role-kitty');
  const bigBeepBtn = document.getElementById('big-beep-btn');
  const buttonHousing = document.querySelector('.button-housing');
  const auraRings = document.getElementById('aura-rings');
  const reactionBubble = document.getElementById('reaction-bubble');
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');
  const installBtn = document.getElementById('install-btn');
  const connectionLed = document.getElementById('connection-led');
  const secretPairBtn = document.getElementById('secret-pair-btn');
  const pairModal = document.getElementById('pair-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const codeDisplay = document.getElementById('code-display');
  const audioEl = document.getElementById('audio-beep');
  const canvas = document.getElementById('particle-canvas');

  // --- 24/7 Free Cloud Channel (Works with Laptop Closed!) ---
  function connectCloud() {
    if (cloudWs) {
      try { cloudWs.close(); } catch (e) {}
    }

    const wsUrl = `wss://ntfy.sh/${myRoom}/ws`;
    try {
      cloudWs = new WebSocket(wsUrl);

      cloudWs.onopen = () => {
        connectionLed.classList.remove('alert');
        if (wsReconnectTimer) {
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = null;
        }
      };

      cloudWs.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          // ntfy sends 'open', 'keepalive', 'message'
          if (packet.event === 'message' && packet.message) {
            let payload = {};
            try {
              payload = JSON.parse(packet.message);
            } catch (err) {
              payload = { senderRole: myRole === 'bat' ? 'kitty' : 'bat' };
            }

            // Only trigger if sent from the partner
            if (payload.senderRole && payload.senderRole !== myRole) {
              handleIncomingBeep(payload);
            }
          }
        } catch (e) {
          console.warn('Error processing cloud message', e);
        }
      };

      cloudWs.onerror = () => {
        connectionLed.classList.add('alert');
      };

      cloudWs.onclose = () => {
        connectionLed.classList.add('alert');
        if (!wsReconnectTimer) {
          wsReconnectTimer = setTimeout(connectCloud, 3000);
        }
      };
    } catch (err) {
      console.warn('WebSocket connection error', err);
      if (!wsReconnectTimer) {
        wsReconnectTimer = setTimeout(connectCloud, 4000);
      }
    }
  }

  // Also support local Socket.io if running local server
  if (typeof io !== 'undefined') {
    try {
      const localSocket = io({ reconnectionAttempts: 2, timeout: 2000 });
      localSocket.on('connect', () => {
        localSocket.emit('join', { room: myRoom, role: myRole });
      });
      localSocket.on('beep', (data) => {
        if (data.senderRole !== myRole) {
          handleIncomingBeep(data);
        }
      });
    } catch (e) {}
  }

  // --- Web Audio Synthesizer (Sweet Melodic Toy Chime) ---
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Play charming "beep beep beep" - 3 high-pitch sweet musical toy notes
  function playBeepSound() {
    if (!soundEnabled) return;
    initAudio();

    if (audioCtx) {
      const now = audioCtx.currentTime;
      // 3 bright playful toy notes: E6 (1318.5 Hz), G#6 (1661.2 Hz), B6 (1975.5 Hz)
      const notes = [
        { time: 0.05, freq: 1318.51, dur: 0.22 },
        { time: 0.35, freq: 1661.22, dur: 0.22 },
        { time: 0.65, freq: 1975.53, dur: 0.38 }
      ];

      notes.forEach((note) => {
        const start = now + note.time;
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(note.freq, start);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(note.freq * 2.01, start);

        gain1.gain.setValueAtTime(0.001, start);
        gain1.gain.exponentialRampToValueAtTime(0.45, start + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);

        gain2.gain.setValueAtTime(0.001, start);
        gain2.gain.exponentialRampToValueAtTime(0.18, start + 0.012);
        gain2.gain.exponentialRampToValueAtTime(0.0001, start + note.dur * 0.7);

        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc1.start(start);
        osc1.stop(start + note.dur + 0.05);
        osc2.start(start);
        osc2.stop(start + note.dur + 0.05);
      });
    }

    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
    }
  }

  // Tactile click pop tone on button press
  function playTactilePop() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  // --- Role Selection (Bat-Cat vs Kitty-Cat) ---
  function updateRoleUI() {
    if (myRole === 'bat') {
      roleBatBtn.classList.add('active');
      roleKittyBtn.classList.remove('active');
    } else {
      roleKittyBtn.classList.add('active');
      roleBatBtn.classList.remove('active');
    }
    localStorage.setItem('toy_role', myRole);
  }

  roleBatBtn.addEventListener('click', () => {
    initAudio();
    myRole = 'bat';
    updateRoleUI();
    playTactilePop();
    triggerParticles(roleBatBtn.getBoundingClientRect(), ['🦇', '✨', '🐾']);
    if (navigator.vibrate) navigator.vibrate(40);
  });

  roleKittyBtn.addEventListener('click', () => {
    initAudio();
    myRole = 'kitty';
    updateRoleUI();
    playTactilePop();
    triggerParticles(roleKittyBtn.getBoundingClientRect(), ['🎀', '✨', '🐾']);
    if (navigator.vibrate) navigator.vibrate(40);
  });

  // --- Huge Button Press Event ---
  function pressBigButton() {
    initAudio();
    playTactilePop();

    if (navigator.vibrate) {
      navigator.vibrate([60]);
    }

    bigBeepBtn.classList.add('pressed');
    setTimeout(() => bigBeepBtn.classList.remove('pressed'), 180);

    auraRings.classList.remove('active');
    void auraRings.offsetWidth;
    auraRings.classList.add('active');

    const rect = bigBeepBtn.getBoundingClientRect();
    const symbols = myRole === 'bat'
      ? ['🦇', '⭐', '💛', '🐾', '✨']
      : ['🎀', '💖', '🌸', '🐾', '✨'];
    triggerParticles(rect, symbols);

    // 1. Send via 24/7 Free Cloud Channel (Works with laptop closed!)
    fetch(`https://ntfy.sh/${myRoom}`, {
      method: 'POST',
      body: JSON.stringify({ senderRole: myRole, timestamp: Date.now() }),
      headers: {
        'Title': 'beep beep beep',
        'Priority': 'urgent',
        'Tags': 'cat,sparkles'
      }
    }).catch(() => {});

    // 2. Also send to local backend if running
    fetch('/api/beep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: myRoom, senderRole: myRole })
    }).catch(() => {});

    requestNotificationPermission();
  }

  bigBeepBtn.addEventListener('click', pressBigButton);

  // --- Incoming Beep Reaction ---
  function handleIncomingBeep(data) {
    playBeepSound();

    if (navigator.vibrate) {
      navigator.vibrate([120, 80, 120, 80, 160]);
    }

    buttonHousing.classList.remove('beeping');
    void buttonHousing.offsetWidth;
    buttonHousing.classList.add('beeping');

    auraRings.classList.remove('active');
    void auraRings.offsetWidth;
    auraRings.classList.add('active');

    const sender = data && data.senderRole ? data.senderRole : (myRole === 'bat' ? 'kitty' : 'bat');
    const badgeToDance = sender === 'bat' ? roleBatBtn : roleKittyBtn;
    badgeToDance.classList.remove('dancing');
    void badgeToDance.offsetWidth;
    badgeToDance.classList.add('dancing');

    reactionBubble.classList.add('show');
    setTimeout(() => {
      reactionBubble.classList.remove('show');
    }, 2400);

    const rect = buttonHousing.getBoundingClientRect();
    triggerParticles(rect, ['✨', '💖', '🎶', '⭐', '🐾']);

    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (swRegistration && swRegistration.showNotification) {
          swRegistration.showNotification('beep beep beep', {
            body: '₍ᐢ. ̫ .ᐢ₎',
            icon: '/assets/icon-192.png',
            badge: '/assets/icon-192.png',
            tag: 'beep-notice',
            renotify: true,
            vibrate: [200, 100, 200, 100, 200]
          });
        } else {
          new Notification('beep beep beep', {
            body: '₍ᐢ. ̫ .ᐢ₎',
            icon: '/assets/icon-192.png'
          });
        }
      } catch (e) {}
    }
  }

  // --- Sound Toggle ---
  function updateSoundUI() {
    if (soundEnabled) {
      soundBtn.classList.remove('muted');
      soundIcon.textContent = '🔔';
    } else {
      soundBtn.classList.add('muted');
      soundIcon.textContent = '🔕';
    }
  }

  soundBtn.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    localStorage.setItem('toy_sound', soundEnabled);
    updateSoundUI();
    if (soundEnabled) {
      playBeepSound();
    }
  });

  // --- Floating Particle Burst ---
  function triggerParticles(rect, emojis) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const count = 14;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'floating-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
      const distance = 90 + Math.random() * 80;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const rot = (Math.random() - 0.5) * 120 + 'deg';

      p.style.left = centerX + 'px';
      p.style.top = centerY + 'px';
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      p.style.setProperty('--rot', rot);

      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }

  // --- Ambient Canvas Sparkles ---
  function initAmbientCanvas() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const colors = ['#ffccd5', '#ffe5ec', '#fff0f3', '#e0e7ff', '#fff3b0'];

    for (let i = 0; i < 28; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 4 + 2,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: -Math.random() * 0.6 - 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- Discreet Keypad Modal (Custom Pair Room) ---
  let enteredCode = '';
  secretPairBtn.addEventListener('click', () => {
    initAudio();
    enteredCode = '';
    codeDisplay.textContent = '••••';
    pairModal.classList.remove('hidden');
  });

  closeModalBtn.addEventListener('click', () => {
    pairModal.classList.add('hidden');
  });

  pairModal.addEventListener('click', (e) => {
    if (e.target === pairModal) {
      pairModal.classList.add('hidden');
    }
  });

  const keyBtns = document.querySelectorAll('.key-btn');
  keyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      initAudio();
      playTactilePop();
      const val = btn.dataset.val;

      if (val === 'C') {
        enteredCode = '';
        codeDisplay.textContent = '••••';
      } else if (val === 'OK') {
        if (enteredCode.length > 0) {
          myRoom = 'bat_kitty_room_' + enteredCode;
          localStorage.setItem('toy_room', myRoom);
          connectCloud();
        }
        pairModal.classList.add('hidden');
      } else {
        if (enteredCode.length < 4) {
          enteredCode += val;
          codeDisplay.textContent = '•'.repeat(enteredCode.length) + '•'.repeat(4 - enteredCode.length);
        }
      }
    });
  });

  // --- Web Notifications & Service Worker Setup ---
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('SW registration error', e);
    }
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
  }

  // --- Android PWA / APK Install Prompt ---
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installBtn.style.display = 'flex';
  });

  installBtn.addEventListener('click', async () => {
    initAudio();
    playTactilePop();
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredInstallPrompt = null;
    } else {
      triggerParticles(installBtn.getBoundingClientRect(), ['📲', '✨', '🐾']);
    }
  });

  // --- Initialize ---
  updateRoleUI();
  updateSoundUI();
  initAmbientCanvas();
  registerServiceWorker();
  connectCloud();

  // Unlock audio on initial touch/click anywhere
  window.addEventListener('pointerdown', initAudio, { once: true });
})();
