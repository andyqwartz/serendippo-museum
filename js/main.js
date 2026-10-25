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
  // Lightbox with zoom/pan support
  html += '<div id="lightbox" hidden><div id="lightbox-inner"><img alt=""><figcaption></figcaption></div><div id="lightbox-controls"><button id="lb-prev" type="button" aria-label="' + (currentLang === "fr" ? "Précédent" : "Previous") + '">←</button><button id="lb-next" type="button" aria-label="' + (currentLang === "fr" ? "Suivant" : "Next") + '">→</button><button id="lb-fullscreen" type="button" aria-label="' + (currentLang === "fr" ? "Plein écran" : "Fullscreen") + '">⛶</button><button id="lb-close" type="button" aria-label="' + (currentLang === "fr" ? "Fermer" : "Close") + '">✕</button></div></div>';
  app.innerHTML = html;

  var works = room.works;
  var lightbox = document.getElementById("lightbox");
  var lbInner = document.getElementById("lightbox-inner");
  var lbImg = lightbox.querySelector("img");
  var lbCaption = lightbox.querySelector("figcaption");
  var currentIndex = 0;
  var scale = 1;
  var translateX = 0;
  var translateY = 0;
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragStartTranslateX = 0;
  var dragStartTranslateY = 0;

  function updateTransform() {
    lbImg.style.transform = "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  }

  function openLightbox(index) {
    currentIndex = index;
    resetZoom();
    var w = works[currentIndex];
    lbImg.src = img(room, w, "full");
    lbImg.alt = esc(altText(room, w, currentLang));
    lbCaption.innerHTML = caption(room, w, currentLang);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (currentIndex + 1 < works.length) {
      var nextImg = new Image();
      nextImg.src = img(room, works[currentIndex + 1], "full");
    }
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      lightbox.requestFullscreen().catch(function() {});
    } else {
      document.exitFullscreen();
    }
  }

  // Zoom with wheel
  lbInner.addEventListener("wheel", function(e) {
    if (lightbox.hidden) return;
    e.preventDefault();
    var rect = lbInner.getBoundingClientRect();
    var mouseX = e.clientX - rect.left - rect.width / 2;
    var mouseY = e.clientY - rect.top - rect.height / 2;
    var zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    var newScale = Math.min(Math.max(scale * zoomFactor, 0.5), 8);
    var ratio = newScale / scale;
    translateX = mouseX - (mouseX - translateX) * ratio;
    translateY = mouseY - (mouseY - translateY) * ratio;
    scale = newScale;
    updateTransform();
  }, { passive: false });

  // Drag to pan
  lbInner.addEventListener("mousedown", function(e) {
    if (lightbox.hidden || scale === 1) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTranslateX = translateX;
    dragStartTranslateY = translateY;
    lbInner.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", function(e) {
    if (!isDragging) return;
    translateX = dragStartTranslateX + (e.clientX - dragStartX);
    translateY = dragStartTranslateY + (e.clientY - dragStartY);
    updateTransform();
  });

  document.addEventListener("mouseup", function() {
    if (isDragging) {
      isDragging = false;
      lbInner.style.cursor = scale > 1 ? "grab" : "default";
    }
  });

  // Double-click to reset zoom
  lbInner.addEventListener("dblclick", function(e) {
    if (lightbox.hidden) return;
    resetZoom();
  });

  // Touch support for mobile
  var touchStartDist = 0;
  var touchStartScale = 1;
  var touchCenterX = 0;
  var touchCenterY = 0;

  lbInner.addEventListener("touchstart", function(e) {
    if (lightbox.hidden) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      var t1 = e.touches[0];
      var t2 = e.touches[1];
      touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartScale = scale;
      var rect = lbInner.getBoundingClientRect();
      touchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left - rect.width / 2;
      touchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top - rect.height / 2;
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartTranslateX = translateX;
      dragStartTranslateY = translateY;
    }
  }, { passive: false });

  lbInner.addEventListener("touchmove", function(e) {
    if (lightbox.hidden) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      var t1 = e.touches[0];
      var t2 = e.touches[1];
      var dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      var newScale = Math.min(Math.max(touchStartScale * (dist / touchStartDist), 0.5), 8);
      var ratio = newScale / scale;
      translateX = touchCenterX - (touchCenterX - translateX) * ratio;
      translateY = touchCenterY - (touchCenterY - translateY) * ratio;
      scale = newScale;
      updateTransform();
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      translateX = dragStartTranslateX + (e.touches[0].clientX - dragStartX);
      translateY = dragStartTranslateY + (e.touches[0].clientY - dragStartY);
      updateTransform();
    }
  }, { passive: false });

  lbInner.addEventListener("touchend", function(e) {
    if (e.touches.length === 0) {
      isDragging = false;
    }
  });

  app.querySelectorAll(".work img").forEach(function(el, i) {
    el.addEventListener("click", function() { openLightbox(i); });
  });

  document.getElementById("lb-next").addEventListener("click", showNext);
  document.getElementById("lb-prev").addEventListener("click", showPrev);
  document.getElementById("lb-close").addEventListener("click", closeLightbox);
  document.getElementById("lb-fullscreen").addEventListener("click", toggleFullscreen);
  lightbox.addEventListener("click", function(e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function(e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") showNext();
    else if (e.key === "ArrowLeft") showPrev();
    else if (e.key === "f" || e.key === "F") toggleFullscreen();
    else if (e.key === "0" || e.key === " ") resetZoom();
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