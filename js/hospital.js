/* =========================================================
   Hospital builder — wards, rooms, panel assignment,
   plus the Hospital Library (presets, import/export).
   ========================================================= */
(function () {
  var container = null;

  function render(c) {
    container = c;
    var h = HCP.state.hospital;

    var html = '<div class="hospital-layout"><div class="hosp-inner">';

    /* ---- hero ---- */
    html += '<div class="hosp-hero">';
    html += '<div class="eyebrow">Hospital</div>';
    html += '<div class="hosp-hero-row">';
    html += '<input class="hosp-name-input" id="hospName" value="' + HCP.svg.esc(h.name) + '" spellcheck="false">';
    html += '<label class="prefix-lockup">Asset prefix <input class="field small" id="hospPrefix" maxlength="4" value="' + HCP.svg.esc(h.assetPrefix || 'NBH') + '"></label>';
    html += '</div></div>';

    /* ---- wards ---- */
    html += '<div class="section-head"><h3>Wards &amp; rooms</h3><button id="addWardBtn" class="mini-btn accent">+ Ward</button></div>';
    html += '<div class="ward-list">';
    h.wards.forEach(function (w) {
      html += '<div class="ward-card glass" data-ward="' + w.id + '">';
      html += '<div class="ward-head">' +
        '<input class="ward-name-input" data-wname="' + w.id + '" value="' + HCP.svg.esc(w.name) + '" spellcheck="false">' +
        '<button class="mini-btn" data-addroom="' + w.id + '">+ Room</button>' +
        '<button class="x-btn" data-delward="' + w.id + '" title="Delete ward">×</button></div>';
      w.rooms.forEach(function (r) {
        html += '<div class="room-row" data-room="' + r.id + '">';
        html += '<input class="field room-name-input" data-rname="' + r.id + '" value="' + HCP.svg.esc(r.name) + '" spellcheck="false">';
        html += '<div class="room-panels">';
        r.panelIds.forEach(function (pid, i) {
          var p = h.panels[pid];
          if (!p) return;
          html += '<span class="panel-tag">' + HCP.svg.esc(p.name) +
            '<button data-unassign="' + r.id + ':' + i + '" title="Remove from room">×</button></span>';
        });
        html += '<select class="field add-panel-select" data-assign="' + r.id + '"><option value="">+ Add panel</option>';
        Object.keys(h.panels).forEach(function (pid) {
          html += '<option value="' + pid + '">' + HCP.svg.esc(h.panels[pid].name) + '</option>';
        });
        html += '</select></div>';
        html += '<div class="room-actions">' +
          '<button class="link-btn" data-simroom="' + r.id + '">Simulate</button>' +
          '<button class="x-btn" data-delroom="' + r.id + '" title="Delete room">×</button></div>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div>';

    /* ---- library ---- */
    html += '<div class="section-head"><h3>Library</h3></div>';
    html += '<div class="lib-grid">';
    HCP.data.presets.forEach(function (p) {
      html += '<div class="preset-card"><div class="preset-name">' + p.name + '</div>' +
        '<div class="preset-desc">' + p.desc + '</div>' +
        '<button class="link-btn" data-preset="' + p.id + '">Load</button></div>';
    });
    html += '</div>';

    /* ---- your configuration ---- */
    html += '<div class="section-head"><h3>Your configuration</h3></div>';
    html += '<div class="config-row">' +
      '<button id="exportBtn" class="mini-btn">Export (.json)</button>' +
      '<button id="importBtn" class="mini-btn">Import (.json)</button>' +
      '</div>';

    html += '</div></div>';
    c.innerHTML = html;
    wire();
  }

  function wire() {
    var h = HCP.state.hospital;

    var name = document.getElementById('hospName');
    if (name) name.addEventListener('input', function () {
      h.name = name.value; HCP.save();
      var sh = document.getElementById('statusHospital');
      if (sh) sh.textContent = h.name;
    });
    var prefix = document.getElementById('hospPrefix');
    if (prefix) prefix.addEventListener('input', function () {
      h.assetPrefix = prefix.value.toUpperCase(); HCP.save();
    });

    onId('addWardBtn', function () {
      h.wards.push({ id: HCP.uid('w'), name: 'New Ward', rooms: [] });
      HCP.save(); render(container);
    });

    container.querySelectorAll('[data-wname]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var w = h.wards.find(function (x) { return x.id === inp.getAttribute('data-wname'); });
        if (w) { w.name = inp.value; HCP.save(); }
      });
    });
    container.querySelectorAll('[data-rname]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var found = HCP.data.getRoom(inp.getAttribute('data-rname'));
        if (found) { found.room.name = inp.value; HCP.save(); }
      });
    });

    container.querySelectorAll('[data-addroom]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var w = h.wards.find(function (x) { return x.id === btn.getAttribute('data-addroom'); });
        if (!w) return;
        var ids = Object.keys(h.panels);
        w.rooms.push({ id: HCP.uid('r'), name: 'Room ' + (w.rooms.length + 1), panelIds: ids.slice(0, 2) });
        HCP.save(); render(container);
      });
    });

    container.querySelectorAll('[data-delward]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var w = h.wards.find(function (x) { return x.id === btn.getAttribute('data-delward'); });
        if (!w) return;
        if (!confirm('Delete ward “' + w.name + '” and its ' + w.rooms.length + ' room(s)?')) return;
        h.wards = h.wards.filter(function (x) { return x !== w; });
        HCP.save(); render(container);
      });
    });

    container.querySelectorAll('[data-delroom]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rid = btn.getAttribute('data-delroom');
        h.wards.forEach(function (w) {
          w.rooms = w.rooms.filter(function (r) { return r.id !== rid; });
        });
        HCP.save(); render(container);
      });
    });

    container.querySelectorAll('[data-simroom]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        HCP.state.ui.roomId = btn.getAttribute('data-simroom');
        HCP.app.switchView('simulate');
      });
    });

    container.querySelectorAll('[data-assign]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (!sel.value) return;
        var found = HCP.data.getRoom(sel.getAttribute('data-assign'));
        if (found) {
          found.room.panelIds.push(sel.value);
          HCP.save(); render(container);
        }
      });
    });

    container.querySelectorAll('[data-unassign]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-unassign').split(':');
        var found = HCP.data.getRoom(parts[0]);
        if (found) {
          found.room.panelIds.splice(parseInt(parts[1], 10), 1);
          HCP.save(); render(container);
        }
      });
    });

    /* library */
    container.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = HCP.data.presets.find(function (p) { return p.id === btn.getAttribute('data-preset'); });
        if (!preset) return;
        if (!confirm('Load “' + preset.name + '”? This replaces your current hospital (export it first if you want to keep it).')) return;
        HCP.calls.clearAll();
        HCP.state.hospital = preset.make();
        HCP.state.ui.roomId = null;
        HCP.state.ui.panelId = null;
        HCP.state.ui.soundId = null;
        HCP.state.ui.selection = null;
        HCP.save();
        HCP.app.refreshChrome();
        render(container);
      });
    });

    onId('exportBtn', function () {
      var blob = new Blob([JSON.stringify(HCP.state.hospital, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (h.name || 'hospital').replace(/[^\w\-]+/g, '-').toLowerCase() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });

    onId('importBtn', function () {
      document.getElementById('importFile').click();
    });
  }

  function handleImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !data.panels || !data.wards || !data.soundProfiles) {
          alert('That file doesn’t look like a Hospital Call Panel Builder export.');
          return;
        }
        HCP.calls.clearAll();
        HCP.state.hospital = data;
        HCP.state.ui.roomId = null;
        HCP.state.ui.panelId = null;
        HCP.state.ui.soundId = null;
        HCP.save();
        HCP.app.refreshChrome();
        if (HCP.state.ui.view === 'hospital') render(container);
      } catch (e) {
        alert('Could not read that file: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  function onId(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  HCP.hospital = { render: render, handleImport: handleImport };
})();
