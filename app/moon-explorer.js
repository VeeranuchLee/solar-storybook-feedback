/* ==========================================================================
   Ari & Dot Book 1 — Solar System Explorer runtime (pages M1-M11)
   --------------------------------------------------------------------------
   THE FILE IS STILL CALLED moon-explorer.js, AND THE DATA IS STILL moons.json.
   Deliberate (owner decision, 2026-09-10): the section grew past moons on that
   date, the names no longer describe it, and the book is live behind a
   service worker -- a sweeping rename of a shipped app risks more than the
   tidiness gains. Everything a child reads says Solar System Explorer; only
   the filenames lag, and that is recorded rather than fixed.

   A page says what it is and nothing else:

       <body data-mx="hub">                              M1
       <body data-mx="family" data-family="jupiter">     M2-M8, M11
       <body data-mx="fame" data-group="moons">          M9
       <body data-mx="game" data-group="moons">          M10

   Everything else comes from data/moons.json, which has three levels:

       group   the kind of thing        Moons, Asteroids
       family  one page of them         Jupiter, Saturn's big moons, Asteroids
       body    one card                 Europa, Vesta

   Add a body and it appears on its family page, in its group's quiz, and (if
   it has a `fame`) in the Hall of Fame, with no page edited. Add a GROUP --
   Comets, Dwarf Planets -- and it is an entry in `groups`, a family pointing
   at it, its bodies, and one page-mNN.html stub. No code here changes either.

   Asteroids orbit "the Sun" and are never presented as moons. The quiz is
   scoped to one group for that reason: "Whose Moon?" must not offer the Sun.

   Sound: a body whose name the book has already recorded plays that clip. The
   rest are silent and show a written pronunciation instead. There is
   deliberately NO speechSynthesis fallback -- see data/moon-narration.json.
   ========================================================================== */
(function () {
  "use strict";

  var MODE = document.body.dataset.mx;
  var FAMILY = document.body.dataset.family || "";
  var GROUP = document.body.dataset.group || "";
  var DATA = null, NARR = { names: {}, says: {} };
  var uid = 0;

  /* ---------- settings, shared with the story pages ------------------------ */
  var store = {
    get sound() { return localStorage.getItem("adx-sound") !== "off"; },
    set sound(v) { localStorage.setItem("adx-sound", v ? "on" : "off"); },
    get motion() { return localStorage.getItem("adx-motion") !== "reduce"; },
    set motion(v) { localStorage.setItem("adx-motion", v ? "full" : "reduce"); }
  };
  var calm = !store.motion ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function applyCalm() { document.body.classList.toggle("calm", calm); }

  /* ---------- sound -------------------------------------------------------- */
  var actx = null, playing = null;
  function tone(f, d, type, g, when) {
    if (!store.sound) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      actx = actx || new C();
      if (actx.state === "suspended") actx.resume();
      var o = actx.createOscillator(), gn = actx.createGain(), t = actx.currentTime + (when || 0);
      o.type = type || "sine"; o.frequency.value = f;
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(g == null ? 0.11 : g, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + d + 0.03);
    } catch (e) {}
  }
  var sfx = {
    tap: function () { tone(880, 0.08, "triangle", 0.08); },
    good: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.32, "sine", 0.08, i * 0.07); }); },
    nope: function () { tone(300, 0.16, "sine", 0.07); tone(220, 0.22, "sine", 0.06, 0.12); }
  };
  function speak(moon) {
    if (!store.sound) return;
    var clip = NARR.names[moon.id];
    if (!clip) return;                     // silent, and the card says why
    try {
      if (playing) { playing.pause(); }
      playing = new Audio("assets-runtime/narration/" + clip);
      playing.play().catch(function () {});
    } catch (e) {}
  }

  /* ---------- drawn bodies ------------------------------------------------- */
  function art(key, cls) {
    var svg = (window.MOON_AVATARS || {})[key];
    if (!svg) return '<svg viewBox="0 0 100 100" aria-hidden="true"></svg>';
    uid++;
    return '<svg class="' + (cls || "") + '" viewBox="0 0 100 100" aria-hidden="true" ' +
      'focusable="false">' + svg.split("__U__").join("mx" + uid) + "</svg>";
  }

  /* ---------- helpers ------------------------------------------------------ */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function bodiesOf(fam) { return DATA.bodies.filter(function (m) { return m.family === fam; }); }
  function byId(id) { return DATA.bodies.filter(function (m) { return m.id === id; })[0]; }
  function famOf(id) { return DATA.families.filter(function (f) { return f.id === id; })[0]; }
  function groupOf(id) { return DATA.groups.filter(function (g) { return g.id === id; })[0]; }
  function famsOf(gid) { return DATA.families.filter(function (f) { return f.group === gid; }); }
  /* Bodies of a whole group, in family order, so the quiz asks in the order the
     atlas is arranged rather than in file order. */
  function groupBodies(gid) {
    var out = [];
    famsOf(gid).forEach(function (f) { out = out.concat(bodiesOf(f.id)); });
    return out;
  }
  /* An `orbits` string as a tools/bodies.py key. "the Sun" -> "sun": asteroids
     read "Orbits: the Sun" on the card, and the drawn body is filed under
     "sun". Every other parent is one word and this is a lowercase. */
  function orbitKey(s) { return String(s).replace(/^the\s+/i, "").toLowerCase(); }
  /* What a family shows as its picture: its own `pics` if it declares them,
     otherwise the worlds its bodies go round. Asteroids all orbit the Sun, so
     the derived answer would be one Sun on every asteroid card.

     `max` matters. The hub card has a fixed picture column and the dwarf
     family has four parents -- Pluto, Haumea, Eris, Makemake -- so unlimited
     art there squeezes "Pluto and the dwarf worlds" into a one-word-per-line
     column. The family page's own header has the width for all of them. */
  function picsOf(fam, max) {
    var f = famOf(fam);
    var out;
    if (f && f.pics && f.pics.length) {
      out = f.pics.slice();
    } else {
      var seen = [];
      out = [];
      bodiesOf(fam).forEach(function (m) {
        if (seen.indexOf(m.orbits) < 0) { seen.push(m.orbits); out.push(orbitKey(m.orbits)); }
      });
    }
    return max ? out.slice(0, max) : out;
  }
  /* The Hall of Fame / quiz entry a group declares, found by kind rather than
     by page name, so a second group's game is data and not a code branch. */
  function extraOf(gid, kind) {
    var g = groupOf(gid);
    if (!g) return null;
    return (g.extras || []).filter(function (e) { return e.kind === kind; })[0] || null;
  }

  /* ---------- top bar ------------------------------------------------------ */
  function bar() {
    var el = document.createElement("nav");
    el.className = "mx-bar";
    el.setAttribute("aria-label", "Solar System Explorer navigation");
    var left = MODE === "hub"
      ? '<a class="mx-btn" href="page-20.html">‹ Back to the story</a>'
      : '<a class="mx-btn" href="page-m1.html">‹ Solar System Explorer</a>';
    el.innerHTML =
      '<a class="mx-btn home" href="https://veeranuchlee.github.io/children-apps/" ' +
        'aria-label="Back to Children Games" title="Back to Children Games">←</a>' +
      left + '<span class="grow"></span>' +
      '<button class="mx-btn" id="mxSound" type="button" aria-pressed="' + store.sound + '">' +
        (store.sound ? "🔊 Sound on" : "🔇 Sound off") + '</button>' +
      '<button class="mx-btn" id="mxCalm" type="button" title="Reduced motion" aria-pressed="' +
        calm + '">' + (calm ? "Full motion" : "Calm mode") + '</button>';
    document.body.insertBefore(el, document.body.firstChild);

    var s = el.querySelector("#mxSound");
    s.addEventListener("click", function () {
      store.sound = !store.sound;
      s.setAttribute("aria-pressed", String(store.sound));
      s.textContent = store.sound ? "🔊 Sound on" : "🔇 Sound off";
      if (!store.sound && playing) playing.pause();
      if (store.sound) sfx.tap();
    });
    var c = el.querySelector("#mxCalm");
    c.addEventListener("click", function () {
      calm = !calm; store.motion = !calm;
      c.setAttribute("aria-pressed", String(calm));
      c.textContent = calm ? "Full motion" : "Calm mode";
      applyCalm();
      Array.prototype.forEach.call(document.querySelectorAll(".mx-lab svg"), function (s) {
        if (!s.pauseAnimations) return;
        if (calm) s.pauseAnimations(); else s.unpauseAnimations();
      });
    });
  }

  /* ---------- the detail sheet -------------------------------------------- */
  var sheet;
  function makeSheet() {
    sheet = document.createElement("aside");
    sheet.className = "mx-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "About this world");
    document.body.appendChild(sheet);
    document.addEventListener("click", function (e) {
      if (sheet.classList.contains("open") && !sheet.contains(e.target) &&
          !e.target.closest(".moon,.trophy")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function close() { sheet.classList.remove("open"); if (playing) playing.pause(); }

  function open(moon, opts) {
    opts = opts || {};
    var recorded = !!NARR.names[moon.id];
    var lab = MX_LAB[moon.interaction];
    sheet.innerHTML =
      '<button class="mx-close" type="button" aria-label="Close">×</button>' +
      '<div class="in"><div>' + art(moon.avatar) + '</div><div>' +
        '<h2>' + esc(moon.name) + '</h2>' +
        (moon.pron ? '<p class="pron">say it: ' + esc(moon.pron) + "</p>" : "") +
        '<p><span class="orbits">Orbits: ' + esc(moon.orbits) + "</span></p>" +
        "<p>" + esc(moon.factShort) + "</p>" +
        (moon.factExtra ? '<p class="extra">' + esc(moon.factExtra) + "</p>" : "") +
        '<div class="mx-acts">' +
          (recorded ? '<button class="mx-pill primary" id="mxSay">▶ Hear the name</button>' : "") +
          (lab ? '<button class="mx-pill" id="mxLab">' + esc(lab.button) + "</button>" : "") +
          (opts.family !== false && MODE !== "family"
            ? '<a class="mx-pill" href="page-' + famOf(moon.family).page + '.html">' +
              esc(famOf(moon.family).allLabel ||
                  "All of " + famOf(moon.family).title.replace(/^The /, "")) + " ›</a>" : "") +
        "</div>" +
        (recorded ? "" : '<p class="mx-note">This name has not been recorded yet — the ' +
          "spelling above shows how to say it.</p>") +
        '<div id="mxLabHost"></div>' +
      "</div></div>";
    sheet.querySelector(".mx-close").addEventListener("click", close);
    var sayBtn = sheet.querySelector("#mxSay");
    if (sayBtn) sayBtn.addEventListener("click", function () { speak(moon); });
    var labBtn = sheet.querySelector("#mxLab");
    if (labBtn) labBtn.addEventListener("click", function () {
      sfx.tap();
      var host = sheet.querySelector("#mxLabHost");
      host.innerHTML = '<div class="mx-lab">' + lab.svg + '<p class="cap">' + esc(lab.cap) + "</p></div>";
      labBtn.disabled = true;
      // Calm mode is a CSS class, and CSS cannot stop SMIL. This can.
      var s = host.querySelector("svg");
      if (s && calm && s.pauseAnimations) s.pauseAnimations();
    });
    sheet.classList.add("open");
    sheet.scrollTop = 0;
    sfx.tap();
    speak(moon);
  }

  /* ---------- cards -------------------------------------------------------- */
  function card(m) {
    return '<button class="moon' + (m.tier === 1 ? " hero" : "") + '" type="button" ' +
      'data-moon="' + m.id + '" aria-label="' + esc(m.name) + ", orbits " + esc(m.orbits) + '">' +
      art(m.avatar) +
      '<span class="nm">' + esc(m.name) + "</span>" +
      (m.pron ? '<span class="pron">' + esc(m.pron) + "</span>" : "") +
      '<span class="orb">Orbits: ' + esc(m.orbits) + "</span>" +
      (m.tier === 1 ? '<span class="fs">' + esc(m.factShort) + "</span>" : "") +
      "</button>";
  }
  function wireCards(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-moon]");
      if (b) open(byId(b.dataset.moon));
    });
  }

  /* ---------- M1 : the hub ------------------------------------------------- */
  /* One page, one tap to anywhere. The groups are headings over the same flat
     menu rather than a level the child has to walk down: a second tap to reach
     Jupiter would buy nothing, and the whole point of this section is that it
     is browsable. Adding a group adds a heading and its cards, and the head
     art gains that group's picture, with nothing here edited. */
  function renderHub() {
    var head = document.createElement("div");
    head.innerHTML =
      '<div class="mx-head"><div class="mx-hosts">' +
        DATA.groups.map(function (g) { return art((g.hosts || [])[0]); }).join("") + "</div>" +
      '<div class="mx-titles"><h1>Solar System Explorer</h1>' +
      '<p class="sub">A little atlas of the solar system — go wherever you like</p></div></div>' +
      '<p class="mx-says mx-intro-says"><b>Ari:</b> “Dot, how many worlds are out there?”<br>' +
      '<b>Dot:</b> “Wrong question. The good question is <em>what goes round what</em> — ' +
      'and what each one is famous for. Pick one and find out.”</p>';
    document.body.appendChild(head);

    DATA.groups.forEach(function (g) {
      var h = document.createElement("div");
      h.className = "mx-group";
      h.innerHTML = "<h2>" + esc(g.title) + "</h2><p>" + esc(g.sub) + "</p>";
      document.body.appendChild(h);

      var menu = document.createElement("div");
      menu.className = "mx-menu";
      menu.innerHTML = famsOf(g.id).map(function (f) {
        var pics = picsOf(f.id, 2).map(function (h2) { return art(h2); }).join("");
        return '<a class="mx-card" href="page-' + f.page + '.html">' +
          '<span class="pics">' + pics + "</span><span><span class=\"t\">" + esc(f.title) +
          '</span><span class="s">' + esc(f.sub) + "</span></span></a>";
      }).join("") +
        (g.extras || []).map(function (e) {
          return '<a class="mx-card special" href="page-' + e.page + '.html">' +
            '<span class="pics">' + art(e.avatar) + "</span><span>" +
            '<span class="t">' + esc(e.title) + "</span>" +
            '<span class="s">' + esc(e.sub) + "</span></span></a>";
        }).join("");
      document.body.appendChild(menu);
    });
  }

  /* ---------- M2-M8, M11 : a family ---------------------------------------- */
  function renderFamily() {
    var f = famOf(FAMILY);
    if (!f) return;
    var grp = groupOf(f.group) || {};
    document.title = "Ari & Dot · Solar System Explorer — " + f.title;
    var all = bodiesOf(FAMILY);
    var heroes = all.filter(function (m) { return m.tier === 1; });
    var rest = all.filter(function (m) { return m.tier !== 1; });

    var head = document.createElement("div");
    head.innerHTML =
      '<div class="mx-head"><div class="mx-hosts">' +
        picsOf(FAMILY).map(function (h) { return art(h); }).join("") + "</div>" +
      '<div class="mx-titles"><h1>' + esc(f.title) + "</h1>" +
      '<p class="sub">' + esc(f.sub) + "</p></div></div>" +
      '<p class="mx-intro">' + esc(f.intro) + "</p>";
    document.body.appendChild(head);

    var g1 = document.createElement("div");
    g1.className = "mx-grid";
    g1.innerHTML = heroes.map(card).join("");
    document.body.appendChild(g1);
    wireCards(g1);

    if (rest.length) {
      var lab = document.createElement("p");
      lab.className = "mx-sec";
      // The group owns this wording: on the asteroid page "More moons to know
      // by sight" would call nine asteroids moons.
      lab.textContent = grp.more || "More to know by sight";
      document.body.appendChild(lab);
      var g2 = document.createElement("div");
      g2.className = "mx-grid tier2";
      g2.innerHTML = rest.map(card).join("");
      document.body.appendChild(g2);
      wireCards(g2);
    }
  }

  /* ---------- M9 : the hall of fame ---------------------------------------- */
  function renderFame() {
    var e = extraOf(GROUP, "fame") || {};
    document.title = "Ari & Dot · Solar System Explorer — " + (e.title || "Hall of Fame");
    var head = document.createElement("div");
    head.innerHTML =
      '<div class="mx-head"><div class="mx-hosts">' + art(e.avatar) + art("io") + "</div>" +
      '<div class="mx-titles"><h1>' + esc(e.title || "Hall of Fame") + "</h1>" +
      '<p class="sub">' + esc(e.pageSub || "") + "</p>" +
      "</div></div>" +
      '<p class="mx-intro">' + esc(e.intro || "") + "</p>";
    document.body.appendChild(head);

    var g = document.createElement("div");
    g.className = "mx-fame";
    // The top-level `hallOfFame` is the moons' list, kept where it has always
    // been. A second group declaring a Hall of Fame carries its own `ids`, or
    // both pages would print the same trophies -- which the audit refuses.
    (e.ids || DATA.hallOfFame).map(function (id) {
      var m = byId(id);
      return '<button class="trophy" type="button" data-moon="' + m.id + '" ' +
        'aria-label="' + esc(m.fame) + ": " + esc(m.name) + '">' + art(m.avatar) +
        '<span class="lab">' + esc(m.fame) + "</span>" +
        '<span class="who">' + esc(m.name) + "</span>" +
        '<span class="orb">Orbits: ' + esc(m.orbits) + "</span></button>";
    }).join("");
    document.body.appendChild(g);
    wireCards(g);
  }

  /* ---------- M10 : whose moon? -------------------------------------------- */
  /* Scoped to ONE group. "Whose Moon?" asks about the moons group only, so the
     Sun never appears as an answer and an asteroid is never asked as a moon.
     A future "Whose Comet?" is a second group with its own `game` extra. */
  function renderGame() {
    var e = extraOf(GROUP, "game") || {};
    var ALL = groupBodies(GROUP);
    document.title = "Ari & Dot · Solar System Explorer — " + (e.title || "Quiz");
    var LEVELS = {
      easy:   { label: "Easy", pick: function (m) { return !!m.fame; } },
      medium: { label: "Medium", pick: function (m) { return m.tier === 1; } },
      hard:   { label: "Hard", pick: function () { return true; } }
    };
    var level = "easy", pool = [], asked = [], current = null, score = 0, tries = 0;

    var wrap = document.createElement("div");
    wrap.className = "mx-game";
    wrap.innerHTML =
      '<div class="mx-head" style="padding:0"><div class="mx-titles">' +
        "<h1>" + esc(e.title || "Quiz") + "</h1>" +
        '<p class="sub">' + esc(e.pageSub || "") + "</p></div></div>" +
      '<div class="mx-levels" id="mxLevels"></div>' +
      '<div class="mx-score"><span>Right <b id="mxRight">0</b></span>' +
        '<span>Asked <b id="mxAsked">0</b></span></div>' +
      '<div class="mx-ask" id="mxAsk"></div>' +
      '<div class="mx-answers" id="mxAnswers"></div>' +
      '<p class="mx-verdict" id="mxVerdict"></p>' +
      '<button class="mx-pill" id="mxSkip" type="button">Another moon →</button>';
    document.body.appendChild(wrap);

    var levelsEl = wrap.querySelector("#mxLevels");
    levelsEl.innerHTML = Object.keys(LEVELS).map(function (k) {
      return '<button class="mx-btn" type="button" data-level="' + k + '">' +
        LEVELS[k].label + "</button>";
    }).join("");
    levelsEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-level]");
      if (!b) return;
      level = b.dataset.level; sfx.tap(); start();
    });

    function start() {
      Array.prototype.forEach.call(levelsEl.children, function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.level === level));
      });
      pool = ALL.filter(LEVELS[level].pick);
      asked = []; score = 0; tries = 0;
      next();
    }

    function next() {
      if (asked.length >= pool.length) asked = [];
      var left = pool.filter(function (m) { return asked.indexOf(m.id) < 0; });
      current = left[Math.floor(Math.random() * left.length)];
      asked.push(current.id);

      // Wrong answers are other real parents from the SAME group, so every
      // option is plausible and none of them is a different kind of thing.
      var others = [];
      ALL.forEach(function (m) {
        if (m.orbits !== current.orbits && others.indexOf(m.orbits) < 0) others.push(m.orbits);
      });
      for (var i = others.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = others[i]; others[i] = others[j]; others[j] = t;
      }
      var opts = others.slice(0, level === "easy" ? 2 : 3).concat([current.orbits]);
      for (i = opts.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        t = opts[i]; opts[i] = opts[j]; opts[j] = t;
      }

      wrap.querySelector("#mxAsk").innerHTML = art(current.avatar) +
        '<span class="q">' + esc(current.name) + "</span>" +
        (current.pron ? '<span class="pron">say it: ' + esc(current.pron) + "</span>" : "");
      wrap.querySelector("#mxAnswers").innerHTML = opts.map(function (o) {
        return '<button class="ans" type="button" data-ans="' + esc(o) + '">' +
          art(orbitKey(o)) + "<span>" + esc(o) + "</span></button>";
      }).join("");
      wrap.querySelector("#mxVerdict").textContent = "";
      speak(current);
    }

    wrap.querySelector("#mxAnswers").addEventListener("click", function (e) {
      var b = e.target.closest("[data-ans]");
      if (!b || b.disabled) return;
      var right = b.dataset.ans === current.orbits;
      tries++;
      Array.prototype.forEach.call(this.children, function (x) {
        x.disabled = true;
        if (x.dataset.ans === current.orbits) x.classList.add("right");
      });
      if (!right) b.classList.add("wrong");
      if (right) { score++; sfx.good(); } else sfx.nope();
      wrap.querySelector("#mxRight").textContent = score;
      wrap.querySelector("#mxAsked").textContent = tries;
      wrap.querySelector("#mxVerdict").innerHTML = (right ? "Yes! " : "") +
        esc(current.name) + " orbits " + esc(current.orbits) + ".<span>" +
        esc(current.factShort) + "</span>";
      setTimeout(next, right ? 1500 : 2600);
    });
    wrap.querySelector("#mxSkip").addEventListener("click", function () { sfx.tap(); next(); });
    start();
  }

  /* ---------- boot --------------------------------------------------------- */
  function boot() {
    applyCalm();
    bar();
    makeSheet();
    if (MODE === "hub") renderHub();
    else if (MODE === "family") renderFamily();
    else if (MODE === "fame") renderFame();
    else if (MODE === "game") renderGame();
  }

  Promise.all([
    fetch("data/moons.json").then(function (r) { return r.json(); }),
    fetch("data/moon-narration.json").then(function (r) { return r.json(); })
      .catch(function () { return { names: {}, says: {} }; })
  ]).then(function (r) {
    DATA = r[0]; NARR = r[1] || NARR;
    NARR.names = NARR.names || {};
    boot();
  }).catch(function (e) {
    document.body.insertAdjacentHTML("beforeend",
      '<p class="mx-intro">The world list could not be loaded. ' +
      "This page needs to be opened through a web address, not from a file. (" +
      esc(e.message) + ")</p>");
  });
})();
