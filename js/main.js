const M = window.MUSEUM;

function esc(s) {
  return String(s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"');
}

function img(room, work, kind) {
  return "images/" + room.slug + "/" + kind + "/" + work.file;
}

function t(obj, lang) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (obj[lang]) return obj[lang];
  if (obj.fr) return obj.fr;
  if (obj.en) return obj.en;
  return "";
}

function caption(room, work, lang) {
  var parts = ['<span class="num">N° ' + esc(work.id) + '</span> — ' + esc(t(room.title, lang))];
  if (work.description) {
    parts.push('<span class="desc">' + esc(work.description) + '</span>');
  }
  var meta = [];
  if (work.date) meta.push(esc(work.date));
  if (work.medium) meta.push(esc(work.medium));
  if (meta.length) {
    parts.push('<span class="meta">' + meta.join(" · ") + '</span>');
  }
  return parts.join(" ");
}

function altText(room, work, lang) {
  var title = t(room.title, lang);
  return title + ", work n° " + work.id;
}

function theme() {
  var t = document.documentElement.getAttribute("data-theme");
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function lang() {
  var l = document.documentElement.getAttribute("data-lang");
  if (l === "fr" || l === "en") return l;
  return navigator.language.startsWith("fr") ? "fr" : "en";
}

function renderHeader() {
  var h = document.getElementById("site-header");
  var currentTheme = theme();
  var currentLang = lang();
  var page = document.body.dataset.page;
  var nav = "";
  nav += '<a class="nav-link' + (page === "home" ? " active" : "") + '" href="index.html">' + (currentLang === "fr" ? "Salles" : "Rooms") + '</a>';
  nav += '<a class="nav-link' + (page === "about" ? " active" : "") + '" href="a-propos.html">' + (currentLang === "fr" ? "À propos" : "About") + '</a>';
  nav += '<button id="lang-toggle" type="button" aria-label="' + (currentLang === "fr" ? "Switch to English" : "Passer au français") + '" class="nav-link">' + currentLang.toUpperCase() + '</button>';
  nav += '<button id="theme-toggle" type="button" aria-label="' + (currentLang === "fr" ? "Changer de thème" : "Switch theme") + '" class="nav-link">' + (currentTheme === "dark" ? (currentLang === "fr" ? "Clair" : "Light") : (currentLang === "fr" ? "Sombre" : "Dark")) + '</button>';
  h.innerHTML = '<a class="title" href="index.html">' + esc(t(M.title, currentLang)) + '</a><nav>' + nav + '</nav>';
  
  var themeBtn = document.getElementById("theme-toggle");
  themeBtn.addEventListener("click", function() {
    var next = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    themeBtn.textContent = next === "dark" ? (currentLang === "fr" ? "Clair" : "Light") : (currentLang === "fr" ? "Sombre" : "Dark");
    themeBtn.setAttribute("aria-label", currentLang === "fr" ? (next === "dark" ? "Passer au thème clair" : "Passer au thème sombre") : (next === "dark" ? "Switch to light theme" : "Switch to dark theme"));
    currentTheme = next;
  });
  
  var langBtn = document.getElementById("lang-toggle");
  langBtn.addEventListener("click", function() {
    var next = currentLang === "fr" ? "en" : "fr";
    document.documentElement.setAttribute("data-lang", next);
    try { localStorage.setItem("lang", next); } catch (e) {}
    langBtn.textContent = next.toUpperCase();
    langBtn.setAttribute("aria-label", next === "fr" ? "Switch to English" : "Passer au français");
    renderHeader();
    renderFooter();
    var page = document.body.dataset.page;
    if (page === "home") initHome();
    else if (page === "room") initRoom();
    else if (page === "about") initAbout();
  });
}

function renderFooter() {
  var f = document.getElementById("site-footer");
  var currentLang = lang();
  var year = new Date().getFullYear();
  var author = t(M.author, currentLang) ? " — " + esc(t(M.author, currentLang)) : "";
  f.textContent = "© " + year + " " + esc(t(M.title, currentLang)) + author;
}

function initHome() {
  var currentLang = lang();
  var app = document.getElementById("app");
  var html = '<p class="home-statement">' + esc(t(M.statement, currentLang)) + '</p>';
  html += '<div class="rooms-list">';
  M.rooms.forEach(function(room, i) {
    html += '<a class="room-link" href="salle.html?p=' + esc(room.slug) + '" data-preview="' + esc(img(room, {file: room.cover}, "thumb")) + '">';
    html += '<span class="room-number">' + esc(room.number) + '</span>';
    html += '<span class="room-title">' + esc(t(room.title, currentLang)) + '</span>';
    html += '<span class="room-year">' + esc(room.year) + '</span>';
    html += '</a>';
  });
  html += '</div>';
  html += '<img id="preview" alt="">';
  app.innerHTML = html;

  var preview = document.getElementById("preview");
  var links = document.querySelectorAll(".room-link");
  links.forEach(function(link, idx) {
    link.style.animationDelay = (idx * 0.1 + 0.1) + "s";
    link.addEventListener("mouseenter", function() {
      preview.src = link.dataset.preview;
      preview.classList.add("visible");
    });
    link.addEventListener("mouseleave", function() {
      preview.classList.remove("visible");
    });
  });
}

function initRoom() {
  var currentLang = lang();
  var params = new URLSearchParams(location.search);
  var slug = params.get("p");
  var room = M.rooms.find(function(r) { return r.slug === slug; });
  var app = document.getElementById("app");
  if (!room) {
    app.innerHTML = '<p style="padding:var(--pad)">' + (currentLang === "fr" ? "Salle introuvable. <a href=\"index.html\">Retour</a>" : "Room not found. <a href=\"index.html\">Back</a>") + '</p>';
    document.title = (currentLang === "fr" ? "Salle introuvable — " : "Room not found — ") + esc(t(M.title, currentLang));
    return;
  }
  document.title = esc(t(room.title, currentLang)) + " — " + esc(t(M.title, currentLang));
  var html = '<div class="room-header">';
  html += '<span class="room-number">' + esc(room.number) + '</span>';
  html += '<h1>' + esc(t(room.title, currentLang)) + '</h1>';
  html += '<span class="room-year">' + esc(room.year) + '</span>';
  html += '</div>';
  if (room.text && t(room.text, currentLang)) {
    html += '<p class="room-text">' + esc(t(room.text, currentLang)) + '</p>';
  }
  html += '<div class="wall">';
  room.works.forEach(function(work, i) {
    var loading = i === 0 ? "eager" : "lazy";
    var aspect = work.w + " / " + work.h;
    html += '<figure class="work" style="animation-delay:' + (i * 0.1 + 0.1) + 's">';
    html += '<img src="' + esc(img(room, work, "full")) + '" alt="' + esc(altText(room, work, currentLang)) + '" width="' + work.w + '" height="' + work.h + '" style="aspect-ratio:' + aspect + '" loading="' + loading + '" decoding="async" data-index="' + i + '">';
    html += '<figcaption>' + caption(room, work, currentLang) + '</figcaption>';
    html += '</figure>';
  });
  html += '</div>';
  // Lightbox with proper zoom/pan
  html += '<div id="lightbox" hidden>';
  html += '<div id="lightbox-inner">';
  html += '<img id="lb-img" alt="">';
  html += '<figcaption id="lb-caption"></figcaption>';
  html += '<div id="lb-zoom-indicator" hidden></div>';
  html += '</div>';
  html += '<div id="lightbox-controls">';
  html += '<button id="lb-prev" type="button" aria-label="' + (currentLang === "fr" ? "Précédent" : "Previous") + '">←</button>';
  html += '<button id="lb-next" type="button" aria-label="' + (currentLang === "fr" ? "Suivant" : "Next") + '">→</button>';
  html += '<button id="lb-zoom-in" type="button" aria-label="' + (currentLang === "fr" ? "Zoom avant" : "Zoom in") + '">+</button>';
  html += '<button id="lb-zoom-out" type="button" aria-label="' + (currentLang === "fr" ? "Zoom arrière" : "Zoom out") + '">−</button>';
  html += '<button id="lb-zoom-reset" type="button" aria-label="' + (currentLang === "fr" ? "Zoom 100%" : "Reset zoom") + '">1:1</button>';
  html += '<button id="lb-fullscreen" type="button" aria-label="' + (currentLang === "fr" ? "Ouvrir l\'image en plein écran" : "Open image in new tab") + '" title="' + (currentLang === "fr" ? "Ouvrir l\'image en plein écran (nouvel onglet)" : "Open image in new tab") + '">⛶</button>';
  html += '<button id="lb-close" type="button" aria-label="' + (currentLang === "fr" ? "Fermer" : "Close") + '">✕</button>';
  html += '</div>';
  html += '</div>';
  app.innerHTML = html;

  var works = room.works;
  var lightbox = document.getElementById("lightbox");
  var lbInner = document.getElementById("lightbox-inner");
  var lbImg = document.getElementById("lb-img");
  var lbCaption = document.getElementById("lb-caption");
  var lbZoomIndicator = document.getElementById("lb-zoom-indicator");
  var currentIndex = 0;
  
  // Zoom state
  var scale = 1;
  var translateX = 0;
  var translateY = 0;
  var targetScale = 1;
  var targetTranslateX = 0;
  var targetTranslateY = 0;
  var animationFrame = null;
  
  // Drag state
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragStartTranslateX = 0;
  var dragStartTranslateY = 0;
  
  // Touch state
  var touchStartDist = 0;
  var touchStartScale = 1;
  var touchCenterX = 0;
  var touchCenterY = 0;
  var lastTouchTime = 0;
  
  // Image natural dimensions
  var imgNaturalW = 0;
  var imgNaturalH = 0;

  function getMaxTranslate() {
    var rect = lbInner.getBoundingClientRect();
    var viewportW = rect.width;
    var viewportH = rect.height;
    var scaledW = imgNaturalW * scale;
    var scaledH = imgNaturalH * scale;
    var maxTx = Math.max(0, (scaledW - viewportW) / 2);
    var maxTy = Math.max(0, (scaledH - viewportH) / 2);
    return { x: maxTx, y: maxTy };
  }

  function clampTranslate(tx, ty) {
    var max = getMaxTranslate();
    return {
      x: Math.max(-max.x, Math.min(max.x, tx)),
      y: Math.max(-max.y, Math.min(max.y, ty))
    };
  }

  function updateTransform(instant) {
    if (instant) {
      lbImg.style.transition = "none";
    } else {
      lbImg.style.transition = "transform 0.08s ease-out";
    }
    lbImg.style.transform = "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
    var pct = Math.round(scale * 100);
    lbZoomIndicator.textContent = pct + "%";
    lbZoomIndicator.hidden = (scale === 1);
  }

  function animateZoom() {
    var easing = 0.15;
    var dx = targetTranslateX - translateX;
    var dy = targetTranslateY - translateY;
    var ds = targetScale - scale;
    
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(ds) > 0.001) {
      translateX += dx * easing;
      translateY += dy * easing;
      scale += ds * easing;
      
      var clamped = clampTranslate(translateX, translateY);
      translateX = clamped.x;
      translateY = clamped.y;
      
      updateTransform(false);
      animationFrame = requestAnimationFrame(animateZoom);
    } else {
      translateX = targetTranslateX;
      translateY = targetTranslateY;
      scale = targetScale;
      updateTransform(true);
      animationFrame = null;
    }
  }

  function setZoom(newScale, centerX, centerY) {
    newScale = Math.min(Math.max(newScale, 0.5), 6);
    if (newScale === scale) return;
    
    var rect = lbInner.getBoundingClientRect();
    var cx = (centerX !== undefined) ? centerX : rect.width / 2;
    var cy = (centerY !== undefined) ? centerY : rect.height / 2;
    
    var ratio = newScale / scale;
    targetTranslateX = cx - (cx - translateX) * ratio;
    targetTranslateY = cy - (cy - translateY) * ratio;
    targetScale = newScale;
    
    var clamped = clampTranslate(targetTranslateX, targetTranslateY);
    targetTranslateX = clamped.x;
    targetTranslateY = clamped.y;
    
    if (!animationFrame) animateZoom();
  }

  function zoomIn() { setZoom(scale * 1.5); }
  function zoomOut() { setZoom(scale / 1.5); }
  function resetZoom() {
    targetScale = 1;
    targetTranslateX = 0;
    targetTranslateY = 0;
    if (!animationFrame) animateZoom();
  }

  function openLightbox(index) {
    currentIndex = index;
    resetZoom();
    scale = 1; translateX = 0; translateY = 0;
    targetScale = 1; targetTranslateX = 0; targetTranslateY = 0;
    updateTransform(true);
    
    var w = works[currentIndex];
    lbImg.src = img(room, w, "full");
    lbImg.alt = esc(altText(room, w, currentLang));
    lbCaption.innerHTML = caption(room, w, currentLang);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    
    lbImg.onload = function() {
      imgNaturalW = lbImg.naturalWidth;
      imgNaturalH = lbImg.naturalHeight;
      resetZoom();
    };
    
    if (currentIndex + 1 < works.length) {
      var nextImg = new Image();
      nextImg.src = img(room, works[currentIndex + 1], "full");
    }
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resetZoom();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % works.length;
    openLightbox(currentIndex);
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + works.length) % works.length;
    openLightbox(currentIndex);
  }

  function openImageFullscreen() {
    var w = works[currentIndex];
    var url = img(room, w, "full");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Wheel zoom
  lbInner.addEventListener("wheel", function(e) {
    if (lightbox.hidden) return;
    e.preventDefault();
    var rect = lbInner.getBoundingClientRect();
    var cx = e.clientX - rect.left;
    var cy = e.clientY - rect.top;
    var zoomFactor = e.deltaY > 0 ? 1/1.2 : 1.2;
    setZoom(scale * zoomFactor, cx, cy);
  }, { passive: false });

  // Zoom buttons
  document.getElementById("lb-zoom-in").addEventListener("click", function(e) {
    e.stopPropagation();
    zoomIn();
  });
  document.getElementById("lb-zoom-out").addEventListener("click", function(e) {
    e.stopPropagation();
    zoomOut();
  });
  document.getElementById("lb-zoom-reset").addEventListener("click", function(e) {
    e.stopPropagation();
    resetZoom();
  });

  // Drag to pan
  lbInner.addEventListener("mousedown", function(e) {
    if (lightbox.hidden) return;
    if (e.button !== 0) return;
    if (scale === 1 && e.target !== lbImg) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTranslateX = translateX;
    dragStartTranslateY = translateY;
    lbInner.style.cursor = "grabbing";
    lbImg.style.transition = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", function(e) {
    if (!isDragging) return;
    targetTranslateX = dragStartTranslateX + (e.clientX - dragStartX);
    targetTranslateY = dragStartTranslateY + (e.clientY - dragStartY);
    
    var clamped = clampTranslate(targetTranslateX, targetTranslateY);
    targetTranslateX = clamped.x;
    targetTranslateY = clamped.y;
    
    if (!animationFrame) animateZoom();
  });

  document.addEventListener("mouseup", function() {
    if (isDragging) {
      isDragging = false;
      lbInner.style.cursor = scale > 1 ? "grab" : "default";
      lbImg.style.transition = "transform 0.08s ease-out";
    }
  });

  // Double-click to reset
  lbInner.addEventListener("dblclick", function(e) {
    if (lightbox.hidden) return;
    resetZoom();
  });

  // Touch support
  lbInner.addEventListener("touchstart", function(e) {
    if (lightbox.hidden) return;
    var now = Date.now();
    if (e.touches.length === 2) {
      e.preventDefault();
      var t1 = e.touches[0];
      var t2 = e.touches[1];
      touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartScale = scale;
      var rect = lbInner.getBoundingClientRect();
      touchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
      touchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
    } else if (e.touches.length === 1) {
      if (now - lastTouchTime < 300) {
        e.preventDefault();
        resetZoom();
      }
      lastTouchTime = now;
      
      if (scale > 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        dragStartTranslateX = translateX;
        dragStartTranslateY = translateY;
        lbImg.style.transition = "none";
      }
    }
  }, { passive: false });

  lbInner.addEventListener("touchmove", function(e) {
    if (lightbox.hidden) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      var t1 = e.touches[0];
      var t2 = e.touches[1];
      var dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      var newScale = Math.min(Math.max(touchStartScale * (dist / touchStartDist), 0.5), 6);
      var rect = lbInner.getBoundingClientRect();
      setZoom(newScale, touchCenterX, touchCenterY);
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      targetTranslateX = dragStartTranslateX + (e.touches[0].clientX - dragStartX);
      targetTranslateY = dragStartTranslateY + (e.touches[0].clientY - dragStartY);
      var clamped = clampTranslate(targetTranslateX, targetTranslateY);
      targetTranslateX = clamped.x;
      targetTranslateY = clamped.y;
      if (!animationFrame) animateZoom();
    }
  }, { passive: false });

  lbInner.addEventListener("touchend", function(e) {
    if (e.touches.length === 0) {
      isDragging = false;
      lbImg.style.transition = "transform 0.08s ease-out";
    }
  });

  // Keyboard
  document.addEventListener("keydown", function(e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") showNext();
    else if (e.key === "ArrowLeft") showPrev();
    else if (e.key === "f" || e.key === "F") openImageFullscreen();
    else if (e.key === "0" || e.key === " ") { e.preventDefault(); resetZoom(); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomIn(); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomOut(); }
  });

  // Click handlers
  app.querySelectorAll(".work img").forEach(function(el, i) {
    el.addEventListener("click", function() { openLightbox(i); });
  });

  document.getElementById("lb-next").addEventListener("click", function(e) { e.stopPropagation(); showNext(); });
  document.getElementById("lb-prev").addEventListener("click", function(e) { e.stopPropagation(); showPrev(); });
  document.getElementById("lb-close").addEventListener("click", closeLightbox);
  document.getElementById("lb-fullscreen").addEventListener("click", function(e) { e.stopPropagation(); openImageFullscreen(); });
  
  lightbox.addEventListener("click", function(e) {
    if (e.target === lightbox) closeLightbox();
  });
}

function initAbout() {
  var currentLang = lang();
  var app = document.getElementById("app");
  var html = '<div class="about-content">';
  var about = t(M.about, currentLang);
  if (Array.isArray(about)) {
    about.forEach(function(p) {
      html += '<p>' + esc(p) + '</p>';
    });
  }
  var contact = t(M.contact, currentLang);
  if (contact) {
    html += '<p class="about-contact">' + esc(contact) + '</p>';
  }
  html += '</div>';
  app.innerHTML = html;
  document.title = (currentLang === "fr" ? "À propos — " : "About — ") + esc(t(M.title, currentLang));
}

// Initialize language from localStorage before first render
(function() {
  try {
    var savedLang = localStorage.getItem("lang");
    if (savedLang === "fr" || savedLang === "en") {
      document.documentElement.setAttribute("data-lang", savedLang);
    }
  } catch (e) {}
})();

renderHeader();
renderFooter();
var page = document.body.dataset.page;
if (page === "home") initHome();
else if (page === "room") initRoom();
else if (page === "about") initAbout();