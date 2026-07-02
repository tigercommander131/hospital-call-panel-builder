/* =========================================================
   SVG panel renderer — turns panel data into photo-real
   Merlon-style wall panels. Pure functions returning markup.
   ========================================================= */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- shared defs (filters, gradients) ---------- */
  function defs(idp) {
    return '\
    <defs>\
      <linearGradient id="' + idp + 'faceSheen" x1="0" y1="0" x2="0.6" y2="1">\
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>\
        <stop offset="0.35" stop-color="#ffffff" stop-opacity="0.04"/>\
        <stop offset="1" stop-color="#000000" stop-opacity="0.10"/>\
      </linearGradient>\
      <radialGradient id="' + idp + 'btnDome" cx="0.38" cy="0.3" r="0.95">\
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.42"/>\
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.08"/>\
        <stop offset="0.85" stop-color="#000000" stop-opacity="0.12"/>\
        <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>\
      </radialGradient>\
      <linearGradient id="' + idp + 'wedgeSheen" x1="0" y1="0" x2="1" y2="1">\
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>\
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05"/>\
        <stop offset="1" stop-color="#000000" stop-opacity="0.14"/>\
      </linearGradient>\
      <linearGradient id="' + idp + 'surroundWhite" x1="0" y1="0" x2="0" y2="1">\
        <stop offset="0" stop-color="#fdfcf9"/>\
        <stop offset="0.5" stop-color="#f1efe8"/>\
        <stop offset="1" stop-color="#dedbd2"/>\
      </linearGradient>\
      <linearGradient id="' + idp + 'steelV" x1="0" y1="0" x2="0" y2="1">\
        <stop offset="0" stop-color="#c8cbce"/>\
        <stop offset="0.18" stop-color="#b3b7ba"/>\
        <stop offset="0.42" stop-color="#d7dadd"/>\
        <stop offset="0.62" stop-color="#a9adb1"/>\
        <stop offset="0.85" stop-color="#c2c6c9"/>\
        <stop offset="1" stop-color="#9fa3a7"/>\
      </linearGradient>\
      <filter id="' + idp + 'brushed" x="-5%" y="-5%" width="110%" height="110%">\
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.012" numOctaves="2" seed="7" result="n"/>\
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.72  0 0 0 0 0.73  0 0 0 0 0.75  0 0 0 0.25 0" result="tex"/>\
        <feComposite in="tex" in2="SourceGraphic" operator="atop"/>\
      </filter>\
      <filter id="' + idp + 'ledGlow" x="-220%" y="-220%" width="540%" height="540%">\
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b"/>\
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>\
      </filter>\
      <filter id="' + idp + 'btnGlow" x="-60%" y="-60%" width="220%" height="220%">\
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="b"/>\
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>\
      </filter>\
      <filter id="' + idp + 'softShadow" x="-40%" y="-40%" width="180%" height="180%">\
        <feDropShadow dx="0" dy="1.1" stdDeviation="1.4" flood-color="#000" flood-opacity="0.45"/>\
      </filter>\
    </defs>';
  }

  /* ---------- geometry helpers ---------- */
  function polarPoint(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  // wedge occupying a corner of the button zone, concave arc around centre
  function wedgePath(corner, zone, cx, cy, innerR, legFrac, cr) {
    var x0 = zone.x0, y0 = zone.y0, x1 = zone.x1, y1 = zone.y1;
    var L = (x1 - x0) * (legFrac || 0.52);
    var tipR = 3.2; // rounded tips
    var P1, P2, cornerPt;
    // P1 = tip on "first" edge going clockwise from corner, P2 = tip on second edge
    if (corner === 'tl') { cornerPt = [x0, y0]; P1 = [x0 + L, y0]; P2 = [x0, y0 + L]; }
    if (corner === 'tr') { cornerPt = [x1, y0]; P1 = [x1, y0 + L]; P2 = [x1 - L, y0]; }
    if (corner === 'br') { cornerPt = [x1, y1]; P1 = [x1 - L, y1]; P2 = [x1, y1 - L]; }
    if (corner === 'bl') { cornerPt = [x0, y1]; P1 = [x0, y1 - L]; P2 = [x0 + L, y1]; }

    function towardCentre(p) {
      var dx = cx - p[0], dy = cy - p[1];
      var d = Math.hypot(dx, dy);
      return [cx - innerR * dx / d * -1, cy - innerR * dy / d * -1]; // placeholder, replaced below
    }
    function onCircle(p) {
      var dx = p[0] - cx, dy = p[1] - cy;
      var d = Math.hypot(dx, dy) || 1;
      return [cx + innerR * dx / d, cy + innerR * dy / d];
    }
    var Q1 = onCircle(P1), Q2 = onCircle(P2);

    // arc sweep: shortest way from Q2 to Q1 around centre
    function ang(p) { return Math.atan2(p[1] - cy, p[0] - cx); }
    var a2 = ang(Q2), a1 = ang(Q1);
    var delta = a1 - a2;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    var sweep = delta > 0 ? 1 : 0;

    // corner arc control points (rounded outer corner)
    var cxn = cornerPt[0], cyn = cornerPt[1];
    var e1 = [cxn + Math.sign(P1[0] - cxn) * cr, cyn + Math.sign(P1[1] - cyn) * cr];
    var e2 = [cxn + Math.sign(P2[0] - cxn) * cr, cyn + Math.sign(P2[1] - cyn) * cr];

    function f(n) { return (Math.round(n * 100) / 100); }
    var d = 'M ' + f(P1[0]) + ' ' + f(P1[1]) +
      ' L ' + f(e1[0]) + ' ' + f(e1[1]) +
      ' Q ' + f(cxn) + ' ' + f(cyn) + ' ' + f(e2[0]) + ' ' + f(e2[1]) +
      ' L ' + f(P2[0]) + ' ' + f(P2[1]) +
      ' Q ' + f((P2[0] + Q2[0]) / 2 + (P2[0] - cxn) * 0.04) + ' ' + f((P2[1] + Q2[1]) / 2 + (P2[1] - cyn) * 0.04) + ' ' + f(Q2[0]) + ' ' + f(Q2[1]) +
      ' A ' + f(innerR) + ' ' + f(innerR) + ' 0 0 ' + sweep + ' ' + f(Q1[0]) + ' ' + f(Q1[1]) +
      ' Q ' + f((P1[0] + Q1[0]) / 2 + (P1[0] - cxn) * 0.04) + ' ' + f((P1[1] + Q1[1]) / 2 + (P1[1] - cyn) * 0.04) + ' ' + f(P1[0]) + ' ' + f(P1[1]) +
      ' Z';
    return d;
  }

  function wedgeTextTransform(corner, zone, cx, cy, innerR) {
    var x0 = zone.x0, y0 = zone.y0, x1 = zone.x1, y1 = zone.y1;
    var cornerPt = { tl: [x0, y0], tr: [x1, y0], bl: [x0, y1], br: [x1, y1] }[corner];
    // text sits between the inner arc and the corner
    var tx = cx + (cornerPt[0] - cx) * 0.73;
    var ty = cy + (cornerPt[1] - cy) * 0.73;
    var rot = (corner === 'tl' || corner === 'br') ? -45 : 45;
    return 'translate(' + tx + ' ' + ty + ') rotate(' + rot + ')';
  }

  /* ---------- icons ---------- */
  function personIcon(x, y, s, color) {
    // classic "restroom figure" like on the real buttons
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + color + '">' +
      '<circle cx="0" cy="-7.6" r="2.55"/>' +
      '<path d="M -1.7 -4.4 L 1.7 -4.4 L 4.1 2.6 L 2.55 2.6 L 2.55 8.2 L 0.75 8.2 L 0.75 3.4 L -0.75 3.4 L -0.75 8.2 L -2.55 8.2 L -2.55 2.6 L -4.1 2.6 Z"/>' +
      '<path d="M -1.9 -4.1 L -3.6 0.9 L -4.7 0.5 L -2.9 -4.3 Z"/>' +
      '<path d="M 1.9 -4.1 L 3.6 0.9 L 4.7 0.5 L 2.9 -4.3 Z"/>' +
      '</g>';
  }

  function crossIcon(x, y, s, color) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + color + '">' +
      '<path d="M -2 -6 H 2 V -2 H 6 V 2 H 2 V 6 H -2 V 2 H -6 V -2 H -2 Z"/></g>';
  }

  // rounded polygon path (used for triangle buttons)
  function roundedPolyPath(pts, rr) {
    function fmt(n) { return Math.round(n * 100) / 100; }
    function toward(a, b, dist) {
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [a[0] + dx / L * dist, a[1] + dy / L * dist];
    }
    var n = pts.length, d = '';
    for (var i = 0; i < n; i++) {
      var p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
      var pIn = toward(p, prev, rr), pOut = toward(p, next, rr);
      d += (i === 0 ? 'M ' : ' L ') + fmt(pIn[0]) + ' ' + fmt(pIn[1]);
      d += ' Q ' + fmt(p[0]) + ' ' + fmt(p[1]) + ' ' + fmt(pOut[0]) + ' ' + fmt(pOut[1]);
    }
    return d + ' Z';
  }

  function triPath(r) {
    return roundedPolyPath([[0, -r], [0.98 * r, 0.72 * r], [-0.98 * r, 0.72 * r]], r * 0.24);
  }

  function barcodeBars(x, y, w, h) {
    // deterministic pseudo-random bars
    var out = '', bx = x, i = 0;
    var seq = [2, 1, 3, 1, 1, 2, 1, 4, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 1, 2, 2, 1, 3];
    while (bx < x + w) {
      var bw = seq[i % seq.length] * (w / 60);
      if (i % 2 === 0) out += '<rect x="' + bx + '" y="' + y + '" width="' + bw + '" height="' + h + '" fill="#111"/>';
      bx += bw; i++;
    }
    return out;
  }

  /* ---------- component renderers ---------- */
  function renderComponent(c, panel, idp, opts) {
    var zonePad = 4;
    var zoneSize = panel.w - zonePad * 2;
    var zone = { x0: zonePad, y0: zonePad, x1: panel.w - zonePad, y1: zonePad + zoneSize };
    var cx = panel.w / 2, cy = zonePad + zoneSize / 2;
    var circles = panel.components.filter(function (k) { return k.type === 'circle'; });
    var maxR = circles.length ? Math.max.apply(null, circles.map(function (k) { return k.r || 22; })) : zoneSize * 0.24;
    var innerR = maxR + 13.5;

    var active = opts.activeComps && opts.activeComps[c.id];
    var sel = opts.selection === c.id;
    var inter = opts.interactive && c.behaviour && c.behaviour.action && c.behaviour.action !== 'none';
    var attrs = ' data-comp="' + c.id + '"' + (inter ? ' class="hit"' : '') + (opts.editable ? ' class="editable' + (sel ? ' selected' : '') + '"' : '');

    if (c.type === 'flap') {
      var fy = c.y != null ? c.y : panel.w + 4;
      var fh = c.h || 28;
      return '<g' + attrs + '>' +
        '<rect x="3.2" y="' + fy + '" width="' + (panel.w - 6.4) + '" height="' + fh + '" rx="4.5" fill="#54585d" stroke="#3c3f43" stroke-width="0.7"/>' +
        '<rect x="3.2" y="' + fy + '" width="' + (panel.w - 6.4) + '" height="' + fh + '" rx="4.5" fill="url(#' + idp + 'faceSheen)"/>' +
        '<circle cx="9.5" cy="' + (fy + fh - 6) + '" r="2.4" fill="#26282b"/>' +
        '</g>';
    }

    if (c.type === 'auxstrip') {
      var ay = c.y != null ? c.y : panel.w + 4;
      var ah = 28;
      return '<g' + attrs + '>' +
        '<rect x="3.2" y="' + ay + '" width="' + (panel.w - 6.4) + '" height="' + ah + '" rx="4.5" fill="#45484d" stroke="#33363a" stroke-width="0.7"/>' +
        '<text x="' + (panel.w * 0.22) + '" y="' + (ay + 9) + '" font-size="4.6" fill="#d8d8d6" text-anchor="middle" font-weight="600">AUX1</text>' +
        '<text x="' + (panel.w * 0.78) + '" y="' + (ay + 9) + '" font-size="4.6" fill="#d8d8d6" text-anchor="middle" font-weight="600">AUX2</text>' +
        '<circle cx="' + (panel.w * 0.22) + '" cy="' + (ay + 17) + '" r="3.4" fill="#191a1c" stroke="#8f9296" stroke-width="1"/>' +
        '<circle cx="' + (panel.w * 0.78) + '" cy="' + (ay + 17) + '" r="3.4" fill="#191a1c" stroke="#8f9296" stroke-width="1"/>' +
        '<rect x="' + (panel.w / 2 - 7) + '" y="' + (ay + 8) + '" width="14" height="15" rx="1.5" fill="#191a1c" stroke="#5b5e63" stroke-width="0.8"/>' +
        '<rect x="' + (panel.w / 2 - 4.4) + '" y="' + (ay + 10) + '" width="8.8" height="9" rx="1" fill="#efefec"/>' +
        '</g>';
    }

    if (c.type === 'brand') {
      return '<text x="' + (panel.w - 6) + '" y="' + (panel.h - 5.5) + '" font-size="3.8" fill="#c9c9c6" text-anchor="end" font-weight="600" letter-spacing="0.2">merlon-IP</text>';
    }

    if (c.type === 'wedge') {
      var path = wedgePath(c.corner || 'tl', zone, cx, cy, innerR, c.leg || 0.52, (panel.face.radius || 9) * 0.9);
      var isBlank = !c.behaviour || c.behaviour.action === 'none';
      var g = '<g' + attrs + '>';
      g += '<path d="' + path + '" fill="' + (c.color || '#63676c') + '" stroke="#f5f5f2" stroke-width="1.1" stroke-opacity="' + (isBlank ? 0.55 : 0.95) + '"' + (active ? ' filter="url(#' + idp + 'btnGlow)"' : '') + '/>';
      g += '<path d="' + path + '" fill="url(#' + idp + 'wedgeSheen)" pointer-events="none"/>';
      if (active) g += '<path d="' + path + '" class="pulseFill" fill="#ffffff" pointer-events="none"/>';
      if (c.label) {
        var wfs = c.size || Math.min(6.2, 26 / Math.max(4, c.label.length) * 1.55);
        g += '<text transform="' + wedgeTextTransform(c.corner || 'tl', zone, cx, cy, innerR) + '" font-size="' + wfs + '" font-weight="700" fill="' + (c.textColor || '#111') + '" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.3" pointer-events="none">' + esc(c.label) + '</text>';
      }
      return g + '</g>';
    }

    if (c.type === 'circle') {
      var r = c.r || 22;
      var shape = c.shape || 'circle';
      var iconColor = c.textColor || '#fff';
      var hasLabel = c.label && c.label.length;
      var hasIcon = c.icon && c.icon !== 'none';
      var fx = active ? ' filter="url(#' + idp + 'btnGlow)"' : ' filter="url(#' + idp + 'softShadow)"';
      var g2 = '<g' + attrs + ' transform="translate(' + c.x + ' ' + c.y + ')">';

      if (shape === 'oval') {
        var rx = r * 1.45, ry = r * 0.92;
        g2 += '<ellipse rx="' + (rx + 1.6) + '" ry="' + (ry + 1.6) + '" fill="#f2f1ee" opacity="0.92"/>';
        g2 += '<ellipse rx="' + rx + '" ry="' + ry + '" fill="' + (c.color || '#199a53') + '"' + fx + '/>';
        if (c.ring) g2 += '<ellipse rx="' + (rx - 1.2) + '" ry="' + (ry - 1.2) + '" fill="none" stroke="' + c.ring + '" stroke-width="1.6"/>';
        g2 += '<ellipse rx="' + rx + '" ry="' + ry + '" fill="url(#' + idp + 'btnDome)" pointer-events="none"/>';
        if (active) g2 += '<ellipse rx="' + rx + '" ry="' + ry + '" class="pulseFill" fill="#ffffff" pointer-events="none"/>';
        if (hasIcon && hasLabel) {
          // icon sits beside the text on wide ovals, like the real thing
          if (c.icon === 'person') g2 += personIcon(-rx * 0.56, 0, ry / 13.5, iconColor);
          if (c.icon === 'cross') g2 += crossIcon(-rx * 0.56, 0, ry / 12, iconColor);
          var fsO = Math.min(ry * 0.5, (rx * 1.02) / Math.max(3, c.label.length) * 1.5);
          g2 += '<text x="' + (rx * 0.2) + '" y="' + (fsO * 0.35) + '" font-size="' + fsO + '" font-weight="700" fill="' + iconColor + '" text-anchor="middle" letter-spacing="0.2" pointer-events="none">' + esc(c.label) + '</text>';
        } else {
          if (c.icon === 'person') g2 += personIcon(0, 0, ry / 10.5, iconColor);
          if (c.icon === 'cross') g2 += crossIcon(0, 0, ry / 9, iconColor);
          if (hasLabel) {
            var fsO2 = Math.min(ry * 0.62, (rx * 1.62) / Math.max(4, c.label.length) * 1.35);
            g2 += '<text y="' + (fsO2 * 0.35) + '" font-size="' + fsO2 + '" font-weight="700" fill="' + iconColor + '" text-anchor="middle" letter-spacing="0.3" pointer-events="none">' + esc(c.label) + '</text>';
          }
        }
        return g2 + '</g>';
      }

      if (shape === 'triangle') {
        var tp = triPath(r);
        g2 += '<path d="' + triPath(r + 1.8) + '" fill="#f2f1ee" opacity="0.92"/>';
        g2 += '<path d="' + tp + '" fill="' + (c.color || '#86c67c') + '"' + fx + '/>';
        g2 += '<path d="' + tp + '" fill="url(#' + idp + 'btnDome)" pointer-events="none"/>';
        if (active) g2 += '<path d="' + tp + '" class="pulseFill" fill="#ffffff" pointer-events="none"/>';
        if (c.icon === 'person') g2 += personIcon(0, hasLabel ? -r * 0.04 : r * 0.1, r / 26, iconColor);
        if (c.icon === 'cross') g2 += crossIcon(0, hasLabel ? -r * 0.04 : r * 0.1, r / 22, iconColor);
        if (hasLabel) {
          var fsT = Math.min(r * 0.27, (r * 1.15) / Math.max(3, c.label.length) * 1.45);
          g2 += '<text y="' + (hasIcon ? r * 0.58 : r * 0.3) + '" font-size="' + fsT + '" font-weight="700" fill="' + iconColor + '" text-anchor="middle" pointer-events="none">' + esc(c.label) + '</text>';
        }
        return g2 + '</g>';
      }

      /* classic circle */
      g2 += '<circle r="' + (r + 1.6) + '" fill="#f2f1ee" opacity="0.92"/>';           // white bezel ring
      g2 += '<circle r="' + r + '" fill="' + (c.color || '#199a53') + '"' + fx + '/>';
      if (c.ring) g2 += '<circle r="' + (r - 1.2) + '" fill="none" stroke="' + c.ring + '" stroke-width="1.6"/>';
      g2 += '<circle r="' + r + '" fill="url(#' + idp + 'btnDome)" pointer-events="none"/>';
      if (active) g2 += '<circle r="' + r + '" class="pulseFill" fill="#ffffff" pointer-events="none"/>';
      if (c.icon === 'person') g2 += personIcon(0, hasLabel ? -r * 0.18 : 0, r / 16.5, iconColor);
      if (c.icon === 'cross') g2 += crossIcon(0, hasLabel ? -r * 0.2 : 0, r / 14, iconColor);
      if (hasLabel) {
        var fs = Math.min(r * 0.34, (r * 1.75) / Math.max(4, c.label.length) * 1.26);
        g2 += '<text y="' + (hasIcon ? r * 0.58 : r * 0.12) + '" font-size="' + fs + '" font-weight="700" fill="' + iconColor + '" text-anchor="middle" letter-spacing="0.2" pointer-events="none">' + esc(c.label) + '</text>';
      }
      return g2 + '</g>';
    }

    if (c.type === 'rect') {
      var w = c.w || 32, h = c.h || 36;
      var g3 = '<g' + attrs + ' transform="translate(' + c.x + ' ' + c.y + ')">';
      g3 += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="3.5" fill="' + (c.color || '#888') + '" stroke="#00000030" stroke-width="0.8"' + (active ? ' filter="url(#' + idp + 'btnGlow)"' : ' filter="url(#' + idp + 'softShadow)"') + '/>';
      g3 += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="3.5" fill="url(#' + idp + 'btnDome)" pointer-events="none"/>';
      if (active) g3 += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="3.5" class="pulseFill" fill="#fff" pointer-events="none"/>';
      var icY = c.label ? -h * 0.14 : 0;
      if (c.icon === 'person') g3 += personIcon(0, icY, Math.min(w, h) / 24, c.textColor || '#fff');
      if (c.icon === 'cross') g3 += crossIcon(0, icY, Math.min(w, h) / 20, c.textColor || '#fff');
      if (c.label) {
        var fs2 = Math.min(6.5, (w - 6) / Math.max(3, c.label.length) * 1.5);
        g3 += '<text y="' + (c.icon && c.icon !== 'none' ? h * 0.32 : 1.8) + '" font-size="' + fs2 + '" font-weight="700" fill="' + (c.textColor || '#fff') + '" text-anchor="middle" pointer-events="none">' + esc(c.label) + '</text>';
      }
      return g3 + '</g>';
    }

    if (c.type === 'led') {
      var lit = opts.panelLive;               // steady blue when live
      var flash = opts.panelFlashing;          // flashing while call active
      var col = c.color || '#38b6ff';
      var cls = flash ? (opts.flashFast ? 'ledFlash fast' : 'ledFlash') : '';
      return '<g' + attrs + ' transform="translate(' + c.x + ' ' + c.y + ') rotate(' + (c.angle || 0) + ')">' +
        '<rect x="-3.4" y="-1.8" width="6.8" height="3.6" rx="1.8" fill="#22242a"/>' +
        '<rect x="-2.9" y="-1.4" width="5.8" height="2.8" rx="1.4" class="' + cls + '" fill="' + (lit || flash ? col : '#3a3f47') + '"' + (lit || flash ? ' filter="url(#' + idp + 'ledGlow)"' : '') + '/>' +
        '</g>';
    }

    if (c.type === 'label') {
      return '<g' + attrs + '><text x="' + c.x + '" y="' + c.y + '" font-size="' + (c.size || 5) + '" fill="' + (c.color || '#eee') + '" text-anchor="middle" font-weight="' + (c.bold ? 700 : 500) + '" letter-spacing="0.4">' + esc(c.text || 'LABEL') + '</text></g>';
    }

    if (c.type === 'barcode') {
      var bw = c.w || 34, bh = bw * 0.55;
      return '<g' + attrs + ' transform="translate(' + (c.x - bw / 2) + ' ' + (c.y - bh / 2) + ')">' +
        '<rect x="-2" y="-2" width="' + (bw + 4) + '" height="' + (bh + 4) + '" rx="1.5" fill="#fbfbf8" filter="url(#' + idp + 'softShadow)"/>' +
        '<text x="' + bw / 2 + '" y="' + bh * 0.28 + '" font-size="' + bw * 0.2 + '" font-weight="800" fill="#111" text-anchor="middle">' + esc(c.text || 'NBH') + '</text>' +
        barcodeBars(bw * 0.08, bh * 0.38, bw * 0.84, bh * 0.34) +
        '<text x="' + bw / 2 + '" y="' + bh * 0.94 + '" font-size="' + bw * 0.13 + '" fill="#222" text-anchor="middle">' + esc(c.code || '023061') + '</text>' +
        '</g>';
    }

    if (c.type === 'speaker') {
      var sr = c.r || 8;
      var holes = '';
      for (var ri = 0; ri < 3; ri++) {
        var n = ri === 0 ? 1 : ri * 6;
        for (var k = 0; k < n; k++) {
          var p = polarPoint(0, 0, ri * sr * 0.32, k * (360 / n));
          holes += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + sr * 0.08 + '" fill="#1c1e21"/>';
        }
      }
      return '<g' + attrs + ' transform="translate(' + c.x + ' ' + c.y + ')">' +
        '<circle r="' + sr + '" fill="#4a4d52" stroke="#33363a" stroke-width="0.6"/>' + holes + '</g>';
    }

    if (c.type === 'screw') {
      return '<g' + attrs + ' transform="translate(' + c.x + ' ' + c.y + ')">' +
        '<circle r="3" fill="url(#' + idp + 'steelV)" stroke="#7d8184" stroke-width="0.5"/>' +
        '<rect x="-2.1" y="-0.45" width="4.2" height="0.9" rx="0.4" fill="#6d7073" transform="rotate(20)"/>' +
        '<rect x="-0.45" y="-2.1" width="0.9" height="4.2" rx="0.4" fill="#6d7073" transform="rotate(20)"/>' +
        '</g>';
    }

    return '';
  }

  /* ---------- whole panel ---------- */
  var idpCounter = 0;
  function renderPanel(panel, opts) {
    opts = opts || {};
    var idp = 'pp' + (++idpCounter) + '_';
    var pad;
    var surround = panel.face.surround || 'none';
    pad = surround === 'none' ? 4 : 12;
    var topPad = pad + (hasBarcodeAbove(panel) ? 14 : 0);
    var vbW = panel.w + pad * 2;
    var vbH = panel.h + topPad + pad;
    var scale = opts.scale || 3;

    var s = '<svg class="panel-svg" data-panel="' + panel.id + '" width="' + (vbW * scale) + '" height="' + (vbH * scale) + '" viewBox="' + (-pad) + ' ' + (-topPad) + ' ' + vbW + ' ' + vbH + '" xmlns="http://www.w3.org/2000/svg">';
    s += defs(idp);

    // surround
    if (surround === 'white') {
      s += '<rect x="' + (-pad + 1) + '" y="' + (-topPad + 1) + '" width="' + (vbW - 2) + '" height="' + (vbH - 2) + '" rx="10" fill="url(#' + idp + 'surroundWhite)" stroke="#c9c5ba" stroke-width="0.8" filter="url(#' + idp + 'softShadow)"/>';
      s += '<rect x="' + (-pad + 3.4) + '" y="' + (-topPad + 3.4) + '" width="' + (vbW - 6.8) + '" height="' + (vbH - 6.8) + '" rx="8" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="1"/>';
      s += '<text x="' + (panel.w * 0.13) + '" y="' + (panel.h + pad * 0.55) + '" font-size="5" fill="#b9b5aa" font-weight="700" font-style="italic">merlon</text>';
    } else if (surround === 'steel') {
      s += '<g filter="url(#' + idp + 'brushed)"><rect x="' + (-pad + 1) + '" y="' + (-topPad + 1) + '" width="' + (vbW - 2) + '" height="' + (vbH - 2) + '" rx="3" fill="url(#' + idp + 'steelV)" stroke="#8b8f93" stroke-width="0.7"/></g>';
    }

    // face module
    s += '<rect x="-1.6" y="-1.6" width="' + (panel.w + 3.2) + '" height="' + (panel.h + 3.2) + '" rx="' + ((panel.face.radius || 9) + 1.5) + '" fill="#2e3033"/>';
    s += '<rect x="0" y="0" width="' + panel.w + '" height="' + panel.h + '" rx="' + (panel.face.radius || 9) + '" fill="' + (panel.face.color || '#5b5f64') + '"/>';
    s += '<rect x="0" y="0" width="' + panel.w + '" height="' + panel.h + '" rx="' + (panel.face.radius || 9) + '" fill="url(#' + idp + 'faceSheen)"/>';

    // components (in order = z-order)
    panel.components.forEach(function (c) {
      s += renderComponent(c, panel, idp, opts);
    });

    // selection handles in editor
    if (opts.editable && opts.selection) {
      var selComp = panel.components.find(function (c) { return c.id === opts.selection; });
      if (selComp && selComp.x != null && ['circle', 'rect', 'led', 'label', 'barcode', 'speaker', 'screw'].indexOf(selComp.type) >= 0) {
        var hw, hh;
        if (selComp.type === 'circle') {
          var rSel = selComp.r || 22;
          var shSel = selComp.shape || 'circle';
          hw = shSel === 'oval' ? rSel * 1.45 : rSel;
          hh = shSel === 'oval' ? rSel * 0.92 : rSel;
        } else {
          hw = (selComp.w || 16) / 2 + 3;
          hh = (selComp.h || (selComp.type === 'barcode' ? (selComp.w || 34) * 0.55 : 12)) / 2 + 3;
        }
        s += '<g pointer-events="none"><rect x="' + (selComp.x - hw - 2) + '" y="' + (selComp.y - hh - 2) + '" width="' + (hw * 2 + 4) + '" height="' + (hh * 2 + 4) + '" fill="none" stroke="#6a8dff" stroke-width="0.9" stroke-dasharray="3 2" rx="2"/></g>';
      }
    }

    s += '</svg>';
    return s;
  }

  function hasBarcodeAbove(panel) {
    return panel.components.some(function (c) { return c.type === 'barcode' && c.y < 0; });
  }

  HCP.svg = {
    renderPanel: renderPanel,
    esc: esc
  };
})();
