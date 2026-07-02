/* =========================================================
   App shell — tabs, boot, global chrome.
   ========================================================= */
(function () {
  var views = {
    simulate: function (c) { HCP.simulate.render(c); },
    builder: function (c) { HCP.builder.render(c); },
    sounds: function (c) { HCP.sounds.render(c); },
    hospital: function (c) { HCP.hospital.render(c); }
  };

  function switchView(name) {
    var ui = HCP.state.ui;
    if (ui.view === 'simulate' && name !== 'simulate') HCP.simulate.destroy();
    if (name !== 'sounds') HCP.audio.previewStop();
    ui.view = name;
    document.querySelectorAll('#mainTabs .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === name);
    });
    var c = document.getElementById('view');
    c.className = 'view-' + name;
    views[name](c);
  }

  function refreshChrome() {
    var h = HCP.state.hospital;
    var sh = document.getElementById('statusHospital');
    if (sh) sh.textContent = h.name;
    var sub = document.getElementById('brandSub');
    if (sub) sub.textContent = h.name;
  }

  function boot() {
    HCP.state.hospital = HCP.data.load() || HCP.data.presets[0].make();
    refreshChrome();

    document.querySelectorAll('#mainTabs .tab').forEach(function (t) {
      t.addEventListener('click', function () { switchView(t.getAttribute('data-view')); });
    });

    var muteBtn = document.getElementById('muteBtn');
    muteBtn.addEventListener('click', function () {
      var m = !HCP.audio.isMuted();
      HCP.audio.setMuted(m);
      muteBtn.classList.toggle('muted', m);
      document.getElementById('volIcon').innerHTML = m
        ? '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
        : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    });

    document.getElementById('fsBtn').addEventListener('click', function () {
      if (HCP.state.ui.view !== 'simulate') switchView('simulate');
      setTimeout(HCP.simulate.toggleWallFullscreen, 50);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'f' || ev.key === 'F') {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (HCP.state.ui.view === 'simulate') HCP.simulate.toggleWallFullscreen();
      }
    });

    document.getElementById('importFile').addEventListener('change', function (ev) {
      if (ev.target.files && ev.target.files[0]) {
        HCP.hospital.handleImport(ev.target.files[0]);
        ev.target.value = '';
      }
    });

    // wake the audio context on first interaction (browser autoplay policy)
    var wake = function () {
      HCP.audio.ensureCtx();
      document.removeEventListener('pointerdown', wake);
    };
    document.addEventListener('pointerdown', wake);

    // re-render wall on resize (panel scaling)
    var rs = null;
    window.addEventListener('resize', function () {
      clearTimeout(rs);
      rs = setTimeout(function () {
        if (HCP.state.ui.view === 'simulate') switchView('simulate');
      }, 200);
    });

    switchView('simulate');
  }

  HCP.app = { switchView: switchView, refreshChrome: refreshChrome };
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
