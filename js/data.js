/* =========================================================
   Hospital Call Panel Builder — data model & presets
   Everything is data driven:
   Hospital → Wards → Rooms → Panels → Components → Behaviour → Sound Profile
   ========================================================= */
window.HCP = window.HCP || {};

(function () {
  let uidCounter = 0;
  function uid(prefix) {
    uidCounter++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + uidCounter + '_' + Math.floor(Math.random() * 1e6).toString(36);
  }

  /* ---------- Sound profiles (recipes, not recordings) ---------- */
  function defaultSoundProfiles() {
    return [
      {
        id: 'snd_emergency', name: 'Emergency (AU continuous)', color: '#e01b24',
        pitch: 1, tempo: 1, volume: 0.9, gap: 0,
        blocks: [
          { kind: 'beep', freq: 800, dur: 240, wave: 'square' },
          { kind: 'beep', freq: 1000, dur: 240, wave: 'square' }
        ]
      },
      {
        id: 'snd_nurse', name: 'Nurse Call (soft chime)', color: '#199a53',
        pitch: 1, tempo: 1, volume: 0.65, gap: 1700,
        blocks: [{ kind: 'chime', freq: 1200, dur: 480 }]
      },
      {
        id: 'snd_assist', name: 'Staff Assist (double beep)', color: '#e3c800',
        pitch: 1, tempo: 1, volume: 0.8, gap: 1100,
        blocks: [
          { kind: 'beep', freq: 880, dur: 170, wave: 'triangle' },
          { kind: 'silence', dur: 110 },
          { kind: 'beep', freq: 880, dur: 170, wave: 'triangle' }
        ]
      },
      {
        id: 'snd_orderly', name: 'Orderly (low two-tone)', color: '#8c2fc7',
        pitch: 1, tempo: 1, volume: 0.7, gap: 2300,
        blocks: [
          { kind: 'chime', freq: 620, dur: 330 },
          { kind: 'chime', freq: 760, dur: 380 }
        ]
      },
      {
        id: 'snd_codeblue', name: 'Code Blue (urgent warble)', color: '#1668dd',
        pitch: 1, tempo: 1, volume: 0.9, gap: 120,
        blocks: [{ kind: 'warble', freq: 700, freq2: 950, rate: 9, dur: 900, wave: 'square' }]
      },
      {
        id: 'snd_nhs', name: 'NHS Ward (warble)', color: '#ff7f27',
        pitch: 1, tempo: 1, volume: 0.75, gap: 900,
        blocks: [{ kind: 'warble', freq: 520, freq2: 660, rate: 6, dur: 700, wave: 'sine' }]
      },
      {
        id: 'snd_us_dingdong', name: 'US Ding-Dong', color: '#a0c4ff',
        pitch: 1, tempo: 1, volume: 0.7, gap: 2400,
        blocks: [
          { kind: 'chime', freq: 660, dur: 420 },
          { kind: 'chime', freq: 528, dur: 620 }
        ]
      }
    ];
  }

  /* ---------- Component factories ---------- */
  function comp(type, props) {
    return Object.assign({ id: uid('c'), type: type, x: 50, y: 50 }, props || {});
  }

  function behaviourCall(label, color, priority, soundId, latching) {
    return { action: 'call', callLabel: label, callColor: color, priority: priority, sound: soundId, latching: latching !== false, flash: true };
  }

  /* ---------- Panel factories (Merlon-IP style, from the NBH photos) ---------- */
  function makeNursePanelNBH() {
    return {
      id: uid('p'), name: 'Bed Panel — Nurse',
      w: 100, h: 138,
      face: { color: '#5b5f64', radius: 9, surround: 'none' },
      components: [
        comp('flap', { x: 0, y: 104, h: 28 }),
        comp('brand', { x: 0, y: 0 }),
        comp('wedge', {
          corner: 'tl', label: 'ASSIST', color: '#f2d500', textColor: '#111', leg: 0.46,
          behaviour: behaviourCall('STAFF ASSIST', '#f2d500', 2, 'snd_assist')
        }),
        comp('wedge', { corner: 'tr', label: '', color: '#53575c', textColor: '#fff', leg: 0.46, behaviour: { action: 'none' } }),
        comp('wedge', {
          corner: 'bl', label: 'ORDERLY', color: '#8c2fc7', textColor: '#fff', leg: 0.46,
          behaviour: behaviourCall('ORDERLY', '#8c2fc7', 4, 'snd_orderly')
        }),
        comp('wedge', {
          corner: 'br', label: 'CANCEL', color: '#f0efec', textColor: '#111', leg: 0.46,
          behaviour: { action: 'cancel' }
        }),
        comp('circle', {
          x: 50, y: 50, r: 24, label: 'NURSE', color: '#199a53', textColor: '#fff', icon: 'person',
          behaviour: behaviourCall('NURSE CALL', '#199a53', 3, 'snd_nurse')
        }),
        comp('led', { x: 28, y: 28, angle: -45, color: '#38b6ff' }),
        comp('led', { x: 72, y: 28, angle: 45, color: '#38b6ff' }),
        comp('led', { x: 28, y: 72, angle: 45, color: '#38b6ff' }),
        comp('led', { x: 72, y: 72, angle: -45, color: '#38b6ff' })
      ]
    };
  }

  function makeEmergencyPanelNBH() {
    return {
      id: uid('p'), name: 'Ensuite — Emergency',
      w: 100, h: 138,
      face: { color: '#5b5f64', radius: 9, surround: 'none' },
      components: [
        comp('flap', { x: 0, y: 104, h: 28 }),
        comp('brand', { x: 0, y: 0 }),
        comp('wedge', {
          corner: 'br', label: 'CANCEL', color: '#f0efec', textColor: '#111', leg: 0.46,
          behaviour: { action: 'cancel' }
        }),
        comp('circle', {
          x: 50, y: 50, r: 24, label: 'EMERGENCY', color: '#e01b24', textColor: '#fff', icon: 'person',
          behaviour: behaviourCall('EMERGENCY', '#e01b24', 1, 'snd_emergency')
        }),
        comp('led', { x: 28, y: 28, angle: -45, color: '#38b6ff' }),
        comp('led', { x: 72, y: 28, angle: 45, color: '#38b6ff' }),
        comp('led', { x: 28, y: 72, angle: 45, color: '#38b6ff' }),
        comp('led', { x: 72, y: 72, angle: -45, color: '#38b6ff' })
      ]
    };
  }

  function makeCorridorPanelNBH() {
    var p = makeNursePanelNBH();
    p.name = 'Corridor — Nurse (white surround)';
    p.face.surround = 'white';
    p.components.push(comp('barcode', { x: 50, y: -9, w: 34, text: 'NBH', code: '023030' }));
    p.components.push(comp('auxstrip', { x: 0, y: 104 }));
    // aux strip replaces the plain flap
    p.components = p.components.filter(function (c) { return c.type !== 'flap'; });
    return p;
  }

  function makeNHSPanel() {
    return {
      id: uid('p'), name: 'NHS Bedhead Unit',
      w: 150, h: 92,
      face: { color: '#e9e6df', radius: 7, surround: 'none' },
      components: [
        comp('label', { x: 75, y: 12, text: 'NURSE CALL SYSTEM', size: 5.4, color: '#5b6770', bold: true }),
        comp('rect', {
          x: 27, y: 48, w: 34, h: 40, label: 'CALL', color: '#ff7f27', textColor: '#fff', icon: 'person',
          behaviour: behaviourCall('PATIENT CALL', '#ff7f27', 3, 'snd_nhs')
        }),
        comp('rect', {
          x: 75, y: 48, w: 34, h: 40, label: 'EMERGENCY', color: '#da291c', textColor: '#fff', icon: 'cross',
          behaviour: behaviourCall('EMERGENCY', '#da291c', 1, 'snd_emergency')
        }),
        comp('rect', {
          x: 123, y: 48, w: 34, h: 40, label: 'RESET', color: '#768692', textColor: '#fff', icon: 'none',
          behaviour: { action: 'cancel' }
        }),
        comp('led', { x: 27, y: 78, angle: 0, color: '#ffa04a' }),
        comp('led', { x: 75, y: 78, angle: 0, color: '#ff4a4a' }),
        comp('screw', { x: 8, y: 8 }),
        comp('screw', { x: 142, y: 8 }),
        comp('screw', { x: 8, y: 84 }),
        comp('screw', { x: 142, y: 84 })
      ]
    };
  }

  function makeUSPanel() {
    return {
      id: uid('p'), name: 'US Patient Station',
      w: 120, h: 120,
      face: { color: '#f4f2ee', radius: 8, surround: 'steel' },
      components: [
        comp('label', { x: 60, y: 13, text: 'PATIENT STATION', size: 5.6, color: '#333', bold: true }),
        comp('circle', {
          x: 36, y: 52, r: 19, label: 'NURSE', color: '#ffffff', textColor: '#c81e2b', icon: 'person', ring: '#c81e2b',
          behaviour: behaviourCall('NURSE CALL', '#c81e2b', 3, 'snd_us_dingdong')
        }),
        comp('circle', {
          x: 86, y: 52, r: 19, label: 'CODE', color: '#1668dd', textColor: '#fff', icon: 'cross',
          behaviour: behaviourCall('CODE BLUE', '#1668dd', 1, 'snd_codeblue')
        }),
        comp('rect', {
          x: 60, y: 95, w: 52, h: 22, label: 'CANCEL', color: '#d7d3cb', textColor: '#333', icon: 'none',
          behaviour: { action: 'cancel' }
        }),
        comp('led', { x: 60, y: 70, angle: 0, color: '#38b6ff' }),
        comp('speaker', { x: 60, y: 30, r: 7 })
      ]
    };
  }

  /* ---------- Hospital presets ---------- */
  function ward(name, rooms) { return { id: uid('w'), name: name, rooms: rooms }; }
  function room(name, panelIds) { return { id: uid('r'), name: name, panelIds: panelIds }; }

  function presetNBH() {
    var nurse = makeNursePanelNBH();
    var emerg = makeEmergencyPanelNBH();
    var corridor = makeCorridorPanelNBH();
    var panels = {};
    [nurse, emerg, corridor].forEach(function (p) { panels[p.id] = p; });
    return {
      id: uid('h'), name: 'Northern Beaches Hospital',
      assetPrefix: 'NBH',
      wall: { color: '#c9dde2', plate: 'steel' },
      soundProfiles: defaultSoundProfiles(),
      panels: panels,
      wards: [
        ward('Ward 9B', [
          room('Room 1 — Bed A', [emerg.id, nurse.id]),
          room('Room 2 — Bed A', [emerg.id, nurse.id]),
          room('Room 3 — Bariatric', [emerg.id, nurse.id]),
          room('Corridor Bay', [corridor.id])
        ]),
        ward('Emergency Dept', [
          room('Resus 1', [emerg.id, nurse.id]),
          room('Triage', [nurse.id])
        ])
      ]
    };
  }

  function presetGenericAU() {
    var h = presetNBH();
    h.name = 'Generic Australian Ward';
    h.assetPrefix = 'AUW';
    h.wards = [ward('Ward A', [
      room('Room 1', Object.keys(h.panels).slice(0, 2)),
      room('Room 2', Object.keys(h.panels).slice(0, 2))
    ])];
    return h;
  }

  function presetNHS() {
    var p = makeNHSPanel();
    var panels = {}; panels[p.id] = p;
    return {
      id: uid('h'), name: 'NHS Ward', assetPrefix: 'NHS',
      wall: { color: '#dce7ea', plate: 'none' },
      soundProfiles: defaultSoundProfiles(),
      panels: panels,
      wards: [ward('Nightingale Ward', [room('Bay 1', [p.id]), room('Bay 2', [p.id]), room('Side Room', [p.id])])]
    };
  }

  function presetUS() {
    var p = makeUSPanel();
    var panels = {}; panels[p.id] = p;
    return {
      id: uid('h'), name: 'Generic US Hospital', assetPrefix: 'USH',
      wall: { color: '#e4e0d8', plate: 'none' },
      soundProfiles: defaultSoundProfiles(),
      panels: panels,
      wards: [ward('Med-Surg 4', [room('Room 401', [p.id]), room('Room 402', [p.id])])]
    };
  }

  /* ---------- Component library (drag-in presets for the designer) ---------- */
  var BUTTON_LIBRARY = [
    { name: 'Emergency', color: '#e01b24', text: '#fff', priority: 1, sound: 'snd_emergency', icon: 'person' },
    { name: 'Nurse', color: '#199a53', text: '#fff', priority: 3, sound: 'snd_nurse', icon: 'person' },
    { name: 'Staff Assist', color: '#f2d500', text: '#111', priority: 2, sound: 'snd_assist', icon: 'none' },
    { name: 'Orderly', color: '#8c2fc7', text: '#fff', priority: 4, sound: 'snd_orderly', icon: 'none' },
    { name: 'Code Blue', color: '#1668dd', text: '#fff', priority: 1, sound: 'snd_codeblue', icon: 'cross' },
    { name: 'MET', color: '#ff7f27', text: '#fff', priority: 1, sound: 'snd_codeblue', icon: 'cross' },
    { name: 'Fire', color: '#c8102e', text: '#fff', priority: 1, sound: 'snd_emergency', icon: 'none' },
    { name: 'Security', color: '#14315c', text: '#fff', priority: 2, sound: 'snd_assist', icon: 'none' },
    { name: 'Cleaner', color: '#00a3a3', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
    { name: 'Porter', color: '#7a5230', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
    { name: 'Housekeeping', color: '#2e9e6b', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
    { name: 'Maintenance', color: '#6d747c', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' },
    { name: 'Isolation', color: '#e8850c', text: '#fff', priority: 4, sound: 'snd_nhs', icon: 'none' },
    { name: 'Tech Support', color: '#4a5568', text: '#fff', priority: 5, sound: 'snd_orderly', icon: 'none' }
  ];

  /* ---------- State, persistence ---------- */
  var STORAGE_KEY = 'hcpb_hospital_v1';
  var state = {
    hospital: null,
    ui: {
      view: 'simulate',
      roomId: null,
      panelId: null,
      soundId: null,
      selection: null,
      muted: false,
      testMode: false
    }
  };

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.hospital));
        var el = document.getElementById('statusSaved');
        if (el) { el.textContent = 'Saved'; el.classList.add('flash'); setTimeout(function(){ el.classList.remove('flash'); }, 600); }
      } catch (e) { console.warn('save failed', e); }
    }, 350);
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var h = JSON.parse(raw);
        if (h && h.panels && h.wards) return h;
      }
    } catch (e) { console.warn('load failed', e); }
    return null;
  }

  function firstRoom(h) {
    for (var i = 0; i < h.wards.length; i++) {
      if (h.wards[i].rooms.length) return h.wards[i].rooms[0];
    }
    return null;
  }

  function getRoom(id) {
    var h = state.hospital;
    for (var i = 0; i < h.wards.length; i++) {
      var w = h.wards[i];
      for (var j = 0; j < w.rooms.length; j++) {
        if (w.rooms[j].id === id) return { ward: w, room: w.rooms[j] };
      }
    }
    return null;
  }

  function allRooms() {
    var out = [];
    state.hospital.wards.forEach(function (w) {
      w.rooms.forEach(function (r) { out.push({ ward: w, room: r }); });
    });
    return out;
  }

  function getSound(id) {
    return state.hospital.soundProfiles.find(function (s) { return s.id === id; }) || null;
  }

  function findComp(panel, compId) {
    return panel.components.find(function (c) { return c.id === compId; }) || null;
  }

  /* ---------- Active call registry ---------- */
  var calls = {
    map: new Map(), // key -> call
    listeners: [],
    key: function (roomId, panelId, compId) { return roomId + '|' + panelId + '|' + compId; },
    raise: function (roomId, panelId, compId, meta) {
      var k = this.key(roomId, panelId, compId);
      if (this.map.has(k)) return this.map.get(k); // latched already
      var call = Object.assign({
        key: k, roomId: roomId, panelId: panelId, compId: compId, startedAt: Date.now()
      }, meta);
      this.map.set(k, call);
      if (!call.latching) {
        var self = this;
        setTimeout(function () { self.dismiss(k); }, Math.max(2500, call.autoClearMs || 3000));
      }
      this.emit();
      return call;
    },
    dismiss: function (key) {
      if (this.map.delete(key)) this.emit();
    },
    cancelPanel: function (roomId, panelId) {
      var removed = false, self = this;
      Array.from(this.map.keys()).forEach(function (k) {
        if (k.indexOf(roomId + '|' + panelId + '|') === 0) { self.map.delete(k); removed = true; }
      });
      if (removed) this.emit();
      return removed;
    },
    clearAll: function () { this.map.clear(); this.emit(); },
    list: function () {
      return Array.from(this.map.values()).sort(function (a, b) {
        return (a.priority - b.priority) || (a.startedAt - b.startedAt);
      });
    },
    highest: function () { var l = this.list(); return l.length ? l[0] : null; },
    isActive: function (roomId, panelId, compId) { return this.map.has(this.key(roomId, panelId, compId)); },
    panelHasCall: function (roomId, panelId) {
      var pfx = roomId + '|' + panelId + '|';
      var keys = Array.from(this.map.keys());
      for (var i = 0; i < keys.length; i++) if (keys[i].indexOf(pfx) === 0) return true;
      return false;
    },
    on: function (fn) { this.listeners.push(fn); },
    emit: function () {
      var self = this;
      this.listeners.forEach(function (fn) { try { fn(self); } catch (e) { console.error(e); } });
    }
  };

  /* ---------- exports ---------- */
  HCP.uid = uid;
  HCP.state = state;
  HCP.calls = calls;
  HCP.save = save;
  HCP.data = {
    load: load,
    presets: [
      { id: 'nbh', name: 'Northern Beaches Hospital', desc: 'Merlon-IP panels: Nurse / Assist / Orderly + ensuite Emergency, exactly like the ward photos.', make: presetNBH },
      { id: 'au', name: 'Generic Australian Ward', desc: 'Standard AU colour conventions on a compact two-room ward.', make: presetGenericAU },
      { id: 'nhs', name: 'NHS Ward', desc: 'UK bedhead unit — orange patient call, red emergency, grey reset.', make: presetNHS },
      { id: 'us', name: 'Generic US Hospital', desc: 'US patient station with Code Blue and ding-dong nurse chime.', make: presetUS }
    ],
    defaultSoundProfiles: defaultSoundProfiles,
    buttonLibrary: BUTTON_LIBRARY,
    firstRoom: firstRoom,
    getRoom: getRoom,
    allRooms: allRooms,
    getSound: getSound,
    findComp: findComp,
    comp: comp,
    behaviourCall: behaviourCall,
    factories: {
      nurseNBH: makeNursePanelNBH,
      emergencyNBH: makeEmergencyPanelNBH,
      nhs: makeNHSPanel,
      us: makeUSPanel
    }
  };
})();
