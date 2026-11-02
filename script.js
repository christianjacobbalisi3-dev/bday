(function () {
  'use strict';

  /* ================================================================
     CONFIGURATION
     ================================================================ */
  var CONFIG = {
    cardMessage:
      'Thank you for every sacrifice, every hug and every lesson.\n' +
      'You are the heart of our family, and we are so lucky to have you.\n' +
      'Happy Birthday, Mother — I love you!',
    cardFrom: 'Your loving child',
    wishText: '✨ Close your eyes and make a wish… ✨',
    blessingText: '🎉 May all your wishes come true, Mother 💖'
  };

  /* ---------- Elements ---------- */
  var stage      = document.getElementById('stage');
  var cakeWrap   = document.getElementById('cakeWrap');
  var candlesEl  = document.getElementById('candles');
  var blowBtn    = document.getElementById('blowBtn');
  var micBtn     = document.getElementById('micBtn');
  var cardBtn    = document.getElementById('cardBtn');
  var againBtn   = document.getElementById('againBtn');
  var soundBtn   = document.getElementById('soundBtn');
  var wishLine   = document.getElementById('wishLine');
  var floaters   = document.getElementById('floaters');
  var photoBtn   = document.getElementById('photoBtn');
  var photoInput = document.getElementById('photoInput');
  var backdrop   = document.getElementById('cardBackdrop');
  var cardMsg    = document.getElementById('cardMsg');
  var cardFrom   = document.getElementById('cardFrom');
  var cardDone   = document.getElementById('cardDone');
  var canvas     = document.getElementById('confetti');
  var ctx        = canvas.getContext ? canvas.getContext('2d') : null;

  var CANDLE_COUNT = 8;
  var blown = false;
  var timers = [];
  var MIC_LABEL = '🎤 Blow with mic';

  function later(fn, ms) {
    var t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }

  /* Safe localStorage helpers */
  function store(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ================================================================
     Candles + age topper
     ================================================================ */
  function makeCandle(i) {
    var c = document.createElement('div');
    c.className = 'candle';
    c.style.animationDelay = (2.5 + i * 0.07) + 's';

    var f = document.createElement('div');
    f.className = 'flame';
    f.style.setProperty('--d', (-Math.random() * 0.5).toFixed(2) + 's');
    f.style.setProperty('--o', (i * 0.07).toFixed(2) + 's');

    var s = document.createElement('div');
    s.className = 'smoke';
    s.style.setProperty('--o', (0.15 + i * 0.07).toFixed(2) + 's');

    c.appendChild(f);
    c.appendChild(s);
    return c;
  }

  for (var i = 0; i < CANDLE_COUNT; i++) {
    if (i === CANDLE_COUNT / 2) {
      var slot = document.createElement('div');
      slot.className = 'topper-slot';
      slot.innerHTML =
        '<div class="topper"><div class="topper-inner">' +
        '<div class="topper-plaque">53</div><div class="topper-stick"></div>' +
        '</div></div>';
      candlesEl.appendChild(slot);
    }

    candlesEl.appendChild(makeCandle(i));
  }

  /* ================================================================
     Wish / blessing line
     ================================================================ */
  var lineTimer = null;

  function setLine(text) {
    clearTimeout(lineTimer);
    wishLine.classList.remove('show');

    lineTimer = setTimeout(function () {
      wishLine.textContent = text;
      if (text) wishLine.classList.add('show');
    }, 380);
  }

  /* ================================================================
     Sound (Web Audio – no audio files needed)
     ================================================================ */
  var audioCtx = null;
  var soundOn = true;
  var songMaster = null;

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;

      try {
        audioCtx = new AC();
      } catch (e) {
        return null;
      }
    }

    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Happy Birthday in C major
  var N = {
    G4: 392.00,
    A4: 440.00,
    B4: 493.88,
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    F5: 698.46,
    G5: 783.99
  };

  var SONG = [
    [N.G4, .75], [N.G4, .25], [N.A4, 1], [N.G4, 1], [N.C5, 1], [N.B4, 2],
    [N.G4, .75], [N.G4, .25], [N.A4, 1], [N.G4, 1], [N.D5, 1], [N.C5, 2],
    [N.G4, .75], [N.G4, .25], [N.G5, 1], [N.E5, 1], [N.C5, 1], [N.B4, 1], [N.A4, 2],
    [N.F5, .75], [N.F5, .25], [N.E5, 1], [N.C5, 1], [N.D5, 1], [N.C5, 2.5]
  ];

  function playSong() {
    var ac = soundOn && ensureAudio();
    if (!ac) return;

    stopSong();

    songMaster = ac.createGain();
    songMaster.gain.value = 0.55;
    songMaster.connect(ac.destination);

    var beat = 0.42;
    var t = ac.currentTime + 0.1;

    SONG.forEach(function (n) {
      var dur = n[1] * beat;

      [[1, 0.16, 'triangle'], [2, 0.04, 'sine']].forEach(function (p) {
        var o = ac.createOscillator();
        var g = ac.createGain();

        o.type = p[2];
        o.frequency.value = n[0] * p[0];

        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(p[1], t + 0.03);
        g.gain.exponentialRampToValueAtTime(
          0.0001,
          t + Math.max(dur, 0.2) * 0.98
        );

        o.connect(g);
        g.connect(songMaster);
        o.start(t);
        o.stop(t + Math.max(dur, 0.2));
      });

      t += dur;
    });
  }

  function stopSong() {
    if (songMaster && audioCtx) {
      try {
        songMaster.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      } catch (e) {}
    }

    songMaster = null;
  }

  function noiseBuffer(ac, seconds) {
    var len = Math.floor(ac.sampleRate * seconds);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);

    for (var i = 0; i < len; i++) {
      d[i] = Math.random() * 2 - 1;
    }

    return buf;
  }

  function pop() {
    var ac = soundOn && ensureAudio();
    if (!ac) return;

    var src = ac.createBufferSource();
    var f = ac.createBiquadFilter();
    var g = ac.createGain();

    src.buffer = noiseBuffer(ac, 0.14);
    f.type = 'bandpass';
    f.frequency.value = 1400;
    f.Q.value = 0.7;

    g.gain.setValueAtTime(0.35, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14);

    src.connect(f);
    f.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  function whoosh() {
    var ac = soundOn && ensureAudio();
    if (!ac) return;

    var src = ac.createBufferSource();
    var f = ac.createBiquadFilter();
    var g = ac.createGain();
    var t = ac.currentTime;

    src.buffer = noiseBuffer(ac, 0.7);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.65);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.68);

    src.connect(f);
    f.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;

    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.setAttribute(
      'aria-label',
      soundOn ? 'Turn sound off' : 'Turn sound on'
    );

    if (!soundOn) {
      stopSong();
    } else if (blown) {
      playSong();
    } else {
      ensureAudio();
      pop();
    }
  });

  /* ================================================================
     Blow with the microphone
     ================================================================ */
  var micStream = null;
  var micCtx = null;
  var micRaf = 0;
  var micActive = false;

  function stopMic() {
    micActive = false;
    cancelAnimationFrame(micRaf);

    if (micStream) {
      micStream.getTracks().forEach(function (t) {
        t.stop();
      });
      micStream = null;
    }

    if (micCtx) {
      try { micCtx.close(); } catch (e) {}
      micCtx = null;
    }

    micBtn.classList.remove('listening');
    micBtn.textContent = MIC_LABEL;
  }

  function micMessage(text) {
    micBtn.textContent = text;

    later(function () {
      if (!micActive) micBtn.textContent = MIC_LABEL;
    }, 2800);
  }

  function startMic() {
    if (blown || !stage.classList.contains('lit')) return;

    if (micActive) {
      stopMic();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      micMessage('🎤 Not supported – tap the cake');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    }).then(function (stream) {
      var AC = window.AudioContext || window.webkitAudioContext;

      micStream = stream;
      micCtx = new AC();

      var analyser = micCtx.createAnalyser();
      analyser.fftSize = 1024;

      micCtx.createMediaStreamSource(stream).connect(analyser);

      var buf = new Uint8Array(analyser.fftSize);
      var frames = 0;
      var baseline = 0;
      var loud = 0;

      micActive = true;
      micBtn.classList.add('listening');
      micBtn.textContent = '🎤 Listening… blow!';

      (function loop() {
        if (!micActive) return;

        analyser.getByteTimeDomainData(buf);

        var sum = 0;

        for (var i = 0; i < buf.length; i++) {
          var v = (buf[i] - 128) / 128;
          sum += v * v;
        }

        var rms = Math.sqrt(sum / buf.length);
        frames++;

        if (frames <= 30) {
          baseline = Math.max(baseline, rms);
        } else {
          var threshold = Math.max(0.12, baseline * 3);
          loud = rms > threshold ? loud + 1 : Math.max(0, loud - 1);

          if (loud >= 8) {
            blow();
            return;
          }
        }

        micRaf = requestAnimationFrame(loop);
      })();

    }).catch(function () {
      micMessage('🎤 Mic blocked – tap the cake');
    });
  }

  /* ================================================================
     Floating hearts & balloons
     ================================================================ */
  var HEARTS = ['💖', '💗', '💕', '🤍', '💞'];

  var BALLOONS = [
    ['#ffd23f', '#e0a800'],
    ['#ffffff', '#d9d9e3'],
    ['#4d96ff', '#2c6fd6'],
    ['#c77dff', '#9b4fd8'],
    ['#6bcb77', '#3fa04d'],
    ['#ff6b6b', '#d84444']
  ];

  var heartTimer = null;
  var balloonTimer = null;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function spawnHeart() {
    if (floaters.children.length > 70) return;

    var h = document.createElement('span');
    h.className = 'heart';
    h.textContent = HEARTS[(Math.random() * HEARTS.length) | 0];
    h.style.setProperty('--x', rand(2, 94).toFixed(1) + '%');
    h.style.setProperty('--s', rand(16, 34).toFixed(0) + 'px');
    h.style.setProperty('--t', rand(6, 10).toFixed(1) + 's');
    h.style.setProperty('--dx', rand(-40, 40).toFixed(0) + 'px');

    floaters.appendChild(h);
    h.addEventListener('animationend', function () {
      h.remove();
    });
  }

  function spawnBalloon() {
    if (floaters.children.length > 70) return;

    var c = BALLOONS[(Math.random() * BALLOONS.length) | 0];
    var b = document.createElement('div');

    b.className = 'balloon';
    b.style.setProperty('--x', rand(3, 88).toFixed(1) + '%');
    b.style.setProperty('--w', rand(30, 46).toFixed(0) + 'px');
    b.style.setProperty('--t', rand(9, 14).toFixed(1) + 's');
    b.style.setProperty('--dx', rand(-30, 30).toFixed(0) + 'px');
    b.style.setProperty('--bc', c[0]);
    b.style.setProperty('--bd', c[1]);

    floaters.appendChild(b);
    b.addEventListener('animationend', function () {
      b.remove();
    });
  }

  function startFloaters() {
    stopFloaters();

    for (var i = 0; i < 6; i++) {
      later(spawnBalloon, i * 260);
    }

    heartTimer = setInterval(spawnHeart, 380);
    balloonTimer = setInterval(spawnBalloon, 1300);
  }

  function stopFloaters() {
    clearInterval(heartTimer);
    clearInterval(balloonTimer);
    floaters.innerHTML = '';
  }

  /* ================================================================
     Personal message card (VIEW ONLY)
     ================================================================ */
  cardMsg.textContent = CONFIG.cardMessage;
  cardFrom.textContent = CONFIG.cardFrom;

  function openCard() {
    backdrop.hidden = false;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('open');
      });
    });
  }

  function closeCard() {
    backdrop.classList.remove('open');

    later(function () {
      if (!backdrop.classList.contains('open')) {
        backdrop.hidden = true;
      }
    }, 450);
  }

  cardDone.addEventListener('click', closeCard);

  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeCard();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !backdrop.hidden) {
      closeCard();
    }
  });

  cardBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openCard();
  });

  /* ================================================================
     Photo frame
     ================================================================ */
  function applyPhoto(url) {
    photoBtn.style.backgroundImage = 'url("' + url + '")';
    photoBtn.classList.add('has');
  }

  var savedPhoto = load('bdayPhoto');
  if (savedPhoto) applyPhoto(savedPhoto);

  photoBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    photoInput.click();
  });

  photoInput.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  photoInput.addEventListener('change', function () {
    var file = photoInput.files && photoInput.files[0];
    if (!file) return;

    var url = URL.createObjectURL(file);
    var img = new Image();

    img.onload = function () {
      var size = 240;
      var cv = document.createElement('canvas');

      cv.width = cv.height = size;

      var side = Math.min(img.width, img.height);

      cv.getContext('2d').drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size
      );

      var data = cv.toDataURL('image/jpeg', 0.85);

      applyPhoto(data);
      store('bdayPhoto', data);
      URL.revokeObjectURL(url);
    };

    img.src = url;
    photoInput.value = '';
  });

  /* ================================================================
     Intro → light the flames
     ================================================================ */
  later(function () {
    if (blown) return;

    stage.classList.add('lit', 'ready');
    setLine(CONFIG.wishText);
  }, 3300);

  /* ================================================================
     Blow out / celebrate / again
     ================================================================ */
  function blow() {
    if (blown) return;
    if (!stage.classList.contains('lit')) return;

    blown = true;
    stopMic();

    stage.classList.remove('lit', 'ready');
    stage.classList.add('out');

    whoosh();
    setLine('');

    later(function () {
      stage.classList.add('celebrating');
      againBtn.hidden = false;
      cardBtn.hidden = false;

      setLine(CONFIG.blessingText);
      burst(160);
      playSong();
      startFloaters();

      later(function () {
        burst(90);
      }, 700);

      later(function () {
        if (blown) openCard();
      }, 3200);

    }, 900);
  }

  function again() {
    if (!blown) return;

    blown = false;

    stage.classList.remove('out', 'celebrating');
    againBtn.hidden = true;
    cardBtn.hidden = true;

    closeCard();
    stopSong();
    stopFloaters();
    setLine('');

    later(function () {
      stage.classList.add('lit', 'ready');
      setLine(CONFIG.wishText);
    }, 300);
  }

  cakeWrap.addEventListener('click', function (e) {
    e.stopPropagation();
    ensureAudio();
    blow();
  });

  cakeWrap.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ensureAudio();
      blow();
    }
  });

  stage.addEventListener('click', function () {
    ensureAudio();
    blow();
  });

  blowBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    ensureAudio();
    blow();
  });

  micBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    startMic();
  });

  againBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    again();
  });

  /* ================================================================
     Confetti
     ================================================================ */
  var particles = [];
  var running = false;
  var W = 0;
  var H = 0;
  var dpr = 1;

  var COLORS = [
    '#ffd23f', '#ff6b6b', '#4d96ff', '#6bcb77',
    '#c77dff', '#ff9f1c', '#ffffff', '#00c2d1'
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = W * dpr;
    canvas.height = H * dpr;

    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize);
  resize();

  function burst(n) {
    pop();

    var rect = cakeWrap.getBoundingClientRect();
    var ox = rect.left + rect.width / 2;
    var oy = rect.top + 40;

    for (var i = 0; i < n; i++) {
      var fromTop = i % 2 === 0;
      var angle = Math.random() * Math.PI * 2;
      var speed = 4 + Math.random() * 9;

      particles.push({
        x: fromTop ? Math.random() * W : ox,
        y: fromTop ? -20 - Math.random() * 120 : oy,
        vx: fromTop ? (Math.random() - 0.5) * 3 : Math.cos(angle) * speed,
        vy: fromTop ? 2 + Math.random() * 3 : Math.sin(angle) * speed - 5,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        flip: Math.random() * Math.PI * 2,
        color: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }

    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];

      p.vy += 0.16;
      p.vx *= 0.99;
      p.vy *= 0.992;

      p.x += p.vx + Math.sin(p.flip) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      p.flip += 0.12;

      if (p.y > H + 30) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (particles.length) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }
})();