/* =========================================================
   Simulate — Interactive Panel Player & Multi-Panel Wall.
   Tap the virtual panel exactly where you'd press the real one.
   ========================================================= */
(function () {
  var tickTimer = null;

  function fmtElapsed(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function currentRoom() {
    var ui = HCP.state.ui;
    var found = ui.roomId ? HCP.data.getRoom(ui.roomId) : null;
    if (!found) {
      var fr = HCP.data.firstRoom(HCP.state.hospital);
      if (fr) { ui.roomId = fr.id; found = HCP.data.getRoom(fr.id); }
    }
    return found;
  }

  function render(container) {
    var h = HCP.state.hospital;
    var ctx = currentRoom();

    var html = '<div class="sim-layout">';

    /* ---- sidebar: ward / room tree + station board ---- */
    html += '<aside class="sim-side glass">';
    html += '<div class="side-title">Rooms</div><div class="room-tree">';
    h.wards.forEach(function (w) {
      html += '<div class="ward-name">' + HCP.svg.esc(w.name) + '</div>';
      w.rooms.forEach(function (r) {
        var active = ctx && ctx.room.id === r.id;
        var callsHere = HCP.calls.list().filter(function (c) { return c.roomId === r.id; });
        var badge = '';
        if (callsHere.length) {
          badge = '<span class="room-badge" style="background:' + callsHere[0].callColor + '">' + callsHere.length + '</span>';
        }
        html += '<button class="room-item' + (active ? ' active' : '') + (callsHere.length ? ' calling' : '') + '" data-room="' + r.id + '">' +
          '<span>' + HCP.svg.esc(r.name) + '</span>' + badge + '</button>';
      });
    });
    html += '</div>';

    html += '<div class="station-card">';
    html += '<div class="side-title">Nurse Station <span class="live-dot"></span></div>';
    html += '<div id="stationBoard" class="station-board"></div>';
    html += '<div class="side-actions">' +
      '<button id="clearAllBtn" class="ghost-btn">Silence all calls</button>' +
      '</div>';
    html += '</div>';
    html += '</aside>';

    /* ---- wall ---- */
    html += '<section class="sim-wall-wrap">';
    html += '<div class="wall-header">';
    html += '<div>';
    html += '<div class="wall-crumb">' + HCP.svg.esc(h.name) +
      (ctx ? ' <span>›</span> ' + HCP.svg.esc(ctx.ward.name) : '') + '</div>';
    html += '<h2 class="wall-title">' + (ctx ? HCP.svg.esc(ctx.room.name) : 'No room selected') + '</h2>';
    html += '</div>';
    html += '</div>';
    html += '<div id="wall" class="wall" style="background:' + ((h.wall && h.wall.color) || '#c9dde2') + '">';
    html += '<div class="wall-shade"></div>';
    html += '<div id="wallPlate" class="wall-plate"></div>';
    html += '<div class="wall-skirting"></div>';
    html += '</div>';
    html += '</section></div>';

    container.innerHTML = html;

    renderWallPanels();
    renderStation();

    /* ---- events ---- */
    container.querySelectorAll('.room-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        HCP.state.ui.roomId = btn.getAttribute('data-room');
        render(container);
      });
    });
    var clearBtn = container.querySelector('#clearAllBtn');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      HCP.calls.clearAll();
      HCP.audio.clickTick(1400);
    });
    /* live tick for timers */
    clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      document.querySelectorAll('[data-elapsed]').forEach(function (el) {
        el.textContent = fmtElapsed(Date.now() - parseInt(el.getAttribute('data-elapsed'), 10));
      });
    }, 1000);
  }

  function toggleWallFullscreen() {
    var wall = document.getElementById('wall');
    if (!wall) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (wall.requestFullscreen) wall.requestFullscreen();
  }

  /* ---------- panels on the wall ---------- */
  function renderWallPanels() {
    var plate = document.getElementById('wallPlate');
    var wall = document.getElementById('wall');
    if (!plate || !wall) return;
    var ctx = currentRoom();
    var h = HCP.state.hospital;
    if (!ctx) { plate.innerHTML = '<div class="empty-note">No rooms yet — add one in the Hospital tab.</div>'; return; }

    var panels = ctx.room.panelIds.map(function (pid) { return h.panels[pid]; }).filter(Boolean);
    if (!panels.length) { plate.innerHTML = '<div class="empty-note">This room has no panels yet. Assign some in the Hospital tab.</div>'; return; }

    var plateStyle = (h.wall && h.wall.plate) || 'none';
    plate.className = 'wall-plate ' + (plateStyle === 'steel' ? 'steel' : 'bare');

    // scale panels to wall height
    var wallH = wall.clientHeight || 600;
    var maxUnits = Math.max.apply(null, panels.map(function (p) { return p.h; }));
    var scale = (wallH * 0.52) / maxUnits;
    scale = Math.max(2, Math.min(scale, 4.6));

    var inner = '';
    panels.forEach(function (p, i) {
      var activeComps = {};
      var flashing = HCP.calls.panelHasCall(ctx.room.id, p.id);
      var flashFast = false;
      p.components.forEach(function (c) {
        if (HCP.calls.isActive(ctx.room.id, p.id, c.id)) {
          activeComps[c.id] = true;
          if (c.behaviour && c.behaviour.priority === 1) flashFast = true;
        }
      });
      inner += '<div class="wall-panel" data-instance="' + p.id + '">' +
        HCP.svg.renderPanel(p, {
          scale: scale, interactive: true,
          activeComps: activeComps,
          panelLive: true,
          panelFlashing: flashing,
          flashFast: flashFast
        }) + '</div>';
      if (i === 0 && panels.length > 1 && plateStyle === 'steel') {
        inner += '<div class="asset-sticker"><div class="asset-title">' + HCP.svg.esc(h.assetPrefix || 'NBH') + '</div>' +
          '<svg width="86" height="26" viewBox="0 0 86 26">' + barcodeSVG() + '</svg>' +
          '<div class="asset-code">0230' + (60 + (ctx.room.name.length % 9)) + '</div></div>';
      }
    });
    plate.innerHTML = inner;

    /* interaction */
    plate.querySelectorAll('.panel-svg').forEach(function (svg) {
      var pid = svg.getAttribute('data-panel');
      svg.addEventListener('pointerdown', function (ev) {
        var t = ev.target.closest('[data-comp]');
        if (!t) return;
        var compId = t.getAttribute('data-comp');
        pressComponent(ctx.room.id, pid, compId, t);
      });
    });
  }

  function barcodeSVG() {
    var out = '', x = 2, i = 0;
    var seq = [2, 1, 3, 1, 1, 2, 1, 4, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1];
    while (x < 82) {
      var w = seq[i % seq.length] * 1.35;
      if (i % 2 === 0) out += '<rect x="' + x + '" y="0" width="' + w + '" height="26" fill="#111"/>';
      x += w; i++;
    }
    return out;
  }

  function pressComponent(roomId, panelId, compId, el) {
    var panel = HCP.state.hospital.panels[panelId];
    if (!panel) return;
    var c = HCP.data.findComp(panel, compId);
    if (!c || !c.behaviour) return;
    var b = c.behaviour;

    // press feedback
    if (el) {
      el.classList.add('pressed');
      setTimeout(function () { el.classList.remove('pressed'); }, 160);
    }

    if (b.action === 'call') {
      HCP.audio.clickTick(1800);
      HCP.calls.raise(roomId, panelId, compId, {
        callLabel: b.callLabel || c.label || 'CALL',
        callColor: b.callColor || c.color || '#38b6ff',
        priority: b.priority || 3,
        sound: b.sound || null,
        latching: b.latching !== false
      });
    } else if (b.action === 'cancel') {
      var removed = HCP.calls.cancelPanel(roomId, panelId);
      HCP.audio.clickTick(removed ? 900 : 500);
    }
  }

  /* ---------- station board ---------- */
  function renderStation() {
    var board = document.getElementById('stationBoard');
    if (!board) return;
    var list = HCP.calls.list();
    if (!list.length) {
      board.innerHTML = '<div class="station-idle"><span class="ok-dot"></span> All quiet — no active calls</div>';
      return;
    }
    var html = '';
    list.forEach(function (c) {
      var loc = HCP.data.getRoom(c.roomId);
      html += '<button class="call-chip' + (c.priority === 1 ? ' p1' : '') + '" data-room-jump="' + c.roomId + '" style="--chip:' + c.callColor + '">' +
        '<span class="chip-label">' + HCP.svg.esc(c.callLabel) + '</span>' +
        '<span class="chip-room">' + HCP.svg.esc(loc ? loc.room.name : '?') + '</span>' +
        '<span class="chip-time" data-elapsed="' + c.startedAt + '">00:00</span>' +
        '</button>';
    });
    board.innerHTML = html;
    board.querySelectorAll('[data-room-jump]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        HCP.state.ui.roomId = chip.getAttribute('data-room-jump');
        var container = document.getElementById('view');
        if (HCP.state.ui.view === 'simulate') render(container);
      });
    });
  }

  /* re-render wall + station when calls change (only when visible) */
  HCP.calls.on(function () {
    if (HCP.state.ui.view !== 'simulate') return;
    renderWallPanels();
    renderStation();
    // sidebar badges
    var container = document.getElementById('view');
    if (container) {
      container.querySelectorAll('.room-item').forEach(function (btn) {
        var rid = btn.getAttribute('data-room');
        var callsHere = HCP.calls.list().filter(function (c) { return c.roomId === rid; });
        btn.classList.toggle('calling', callsHere.length > 0);
        var badge = btn.querySelector('.room-badge');
        if (callsHere.length) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'room-badge';
            btn.appendChild(badge);
          }
          badge.style.background = callsHere[0].callColor;
          badge.textContent = callsHere.length;
        } else if (badge) badge.remove();
      });
    }
    // emergency vignette
    var top = HCP.calls.highest();
    document.body.classList.toggle('emergency-live', !!(top && top.priority === 1));
  });

  HCP.simulate = {
    render: render,
    toggleWallFullscreen: toggleWallFullscreen,
    destroy: function () { clearInterval(tickTimer); }
  };
})();
