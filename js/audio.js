/* =========================================================
   Alarm playback engine — every alarm is synthesised from a
   recipe (blocks of beep/chime/pulse/sweep/warble/silence).
   No audio files anywhere in the app.
   ========================================================= */
(function () {
  var ctx = null;
  var master = null;
  var muted = false;
  var currentLoop = null;   // alarm loop  { stop() }
  var currentSoundId = null;
  var previewLoop = null;   // sound-studio preview loop

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---- schedule a single block, returns duration in seconds ---- */
  function scheduleBlock(block, t0, out, pitch, tempo) {
    var freq = (block.freq || 800) * pitch;
    var freq2 = (block.freq2 || freq / pitch) * pitch;
    var dur = Math.max(0.02, (block.dur || 300) / 1000 / tempo);
    var kind = block.kind;

    if (kind === 'silence') return dur;

    var g = ctx.createGain();
    g.connect(out);

    function osc(type, f) {
      var o = ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      return o;
    }

    if (kind === 'beep') {
      var o = osc(block.wave || 'sine', freq);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.9, t0 + 0.008);
      g.gain.setValueAtTime(0.9, t0 + dur - 0.015);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0); o.stop(t0 + dur + 0.02);
      return dur;
    }

    if (kind === 'chime') {
      // bell-ish: fundamental + 2 partials with exponential decay
      var tail = dur * 1.9;
      [1, 2.76, 5.4].forEach(function (mult, i) {
        var o1 = osc('sine', freq * mult);
        var pg = ctx.createGain();
        o1.disconnect(); o1.connect(pg); pg.connect(g);
        var amp = [0.85, 0.22, 0.07][i];
        pg.gain.setValueAtTime(amp, t0);
        pg.gain.exponentialRampToValueAtTime(0.0008, t0 + tail);
        o1.start(t0); o1.stop(t0 + tail + 0.05);
      });
      g.gain.setValueAtTime(1, t0);
      return dur; // next block can start while tail rings — musical
    }

    if (kind === 'pulse') {
      var count = Math.max(1, block.count || 3);
      var on = dur, off = Math.max(0.02, (block.gapMs || 90) / 1000 / tempo);
      for (var i = 0; i < count; i++) {
        var ts = t0 + i * (on + off);
        var o2 = osc(block.wave || 'square', freq);
        var pg2 = ctx.createGain();
        o2.disconnect(); o2.connect(pg2); pg2.connect(g);
        pg2.gain.setValueAtTime(0, ts);
        pg2.gain.linearRampToValueAtTime(0.85, ts + 0.006);
        pg2.gain.setValueAtTime(0.85, ts + on - 0.012);
        pg2.gain.linearRampToValueAtTime(0.0001, ts + on);
        o2.start(ts); o2.stop(ts + on + 0.02);
      }
      g.gain.setValueAtTime(1, t0);
      return count * (dur + off);
    }

    if (kind === 'sweep') {
      var o3 = osc(block.wave || 'sine', freq);
      o3.frequency.linearRampToValueAtTime(freq2, t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.85, t0 + 0.01);
      g.gain.setValueAtTime(0.85, t0 + dur - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      o3.start(t0); o3.stop(t0 + dur + 0.02);
      return dur;
    }

    if (kind === 'warble') {
      var o4 = osc(block.wave || 'sine', (freq + freq2) / 2);
      var lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(block.rate || 7, t0);
      var lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(Math.abs(freq2 - freq) / 2, t0);
      lfo.connect(lfoGain); lfoGain.connect(o4.frequency);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.8, t0 + 0.01);
      g.gain.setValueAtTime(0.8, t0 + dur - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      o4.start(t0); lfo.start(t0);
      o4.stop(t0 + dur + 0.02); lfo.stop(t0 + dur + 0.02);
      return dur;
    }

    // fallback beep
    var o5 = osc('sine', freq);
    g.gain.setValueAtTime(0.7, t0);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o5.start(t0); o5.stop(t0 + dur);
    return dur;
  }

  /* ---- play one iteration of a recipe into dest, returns total ms ---- */
  function playOnce(profile, dest) {
    if (!ensureCtx()) return 0;
    var pitch = profile.pitch || 1;
    var tempo = profile.tempo || 1;
    var vol = (profile.volume == null ? 0.8 : profile.volume);
    var g = ctx.createGain();
    g.gain.value = vol * 0.55; // headroom
    g.connect(dest || master);
    var t = ctx.currentTime + 0.03;
    var total = 0;
    (profile.blocks || []).forEach(function (b) {
      var d = scheduleBlock(b, t + total, g, pitch, tempo);
      total += d;
    });
    setTimeout(function () { try { g.disconnect(); } catch (e) {} }, (total + 3) * 1000);
    return total * 1000;
  }

  /* ---- looping playback through a private gain node so stop()
         silences instantly, even mid-iteration ---- */
  function makeLoop(profile) {
    if (!ensureCtx()) return null;
    var gate = ctx.createGain();
    gate.gain.value = 1;
    gate.connect(master);
    var stopped = false, timer = null;
    function iter() {
      if (stopped) return;
      var ms = playOnce(profile, gate);
      var gap = Math.max(30, (profile.gap == null ? 800 : profile.gap) / (profile.tempo || 1));
      timer = setTimeout(iter, ms + gap);
    }
    iter();
    return {
      stop: function () {
        stopped = true;
        clearTimeout(timer);
        try {
          gate.gain.setValueAtTime(0, ctx.currentTime);
          gate.disconnect();
        } catch (e) {}
      }
    };
  }

  function stopAlarm() {
    if (currentLoop) { currentLoop.stop(); currentLoop = null; }
    currentSoundId = null;
  }

  /* ---- arbitration: play the highest-priority active call ---- */
  function arbitrate() {
    if (previewLoop) return; // Sound Studio preview owns the speakers
    var top = HCP.calls.highest();
    var wantId = top && top.sound ? top.sound : null;
    if (wantId === currentSoundId) return;
    stopAlarm();
    if (wantId) {
      var profile = HCP.data.getSound(wantId);
      if (profile) {
        currentLoop = makeLoop(profile);
        currentSoundId = currentLoop ? wantId : null;
      }
    }
  }

  /* ---- tiny UI sounds ---- */
  function clickTick(freq) {
    if (!ensureCtx()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq || 2200;
    o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.start(t); o.stop(t + 0.08);
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
  }

  /* ---- Sound Studio preview ---- */
  function previewStart(profile) {
    if (previewLoop) { previewLoop.stop(); previewLoop = null; }
    stopAlarm();
    previewLoop = makeLoop(profile);
  }
  function previewStop() {
    if (previewLoop) { previewLoop.stop(); previewLoop = null; }
    arbitrate(); // resume live alarm if calls are still active
  }

  HCP.audio = {
    ensureCtx: ensureCtx,
    playOnce: function (profile) { return playOnce(profile, null); },
    arbitrate: arbitrate,
    clickTick: clickTick,
    setMuted: setMuted,
    isMuted: function () { return muted; },
    previewStart: previewStart,
    previewStop: previewStop,
    isPreviewing: function () { return !!previewLoop; },
    debugState: function () {
      return { alarmSound: currentSoundId, alarmLooping: !!currentLoop, previewing: !!previewLoop };
    }
  };

  // wire arbitration to the call registry once data.js is loaded
  HCP.calls.on(function () { arbitrate(); });
})();
