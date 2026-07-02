/* =========================================================
   Designer — drag-and-drop panel builder.
   Figma + Canva + hospital call systems.
   ========================================================= */
(function () {
  var history = [];
  var HISTORY_MAX = 60;
  var container = null;

  function currentPanel() {
    var ui = HCP.state.ui;
    var panels = HCP.state.hospital.panels;
    if (!ui.panelId || !panels[ui.panelId]) {
      var ids = Object.keys(panels);
      ui.panelId = ids.length ? ids[0] : null;
    }
    return ui.panelId ? panels[ui.panelId] : null;
  }

  function snapshot() {
    var p = currentPanel();
    if (!p) return;
    history.push(JSON.stringify(p));
    if (history.length > HISTORY_MAX) history.shift();
  }

  function undo() {
    var p = currentPanel();
    if (!p || !history.length) return;
    var prev = JSON.parse(history.pop());
    HCP.state.hospital.panels[p.id] = prev;
    HCP.save();
    render(container);
  }

  function mutate(fn, skipSnapshot) {
    var p = currentPanel();
    if (!p) return;
    if (!skipSnapshot) snapshot();
    fn(p);
    HCP.save();
  }

  /* ============ render ============ */
  function render(c) {
    container = c;
    var h = HCP.state.hospital;
    var panel = currentPanel();
    var ui = HCP.state.ui;

    var html = '<div class="builder-layout">';

    /* --- left palette --- */
    html += '<aside class="build-palette glass">';
    html += '<div class="side-title">Panel</div>';
    html += '<div class="panel-picker">';
    html += '<select id="panelSelect" class="field">';
    Object.keys(h.panels).forEach(function (pid) {
      html += '<option value="' + pid + '"' + (panel && pid === panel.id ? ' selected' : '') + '>' + HCP.svg.esc(h.panels[pid].name) + '</option>';
    });
    html += '</select>';
    html += '<div class="row-btns">' +
      '<button id="newPanelBtn" class="mini-btn">+ New</button>' +
      '<button id="dupPanelBtn" class="mini-btn">Duplicate</button>' +
      '<button id="delPanelBtn" class="mini-btn danger">Delete</button></div>';
    html += '</div>';

    html += '<div class="side-title">Component Library</div>';
    html += '<div class="palette-scroll">';
    html += '<div class="pal-section">Call buttons</div><div class="pal-grid">';
    HCP.data.buttonLibrary.forEach(function (b, i) {
      html += '<button class="pal-chip" data-libbtn="' + i + '" style="--pc:' + b.color + ';--pt:' + b.text + '">' + HCP.svg.esc(b.name) + '</button>';
    });
    html += '</div>';
    html += '<div class="pal-section">Shapes & hardware</div><div class="pal-grid">';
    [
      ['circle', 'Circle button'], ['rect', 'Rect button'], ['wedge', 'Corner wedge'],
      ['led', 'LED'], ['label', 'Label'], ['barcode', 'Asset label'],
      ['speaker', 'Speaker'], ['screw', 'Screw'], ['auxstrip', 'AUX strip'], ['flap', 'Blank flap']
    ].forEach(function (t) {
      html += '<button class="pal-chip shape" data-shape="' + t[0] + '">' + t[1] + '</button>';
    });
    html += '</div></div>';
    html += '</aside>';

    /* --- canvas --- */
    html += '<section class="build-canvas-wrap">';
    html += '<div class="canvas-toolbar">';
    html += '<label class="switch"><input type="checkbox" id="testToggle"' + (ui.testMode ? ' checked' : '') + '><span></span> Test</label>';
    html += '<span class="toolbar-sep"></span>';
    html += '<button id="undoBtn" class="mini-btn" title="Undo (⌘Z)">Undo</button>';
    html += '<button id="fwdBtn" class="mini-btn" title="Bring forward">Front</button>';
    html += '<button id="backBtn" class="mini-btn" title="Send back">Back</button>';
    html += '<button id="dupCompBtn" class="mini-btn">Duplicate</button>';
    html += '<button id="delCompBtn" class="mini-btn danger">Delete</button>';
    html += '</div>';
    html += '<div id="buildCanvas" class="build-canvas' + (ui.testMode ? ' testing' : '') + '"></div>';
    html += '</section>';

    /* --- inspector --- */
    html += '<aside id="inspector" class="build-inspector glass"></aside>';
    html += '</div>';

    c.innerHTML = html;
    drawCanvas();
    drawInspector();
    wireStaticEvents();
  }

  /* ============ canvas ============ */
  function drawCanvas() {
    var panel = currentPanel();
    var cv = document.getElementById('buildCanvas');
    if (!cv) return;
    if (!panel) { cv.innerHTML = '<div class="empty-note">No panel — create one with “+ New”.</div>'; return; }
    var ui = HCP.state.ui;

    var scale = Math.min(
      (cv.clientWidth - 80) / (panel.w + 30),
      (cv.clientHeight - 60) / (panel.h + 40)
    );
    scale = Math.max(2, Math.min(scale || 3, 5));

    var activeComps = {};
    var flashing = false, flashFast = false;
    if (ui.testMode) {
      panel.components.forEach(function (cc) {
        if (HCP.calls.isActive('TEST', panel.id, cc.id)) {
          activeComps[cc.id] = true;
          flashing = true;
          if (cc.behaviour && cc.behaviour.priority === 1) flashFast = true;
        }
      });
    }

    cv.innerHTML = '<div class="canvas-stage">' + HCP.svg.renderPanel(panel, {
      scale: scale,
      editable: !ui.testMode,
      interactive: ui.testMode,
      selection: ui.testMode ? null : ui.selection,
      activeComps: activeComps,
      panelLive: ui.testMode,
      panelFlashing: flashing,
      flashFast: flashFast
    }) + '</div>';

    var svg = cv.querySelector('svg');
    if (!svg) return;

    if (ui.testMode) {
      svg.addEventListener('pointerdown', function (ev) {
        var t = ev.target.closest('[data-comp]');
        if (!t) return;
        testPress(panel, t.getAttribute('data-comp'), t);
      });
      return;
    }

    /* ----- editing interactions ----- */
    svg.addEventListener('pointerdown', function (ev) {
      var t = ev.target.closest('[data-comp]');
      var ui2 = HCP.state.ui;
      if (!t) {
        if (ui2.selection) { ui2.selection = null; drawCanvas(); drawInspector(); }
        return;
      }
      var compId = t.getAttribute('data-comp');
      if (ui2.selection !== compId) {
        ui2.selection = compId;
        drawCanvas(); drawInspector();
      }
      var comp = HCP.data.findComp(currentPanel(), compId);
      if (!comp || comp.x == null || ['wedge', 'flap', 'auxstrip', 'brand'].indexOf(comp.type) >= 0) return;
      var pt = canvasPoint(ev);
      if (!pt) return;
      dragState = { comp: comp, dx: comp.x - pt.x, dy: comp.y - pt.y, moved: false, snap: JSON.stringify(currentPanel()) };
    });
  }

  /* drag tracking lives on document so re-renders can't orphan a gesture */
  var dragState = null;
  function canvasPoint(ev) {
    var cv = document.getElementById('buildCanvas');
    var svg = cv && cv.querySelector('svg');
    if (!svg) return null;
    var rect = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    return {
      x: vb.x + (ev.clientX - rect.left) / rect.width * vb.width,
      y: vb.y + (ev.clientY - rect.top) / rect.height * vb.height
    };
  }
  document.addEventListener('pointermove', function (ev) {
    if (!dragState || HCP.state.ui.view !== 'builder') return;
    var pt = canvasPoint(ev);
    var p = currentPanel();
    if (!pt || !p) return;
    var nx = Math.round((pt.x + dragState.dx) * 2) / 2;
    var ny = Math.round((pt.y + dragState.dy) * 2) / 2;
    nx = Math.max(-14, Math.min(p.w + 14, nx));
    ny = Math.max(-16, Math.min(p.h + 8, ny));
    if (nx !== dragState.comp.x || ny !== dragState.comp.y) {
      dragState.comp.x = nx; dragState.comp.y = ny;
      dragState.moved = true;
      drawCanvasLight(dragState.comp);
    }
  });
  function endDocDrag() {
    if (!dragState) return;
    if (dragState.moved) {
      history.push(dragState.snap);
      if (history.length > HISTORY_MAX) history.shift();
      HCP.save();
      drawCanvas(); drawInspector();
    }
    dragState = null;
  }
  document.addEventListener('pointerup', endDocDrag);
  document.addEventListener('pointercancel', endDocDrag);

  // fast path: move the dragged component's group without a full re-render
  function drawCanvasLight(comp) {
    var cv = document.getElementById('buildCanvas');
    var el = cv && cv.querySelector('[data-comp="' + comp.id + '"]');
    if (!el) return;
    if (el.tagName.toLowerCase() === 'g' && el.getAttribute('transform') && el.getAttribute('transform').indexOf('translate') === 0) {
      var rot = '';
      var m = el.getAttribute('transform').match(/rotate\([^)]*\)/);
      if (m) rot = ' ' + m[0];
      if (comp.type === 'barcode') {
        var bw = comp.w || 34, bh = bw * 0.55;
        el.setAttribute('transform', 'translate(' + (comp.x - bw / 2) + ' ' + (comp.y - bh / 2) + ')');
      } else {
        el.setAttribute('transform', 'translate(' + comp.x + ' ' + comp.y + ')' + rot);
      }
    } else {
      drawCanvas(); // labels etc: cheap enough
    }
  }

  function testPress(panel, compId, el) {
    var c = HCP.data.findComp(panel, compId);
    if (!c || !c.behaviour) return;
    if (el) { el.classList.add('pressed'); setTimeout(function () { el.classList.remove('pressed'); }, 160); }
    if (c.behaviour.action === 'call') {
      HCP.audio.clickTick(1800);
      HCP.calls.raise('TEST', panel.id, compId, {
        callLabel: c.behaviour.callLabel || c.label || 'CALL',
        callColor: c.behaviour.callColor || c.color || '#38b6ff',
        priority: c.behaviour.priority || 3,
        sound: c.behaviour.sound || null,
        latching: c.behaviour.latching !== false
      });
    } else if (c.behaviour.action === 'cancel') {
      var removed = HCP.calls.cancelPanel('TEST', panel.id);
      HCP.audio.clickTick(removed ? 900 : 500);
    }
  }

  HCP.calls.on(function () {
    if (HCP.state.ui.view === 'builder' && HCP.state.ui.testMode) drawCanvas();
  });

  /* ============ inspector ============ */
  function drawInspector() {
    var box = document.getElementById('inspector');
    if (!box) return;
    var panel = currentPanel();
    var ui = HCP.state.ui;
    if (!panel) { box.innerHTML = ''; return; }
    var comp = ui.selection ? HCP.data.findComp(panel, ui.selection) : null;

    var html = '';
    if (!comp) {
      /* --- panel properties --- */
      html += '<div class="side-title">Panel Properties</div>';
      html += field('Name', '<input class="field" id="pp_name" value="' + HCP.svg.esc(panel.name) + '">');
      html += field('Width <em>' + panel.w + '</em>', slider('pp_w', 60, 200, panel.w));
      html += field('Height <em>' + panel.h + '</em>', slider('pp_h', 60, 220, panel.h));
      html += field('Face colour', colorRow('pp_face', panel.face.color, ['#5b5f64', '#4a4e53', '#e9e6df', '#f4f2ee', '#2f3236', '#dfe3e6']));
      html += field('Corner radius <em>' + (panel.face.radius || 9) + '</em>', slider('pp_rad', 0, 20, panel.face.radius || 9));
      html += field('Surround', '<select class="field" id="pp_surround">' +
        opt('none', 'None (flush)', panel.face.surround) +
        opt('white', 'White plastic (merlon)', panel.face.surround) +
        opt('steel', 'Stainless steel', panel.face.surround) + '</select>');
      html += '<div class="hint-block">Select a component to edit it.</div>';
    } else {
      html += '<div class="side-title">' + typeName(comp.type) + '</div>';

      if ('label' in comp || comp.type === 'circle' || comp.type === 'rect' || comp.type === 'wedge') {
        html += field('Label', '<input class="field" id="cp_label" value="' + HCP.svg.esc(comp.label || '') + '">');
      }
      if (comp.type === 'label') html += field('Text', '<input class="field" id="cp_text" value="' + HCP.svg.esc(comp.text || '') + '">');
      if (comp.type === 'barcode') {
        html += field('Site code', '<input class="field" id="cp_bctext" value="' + HCP.svg.esc(comp.text || 'NBH') + '">');
        html += field('Asset number', '<input class="field" id="cp_bccode" value="' + HCP.svg.esc(comp.code || '023061') + '">');
      }

      if (comp.type !== 'screw' && comp.type !== 'brand') {
        var colTargets = { label: 'color' }[comp.type] || 'color';
        if (comp.type !== 'barcode' && comp.type !== 'speaker' && comp.type !== 'flap' && comp.type !== 'auxstrip') {
          html += field('Colour', colorRow('cp_color', comp[colTargets] || '#199a53',
            ['#e01b24', '#199a53', '#f2d500', '#8c2fc7', '#1668dd', '#ff7f27', '#f0efec', '#63676c', '#38b6ff', '#ffffff']));
        }
        if (comp.type === 'circle' || comp.type === 'rect' || comp.type === 'wedge' || comp.type === 'label') {
          html += field('Text colour', colorRow('cp_tcolor', comp.textColor || comp.color || '#ffffff', ['#ffffff', '#111111', '#c81e2b']));
        }
      }

      /* geometry */
      if (comp.type === 'circle') html += field('Size <em>' + (comp.r || 22) + '</em>', slider('cp_r', 8, 44, comp.r || 22));
      if (comp.type === 'rect') {
        html += field('Width <em>' + (comp.w || 32) + '</em>', slider('cp_w', 10, 90, comp.w || 32));
        html += field('Height <em>' + (comp.h || 36) + '</em>', slider('cp_h', 10, 70, comp.h || 36));
      }
      if (comp.type === 'wedge') {
        html += field('Corner', '<select class="field" id="cp_corner">' +
          opt('tl', 'Top left', comp.corner) + opt('tr', 'Top right', comp.corner) +
          opt('bl', 'Bottom left', comp.corner) + opt('br', 'Bottom right', comp.corner) + '</select>');
        html += field('Reach <em>' + Math.round((comp.leg || 0.52) * 100) + '%</em>', slider('cp_leg', 30, 70, Math.round((comp.leg || 0.52) * 100)));
      }
      if (comp.type === 'led') html += field('Angle <em>' + (comp.angle || 0) + '°</em>', slider('cp_angle', -90, 90, comp.angle || 0, 5));
      if (comp.type === 'label') html += field('Size <em>' + (comp.size || 5) + '</em>', slider('cp_size', 3, 14, comp.size || 5));
      if (comp.type === 'barcode') html += field('Width <em>' + (comp.w || 34) + '</em>', slider('cp_w', 18, 70, comp.w || 34));
      if (comp.type === 'circle' || comp.type === 'rect') {
        html += field('Icon', '<select class="field" id="cp_icon">' +
          opt('none', 'None', comp.icon || 'none') + opt('person', 'Person (call figure)', comp.icon) + opt('cross', 'Medical cross', comp.icon) + '</select>');
      }

      /* behaviour */
      if (['circle', 'rect', 'wedge'].indexOf(comp.type) >= 0) {
        var b = comp.behaviour || { action: 'none' };
        html += '<div class="side-title">Behaviour</div>';
        html += field('When pressed', '<select class="field" id="cp_action">' +
          opt('call', 'Raise a call', b.action) + opt('cancel', 'Cancel calls on panel', b.action) + opt('none', 'Nothing (decorative)', b.action) + '</select>');
        if (b.action === 'call') {
          html += field('Call name', '<input class="field" id="cp_callLabel" value="' + HCP.svg.esc(b.callLabel || comp.label || 'CALL') + '">');
          html += field('Priority <em>P' + (b.priority || 3) + '</em>', slider('cp_priority', 1, 5, b.priority || 3));
          html += '<div class="prio-scale"><span>P1 emergency</span><span>P5 routine</span></div>';
          html += field('Alarm sound', '<select class="field" id="cp_sound"><option value="">— silent —</option>' +
            HCP.state.hospital.soundProfiles.map(function (s) { return opt(s.id, s.name, b.sound); }).join('') + '</select>');
          html += field('', '<label class="check"><input type="checkbox" id="cp_latching"' + (b.latching !== false ? ' checked' : '') + '> Latching (stays on until Cancel)</label>');
        }
      }
    }
    box.innerHTML = html;
    wireInspectorEvents(comp);
  }

  function typeName(t) {
    return { circle: 'Circular Button', rect: 'Rectangular Button', wedge: 'Corner Wedge', led: 'Indicator LED', label: 'Label', barcode: 'Asset Label', speaker: 'Speaker', screw: 'Screw', auxstrip: 'AUX Strip', flap: 'Blank Flap', brand: 'Brand Mark' }[t] || t;
  }
  function field(label, control) {
    return '<div class="insp-field">' + (label ? '<label>' + label + '</label>' : '') + control + '</div>';
  }
  function slider(id, min, max, val, step) {
    return '<input type="range" class="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '">';
  }
  function opt(v, t, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + t + '</option>'; }
  function colorRow(id, current, swatches) {
    var html = '<div class="color-row" id="' + id + '">';
    swatches.forEach(function (c) {
      html += '<button class="swatch' + (c.toLowerCase() === (current || '').toLowerCase() ? ' on' : '') + '" data-color="' + c + '" style="background:' + c + '"></button>';
    });
    html += '<input type="color" class="swatch-custom" value="' + toHex(current || '#199a53') + '" title="Custom colour">';
    return html + '</div>';
  }
  function toHex(c) {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    return '#199a53';
  }

  /* ============ events ============ */
  function wireStaticEvents() {
    var panel = currentPanel();
    var ui = HCP.state.ui;

    var sel = document.getElementById('panelSelect');
    if (sel) sel.addEventListener('change', function () {
      ui.panelId = sel.value; ui.selection = null; history = [];
      render(container);
    });

    on('newPanelBtn', 'click', function () {
      var p = HCP.data.factories.nurseNBH();
      p.name = 'New Panel';
      HCP.state.hospital.panels[p.id] = p;
      ui.panelId = p.id; ui.selection = null; history = [];
      HCP.save(); render(container);
    });
    on('dupPanelBtn', 'click', function () {
      if (!panel) return;
      var copy = JSON.parse(JSON.stringify(panel));
      copy.id = HCP.uid('p'); copy.name = panel.name + ' (copy)';
      copy.components.forEach(function (cc) { cc.id = HCP.uid('c'); });
      HCP.state.hospital.panels[copy.id] = copy;
      ui.panelId = copy.id; HCP.save(); render(container);
    });
    on('delPanelBtn', 'click', function () {
      if (!panel) return;
      if (!confirm('Delete panel “' + panel.name + '”? Rooms using it will lose it.')) return;
      delete HCP.state.hospital.panels[panel.id];
      HCP.state.hospital.wards.forEach(function (w) {
        w.rooms.forEach(function (r) {
          r.panelIds = r.panelIds.filter(function (id) { return id !== panel.id; });
        });
      });
      ui.panelId = null; ui.selection = null;
      HCP.save(); render(container);
    });

    on('testToggle', 'change', function (ev) {
      ui.testMode = ev.target.checked;
      if (!ui.testMode) { HCP.calls.cancelPanel('TEST', panel ? panel.id : ''); }
      render(container);
    });

    on('undoBtn', 'click', undo);
    on('dupCompBtn', 'click', function () {
      var comp = ui.selection && HCP.data.findComp(currentPanel(), ui.selection);
      if (!comp) return;
      mutate(function (p) {
        var copy = JSON.parse(JSON.stringify(comp));
        copy.id = HCP.uid('c');
        if (copy.x != null) { copy.x += 8; copy.y += 8; }
        p.components.push(copy);
        ui.selection = copy.id;
      });
      drawCanvas(); drawInspector();
    });
    on('delCompBtn', 'click', deleteSelected);
    on('fwdBtn', 'click', function () { reorder(1); });
    on('backBtn', 'click', function () { reorder(-1); });

    /* palette */
    container.querySelectorAll('[data-libbtn]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var lib = HCP.data.buttonLibrary[parseInt(chip.getAttribute('data-libbtn'), 10)];
        mutate(function (p) {
          var c = HCP.data.comp('circle', {
            x: p.w / 2, y: p.w / 2, r: 18,
            label: lib.name.toUpperCase(), color: lib.color, textColor: lib.text, icon: lib.icon,
            behaviour: HCP.data.behaviourCall(lib.name.toUpperCase(), lib.color, lib.priority, lib.sound)
          });
          p.components.push(c);
          HCP.state.ui.selection = c.id;
        });
        drawCanvas(); drawInspector();
      });
    });
    container.querySelectorAll('[data-shape]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        addShape(chip.getAttribute('data-shape'));
      });
    });
  }

  function addShape(type) {
    mutate(function (p) {
      var mid = { x: p.w / 2, y: p.w / 2 };
      var c;
      switch (type) {
        case 'circle': c = HCP.data.comp('circle', { x: mid.x, y: mid.y, r: 20, label: 'CALL', color: '#199a53', textColor: '#fff', icon: 'person', behaviour: HCP.data.behaviourCall('CALL', '#199a53', 3, 'snd_nurse') }); break;
        case 'rect': c = HCP.data.comp('rect', { x: mid.x, y: mid.y, w: 32, h: 36, label: 'CALL', color: '#ff7f27', textColor: '#fff', icon: 'none', behaviour: HCP.data.behaviourCall('CALL', '#ff7f27', 3, 'snd_nhs') }); break;
        case 'wedge':
          var used = p.components.filter(function (k) { return k.type === 'wedge'; }).map(function (k) { return k.corner; });
          var corner = ['tl', 'tr', 'bl', 'br'].find(function (k) { return used.indexOf(k) < 0; }) || 'tl';
          c = HCP.data.comp('wedge', { corner: corner, label: 'ASSIST', color: '#f2d500', textColor: '#111', leg: 0.46, behaviour: HCP.data.behaviourCall('STAFF ASSIST', '#f2d500', 2, 'snd_assist') });
          break;
        case 'led': c = HCP.data.comp('led', { x: mid.x, y: mid.y - 26, angle: 0, color: '#38b6ff' }); break;
        case 'label': c = HCP.data.comp('label', { x: mid.x, y: 12, text: 'LABEL', size: 5, color: '#efefec', bold: true }); break;
        case 'barcode': c = HCP.data.comp('barcode', { x: mid.x, y: -9, w: 34, text: HCP.state.hospital.assetPrefix || 'NBH', code: '0230' + Math.floor(10 + Math.random() * 89) }); break;
        case 'speaker': c = HCP.data.comp('speaker', { x: mid.x, y: p.h - 18, r: 8 }); break;
        case 'screw': c = HCP.data.comp('screw', { x: 10, y: 10 }); break;
        case 'auxstrip': c = HCP.data.comp('auxstrip', { x: 0, y: p.w + 4 }); break;
        case 'flap': c = HCP.data.comp('flap', { x: 0, y: p.w + 4, h: Math.max(16, p.h - p.w - 8) }); break;
      }
      if (c) { p.components.push(c); HCP.state.ui.selection = c.id; }
    });
    drawCanvas(); drawInspector();
  }

  function deleteSelected() {
    var ui = HCP.state.ui;
    if (!ui.selection) return;
    mutate(function (p) {
      p.components = p.components.filter(function (c) { return c.id !== ui.selection; });
      ui.selection = null;
    });
    drawCanvas(); drawInspector();
  }

  function reorder(dir) {
    var ui = HCP.state.ui;
    if (!ui.selection) return;
    mutate(function (p) {
      var i = p.components.findIndex(function (c) { return c.id === ui.selection; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= p.components.length) return;
      var tmp = p.components[i]; p.components[i] = p.components[j]; p.components[j] = tmp;
    });
    drawCanvas();
  }

  function wireInspectorEvents(comp) {
    var ui = HCP.state.ui;

    /* panel props */
    bindText('pp_name', function (p, v) { p.name = v; refreshPanelSelect(); });
    bindRange('pp_w', function (p, v) { p.w = v; });
    bindRange('pp_h', function (p, v) { p.h = v; });
    bindRange('pp_rad', function (p, v) { p.face.radius = v; });
    bindColorRow('pp_face', function (p, v) { p.face.color = v; });
    bindSelect('pp_surround', function (p, v) { p.face.surround = v; });

    if (!comp) return;

    /* component props */
    bindText('cp_label', function (p, v) { comp.label = v; });
    bindText('cp_text', function (p, v) { comp.text = v; });
    bindText('cp_bctext', function (p, v) { comp.text = v; });
    bindText('cp_bccode', function (p, v) { comp.code = v; });
    bindColorRow('cp_color', function (p, v) {
      comp.color = v;
      if (comp.behaviour && comp.behaviour.action === 'call') comp.behaviour.callColor = v;
    });
    bindColorRow('cp_tcolor', function (p, v) { comp.textColor = v; });
    bindRange('cp_r', function (p, v) { comp.r = v; });
    bindRange('cp_w', function (p, v) { comp.w = v; });
    bindRange('cp_h', function (p, v) { comp.h = v; });
    bindRange('cp_leg', function (p, v) { comp.leg = v / 100; });
    bindRange('cp_angle', function (p, v) { comp.angle = v; });
    bindRange('cp_size', function (p, v) { comp.size = v; });
    bindSelect('cp_corner', function (p, v) { comp.corner = v; });
    bindSelect('cp_icon', function (p, v) { comp.icon = v; });

    bindSelect('cp_action', function (p, v) {
      comp.behaviour = comp.behaviour || {};
      comp.behaviour.action = v;
      if (v === 'call' && !comp.behaviour.callLabel) {
        comp.behaviour.callLabel = comp.label || 'CALL';
        comp.behaviour.callColor = comp.color;
        comp.behaviour.priority = comp.behaviour.priority || 3;
        comp.behaviour.latching = true;
      }
    }, true);
    bindText('cp_callLabel', function (p, v) { comp.behaviour.callLabel = v; });
    bindRange('cp_priority', function (p, v) { comp.behaviour.priority = v; }, true);
    bindSelect('cp_sound', function (p, v) {
      comp.behaviour.sound = v || null;
      var prof = v && HCP.data.getSound(v);
      if (prof) HCP.audio.playOnce(prof); // audition
    });
    var latch = document.getElementById('cp_latching');
    if (latch) latch.addEventListener('change', function () {
      mutate(function () { comp.behaviour.latching = latch.checked; }, false);
    });
  }

  function refreshPanelSelect() {
    var sel = document.getElementById('panelSelect');
    var p = currentPanel();
    if (sel && p) {
      var o = sel.querySelector('option[value="' + p.id + '"]');
      if (o) o.textContent = p.name;
    }
  }

  function bindText(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    var committed = el.value;
    el.addEventListener('input', function () {
      mutate(function (p) { fn(p, el.value); }, true);
      drawCanvas();
    });
    el.addEventListener('change', function () {
      if (el.value !== committed) { snapshot(); committed = el.value; HCP.save(); }
    });
  }
  function bindRange(id, fn, redrawInspector) {
    var el = document.getElementById(id);
    if (!el) return;
    var snapped = false;
    el.addEventListener('input', function () {
      if (!snapped) { snapshot(); snapped = true; }
      mutate(function (p) { fn(p, parseFloat(el.value)); }, true);
      var lbl = el.closest('.insp-field');
      var em = lbl && lbl.querySelector('em');
      if (em) em.textContent = id === 'cp_priority' ? 'P' + el.value : (id === 'cp_leg' ? el.value + '%' : el.value);
      drawCanvas();
    });
    el.addEventListener('change', function () {
      snapped = false; HCP.save();
      if (redrawInspector) drawInspector();
    });
  }
  function bindSelect(id, fn, redrawInspector) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      mutate(function (p) { fn(p, el.value); });
      drawCanvas();
      if (redrawInspector) drawInspector();
    });
  }
  function bindColorRow(id, fn) {
    var row = document.getElementById(id);
    if (!row) return;
    row.querySelectorAll('.swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        mutate(function (p) { fn(p, sw.getAttribute('data-color')); });
        row.querySelectorAll('.swatch').forEach(function (s2) { s2.classList.remove('on'); });
        sw.classList.add('on');
        drawCanvas();
      });
    });
    var custom = row.querySelector('.swatch-custom');
    if (custom) custom.addEventListener('input', function () {
      mutate(function (p) { fn(p, custom.value); }, true);
      drawCanvas();
    });
  }

  function on(id, evt, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }

  /* keyboard */
  document.addEventListener('keydown', function (ev) {
    if (HCP.state.ui.view !== 'builder' || HCP.state.ui.testMode) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    var ui = HCP.state.ui;
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); return; }
    if (!ui.selection) return;
    var comp = HCP.data.findComp(currentPanel(), ui.selection);
    if (!comp) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteSelected(); return; }
    var d = ev.shiftKey ? 5 : 1;
    var moved = false;
    if (comp.x != null) {
      if (ev.key === 'ArrowLeft') { comp.x -= d; moved = true; }
      if (ev.key === 'ArrowRight') { comp.x += d; moved = true; }
      if (ev.key === 'ArrowUp') { comp.y -= d; moved = true; }
      if (ev.key === 'ArrowDown') { comp.y += d; moved = true; }
    }
    if (moved) { ev.preventDefault(); HCP.save(); drawCanvas(); }
  });

  HCP.builder = { render: render };
})();
