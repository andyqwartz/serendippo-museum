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
  app.innerHTML = html;

  app.querySelectorAll(".work img").forEach(function(el, i) {
    el.addEventListener("click", function() { Viewer.open(room, i); });
  });

  Viewer.openFromHash(room);
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