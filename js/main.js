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

function theme() {
  var t = document.documentElement.getAttribute("data-theme");
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function renderHeader() {
  var h = document.getElementById("site-header");
  var current = theme();
  var page = document.body.dataset.page;
  var nav = "";
  nav += '<a class="nav-link' + (page === "home" ? " active" : "") + '" href="index.html">Salles</a>';
  nav += '<a class="nav-link' + (page === "about" ? " active" : "") + '" href="a-propos.html">À propos</a>';
  nav += '<button id="theme-toggle" type="button" aria-label="Changer de thème" class="nav-link">' + (current === "dark" ? "Clair" : "Sombre") + '</button>';
  h.innerHTML = '<a class="title" href="index.html">' + esc(M.title) + '</a><nav>' + nav + '</nav>';
  var btn = document.getElementById("theme-toggle");
  btn.addEventListener("click", function() {
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    btn.textContent = next === "dark" ? "Clair" : "Sombre";
    current = next;
  });
}

function renderFooter() {
  var f = document.getElementById("site-footer");
  var year = new Date().getFullYear();
  var author = M.author ? " — " + esc(M.author) : "";
  f.textContent = "© " + year + " " + esc(M.title) + author;
}

function initHome() {
  var app = document.getElementById("app");
  var html = '<p class="home-statement">' + esc(M.statement) + '</p>';
  html += '<div class="rooms-list">';
  M.rooms.forEach(function(room, i) {
    html += '<a class="room-link" href="salle.html?p=' + esc(room.slug) + '" data-preview="' + esc(img(room, {file: room.cover}, "thumb")) + '">';
    html += '<span class="room-number">' + esc(room.number) + '</span>';
    html += '<span class="room-title">' + esc(room.title) + '</span>';
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
  var params = new URLSearchParams(location.search);
  var slug = params.get("p");
  var room = M.rooms.find(function(r) { return r.slug === slug; });
  var app = document.getElementById("app");
  if (!room) {
    app.innerHTML = '<p style="padding:var(--pad)">Salle introuvable. <a href="index.html">Retour</a></p>';
    document.title = "Salle introuvable — " + esc(M.title);
    return;
  }
  document.title = esc(room.title) + " — " + esc(M.title);
  var html = '<div class="room-header">';
  html += '<span class="room-number">' + esc(room.number) + '</span>';
  html += '<h1>' + esc(room.title) + '</h1>';
  html += '<span class="room-year">' + esc(room.year) + '</span>';
  html += '</div>';
  if (room.text) {
    html += '<p class="room-text">' + esc(room.text) + '</p>';
  }
  html += '<div class="wall">';
  room.works.forEach(function(work, i) {
    var loading = i === 0 ? "eager" : "lazy";
    var aspect = work.w + " / " + work.h;
    html += '<figure class="work" style="animation-delay:' + (i * 0.1 + 0.1) + 's">';
    html += '<img src="' + esc(img(room, work, "full")) + '" alt="' + esc(work.alt) + '" width="' + work.w + '" height="' + work.h + '" style="aspect-ratio:' + aspect + '" loading="' + loading + '" decoding="async" data-index="' + i + '">';
    html += '<figcaption><span class="work-id">N° ' + esc(work.id) + '</span> — ' + esc(work.title) + ', ' + esc(work.year) + ' — ' + esc(work.medium) + '</figcaption>';
    html += '</figure>';
  });
  html += '</div>';
  html += '<div id="lightbox" hidden><img alt=""><figcaption></figcaption><div id="lightbox-controls"><button id="lb-prev" type="button" aria-label="Précédent">←</button><button id="lb-next" type="button" aria-label="Suivant">→</button><button id="lb-close" type="button" aria-label="Fermer">✕</button></div></div>';
  app.innerHTML = html;

  var works = room.works;
  var lightbox = document.getElementById("lightbox");
  var lbImg = lightbox.querySelector("img");
  var lbCaption = lightbox.querySelector("figcaption");
  var currentIndex = 0;

  function openLightbox(index) {
    currentIndex = index;
    var w = works[currentIndex];
    lbImg.src = img(room, w, "full");
    lbImg.alt = w.alt;
    lbCaption.innerHTML = '<span class="work-id">N° ' + esc(w.id) + '</span> — ' + esc(w.title) + ', ' + esc(w.year) + ' — ' + esc(w.medium);
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
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % works.length;
    openLightbox(currentIndex);
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + works.length) % works.length;
    openLightbox(currentIndex);
  }

  app.querySelectorAll(".work img").forEach(function(el, i) {
    el.addEventListener("click", function() { openLightbox(i); });
  });

  document.getElementById("lb-next").addEventListener("click", showNext);
  document.getElementById("lb-prev").addEventListener("click", showPrev);
  document.getElementById("lb-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function(e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function(e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") showNext();
    else if (e.key === "ArrowLeft") showPrev();
  });
}

function initAbout() {
  var app = document.getElementById("app");
  var html = '<div class="about-content">';
  M.about.forEach(function(p) {
    html += '<p>' + esc(p) + '</p>';
  });
  if (M.contact) {
    html += '<p class="about-contact">' + esc(M.contact) + '</p>';
  }
  html += '</div>';
  app.innerHTML = html;
  document.title = "À propos — " + esc(M.title);
}

renderHeader();
renderFooter();
var page = document.body.dataset.page;
if (page === "home") initHome();
else if (page === "room") initRoom();
else if (page === "about") initAbout();
