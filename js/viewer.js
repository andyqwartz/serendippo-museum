/* Visionneuse SERENDIPPO : zoom, deplacement, plein ecran, liens directs.
   JavaScript classique, sans dependance. Utilise img(), caption() et altText() definies dans main.js.
   Disposition : bandeau d'outils en haut, zone de l'image au milieu, legende en bas.
   Rien ne recouvre l'image : elle est ajustee et decoupee dans la zone du milieu. */
(function () {
  "use strict";
  var root, stage, imgEl, capEl, countEl, zoomEl, fsBtn;
  var room = null, index = 0, opener = null;
  var S = { fit: 1, scale: 1, x: 0, y: 0, nw: 1, nh: 1, fitMode: true };
  var pointers = {}, gesture = null, lastTap = 0;

  function dpr() { return window.devicePixelRatio || 1; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) || 1; }
  function dims() { return { w: stage.clientWidth, h: stage.clientHeight }; }

  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function fsSupported() {
    var t = document.documentElement;
    return !!((document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
      (t.requestFullscreen || t.webkitRequestFullscreen));
  }
  function exitFs() {
    var f = document.exitFullscreen || document.webkitExitFullscreen;
    if (f) { var p = f.call(document); if (p && p.catch) { p.catch(function () {}); } }
  }
  function toggleFullscreen() {
    if (fsElement()) { exitFs(); return; }
    var f = root.requestFullscreen || root.webkitRequestFullscreen;
    if (f) { var p = f.call(root); if (p && p.catch) { p.catch(function () {}); } }
  }

  function apply() {
    var d = dims(), w = S.nw * S.scale, h = S.nh * S.scale, r = dpr();
    S.x = w <= d.w ? (d.w - w) / 2 : Math.min(0, Math.max(d.w - w, S.x));
    S.y = h <= d.h ? (d.h - h) / 2 : Math.min(0, Math.max(d.h - h, S.y));
    S.x = Math.round(S.x * r) / r;
    S.y = Math.round(S.y * r) / r;
    imgEl.style.transform = "translate(" + S.x + "px," + S.y + "px) scale(" + S.scale + ")";
    zoomEl.textContent = Math.round(S.scale * r * 100) + " %";
  }

  function computeFit() {
    var d = dims();
    S.fit = Math.min(1, d.w / S.nw, d.h / S.nh);
  }

  function fitView() {
    computeFit();
    S.fitMode = true;
    S.scale = S.fit;
    S.x = 0;
    S.y = 0;
    apply();
  }

  function zoomTo(ns, px, py) {
    ns = Math.min(Math.max(8, S.fit), Math.max(S.fit, ns));
    var k = ns / S.scale;
    S.x = px - (px - S.x) * k;
    S.y = py - (py - S.y) * k;
    S.scale = ns;
    S.fitMode = Math.abs(ns - S.fit) < 0.0005;
    apply();
  }

  function zoomBy(f) {
    var d = dims();
    zoomTo(S.scale * f, d.w / 2, d.h / 2);
  }

  function setActual() {
    var d = dims();
    zoomTo(Math.max(1 / dpr(), S.fit), d.w / 2, d.h / 2);
  }

  function toggleZoom(px, py) {
    if (S.fitMode) {
      var target = (1 / dpr() > S.fit * 1.05) ? 1 / dpr() : S.fit * 2.5;
      zoomTo(target, px, py);
    } else {
      fitView();
    }
  }

  function onResize() {
    if (!root || root.hidden) { return; }
    computeFit();
    if (S.fitMode) { S.scale = S.fit; }
    apply();
  }

  function onWheel(e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    var dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    zoomTo(S.scale * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
  }

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button > 0) { return; }
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      gesture = { type: "pinch", d: dist(pointers[ids[0]], pointers[ids[1]]), scale: S.scale };
    } else if (ids.length === 1) {
      gesture = { type: "drag", x: S.x, y: S.y, moved: false };
    }
  }

  function onMove(e) {
    var p = pointers[e.pointerId];
    if (!p) { return; }
    p.x = e.clientX;
    p.y = e.clientY;
    var ids = Object.keys(pointers);
    if (gesture && gesture.type === "pinch" && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var r = stage.getBoundingClientRect();
      zoomTo(gesture.scale * dist(a, b) / gesture.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    } else if (gesture && gesture.type === "drag" && ids.length === 1) {
      var dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) { gesture.moved = true; }
      if (S.scale > S.fit * 1.001) {
        S.x = gesture.x + dx;
        S.y = gesture.y + dy;
        apply();
      }
    }
  }

  function onUp(e) {
    var p = pointers[e.pointerId];
    if (!p) { return; }
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length > 0) { gesture = null; return; }
    var g = gesture;
    gesture = null;
    if (!g || g.type !== "drag") { return; }
    var dx = e.clientX - p.sx, dy = e.clientY - p.sy;
    if (S.scale <= S.fit * 1.001 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (!g.moved) {
      var now = Date.now();
      if (now - lastTap < 320) {
        lastTap = 0;
        var r = stage.getBoundingClientRect();
        toggleZoom(e.clientX - r.left, e.clientY - r.top);
      } else {
        lastTap = now;
      }
    }
  }

  function onKey(e) {
    if (!root || root.hidden) { return; }
    var k = e.key;
    if (k === "Escape") { close(); }
    else if (k === "ArrowLeft") { go(-1); }
    else if (k === "ArrowRight") { go(1); }
    else if (k === "+" || k === "=") { zoomBy(1.5); }
    else if (k === "-") { zoomBy(1 / 1.5); }
    else if (k === "0") { fitView(); }
    else if (k === "1") { setActual(); }
    else if (k === "f" || k === "F") { toggleFullscreen(); }
    else { return; }
    e.preventDefault();
  }

  function syncFs() {
    var on = !!fsElement();
    if (fsBtn) { fsBtn.setAttribute("aria-label", on ? "Quitter le plein écran" : "Plein écran"); }
    onResize();
  }

  function onLoad() {
    if (imgEl.naturalWidth && (imgEl.naturalWidth !== S.nw || imgEl.naturalHeight !== S.nh)) {
      S.nw = imgEl.naturalWidth;
      S.nh = imgEl.naturalHeight;
      imgEl.style.width = S.nw + "px";
      imgEl.style.height = S.nh + "px";
      fitView();
    }
    imgEl.style.visibility = "visible";
    root.classList.remove("is-loading");
    var nxt = room.works[(index + 1) % room.works.length];
    var pre = new Image();
    pre.src = img(room, nxt, "full");
  }

  function show(i) {
    index = i;
    var w = room.works[i];
    root.classList.add("is-loading");
    imgEl.style.visibility = "hidden";
    S.nw = w.w;
    S.nh = w.h;
    imgEl.style.width = w.w + "px";
    imgEl.style.height = w.h + "px";
    imgEl.setAttribute("alt", altText(room, w));
    imgEl.src = img(room, w, "full");
    capEl.innerHTML = caption(room, w);
    countEl.textContent = (i + 1) + " / " + room.works.length;
    try { history.replaceState(null, "", "#" + w.id); } catch (err) {}
    fitView();
  }

  function go(d) {
    var n = room.works.length;
    show((index + d + n) % n);
  }

  function build() {
    if (root) { return; }
    root = document.createElement("div");
    root.className = "viewer";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Visionneuse");
    root.innerHTML =
      '<div class="viewer-bar">' +
      '<div class="viewer-group">' +
      '<button type="button" data-act="prev" aria-label="Œuvre précédente">←</button>' +
      '<button type="button" data-act="next" aria-label="Œuvre suivante">→</button>' +
      '</div>' +
      '<div class="viewer-group">' +
      '<button type="button" data-act="out" aria-label="Zoom arrière">−</button>' +
      '<button type="button" data-act="in" aria-label="Zoom avant">+</button>' +
      '<button type="button" data-act="actual" aria-label="Taille réelle, un pixel de l image par pixel de l écran">1:1</button>' +
      '<button type="button" data-act="fit" aria-label="Ajuster à la fenêtre">Ajuster</button>' +
      '<button type="button" data-act="fs" aria-label="Plein écran">⛶</button>' +
      '<button type="button" data-act="close" aria-label="Fermer">✕</button>' +
      '</div>' +
      '</div>' +
      '<div class="viewer-stage"><img class="viewer-img" alt="" draggable="false">' +
      '<div class="viewer-loading">Chargement…</div></div>' +
      '<div class="viewer-cap"><span class="viewer-title"></span>' +
      '<span><span class="viewer-zoom"></span> · <span class="viewer-count"></span></span></div>';
    document.body.appendChild(root);
    stage = root.querySelector(".viewer-stage");
    imgEl = root.querySelector(".viewer-img");
    capEl = root.querySelector(".viewer-title");
    countEl = root.querySelector(".viewer-count");
    zoomEl = root.querySelector(".viewer-zoom");
    fsBtn = root.querySelector('[data-act="fs"]');
    if (!fsSupported()) { fsBtn.hidden = true; }

    root.querySelector(".viewer-bar").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) { return; }
      var a = b.getAttribute("data-act");
      if (a === "prev") { go(-1); }
      else if (a === "next") { go(1); }
      else if (a === "out") { zoomBy(1 / 1.5); }
      else if (a === "in") { zoomBy(1.5); }
      else if (a === "actual") { setActual(); }
      else if (a === "fit") { fitView(); }
      else if (a === "fs") { toggleFullscreen(); }
      else if (a === "close") { close(); }
    });
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    imgEl.addEventListener("load", onLoad);
    window.addEventListener("resize", onResize);
    if (window.ResizeObserver) { new ResizeObserver(onResize).observe(stage); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", syncFs);
    document.addEventListener("webkitfullscreenchange", syncFs);
  }

  function open(r, i) {
    build();
    room = r;
    opener = document.activeElement;
    root.querySelector('[data-act="prev"]').hidden = r.works.length < 2;
    root.querySelector('[data-act="next"]').hidden = r.works.length < 2;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    root.querySelector('[data-act="close"]').focus();
    show(i);
  }

  function close() {
    if (!root || root.hidden) { return; }
    if (fsElement() === root) { exitFs(); }
    root.hidden = true;
    imgEl.removeAttribute("src");
    document.body.style.overflow = "";
    pointers = {};
    gesture = null;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (err) {}
    if (opener && opener.focus) { opener.focus(); }
  }

  function openFromHash(r) {
    var id = (location.hash || "").replace("#", "");
    if (!id) { return; }
    for (var i = 0; i < r.works.length; i++) {
      if (r.works[i].id === id) { open(r, i); return; }
    }
  }

  window.Viewer = { open: open, close: close, openFromHash: openFromHash };
})();