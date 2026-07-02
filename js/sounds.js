/* =========================================================
   Hospital Alarm Sound Studio — GarageBand for hospital
   alarms. Every alarm is a recipe, never a recording.
   ========================================================= */
(function () {
  var container = null;
  var selBlock = -1;

  var BLOCK_KINDS = [
    { kind: 'beep', name: 'Beep', color: '#0a84ff' },
    { kind: 'chime', name: 'Chime', color: '#ff9f0a' },
    { kind: 'pulse', name: 'Pulse', color: '#ff375f' },
    { kind: 'sweep', name: 'Sweep', color: '#bf5af2' },
    { kind: 'warble', name: 'Warble', color: '#30d158' },
    { kind: 'silence', name: 'Silence', color: '#8e8e93' }
  ];

  function kindMeta(kind) {
    return BLOCK_KINDS.find(function (k) { return k.kind === kind; }) || BLOCK_KINDS[0];
  }

  function currentSound() {
    var h = HCP.state.hospital;
    var ui = HCP.state.ui;
    var found = h.soundProfiles.find(function (s) { return s.id === ui.soundId; });
    if (!found && h.soundProfiles.length) {
      ui.soundId = h.soundProfiles[0].id;
      found = h.soundProfiles[0];
    }
    return found || null;
  }

  function usedByCount(soundId) {
    var n = 0;
    var panels = HCP.state.hospital.panels;
    Object.keys(panels).forEach(function (pid) {
      panels[pid].components.forEach(function (c) {
        if (c.behaviour && c.behaviour.sound === soundId) n++;
      });
    });
    return n;
  }

  function blockDurMs(b) {
    if (b.kind === 'pulse') return (b.count || 3) * ((b.dur || 150) + (b.gapMs || 90));
    if (b.kind === 'chime') return (b.dur || 400);
    return b.dur || 300;
  }

  function render(c) {
    container = c;
    var h = HCP.state.hospital;
    var snd = currentSound();

    var html = '<div class="studio-layout">';

    /* --- profile list --- */
    html += '<aside class="studio-side glass"><div class="side-title">Sound Profiles</div><div class="sound-list">';
    h.soundProfiles.forEach(function (s) {
      var used = usedByCount(s.id);
      html += '<button class="sound-item' + (snd && s.id === snd.id ? ' active' : '') + '" data-sound="' + s.id + '">' +
        '<span class="dot" style="background:' + (s.color || '#888') + '"></span>' +
        '<span class="snd-name">' + HCP.svg.esc(s.name) + '</span>' +
        (used ? '<span class="snd-used">' + used + ' btn</span>' : '') +
        '</button>';
    });
    html += '</div><div class="row-btns">' +
      '<button id="newSoundBtn" class="mini-btn">+ New</button>' +
      '<button id="dupSoundBtn" class="mini-btn">Duplicate</button>' +
      '<button id="delSoundBtn" class="mini-btn danger">Delete</button></div>';

    html += '<div class="side-title">Describe it</div>' +
      '<div class="describe-box">' +
      '<input class="field" id="describeInput" placeholder="urgent but not an emergency">' +
      '<button id="describeBtn" class="mini-btn">Generate</button></div>';
    html += '</aside>';

    /* --- editor --- */
    html += '<section class="studio-main">';
    if (!snd) {
      html += '<div class="empty-note">No sound profiles yet — create one.</div></section></div>';
      c.innerHTML = html;
      wireListEvents();
      return;
    }

    html += '<div class="studio-header">';
    html += '<input class="big-name" id="sndName" value="' + HCP.svg.esc(snd.name) + '">';
    html += '<div class="transport">' +
      '<button id="previewBtn" class="play-btn">Play</button>' +
      '<button id="stopBtn" class="play-btn stop">Stop</button></div>';
    html += '</div>';

    /* the dark stage — visualisation + recipe timeline */
    html += '<div class="stage-dark">';
    html += '<canvas id="sndViz" class="snd-viz" height="130"></canvas>';
    html += '<div class="timeline" id="timeline">';
    var total = snd.blocks.reduce(function (a, b) { return a + blockDurMs(b); }, 0) || 1;
    snd.blocks.forEach(function (b, i) {
      var meta = kindMeta(b.kind);
      var wPct = Math.max(9, blockDurMs(b) / (total + (snd.gap || 0)) * 100);
      html += '<button class="tblock k-' + b.kind + (i === selBlock ? ' on' : '') + '" data-block="' + i + '" style="--bc:' + meta.color + ';width:' + wPct + '%">' +
        '<span class="tb-kind">' + meta.name + '</span>' +
        '<span class="tb-info">' + (b.kind === 'silence' ? (b.dur || 300) + 'ms' : Math.round(b.freq || 800) + 'Hz') + '</span>' +
        '</button>';
    });
    if (snd.gap) {
      var gapPct = Math.max(6, snd.gap / (total + snd.gap) * 100);
      html += '<div class="tgap" style="width:' + Math.min(30, gapPct) + '%">gap ' + snd.gap + 'ms</div>';
    }
    html += '<div class="trepeat">⟳</div>';
    html += '</div>';   /* /timeline */
    html += '</div>';   /* /stage-dark */

    /* add blocks */
    html += '<div class="block-palette">';
    BLOCK_KINDS.forEach(function (k) {
      html += '<button class="pal-chip" data-addblock="' + k.kind + '" style="--pc:' + k.color + ';--pt:#fff">+ ' + k.name + '</button>';
    });
    html += '</div>';

    /* selected block params */
    html += '<div id="blockParams" class="block-params glass"></div>';

    /* simple mode */
    html += '<div class="side-title">Simple mode</div>';
    html += '<div class="simple-grid glass">';
    html += simpleSlider('sm_pitch', 'Pitch', 50, 200, Math.round((snd.pitch || 1) * 100), '%');
    html += simpleSlider('sm_tempo', 'Tempo', 50, 200, Math.round((snd.tempo || 1) * 100), '%');
    html += simpleSlider('sm_gap', 'Repeat gap', 0, 4000, snd.gap || 0, 'ms');
    html += simpleSlider('sm_vol', 'Volume', 0, 100, Math.round((snd.volume == null ? 0.8 : snd.volume) * 100), '%');
    html += '</div>';

    html += '</section></div>';
    c.innerHTML = html;

    drawViz(snd);
    drawBlockParams(snd);
    wireListEvents();
    wireEditorEvents(snd);
  }

  function simpleSlider(id, label, min, max, val, unit) {
    return '<div class="simple-cell"><label>' + label + ' <em>' + val + unit + '</em></label>' +
      '<input type="range" class="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" data-unit="' + unit + '"></div>';
  }

  /* ---------- visualisation ---------- */
  function drawViz(snd) {
    var cv = document.getElementById('sndViz');
    if (!cv) return;
    cv.width = cv.clientWidth * 2;
    cv.height = 260;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    var totalMs = snd.blocks.reduce(function (a, b) { return a + blockDurMs(b); }, 0) + (snd.gap || 0);
    if (!totalMs) return;
    var pxPerMs = cv.width / totalMs;
    var fMin = 200, fMax = 2000;
    function yOf(f) {
      var t = (Math.log(f) - Math.log(fMin)) / (Math.log(fMax) - Math.log(fMin));
      return cv.height - 24 - Math.max(0, Math.min(1, t)) * (cv.height - 48);
    }

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [300, 500, 800, 1200, 1800].forEach(function (f) {
      var y = yOf(f);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '20px -apple-system, sans-serif';
      ctx.fillText(f + ' Hz', 10, y - 6);
    });

    var x = 0;
    var pitch = snd.pitch || 1;
    snd.blocks.forEach(function (b, i) {
      var w = blockDurMs(b) * pxPerMs;
      var meta = kindMeta(b.kind);
      ctx.fillStyle = meta.color;
      if (b.kind === 'silence') {
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, cv.height - 34, w, 10);
        ctx.globalAlpha = 1;
      } else if (b.kind === 'sweep') {
        var y1 = yOf((b.freq || 800) * pitch), y2 = yOf((b.freq2 || 1200) * pitch);
        ctx.beginPath();
        ctx.moveTo(x, y1 + 8); ctx.lineTo(x + w, y2 + 8);
        ctx.lineTo(x + w, y2 - 8); ctx.lineTo(x, y1 - 8);
        ctx.closePath(); ctx.fill();
      } else if (b.kind === 'warble') {
        var ym = yOf(((b.freq || 700) + (b.freq2 || 950)) / 2 * pitch);
        var amp = Math.abs(yOf((b.freq2 || 950) * pitch) - yOf((b.freq || 700) * pitch)) / 2;
        ctx.beginPath();
        for (var px = 0; px <= w; px += 3) {
          var yy = ym + Math.sin(px / w * (b.rate || 7) * Math.PI * 2) * amp;
          px === 0 ? ctx.moveTo(x + px, yy) : ctx.lineTo(x + px, yy);
        }
        ctx.lineWidth = 12; ctx.strokeStyle = meta.color; ctx.stroke();
      } else if (b.kind === 'pulse') {
        var yP = yOf((b.freq || 800) * pitch);
        var count = b.count || 3;
        var on = (b.dur || 150) * pxPerMs, off = (b.gapMs || 90) * pxPerMs;
        for (var k = 0; k < count; k++) {
          ctx.fillRect(x + k * (on + off), yP - 9, on, 18);
        }
      } else {
        var yB = yOf((b.freq || 800) * pitch);
        var r = 9;
        roundRect(ctx, x + 1, yB - r, Math.max(6, w - 2), r * 2, r);
        ctx.fill();
        if (b.kind === 'chime') {
          ctx.globalAlpha = 0.25;
          roundRect(ctx, x + w, yB - r, w * 0.9, r * 2, r);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (i === selBlock) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, 8, Math.max(6, w - 2), cv.height - 16);
      }
      x += w;
    });

    if (snd.gap) {
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fillRect(x, cv.height - 34, snd.gap * pxPerMs, 10);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- selected block params ---------- */
  function drawBlockParams(snd) {
    var box = document.getElementById('blockParams');
    if (!box) return;
    var b = snd.blocks[selBlock];
    if (!b) {
      box.innerHTML = '<div class="hint-block">Select a block on the timeline to tune it — or add blocks below.</div>';
      return;
    }
    var meta = kindMeta(b.kind);
    var html = '<div class="bp-head"><span class="dot" style="background:' + meta.color + '"></span> ' + meta.name + ' block' +
      '<span class="bp-actions">' +
      '<button id="bpLeft" class="mini-btn" title="Move earlier">‹</button><button id="bpRight" class="mini-btn" title="Move later">›</button>' +
      '<button id="bpDelete" class="mini-btn danger">Remove</button></span></div>';
    html += '<div class="bp-grid">';
    if (b.kind !== 'silence') {
      html += bpSlider('bp_freq', b.kind === 'warble' || b.kind === 'sweep' ? 'Freq A' : 'Frequency', 200, 2000, b.freq || 800, 'Hz');
      if (b.kind === 'warble' || b.kind === 'sweep') html += bpSlider('bp_freq2', 'Freq B', 200, 2000, b.freq2 || 1000, 'Hz');
      if (b.kind === 'warble') html += bpSlider('bp_rate', 'Warble rate', 2, 16, b.rate || 7, '/s');
      if (b.kind === 'pulse') {
        html += bpSlider('bp_count', 'Pulses', 1, 8, b.count || 3, '');
        html += bpSlider('bp_gapms', 'Pulse gap', 30, 300, b.gapMs || 90, 'ms');
      }
    }
    html += bpSlider('bp_dur', b.kind === 'pulse' ? 'Pulse length' : 'Duration', 40, 1500, b.dur || 300, 'ms');
    if (b.kind === 'beep' || b.kind === 'pulse' || b.kind === 'sweep' || b.kind === 'warble') {
      html += '<div class="simple-cell"><label>Tone</label><select class="field" id="bp_wave">' +
        ['sine', 'triangle', 'square', 'sawtooth'].map(function (w) {
          return '<option value="' + w + '"' + ((b.wave || 'sine') === w ? ' selected' : '') + '>' + w + '</option>';
        }).join('') + '</select></div>';
    }
    html += '</div>';
    box.innerHTML = html;

    bindBP('bp_freq', function (v) { b.freq = v; });
    bindBP('bp_freq2', function (v) { b.freq2 = v; });
    bindBP('bp_rate', function (v) { b.rate = v; });
    bindBP('bp_count', function (v) { b.count = v; });
    bindBP('bp_gapms', function (v) { b.gapMs = v; });
    bindBP('bp_dur', function (v) { b.dur = v; });
    var wave = document.getElementById('bp_wave');
    if (wave) wave.addEventListener('change', function () { b.wave = wave.value; commit(snd); });

    onId('bpDelete', function () {
      snd.blocks.splice(selBlock, 1);
      selBlock = -1;
      commit(snd, true);
    });
    onId('bpLeft', function () { moveBlock(snd, -1); });
    onId('bpRight', function () { moveBlock(snd, 1); });

    function bindBP(id, fn) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        fn(parseFloat(el.value));
        var em = el.closest('.simple-cell').querySelector('em');
        if (em) em.textContent = el.value + (el.getAttribute('data-unit') || '');
        drawViz(snd);
        HCP.save();
      });
      el.addEventListener('change', function () { commit(snd); });
    }
  }

  function bpSlider(id, label, min, max, val, unit) {
    return '<div class="simple-cell"><label>' + label + ' <em>' + val + unit + '</em></label>' +
      '<input type="range" class="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" data-unit="' + unit + '"></div>';
  }

  function moveBlock(snd, dir) {
    var j = selBlock + dir;
    if (selBlock < 0 || j < 0 || j >= snd.blocks.length) return;
    var t = snd.blocks[selBlock];
    snd.blocks[selBlock] = snd.blocks[j];
    snd.blocks[j] = t;
    selBlock = j;
    commit(snd, true);
  }

  function commit(snd, rerender) {
    HCP.save();
    if (HCP.audio.isPreviewing()) HCP.audio.previewStart(snd); // live-retune preview
    if (rerender) render(container);
    else drawViz(snd);
  }

  /* ---------- events ---------- */
  function wireListEvents() {
    container.querySelectorAll('[data-sound]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        HCP.audio.previewStop();
        HCP.state.ui.soundId = btn.getAttribute('data-sound');
        selBlock = -1;
        render(container);
      });
    });

    onId('newSoundBtn', function () {
      var s = {
        id: HCP.uid('snd'), name: 'New Alarm', color: '#034f46',
        pitch: 1, tempo: 1, volume: 0.8, gap: 1000,
        blocks: [{ kind: 'beep', freq: 900, dur: 250, wave: 'sine' }]
      };
      HCP.state.hospital.soundProfiles.push(s);
      HCP.state.ui.soundId = s.id;
      selBlock = -1;
      HCP.save(); render(container);
    });

    onId('dupSoundBtn', function () {
      var snd = currentSound();
      if (!snd) return;
      var copy = JSON.parse(JSON.stringify(snd));
      copy.id = HCP.uid('snd'); copy.name = snd.name + ' (copy)';
      HCP.state.hospital.soundProfiles.push(copy);
      HCP.state.ui.soundId = copy.id;
      HCP.save(); render(container);
    });

    onId('delSoundBtn', function () {
      var snd = currentSound();
      if (!snd) return;
      var used = usedByCount(snd.id);
      if (!confirm('Delete “' + snd.name + '”?' + (used ? ' ' + used + ' button(s) use it and will go silent.' : ''))) return;
      HCP.state.hospital.soundProfiles = HCP.state.hospital.soundProfiles.filter(function (s) { return s.id !== snd.id; });
      HCP.state.ui.soundId = null;
      HCP.save(); render(container);
    });

    onId('describeBtn', function () {
      var input = document.getElementById('describeInput');
      var txt = (input && input.value || '').trim();
      if (!txt) return;
      var s = generateFromDescription(txt);
      HCP.state.hospital.soundProfiles.push(s);
      HCP.state.ui.soundId = s.id;
      selBlock = -1;
      HCP.save(); render(container);
      HCP.audio.previewStart(s);
      setTimeout(function () { HCP.audio.previewStop(); }, 3500);
    });
  }

  function wireEditorEvents(snd) {
    var name = document.getElementById('sndName');
    if (name) name.addEventListener('input', function () {
      snd.name = name.value;
      HCP.save();
    });

    onId('previewBtn', function () { HCP.audio.previewStart(snd); });
    onId('stopBtn', function () { HCP.audio.previewStop(); });

    container.querySelectorAll('[data-block]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selBlock = parseInt(btn.getAttribute('data-block'), 10);
        render(container);
      });
    });

    container.querySelectorAll('[data-addblock]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-addblock');
        var b = { kind: kind, freq: 800, dur: 300, wave: 'sine' };
        if (kind === 'chime') { b.freq = 1200; b.dur = 450; }
        if (kind === 'warble') { b.freq = 700; b.freq2 = 950; b.rate = 7; b.dur = 800; }
        if (kind === 'sweep') { b.freq = 500; b.freq2 = 1100; b.dur = 500; }
        if (kind === 'pulse') { b.dur = 140; b.count = 3; b.gapMs = 90; }
        if (kind === 'silence') { b = { kind: 'silence', dur: 300 }; }
        snd.blocks.push(b);
        selBlock = snd.blocks.length - 1;
        commit(snd, true);
      });
    });

    /* simple mode */
    bindSimple('sm_pitch', function (v) { snd.pitch = v / 100; });
    bindSimple('sm_tempo', function (v) { snd.tempo = v / 100; });
    bindSimple('sm_gap', function (v) { snd.gap = v; });
    bindSimple('sm_vol', function (v) { snd.volume = v / 100; });

    function bindSimple(id, fn) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        fn(parseFloat(el.value));
        var em = el.closest('.simple-cell').querySelector('em');
        if (em) em.textContent = el.value + (el.getAttribute('data-unit') || '');
        drawViz(snd);
        HCP.save();
        if (HCP.audio.isPreviewing()) HCP.audio.previewStart(snd);
      });
    }
  }

  /* ---------- describe → recipe ---------- */
  function generateFromDescription(txt) {
    var t = txt.toLowerCase();
    // negated phrases must not trigger their branch ("not an emergency")
    var tBranch = t.replace(/\b(not|no|isn'?t|without)\s+(an?\s+|the\s+)?\w+/g, '');
    var s = {
      id: HCP.uid('snd'),
      name: txt.length > 34 ? txt.slice(0, 34) + '…' : txt,
      color: '#034f46', pitch: 1, tempo: 1, volume: 0.8, gap: 1200, blocks: []
    };
    var has = function (re) { return re.test(tBranch); };
    var hasMod = function (re) { return re.test(t); };

    if (has(/emergen|code|resus|crash|critical/)) {
      s.blocks = [
        { kind: 'beep', freq: 800, dur: 240, wave: 'square' },
        { kind: 'beep', freq: 1000, dur: 240, wave: 'square' }
      ];
      s.gap = 0; s.volume = 0.9; s.color = '#e01b24';
    } else if (has(/urgent|assist|hurry|priority/)) {
      s.blocks = [
        { kind: 'pulse', freq: 900, dur: 140, count: 3, gapMs: 80, wave: 'triangle' }
      ];
      s.gap = 900; s.color = '#e0a136';
    } else if (has(/warble|nhs|uk|british/)) {
      s.blocks = [{ kind: 'warble', freq: 520, freq2: 680, rate: 6, dur: 750, wave: 'sine' }];
      s.gap = 900; s.color = '#ff7f27';
    } else if (has(/ding|dong|us|american|door/)) {
      s.blocks = [{ kind: 'chime', freq: 660, dur: 420 }, { kind: 'chime', freq: 528, dur: 620 }];
      s.gap = 2400; s.color = '#a0c4ff';
    } else if (has(/nurse|call|classic|australian|aussie|au\b/)) {
      s.blocks = [{ kind: 'chime', freq: 1200, dur: 480 }];
      s.gap = 1700; s.color = '#199a53';
    } else if (has(/chime|bell|gentle|soft|calm/)) {
      s.blocks = [{ kind: 'chime', freq: 1000, dur: 500 }];
      s.gap = 2000; s.color = '#41c98a';
    } else {
      s.blocks = [{ kind: 'beep', freq: 950, dur: 260, wave: 'sine' }, { kind: 'silence', dur: 160 }, { kind: 'beep', freq: 950, dur: 260, wave: 'sine' }];
      s.gap = 1400;
    }

    if (hasMod(/fast|quick|rapid/)) { s.tempo = 1.5; s.gap = Math.round(s.gap * 0.5); }
    if (hasMod(/slow|lazy|relaxed/)) { s.tempo = 0.75; s.gap = Math.round(s.gap * 1.8); }
    if (hasMod(/high/)) s.pitch = 1.3;
    if (hasMod(/low|deep/)) s.pitch = 0.72;
    if (hasMod(/soft|quiet|gentle/)) s.volume = 0.5;
    if (hasMod(/loud/)) s.volume = 1;
    if (hasMod(/not an emergency|not emergency/)) { s.gap = Math.max(s.gap, 800); s.volume = Math.min(s.volume, 0.75); }
    return s;
  }

  function onId(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  HCP.sounds = { render: render };
})();
