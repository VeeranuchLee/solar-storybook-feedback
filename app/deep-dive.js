/* ============================================================
   Ari & Dot — the deep-dive mini-book system, and the contents overlay.

   DEEP-DIVE-SPEC.md, Phase 1A (§15). Reads `app/book-nav.js` and nothing else.

   WHAT A PAGE HAS TO DO TO OPT IN — three lines, no page-specific code:

       <link rel="stylesheet" href="app/deep-dive.css">
       <script src="app/book-nav.js"></script>
       <script src="app/deep-dive.js"></script>

   The page it is running on is read from the filename (`page-07.html` ->
   `page-07`), so a page never has to declare its own number and can never
   declare it wrongly. `data-page` on the script tag overrides that for a
   harness.

   ------------------------------------------------------------
   THE STATE MODEL, AND THE ONE FIELD THAT BREAKS QUIETLY
   ------------------------------------------------------------

   §11 asks for `currentMainPage`, `activeOverlay`, `activeDeepDiveId`,
   `deepDivePageIndex` and `deepDiveSourcePage`. All five are here, in one
   object, and every transition goes through the four functions below it.

   Three further fields route the selection menus, which a deep dive now keeps
   in its `menus` array rather than inside `pages`: `activeMenuId` is set
   exactly when a menu is on screen, `launchMenuId` names the menu whose tap
   opened the body page showing (so Close can go back to it), and
   `menuParentId` chains a menu that was itself opened from a menu.

   The book is twenty separate HTML documents, not one app shell. So
   `currentMainPage` is a real thing the document already knows, and changing it
   means a navigation. That makes `goToMainPage()` the only place a page change
   can happen, and both the contents overlay and Close go through it.

   This matters because of the rule §3 calls out as the one that breaks
   silently: closing a deep dive must return the child to the exact page that
   OPENED it — page 10 to page 10, page 16 to page 16, never page 1 and never a
   hub. There are two tempting ways to write Close that look right:

       close() { location.href = "page-01.html"; }        // a hub. No.
       close() { goToMainPage(deepDive.sourcePage); }     // the CONFIG's page.

   The second is the dangerous one. It behaves correctly for every deep dive
   that is offered from exactly one page, which is most of them, and it is wrong
   the moment a mini-book is reachable from two — the child is moved to
   someone else's page and nothing errors. So `sourcePage` in the config (where
   a deep dive belongs) and `deepDiveSourcePage` in the state (where this child
   actually opened it) are separate fields, captured at different times, and
   Close reads only the second. `moons-intro` is launched from pages 7 and 9 so
   that the difference is exercised rather than merely intended.

   State is mirrored into sessionStorage, and is NOT read back as authority.
   `currentMainPage` is re-derived from the document on every load, so a page
   the child reached by some other route — the page navigator, a bookmark, the
   back button — can never be described by a stale stored value. The mirror is
   there to be read: it is what a QC harness inspects to see the five fields
   §11 names, and what makes `deepDiveSourcePage` visible at the moment it is
   captured rather than only in its effect. An overlay deliberately does not
   survive a reload.

   ------------------------------------------------------------
   BACK IS NOT CLOSE
   ------------------------------------------------------------

   Back (top left) moves within the deep dive. Close (top right) leaves it. When
   there is nowhere inside left to go, Back is dimmed and inert rather than
   quietly behaving like Close. That is a decision, not an omission: a control
   that does one thing four times and a different thing the fifth cannot be
   learned by a six-year-old, and the book already dims Previous this way on
   page 1 rather than making it mean something else. Close is always there, in
   its own corner, in its own colour — except on a body page a menu launched,
   where Close goes back to that menu first, because the menu is still inside
   the mini-book and is the surface the child chose from. The menus count as
   "inside" for Back too: a body page's first step can reach the menu that
   opened it, and a menu opened from another menu reaches that menu.

   See `back()` for how "nowhere left to go" is worked out — it is not simply
   "the first page", because a deep dive can be entered part-way through.

   ------------------------------------------------------------
   NO SPEECH HERE
   ------------------------------------------------------------

   AUDIO-DIRECTION.md: every OS voice is an adult, Ari is a child, so
   `speechSynthesis` is a defect and not a degraded mode. Nothing in this file
   speaks. Deep-dive narration is rendered clips wired the way the pages already
   wire theirs, and that is Phase 1D.
   ============================================================ */
(function () {
  "use strict";

  var NAV = window.BOOK_NAV;
  if (!NAV) {
    console.error("[book-nav] app/book-nav.js did not load, so the contents " +
                  "overlay and every deep dive are unavailable on this page.");
    return;
  }

  /* ---------- which page is this? ---------- */
  var thisScript = document.currentScript;
  function currentPageId() {
    if (thisScript && thisScript.dataset.page) return thisScript.dataset.page;
    var file = (location.pathname.split("/").pop() || "").replace(/\.html?$/i, "");
    return /^page-\d+$/.test(file) ? file : null;
  }

  /* ---------- state (§11) ---------- */
  var STORE_KEY = "adx-book-nav";

  var state = {
    currentMainPage: currentPageId(),
    activeOverlay: null,        // null | "toc" | "deepDive"
    activeDeepDiveId: null,
    deepDivePageIndex: 0,
    deepDiveSourcePage: null,   // captured when a deep dive OPENS. See header.
    deepDiveHistory: [],        // indices visited, for Back
    activeMenuId: null,         // set exactly while a menu is on screen
    launchMenuId: null,         // the menu whose tap opened the body page showing
    menuParentId: null          // a menu opened FROM another menu (s6 from s0)
  };

  function persist() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        currentMainPage: state.currentMainPage,
        activeOverlay: state.activeOverlay,
        activeDeepDiveId: state.activeDeepDiveId,
        deepDivePageIndex: state.deepDivePageIndex,
        deepDiveSourcePage: state.deepDiveSourcePage,
        activeMenuId: state.activeMenuId,
        launchMenuId: state.launchMenuId,
        menuParentId: state.menuParentId
      }));
    } catch (e) { /* private browsing: the book still works, nothing is remembered */ }
  }

  /* ---------- config lookup ---------- */
  function deepDiveById(id) {
    var list = NAV.deepDives || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function pageMeta(id) {
    var list = NAV.pages || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  /* `?deepdive=preview` un-hides entries marked `preview: true`. Phase 1B's
     real deep dives carry no such mark and are always offered. */
  function previewOn() {
    try {
      return new URLSearchParams(location.search).get("deepdive") === "preview";
    } catch (e) { return false; }
  }
  function offeredHere(dd, pageId) {
    var from = dd.launchFrom || (dd.sourcePage ? [dd.sourcePage] : []);
    if (from.indexOf(pageId) < 0) return false;
    return dd.preview ? previewOn() : true;
  }

  /* ---------- the only place currentMainPage changes ---------- */
  function goToMainPage(pageId) {
    if (!pageId) return;
    state.currentMainPage = pageId;
    persist();
    /* Already on it — the overlay simply closes and the child is where they
       should be. Any other page is a real document navigation. */
    var here = currentPageId();
    if (pageId === here) return;
    location.href = pageId + ".html";
  }

  /* ---------- DOM scaffolding ---------- */
  var root = null, scrim = null, panel = null;
  var elBack, elClose, elTitle, elSub, elBody, elPos, elDots, elNext, elFoot;
  var lastFocus = null, inerted = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildShell() {
    if (root) return;
    root = el("div", "dd-root");

    scrim = el("div", "dd-scrim");
    scrim.hidden = true;

    panel = el("section", "dd-panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "dd-title");

    var bar = el("header", "dd-bar");
    elBack = el("button", "dd-btn dd-btn-back");
    elBack.type = "button";
    elBack.innerHTML = '<span aria-hidden="true">‹</span><span>Back</span>';

    var head = el("div", "dd-head");
    elTitle = el("h2"); elTitle.id = "dd-title";
    elSub = el("p");
    head.appendChild(elTitle); head.appendChild(elSub);

    elClose = el("button", "dd-btn dd-btn-close");
    elClose.type = "button";
    /* Says what it does, not what it is. "Close" alone leaves a child's helper
       guessing whether it closes the page, the book or the app. */
    elClose.setAttribute("aria-label", "Close. Go back to the story");
    elClose.innerHTML = '<span>Close</span><span aria-hidden="true">×</span>';

    bar.appendChild(elBack); bar.appendChild(head); bar.appendChild(elClose);

    elBody = el("div", "dd-body");

    elFoot = el("footer", "dd-foot");
    var foot = elFoot;
    elDots = el("div", "dd-dots");
    elPos = el("div", "dd-pos");
    elNext = el("button", "dd-btn dd-next");
    elNext.type = "button";
    elNext.innerHTML = '<span>Next</span><span aria-hidden="true">›</span>';
    foot.appendChild(elDots); foot.appendChild(elPos); foot.appendChild(elNext);

    panel.appendChild(bar); panel.appendChild(elBody); panel.appendChild(foot);
    root.appendChild(scrim); root.appendChild(panel);
    document.body.appendChild(root);

    elBack.addEventListener("click", back);
    elClose.addEventListener("click", closeOverlay);
    elNext.addEventListener("click", next);
    scrim.addEventListener("click", closeOverlay);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.activeOverlay) { e.preventDefault(); closeOverlay(); }
    });
    window.addEventListener("resize", sizeToStage);
    window.addEventListener("scroll", sizeToStage, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", sizeToStage);
    }
  }

  /* The overlay covers the page's own stage, CLIPPED TO THE VIEWPORT.
     Measured, never recomputed from the min()/aspect-ratio formula the pages
     use — see deep-dive.css for why that formula is not safe to copy.

     The clipping is not defensive tidying, it is the fix for something this
     found: on a 768x1024 iPad held upright, page 7's portrait rules give it a
     stage 1100px tall inside a 1024px viewport. An overlay that matched the
     stage exactly therefore put its own footer — the position counter and Next
     — 76px below the bottom of the screen, on a panel that is `position: fixed`
     and so cannot be scrolled to. The deep dive looked perfect and had no way
     forward. Intersecting with the viewport costs nothing where the stage
     already fits, which is every landscape case. */
  function sizeToStage() {
    if (!root) return;
    var doc = document.documentElement;
    var vw = doc.clientWidth, vh = doc.clientHeight;
    var stage = document.getElementById("stage");
    var box = { left: 0, top: 0, width: vw, height: vh };

    if (stage) {
      var r = stage.getBoundingClientRect();
      var left = Math.max(0, r.left), top = Math.max(0, r.top);
      var w = Math.min(vw, r.right) - left, h = Math.min(vh, r.bottom) - top;
      /* A stage scrolled almost out of view would leave a sliver of a panel.
         Below a usable size, cover the viewport instead — ugly beats unusable. */
      if (w >= 280 && h >= 280) box = { left: left, top: top, width: w, height: h };
    }

    root.style.setProperty("--dd-left", box.left + "px");
    root.style.setProperty("--dd-top", box.top + "px");
    root.style.setProperty("--dd-w", box.width + "px");
    root.style.setProperty("--dd-h", box.height + "px");

    /* The asteroid roster's scale is measured, not chosen, so it has to be
       re-measured whenever the panel changes shape — a rotated iPad is a
       different panel and a lineup fitted to the old one either overflows it
       or leaves half of it empty. See fitRoster(). */
    if (pendingFit) pendingFit();
  }

  /* Everything behind the overlay stops answering to taps and to the screen
     reader. `inert` is applied to body's other children, so the page does not
     have to name a container for us. */
  function setBackgroundInert(on) {
    if (on) {
      inerted = [];
      Array.prototype.forEach.call(document.body.children, function (c) {
        if (c === root) return;
        if (c.inert) return;              // already inert for the page's own reasons
        c.inert = true;
        inerted.push(c);
      });
    } else {
      inerted.forEach(function (c) { c.inert = false; });
      inerted = [];
    }
  }

  function showPanel(on) {
    buildShell();
    if (on) {
      lastFocus = document.activeElement;
      sizeToStage();
      scrim.hidden = false;
      panel.hidden = false;
      setBackgroundInert(true);
    } else {
      scrim.hidden = true;
      panel.hidden = true;
      setBackgroundInert(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
    }
  }

  /* ============================================================
     TOC overlay (§7.1). Card UI is allowed here, and only here.
     ============================================================ */
  function openTOC() {
    buildShell();
    state.activeOverlay = "toc";
    state.activeDeepDiveId = null;
    persist();

    elTitle.textContent = "Contents";
    elSub.textContent = "Twenty pages. Tap one to go there.";
    elClose.setAttribute("aria-label", "Close the contents");

    /* The contents is a list, not a mini-book: there is no page 2 of it, so the
       deep dive's Back / Next / position furniture is taken away rather than
       shown doing nothing. A dimmed control a child can never use still reads as
       a control, and §7.1 asks for cards and a close button, full stop. */
    elBack.hidden = true;
    elFoot.hidden = true;

    elBody.className = "dd-body toc-body";
    elBody.textContent = "";

    var here = state.currentMainPage;
    var chapters = NAV.chapters && NAV.chapters.length
      ? NAV.chapters
      : [{ id: "all", title: "", pages: (NAV.pages || []).map(function (p) { return p.number; }) }];

    chapters.forEach(function (ch) {
      if (ch.title) elBody.appendChild(el("h3", "toc-chapter", ch.title));
      var grid = el("div", "toc-grid");
      ch.pages.forEach(function (n) {
        var meta = pageMeta("page-" + String(n).padStart(2, "0"));
        if (!meta) return;
        var card = el("button", "toc-card");
        card.type = "button";
        card.dataset.target = meta.id;
        if (meta.id === here) card.dataset.current = "true";
        card.setAttribute("aria-label",
          "Page " + meta.number + ", " + meta.title +
          (meta.id === here ? ". This is the page you are on" : ""));
        card.appendChild(el("span", "toc-num", String(meta.number)));
        var txt = el("div", "toc-text");
        txt.appendChild(el("strong", null, meta.title));
        if (meta.subtitle) txt.appendChild(el("span", null, meta.subtitle));
        card.appendChild(txt);
        card.addEventListener("click", function () { jumpTo(meta.id); });
        grid.appendChild(card);
      });
      elBody.appendChild(grid);
    });

    showPanel(true);
    elClose.focus();
  }

  /* A contents card is an explicit choice by the child, which §3 allows: it
     sets currentMainPage and closes the overlay. It is not a deep-dive Close
     and must never be confused with one. */
  function jumpTo(pageId) {
    state.activeOverlay = null;
    persist();
    showPanel(false);
    goToMainPage(pageId);
  }

  /* ============================================================
     Deep dives (§8, §10, §12)
     ============================================================ */
  function openDeepDive(id, opts) {
    var dd = deepDiveById(id);
    if (!dd || !dd.pages || !dd.pages.length) {
      console.error("[book-nav] no deep dive called " + id + ", or it has no pages.");
      return;
    }
    buildShell();
    opts = opts || {};

    state.activeOverlay = "deepDive";
    state.activeDeepDiveId = id;
    /* THE CAPTURE. Where this child is right now — not dd.sourcePage. */
    state.deepDiveSourcePage = state.currentMainPage;
    state.launchMenuId = null;
    state.menuParentId = null;

    /* `opts.page` naming a body page is a deep link, and a deep-linked child
       has no launching menu: Close must promise the story, not the choices.
       Anything else — no page named, or a menu named — opens the entry menu,
       which is the surface a child lands on. */
    var at = opts.page ? indexOfPage(dd, opts.page) : -1;
    if (at >= 0) {
      state.activeMenuId = null;
      state.deepDivePageIndex = at;
      state.deepDiveHistory = [at];
      renderDeepDivePage();
    } else {
      var entry = opts.page ? menuById(dd, opts.page) : null;
      if (opts.page && !entry) {
        console.error("[book-nav] " + id + " has no page or menu called '" +
                      opts.page + "', so the entry menu is shown instead.");
      }
      if (!entry && dd.menus && dd.menus.length) entry = dd.menus[0];
      if (entry) {
        openMenu(entry.id);
      } else {
        /* A config with no menus yet still opens at its first body page. */
        state.activeMenuId = null;
        state.deepDivePageIndex = 0;
        state.deepDiveHistory = [0];
        renderDeepDivePage();
      }
    }
    persist();
    showPanel(true);
    elClose.focus();
  }

  /* -1 when the id is no page of this mini-book. Returning 0 here (the old
     behaviour) quietly turned an unmatched id into the first page, which
     cannot stand now that a target may name a menu instead. */
  function indexOfPage(dd, pageId) {
    if (!pageId) return -1;
    for (var i = 0; i < dd.pages.length; i++) if (dd.pages[i].id === pageId) return i;
    return -1;
  }

  function menuById(dd, menuId) {
    var list = (dd && dd.menus) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === menuId) return list[i];
    return null;
  }

  /* The menu that offers another menu, read out of the config: menus reach one
     another only through their targets, so the link is already in the data and
     does not need to be declared a second time. */
  function parentMenuId(dd, menuId) {
    var list = (dd && dd.menus) || [];
    for (var i = 0; i < list.length; i++) {
      var hs = list[i].hotspots || [];
      for (var j = 0; j < hs.length; j++) {
        if (hs[j].targetPage === menuId) return list[i].id;
      }
    }
    return null;
  }

  /* A menu's destinations are their own sequence. Each menu owns one
     contiguous run of `dd.pages`: the run starts at the first page that menu
     points to and ends where the next menu's run begins, or at the end of the
     array. Saturn is why: a child who entered through s6 "strange little
     moons" and tapped "Ring shapers" was shown 8 / 11, a count that reaches
     back over s0's seven pages to a menu that child never chose. The four
     little-moon pages read 1 / 4, because s6 is the surface they chose. The
     four deep dives with a single menu own the whole array as one run, so
     their numbering does not change.

     The runs are DERIVED and never declared: `dd.pages` is kept in menu order
     (book-nav.js records that promise), so a menu's first page target tells
     the engine where its run starts. A hand-written table of Saturn's
     boundaries would be a second copy of what the config already says, and
     the copy is what drifts the first time a page is inserted — the roster's
     `size` tokens were removed for exactly that kind of drift. */

  /* The config is read-only data once loaded, so each deep dive's runs are
     worked out once and kept. */
  var spanCache = {};

  /* A menu's first destination in `pages`, or -1 when every target names
     another menu. Targets that name menus are skipped: s0 points at s6, and
     s6's pages are s6's run, not s0's. */
  function menuSpanStart(dd, m) {
    var targets = (m.hotspots || []).concat(m.asteroids || []);
    for (var i = 0; i < targets.length; i++) {
      var at = indexOfPage(dd, targets[i].targetPage);
      if (at >= 0) return at;
    }
    return -1;
  }

  function menuSpans(dd) {
    if (spanCache[dd.id]) return spanCache[dd.id];
    var spans = [];
    var list = dd.menus || [];
    for (var i = 0; i < list.length; i++) {
      var start = menuSpanStart(dd, list[i]);
      /* A menu whose targets are all menus owns no run. */
      if (start < 0) continue;
      /* Runs move forward through `pages`, so a start at or behind the last
         one found means the config has broken menu order, and runs derived
         from it would number pages by a shape the menus do not have. Say so,
         and leave the numbering to the menus that did keep the order. */
      if (spans.length && start <= spans[spans.length - 1].start) {
        console.error("[book-nav] the menus of " + dd.id + " must reach a first " +
                      "page in menu order, and '" + list[i].id + "' does not, " +
                      "so its destinations are not numbered as their own run.");
        continue;
      }
      spans.push({ start: start, count: 0 });
    }
    for (var j = 0; j < spans.length; j++) {
      spans[j].count = (j + 1 < spans.length ? spans[j + 1].start : dd.pages.length) -
                       spans[j].start;
    }
    spanCache[dd.id] = spans;
    return spans;
  }

  /* The run a body page belongs to, found from the page's own index and not
     from how the child arrived: a deep link straight to s9 reads 3 / 4 with no
     dependence on launchMenuId, which keeps its own job of telling Close
     which menu to return to. A page no run covers — a config with no menus,
     or a gap before the first run — falls back to the whole array, which is
     the numbering every deep dive had before runs existed. */
  function spanForIndex(dd, index) {
    var spans = menuSpans(dd);
    for (var i = 0; i < spans.length; i++) {
      if (index >= spans[i].start && index < spans[i].start + spans[i].count) {
        return spans[i];
      }
    }
    return { start: 0, count: dd.pages.length };
  }

  /* Opening a menu is navigation, not paging: no index moves and no history
     grows. `parentId` is handed in because where the child came from is the
     caller's fact — the entry menu has no parent, a menu reached from another
     menu has that menu. */
  function openMenu(menuId, parentId) {
    var dd = deepDiveById(state.activeDeepDiveId);
    var m = menuById(dd, menuId);
    if (!m) return;
    state.activeMenuId = menuId;
    state.menuParentId = parentId || null;
    /* No body page is showing once the menu is, so nothing launched one. */
    state.launchMenuId = null;
    renderMenu(m);
  }

  /* A target names a body page or a menu, and the config carries one field for
     both, so both arrays are searched before the choice is called broken. */
  function openTarget(targetId) {
    var dd = deepDiveById(state.activeDeepDiveId);
    if (!dd || !targetId) return;
    var fromMenu = state.activeMenuId;

    var at = indexOfPage(dd, targetId);
    if (at >= 0) {
      state.activeMenuId = null;
      state.launchMenuId = fromMenu;
      state.deepDivePageIndex = at;
      /* History restarts at the chosen body, so Back unwinds this page's own
         steps and then, with none left, the menu that launched it. */
      state.deepDiveHistory = [at];
      renderDeepDivePage();
      persist();
      return;
    }

    var m = menuById(dd, targetId);
    if (m) {
      openMenu(m.id, fromMenu);
      persist();
      return;
    }
    console.error("[book-nav] target '" + targetId + "' is neither a page nor a " +
                  "menu of " + dd.id + ", so that choice goes nowhere.");
  }

  function goToDeepDivePage(index, opts) {
    var dd = deepDiveById(state.activeDeepDiveId);
    if (!dd) return;
    /* A menu is not page 0: while one is showing there is nothing for Next —
       or for a harness driving it — to step to until a body page is chosen. */
    if (state.activeMenuId) return;
    if (index < 0 || index >= dd.pages.length) return;
    /* Nor can a step cross out of the current menu's run: Next from s12 would
       walk a child into s7 and the little-moon pages without ever passing the
       s6 menu that introduces them. On a run's last page Next is inert exactly
       as it is on the mini-book's last page. */
    var here = spanForIndex(dd, state.deepDivePageIndex);
    var step = spanForIndex(dd, index);
    if (here.start !== step.start || here.count !== step.count) return;
    state.deepDivePageIndex = index;
    if (!opts || !opts.replaceHistory) state.deepDiveHistory.push(index);
    persist();
    renderDeepDivePage();
  }

  function next() {
    goToDeepDivePage(state.deepDivePageIndex + 1);
  }

  /* Back moves INSIDE the deep dive. It never leaves it — see the header.

     Two ways to move back, and both are needed. Popping the history undoes the
     jump that was actually made, which matters because a hotspot on a menu can
     skip several pages forward and "one less than the index" would not undo it.
     But a deep dive can also be ENTERED at a page — Phase 1B's "About Ceres" is
     meant to open the asteroid-belt mini-book straight at Ceres — and such a
     child has no history at all. Popping alone would leave Back dead for the
     whole mini-book and make its first pages unreachable, so with no history to
     pop, Back steps one page back instead.

     A third rung sits under both, for a body page a menu opened: with the
     history spent and the index already 0, the menu that launched the page is
     where this child actually came from, so Back returns to it. And on a menu
     opened from another menu (Saturn's s6 from s0), Back returns to that menu.

     Which leaves Back inert in exactly one situation: no history, already on
     the mini-book's first body page, no launching menu, no menu showing. There
     is genuinely nowhere inside to go. */
  function canGoBack() {
    if (state.activeMenuId) return !!state.menuParentId;
    return state.deepDiveHistory.length > 1 ||
           state.deepDivePageIndex > 0 ||
           !!state.launchMenuId;
  }

  function back() {
    if (state.activeOverlay !== "deepDive") return;
    if (state.activeMenuId) {
      if (state.menuParentId) {
        var dd = deepDiveById(state.activeDeepDiveId);
        openMenu(state.menuParentId, parentMenuId(dd, state.menuParentId));
        persist();
      }
      return;
    }
    var dd = deepDiveById(state.activeDeepDiveId);
    var p = dd && dd.pages[state.deepDivePageIndex];
    /* On an asteroid body page reached from the belt menu, Back's promise is
       "Back to belt": stepping back through Ceres, Pallas, ... is not what the
       label says, and a child who chose Vesta from the menu did not choose the
       page before it. Close already returns to the menu in this state; Back
       must do the same. Other deep dives keep their in-book paging. */
    if (p && p.layoutType === "asteroid-focus" && state.launchMenuId) {
      openMenu(state.launchMenuId, state.menuParentId);
      persist();
      return;
    }
    if (state.deepDiveHistory.length > 1) {
      state.deepDiveHistory.pop();
      state.deepDivePageIndex = state.deepDiveHistory[state.deepDiveHistory.length - 1];
    } else if (state.deepDivePageIndex > 0) {
      state.deepDivePageIndex -= 1;
      state.deepDiveHistory = [state.deepDivePageIndex];
    } else if (state.launchMenuId) {
      openMenu(state.launchMenuId, state.menuParentId);
      persist();
      return;
    } else {
      return;
    }
    persist();
    renderDeepDivePage();
  }

  /* Close LEAVES the deep dive, and returns to the page that opened it — with
     one stop first: on a body page a menu launched, Close goes back to that
     menu, which is still inside the mini-book and is the surface the child
     chose from. Escape and the scrim call this same function, so they follow
     this rule rather than one of their own. */
  function closeOverlay() {
    if (state.activeOverlay === "deepDive" && !state.activeMenuId && state.launchMenuId) {
      openMenu(state.launchMenuId, state.menuParentId);
      persist();
      return;
    }
    var wasDeepDive = state.activeOverlay === "deepDive";
    var source = state.deepDiveSourcePage;
    clearPulse();

    state.activeOverlay = null;
    state.activeDeepDiveId = null;
    state.activeMenuId = null;
    state.launchMenuId = null;
    state.menuParentId = null;
    state.deepDiveHistory = [];
    persist();
    showPanel(false);

    if (wasDeepDive && source) goToMainPage(source);
  }

  function renderDeepDivePage() {
    var dd = deepDiveById(state.activeDeepDiveId);
    if (!dd) return;
    var p = dd.pages[state.deepDivePageIndex];
    /* Counted within the menu's run, not the whole mini-book — see
       menuSpans(). The run comes from the index alone, so a deep-linked page
       numbers itself with no launching menu to ask. */
    var span = spanForIndex(dd, state.deepDivePageIndex);
    var total = span.count;
    var n = state.deepDivePageIndex - span.start + 1;

    elTitle.textContent = p.title || dd.title;
    elSub.textContent = p.subtitle || dd.title;

    /* A menu takes the page furniture away; a body page always brings it back. */
    elBack.hidden = false;
    elFoot.hidden = false;
    elNext.hidden = false;

    /* A body destination is one tap away from the belt roster. Say where Back
       goes: a six-year-old should not have to infer navigation history. */
    elBack.lastChild.textContent = p.layoutType === "asteroid-focus" ? "Back to belt" : "Back";

    var canBack = canGoBack();
    /* With nothing to unwind and no page to step back to, Back's next move is
       the menu that opened this page — say that, not "one page", and use the
       same word for the menu that Close does. Asteroid body pages name the
       belt menu explicitly because that is where the visible label says Back
       goes. */
    var asteroidBack = p.layoutType === "asteroid-focus" && state.launchMenuId;
    var backToMenu = canBack && state.launchMenuId &&
                     (asteroidBack ||
                      (state.deepDiveHistory.length <= 1 && state.deepDivePageIndex === 0));
    var backLabel = "Back. This is the first page";
    if (canBack) {
      if (asteroidBack) backLabel = "Back to the belt";
      else if (backToMenu) backLabel = "Back to the choices";
      else backLabel = "Back one page";
    }
    elBack.setAttribute("aria-disabled", canBack ? "false" : "true");
    elBack.setAttribute("aria-label", backLabel);

    /* Close keeps its promise honest: on a page a menu opened it goes back to
       that menu, not out of the mini-book, and the label says which. */
    elClose.setAttribute("aria-label", state.launchMenuId
      ? "Close. Go back to the choices"
      : "Close. Go back to the story");

    /* Next's reach is the run, so it is inert on a run's last page even when
       the mini-book carries on behind the next menu. */
    var canNext = state.deepDivePageIndex < span.start + total - 1;
    elNext.setAttribute("aria-disabled", canNext ? "false" : "true");
    elNext.setAttribute("aria-label", canNext ? "Next page" : "Next. This is the last page");

    elPos.textContent = n + " / " + total;
    elDots.textContent = "";
    for (var i = span.start; i < span.start + total; i++) {
      var d = el("span", "dd-dot");
      d.dataset.on = String(i === state.deepDivePageIndex);
      elDots.appendChild(d);
    }

    elBody.textContent = "";
    elBody.className = "dd-body" + (p.layoutType ? " dd-body-" + p.layoutType : "");
    elBody.scrollTop = 0;
    /* The outgoing page's fit closure points at nodes that have just been
       thrown away. Drop it before the new page installs its own, and drop any
       name-pill pulse with it: its timer would otherwise fire against a node
       that is no longer on screen. */
    pendingFit = null;
    clearPulse();
    renderLayout(p);
  }

  /* A menu renders through the same layout renderers a page uses — picture,
     copy, hotspots or roster — with all of the page furniture taken away: no
     dots, no x / y, no Next. The contents overlay already hides `elFoot` for
     exactly this reason ("there is no page 2 of it"), and a menu is in the
     same position: a counter over a surface you choose from would count
     something that is not a page. Back is taken away too, unless the menu was
     reached from another menu, when Back is the way back to it. */
  function renderMenu(m) {
    var dd = deepDiveById(state.activeDeepDiveId);

    elTitle.textContent = m.title || dd.title;
    elSub.textContent = m.subtitle || dd.title;

    elFoot.hidden = true;
    if (state.menuParentId) {
      elBack.hidden = false;
      elBack.lastChild.textContent = "Back";
      elBack.setAttribute("aria-disabled", "false");
      /* Names its destination, the way "Back to belt" does on an asteroid
         page, and uses the same word for the choices Close does. */
      elBack.setAttribute("aria-label", "Back to the choices");
    } else {
      elBack.hidden = true;
    }
    elClose.setAttribute("aria-label", "Close. Go back to the story");

    elBody.textContent = "";
    elBody.className = "dd-body" + (m.layoutType ? " dd-body-" + m.layoutType : "");
    elBody.scrollTop = 0;
    /* The outgoing page's fit closure points at nodes that have just been
       thrown away. Drop it before the new page installs its own, and drop any
       name-pill pulse with it: its timer would otherwise fire against a node
       that is no longer on screen. */
    pendingFit = null;
    clearPulse();
    renderLayout(m, true);
  }

  /* ---------- layout renderers (§12) ----------
     A layoutType the engine does not know still renders its words rather than
     rendering nothing: an unfinished config should look plain, not empty. */
  function renderLayout(p, isMenu) {
    /* The picture comes FIRST, above the words. "Children get images, not
       lists": our readers are six and seven, and a page that opens with five
       lines of prose and no picture is a page they turn away from. `image` is
       `{ src, alt }` and every src below points at art the book already
       publishes and already lists in `assets-manifest.json` — nothing new was
       drawn for Phase 1B and nothing new has to be precached.

       A src is always the `standard` tier. The pages swap themselves up to
       `high` with a `retier()` pass over `img[src]` at load, which cannot see
       an image the overlay creates later; and the high tier is not published
       for these folders anyway, so a swapped src would 404 into a broken
       picture instead of a moon. */
    if (p.layoutType === "asteroid-focus") {
      /* A body page carries no photograph — the drawing IS its picture, and it
         belongs above the words like every other hero. */
      renderFocus(p);
    } else if (p.image && p.image.src &&
               p.layoutType !== "overview-hotspots" &&
               p.layoutType !== "asteroid-roster") {
      var fig = el("div", "dd-hero");
      var img = document.createElement("img");
      img.src = p.image.src;
      img.alt = p.image.alt || "";
      img.decoding = "async";
      fig.appendChild(img);
      elBody.appendChild(fig);
    }

    /* EVERY DESTINATION with words gets the control, and no menu does.

       The gate used to be `asteroid-focus`, which meant the ten belt pages
       could be read aloud and the thirty moon pages could not -- not because
       anyone decided a child exploring Saturn needs less help reading than a
       child exploring the belt, but because the belt was the only deep-dive
       text that had ever reached the narration map. That was a pipeline
       accident, and gating the UI on the layout made the accident look like a
       design.

       Menus are excluded by the owner's call, and it is the same call that took
       the dots and Next off them: a menu is a routing surface, and a speaker is
       one more piece of chrome on a surface deliberately stripped. `isMenu` is
       passed in rather than inferred from the layout type, because inferring
       behaviour from the layout is the exact mistake above. */
    if (p.body) {
      if (isMenu) {
        elBody.appendChild(el("p", "dd-copy", p.body));
      } else {
        var copyRow = el("div", "dd-copy-row");
        copyRow.appendChild(el("p", "dd-copy", p.body));
        copyRow.appendChild(readAloudButton(p));
        elBody.appendChild(copyRow);
      }
    }

    switch (p.layoutType) {
      case "overview-hotspots": renderHotspots(p); break;
      case "compare":           renderCompare(p);  break;
      case "chips":             renderChips(p);    break;
      case "asteroid-roster":   renderRoster(p);   break;
      case "single-focus":
      case "asteroid-focus":
      case "diagram":
      default:                  break;
    }

    if (p.facts && p.facts.length) renderFacts(p.facts);
  }

  /* Deep dives use the page's normal narration bridge. Page 10 has already
     mapped each of these exact ten strings to licensed rendered AAC; calling
     speechSynthesis here lets that bridge play the file while preserving the
     page-wide Sound toggle and cancellation behaviour. The QA gate verifies
     that every configured string has a shipped mapping, so this never relies
     on the operating-system fallback. */
  /* WHAT THIS ACTUALLY SPEAKS, because the API's name is misleading here.

     `speechSynthesis.speak` is not the OS robot voice in this book. Every page
     carries a `window.__NARRATION` map written by tools/wire-narration.py and a
     shim that intercepts speak(), looks the exact string up in that map, and
     plays the licensed clip. The OS voice is only what happens to a string the
     map does NOT carry -- and AUDIO-DIRECTION.md calls that fallback a defect,
     not a degraded mode. So the string handed over here has to be one the host
     page's map carries, character for character.

     `narration || body` is the whole rule. The ten asteroid pages set both, to
     the same string, which is why harvesting `body` adds no duplicate and costs
     no second render. Every moon page sets only `body`, and those are the
     strings tools/extract-narration.py now lifts out of book-nav.js so that
     they reach the map at all. */
  function speakableText(p) {
    return p.narration || p.body || "";
  }

  function readAloudButton(p) {
    var text = speakableText(p);
    var b = el("button", "dd-speak");
    b.type = "button";
    b.dataset.narration = text;
    b.setAttribute("aria-label", "Read about " + (p.title || "this page"));
    b.innerHTML = '<span aria-hidden="true">🔊</span><span>Read this page</span>';
    b.addEventListener("click", function () {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = .94;
      utterance.pitch = 1.06;
      window.speechSynthesis.speak(utterance);
    });
    return b;
  }

  /* HotspotScene — a few big targets that jump to a page or a menu inside this
     mini-book. */
  function renderHotspots(p) {
    if (!p.hotspots || !p.hotspots.length) return;
    var scene = el("div", "dd-scene");
    /* On an overview the picture is the scene itself and the targets sit on
       top of it, which is exactly what deep-dive.css was written for: "when
       Phase 1B gives a deep-dive page a picture the discs sit on top of it
       unchanged". `aria-hidden` because the labels on the discs already say
       what each target is; a second description of the same thing is noise. */
    if (p.image && p.image.src) {
      var bg = document.createElement("img");
      bg.className = "dd-scene-art";
      bg.src = p.image.src;
      bg.alt = "";
      bg.setAttribute("aria-hidden", "true");
      bg.decoding = "async";
      scene.appendChild(bg);
    }
    p.hotspots.forEach(function (h) {
      var b = el("button", "dd-hotspot", h.label);
      b.type = "button";
      b.dataset.hotspot = h.id || "";
      b.setAttribute("aria-label", h.label);
      if (h.x != null && h.y != null) {
        b.style.position = "absolute";
        b.style.left = h.x + "%";
        b.style.top = h.y + "%";
        b.style.transform = "translate(-50%,-50%)";
      }
      b.addEventListener("click", function () {
        openTarget(h.targetPage);
      });
      scene.appendChild(b);
    });
    elBody.appendChild(scene);
  }

  function renderCompare(p) {
    if (!p.items || !p.items.length) return;
    var wrap = el("div", "dd-compare");
    p.items.slice(0, 5).forEach(function (it) {          // §12: 3 to 5, no more
      var box = el("div", "dd-compare-item");
      box.appendChild(el("strong", null, it.name));
      if (it.note) box.appendChild(el("span", null, it.note));
      wrap.appendChild(box);
    });
    elBody.appendChild(wrap);
  }

  /* ChipList (§10). Phase 1A shipped chips as bare labels because its only
     chip page was a list of names to read. Phase 1B needs two more things from
     the same primitive, and both are content rather than code:

       `pron`  the written pronunciation, shown UNDER the name, always.
               `2026-09-11-deep-dive-spec-amendment.md` requires it: none of
               J7's five moons has a recorded name clip, and the rule the
               Explorer already followed (`app/moon-explorer.js:77-86`) is that
               a body with no clip is silent and shows its written `pron` —
               never the OS robot voice, which AUDIO-DIRECTION.md rules out.

       `note`  the body's one-line fact, revealed when the chip is tapped.

     The reveal is the part that is a decision. A `<button>` that visibly does
     nothing when a child taps it is worse than no button: the child learns the
     control is broken and stops trying the ones that work. Phase 1D will add
     sound to this same tap; until then the tap has to pay for itself, so it
     puts the chip's fact in one panel under the row. One panel rather than ten
     expanding chips, because expanding a chip in a wrapped row reflows every
     chip after it and moves the target the child just hit.

     A chip with no `note` keeps Phase 1A's behaviour exactly: a label, and
     nothing to reveal. */
  function renderChips(p) {
    if (!p.chips || !p.chips.length) return;
    var wrap = el("div", "dd-chips");
    var anyNote = p.chips.some(function (c) { return !!c.note; });

    var note = null;
    if (anyNote) {
      note = el("div", "dd-chip-note");
      note.setAttribute("aria-live", "polite");
      note.appendChild(el("strong", null, ""));
      note.appendChild(el("span", null, "Tap a name to read about it."));
    }

    p.chips.forEach(function (c) {
      var b = el("button", "dd-chip");
      b.type = "button";
      b.appendChild(el("span", "dd-chip-name", c.label));
      if (c.pron) b.appendChild(el("span", "dd-chip-pron", "say it: " + c.pron));
      b.setAttribute("aria-label",
        c.label + (c.pron ? ". Say it: " + c.pron : "") + (c.note ? ". " + c.note : ""));
      if (c.note) {
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(wrap.children, function (o) { o.dataset.on = "false"; });
          b.dataset.on = "true";
          note.firstChild.textContent = c.label;
          note.lastChild.textContent = c.note;
        });
      }
      wrap.appendChild(b);
    });

    elBody.appendChild(wrap);
    if (note) elBody.appendChild(note);
  }

  /* ============================================================
     THE ASTEROID ROSTER, AND THE ONE THING THE ART IS NOT ALLOWED TO SAY
     ============================================================

     §7.2's entry menu is a menu of ten belt bodies. They run from Ceres at 940
     km to Gaspra at 12 km — a 78:1 spread — and the whole difficulty is that a
     menu wants ten similar buttons and the truth wants one huge rock and one
     speck. A row of ten same-sized rocks would teach a six-year-old that the
     asteroid belt is full of interchangeable pebbles, which is the single
     biggest thing it could get wrong about the belt. Our readers are
     pre-readers, so "not to scale" underneath is not available: whatever the
     art says IS what the page says.

     So the art carries the size, in two registers, and nothing else has to:

       THE SIX BIG ONES ARE DRAWN AT TRUE RELATIVE SCALE under the label
       "Real size comparison". Every one of them is `diameter_km x rk`, where
       `rk` is a single number for the whole screen. They stand on one
       baseline, largest first, so the lineup itself is the statement: Ceres
       really is drawn four times Psyche's width, because it is four times
       Psyche's width. The label (owner, 2026-09-25) says in words what the
       row already shows — and it is what lets the row give up vertical room
       on a short viewport: `rk` shrinks UNIFORMLY (the relative scale never
       changes, only the size of the picture), and the "Real size comparison"
       label keeps the honest meaning the bigger art used to carry alone.

       THE FOUR SMALL ONES SHARE ONE YELLOW-BORDERED "ZOOMED IN" PANEL
       (owner, 2026-09-24; re-titled when layout (b) arrived 2026-09-25). At
       the same `rk` Gaspra is under four pixels — too small to draw and too
       small to tap — so the four small worlds are shown enlarged together
       inside a single rectangular panel across the bottom of the menu, with
       a small yellow "Zoomed in" pill sitting on the panel's top-left
       border like a tab (polish round 2026-09-25: the magnifier is DRAWN in
       the pill — see .dd-zoom-pill-icon — not the emoji).

       THE HONESTY LIVES IN THE PICTURE AGAIN. Under each enlarged rock's name
       sits a faint circle holding that SAME asteroid drawn at the top row's
       `rk` — its true size, exactly as if it were the sixth body of the
       comparison — captioned "Actual size (same scale)". That is the round-1
       true-scale dot, brought back in a new shape (owner, 2026-09-25): the
       lens says "enlarged", the dot says "this much", at the same scale as
       the six big ones, so nobody has to read a sentence to undo the
       magnification — the dot does it in the picture. The old round lenses,
       their handles and their leader lines stay gone: the dot is a faint
       ring, not a second magnifier, and nothing runs between the four rocks
       (Lutetia, Mathilde, Ida and Gaspra are four separate worlds in no
       particular order — the 2026-09-23 handle removal settled that). The
       note that carried the honesty in round 2 ("Smaller asteroids, shown
       larger…") is gone: layout (b) restores the dots it replaced, and on a
       short landscape viewport keeping both the note and the dots and the
       owner's specified rock sizes would not fit one screen.

     HOW BIG, THEN? Each small rock is sized to a shared target height
     (ZOOM_TARGET below) that fitRoster() measures against the panel's width
     the same way it measures the belt's `rk`. In landscape the four zoomed
     rocks grow (zoomTargets() — owner 2026-09-24: "roughly 20-30%", plus the
     2026-09-25 instruction that they should read ~20-25% bigger than the
     round-1 ~96px art), and the belt row above gives up the vertical room
     instead: the panel gets taller, and `rk` shrinks, so the six big bodies
     keep their true relative scale to one another and stay fully visible.
     The owner has explicitly allowed the enlarged small ones to draw as big
     as, or bigger than, Vesta (2026-09-25) — the top row is the only place
     the picture compares sizes, and there the six are drawn honestly; the
     zoom panel makes no size claim of its own, and the tiny scale dots stop a
     child from reading one.

     WHY THE SIZE IS COMPUTED AND NOT DECLARED. An earlier draft of this config
     carried a `size` token per body (`xxl`, `lg`, `zoom`). A token beside a
     real diameter is a second copy of the same fact, and the copy is the one
     that drifts: edit `diameter_km` and the picture keeps the old size, with
     nothing failing. The tokens are gone. `app/asteroid-avatars.js` carries
     each body's `km` next to its drawing, `tools/build-asteroid-avatars.py`
     refuses to bake a body whose km is not also in its fact strip, and the
     only thing this file decides is `family` — whether a body is big enough to
     draw honestly, or small enough to need the zoom panel.

     TAP TARGETS. A rock is not a rectangle. Ida's box is 57% empty space, so a
     button drawn over its bounds would eat taps that land nowhere near it and
     steal them from its neighbour. Instead the button itself is transparent to
     the pointer and the SILHOUETTE is the target: `hit` is the same outline
     bodies.py clips the surface with, painted invisible, with a 28px
     non-scaling stroke that widens it evenly by 14px all round. The stroke is
     what makes the touch area an honest 64px: the owner's 2026-09-25 tap rule
     is 64×64 CSS px, and the smallest visible rock (Psyche, held at
     ROCK_MIN = 36px of art by `rkFloor()` below) plus 28px of stroke is
     exactly that floor. Each zoom rock holds a higher floor of its own
     (ZOOM_MIN below): the four small worlds were drawn inside 102px of glass
     in round 1, so a target smaller than that is a target that shrank. */

  var ROCK_MIN = 36;     // px of visible rock, on its shorter axis
  /* 36, down from 44 on 2026-09-25, and the tap floor is met by the HIT, not
     the art: the silhouette's 28px non-scaling stroke (was 14) adds 14px all
     round, so Psyche's 36px of visible art is a 64px touch target, which is
     the owner's 2026-09-25 rule. The art could not stay at 44 with a 14px
     stroke — that was a 58px target — and it could not stay at 44 with the
     floor raised, because layout (b)'s label, enlarged rocks and scale dots
     would not fit the 1024×768 landscape. The six bodies keep their true
     RELATIVE scale whatever this constant is; only the picture's size moves. */
  /* 8px, down from 10 on 2026-09-23. The name pills became tap targets that
     day and got wider with it, and at 768px — the iPad this book is drawn for
     — the six-body lineup then measured the panel's width to the pixel. Two
     pixels per gap is the cheapest place to buy the row some room; the
     alternative was shrinking a target a child has to hit. Must match
     .dd-roster-belt's gap. */
  var ROCK_GAP = 8;
  /* The fit searches for the largest scale whose row still fits, so without
     this it converges ON the boundary and leaves nothing for sub-pixel
     rounding: the row measured 689px inside a 687px belt and grew a scrollbar
     between the two rows — a stray horizontal line, on the exact menu the
     owner had just asked to have one removed from. */
  var ROW_SLACK = 4;     // px of room the fitted row must leave spare
  var RK_MAX = 0.42;     // px per km — past this Ceres outgrows any panel
  /* THE ZOOM PANEL'S SIZE. Each of the four small rocks is drawn at a shared
     target height — the artist's-eye size that reads as "magnified" but still
     lets all four sit cleanly in one panel — and never smaller than ZOOM_MIN.
     ZOOM_MIN is the art the round lenses showed in round 1: the glass
     measured `max(102, round(940*rk*0.40))` and the drawing inside it was 82%
     of the glass, so each world rendered at about 84–92px. A zoomed rock
     under that is a tap target that shrank, and the panel scrolls before any
     rock does. */
  var ZOOM_TARGET = 124;  // px of rock height the panel aims for (portrait)
  var ZOOM_MIN = 96;      // px of rock height the panel never goes below
  var ZOOM_GAP = 20;      // px between the four zoom cells — keep in step with .dd-roster-zoom-row
  /* The zoom panel's per-orientation sizes (owner, 2026-09-24, adjusted
     2026-09-25). Held upright the four rocks aim for ZOOM_TARGET. In
     landscape they aim larger — the 2026-09-25 instruction is that they read
     ~20-25% bigger than the round-1 ~96px art, i.e. 115–120px at 1024×768,
     and at 1180×820 the WIP's 155px was already staged and accepted — and
     fitRoster lets the belt row give up the room instead. The landscape MIN
     stays at the round-1 floor: the 2026-09-24 "growth" min of 120 could not
     fit the short landscape once layout (b) added its label, larger rocks and
     scale dots, and a floor that forces overflow is a floor that lies. Verify
     in the QC screenshots: zoomed rocks ~115-120px at 1024×768, comfortably
     ≥ the 64px tap floor, and (owner 2026-09-25) they may draw as big as or
     bigger than Vesta — the tiny scale dots carry the honesty. */
  function zoomTargets() {
    var landscape = document.documentElement.clientWidth >
                    document.documentElement.clientHeight;
    return landscape
      ? { target: Math.round(ZOOM_TARGET * 1.25),
          min:    ZOOM_MIN }
      : { target: ZOOM_TARGET, min: ZOOM_MIN };
  }
  var uidSeq = 0;

  /* Re-run after the panel is on screen and after any resize: `rk` is measured,
     and nothing can be measured while the panel is still hidden. */
  var pendingFit = null;

  function avatars() { return window.ASTEROID_AVATARS || null; }

  /* The drawing's own proportions, as multiples of the body's mean diameter.
     `sw`/`sh` are the body; `aw`/`ah` are the SVG element around it, which is
     wider for Ida because Dactyl is drawn beside her. Dividing by the
     silhouette's geometric mean is what makes `km x rk` mean the same thing for
     a round body and a long one — Ida is not credited with Vesta's width just
     for being stretched. */
  function rockFactors(key) {
    var a = avatars()[key];
    var b = a.box, f = a.full;
    var g = Math.sqrt(b[2] * b[3]) || 1;
    return { km: a.km,
             aw: f[2] / g, ah: f[3] / g,
             sw: b[2] / g, sh: b[3] / g };
  }

  /* One SVG of one body. The viewBox is the drawing's own tight box rather than
     the stock 0 0 100 100, so the element IS the rock: every avatar in
     bodies.py sits in a different amount of empty space, and at a shared
     viewBox Gaspra's 28-unit rock would render at 43% of Ceres's 64-unit one
     before any scale was applied at all. */
  function rockArt(key) {
    var a = avatars()[key];
    var uid = "ast" + (++uidSeq);
    var holder = document.createElement("div");
    holder.innerHTML =
      '<svg class="dd-rock-svg" viewBox="' + a.full.join(" ") + '" ' +
      'aria-hidden="true" focusable="false">' +
      a.svg.replace(/__U__/g, uid) +
      '<g class="dd-rock-hit">' + a.hit + "</g></svg>";
    return holder.firstChild;
  }

  function styleRock(node, f) {
    node.style.setProperty("--km", f.km);
    node.style.setProperty("--aw", f.aw.toFixed(4));
    node.style.setProperty("--ah", f.ah.toFixed(4));
    node.style.setProperty("--sw", f.sw.toFixed(4));
    node.style.setProperty("--sh", f.sh.toFixed(4));
  }

  /* The smallest scale at which every true-scale body still clears ROCK_MIN on
     its shorter axis. This is a floor and not a target: if the panel is too
     short to hold the lineup at this scale the body area scrolls, because a
     rock a child cannot reliably hit is worse than a scrollbar. The zoom rocks
     skip it — they carry their own, higher floor (ZOOM_MIN). */
  function rkFloor(items) {
    var floor = 0;
    items.forEach(function (it) {
      if (it.zoom) return;
      var f = it.f;
      floor = Math.max(floor, ROCK_MIN / (f.km * Math.min(f.sw, f.sh)));
    });
    return floor;
  }

  /* ------------------------------------------------------------
     THE NAME PILL, AND WHY IT IS A SECOND BUTTON

     Owner brief, 2026-09-23: "Tap asteroid image -> open that asteroid's
     detail page. Tap name pill / speaker area -> play audio of the asteroid's
     name only."

     That is two jobs, so it is two buttons. The pill used to be a `<span>`
     INSIDE the rock button, which made the whole thing one target with one
     meaning; a button cannot be nested in a button, so the rock and the pill
     are now siblings in a `.dd-rock-cell` wrapper. The two must not overlap:
     the rock is hit-shaped by its silhouette (see `.dd-rock-hit`) and the pill
     is a plain rectangle below it, so neither can eat the other's taps. The
     rock's shaped target is untouched by this change — the brief is explicit
     that it stays as it is.

     A PILL THAT CANNOT SPEAK IS NOT AN AUDIO CONTROL. `speechSynthesis` here
     reaches the host page's clip map, not the OS voice, but only for a string
     the map carries character for character; anything else falls through to an
     adult robot, which AUDIO-DIRECTION.md calls a defect. And a control that
     visibly offers sound and then does nothing is the same defect a child can
     see. So `nameClip()` asks the map FIRST, and a name it does not carry gets
     the old inert label back — no speaker icon, no tap target, no handler —
     rather than a button that lies. All ten belt names are mapped today; this
     is what keeps an eleventh from shipping silent.
     ------------------------------------------------------------ */

  /* The exact string the host page's map has a clip for, or null. `say` is
     separate from `name` because the pill SHOWS the name and SPEAKS a short
     sentence around it ("This asteroid is called Vesta.", owner 2026-09-24):
     a one-word render has no context and the voice guesses. */
  function nameClip(a) {
    var text = a.say || a.name || "";
    var map = window.__NARRATION;
    return (text && map && map[text]) ? text : null;
  }

  var EAR = '<svg class="dd-rock-ear" viewBox="0 0 24 24" aria-hidden="true" ' +
            'focusable="false">' +
            '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>' +
            '<path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" ' +
            'fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round"/></svg>';

  /* The pulse runs for an estimated span rather than until the clip ends,
     because the shim that plays it replaces `speechSynthesis.speak` wholesale
     and never fires the utterance's `onend` — there is no end event to listen
     for. Since 2026-09-24 the pills speak a short sentence, not a bare name,
     and the ten clips measure 1.75s to 4.91s (Ida's names Dactyl too), so one
     fixed span either cuts Ida short or holds the others for three seconds of
     silence. The span is scaled to the sentence instead: 80ms a character
     puts every clip's pulse 0.3–0.6s past its end. A second tap clears the
     first pulse, so the highlight always names the clip that is playing now. */
  var PULSE_MS_PER_CHAR = 80, PULSE_MS_MIN = 1500;
  var pulseTimer = null, pulsing = null;

  function clearPulse() {
    if (pulseTimer) { clearTimeout(pulseTimer); pulseTimer = null; }
    if (pulsing) { pulsing.dataset.playing = "false"; pulsing = null; }
  }

  function sayName(pill, text) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    clearPulse();
    /* Stops whatever is playing, including a clip the shim started, and is the
       same call the page's Mute button makes. */
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .94;
    utterance.pitch = 1.06;
    window.speechSynthesis.speak(utterance);
    pulsing = pill;
    pill.dataset.playing = "true";
    pulseTimer = setTimeout(clearPulse,
      Math.max(PULSE_MS_MIN, text.length * PULSE_MS_PER_CHAR));
  }

  /* One cell — a rock button and its name pill — for the belt row and for the
     zoom panel. `zoom` marks the four small worlds: they draw the art straight,
     with no lens and no leader line — the shared panel, its pill and the tiny
     true-scale dot do the honesty the magnifier used to do by hand — and
     carry a per-rock `--rk` written by fitRoster() so all four land on one
     target height. */
  function buildRock(a, zoom) {
    var f = rockFactors(a.key);
    var cell = el("div", "dd-rock-cell");
    var b = el("button", "dd-rock" + (zoom ? " dd-rock-zoom" : ""));
    b.type = "button";
    b.dataset.rock = a.key;
    styleRock(b, f);
    b.setAttribute("aria-label", a.name);

    b.appendChild(rockArt(a.key));

    b.addEventListener("click", function () {
      openTarget(a.targetPage);
    });
    cell.appendChild(b);

    var text = nameClip(a);
    var pill;
    if (text) {
      pill = el("button", "dd-rock-pill");
      pill.type = "button";
      pill.dataset.say = text;
      pill.setAttribute("aria-label", "Hear the name " + a.name);
      pill.appendChild(el("span", "dd-rock-pill-name", a.name));
      pill.insertAdjacentHTML("beforeend", EAR);
      pill.addEventListener("click", function () { sayName(pill, text); });
    } else {
      /* No clip for this name on this page. A label, and nothing that looks
         tappable — see the note above. */
      pill = el("span", "dd-rock-pill dd-rock-pill-mute");
      pill.appendChild(el("span", "dd-rock-pill-name", a.name));
    }
    cell.appendChild(pill);

    /* THE TRUE-SCALE DOT, ROUND 3 (owner, 2026-09-25). Under each enlarged
       rock's name: a faint ring holding that SAME body drawn at the top row's
       scene `rk` — its actual size, exactly as if it were a body of the "Real
       size comparison" above — captioned "Actual size (same scale)". The ring
       is not a second magnifier: it is a faint circle, it has no border tab
       and nothing runs between the four rocks. Purely informational —
       aria-hidden, not a tap target, never spoken (AUDIO-DIRECTION.md). It
       carries the scene's inherited `--rk` until fitRoster() writes its own,
       clamped so the tiniest dot (Gaspra, 12 km) never renders under 3px. */
    if (zoom) {
      var tiny = el("div", "dd-rock-tiny");
      tiny.setAttribute("aria-hidden", "true");
      var ring = el("span", "dd-rock-tiny-ring");
      ring.appendChild(rockArt(a.key));
      styleRock(ring.firstChild, f);
      /* Two short lines ("Actual size" / "same scale"), stacked and centred
         under the ring — the polish round (2026-09-25) replaced the single
         nowrap line: at ~8px it was unreadable, and the two-line form stays
         ≥ 13px without out-widthing the cell. */
      var tinyCap = el("div", "dd-rock-tiny-cap");
      tinyCap.appendChild(el("span", null, "Actual size"));
      tinyCap.appendChild(el("span", null, "same scale"));
      tiny.appendChild(ring);
      tiny.appendChild(tinyCap);
      cell.appendChild(tiny);
    }
    return cell;
  }

  function renderRoster(p) {
    var list = p.asteroids || [];
    if (!list.length) return;

    var scene = el("div", "dd-roster");
    if (p.image && p.image.src) {
      var bg = document.createElement("img");
      bg.className = "dd-scene-art";
      bg.src = p.image.src;
      bg.alt = "";
      bg.setAttribute("aria-hidden", "true");
      bg.decoding = "async";
      scene.appendChild(bg);
    }

    if (!avatars()) {
      /* Loud, and still navigable. A menu that silently draws ten empty boxes
         is the failure this book keeps finding late; a menu of ten names is
         plain and works. */
      console.error("[book-nav] app/asteroid-avatars.js did not load, so the " +
                    "asteroid roster has no drawings. The names still open " +
                    "their pages.");
      var plain = el("div", "dd-chips");
      list.forEach(function (a) {
        var c = el("button", "dd-chip");
        c.type = "button";
        c.appendChild(el("span", "dd-chip-name", a.name));
        c.addEventListener("click", function () {
          openTarget(a.targetPage);
        });
        plain.appendChild(c);
      });
      scene.appendChild(plain);
      elBody.appendChild(scene);
      return;
    }

    /* The head of the whole roster: the "Real size comparison" label over the
       top row, and — on the same line, top-right — the optional "Tap an
       asteroid" hint (owner, 2026-09-25: only if it fits and is not clutter).
       On-screen text only: nothing here is spoken, no __NARRATION key, no
       speechSynthesis (AUDIO-DIRECTION.md). */
    var head = el("div", "dd-roster-head");
    head.appendChild(el("span", "dd-roster-label", "Real size comparison"));
    var hint = el("span", "dd-tap-hint", "Tap an asteroid");
    hint.setAttribute("aria-hidden", "true");
    head.appendChild(hint);
    scene.appendChild(head);

    var belt = el("div", "dd-roster-belt");
    var zoom = el("div", "dd-roster-zoom");
    var zoomRow = el("div", "dd-roster-zoom-row");
    var items = [];

    list.forEach(function (a) {
      if (!avatars()[a.key]) {
        console.error("[book-nav] no drawn body for roster key '" + a.key + "'.");
        return;
      }
      var isZoom = a.family === "small";
      var node = buildRock(a, isZoom);
      items.push({ f: rockFactors(a.key), zoom: isZoom, node: node,
                   rock: node.querySelector(".dd-rock") });
      (isZoom ? zoomRow : belt).appendChild(node);
    });

    /* The shared panel's header: the large yellow "Zoomed in" pill as a tab
       on the panel's top-left edge (owner 2026-09-24, re-titled 2026-09-25;
       polish round 2026-09-25 made it a clearly readable ~20-22px label with
       the magnifier DRAWN in the pill, per the owner's mockup). The note that
       sat beside it in rounds 1-2 is gone — layout (b) restores the tiny
       true-scale dots, which carry the honesty in the picture instead (see
       buildRock), and the 1024×768 landscape cannot hold the note, the dots
       and the specified rock sizes on one screen. */
    if (zoomRow.children.length) {
      var zHead = el("div", "dd-roster-zoom-head");
      var zPill = el("span", "dd-zoom-pill");
      /* The magnifier icon, drawn (not the emoji): one crisp glyph that
         renders identically on macOS, Windows and iOS Safari, sized with the
         pill's text. currentColor paints it the pill's dark ink. */
      var zIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      zIcon.setAttribute("class", "dd-zoom-pill-icon");
      zIcon.setAttribute("viewBox", "0 0 24 24");
      zIcon.setAttribute("aria-hidden", "true");
      zIcon.setAttribute("focusable", "false");
      zIcon.innerHTML =
        '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" ' +
        'stroke-width="3.2"/><path d="M15.5 15.5 L21 21" stroke="currentColor" ' +
        'stroke-width="3.4" stroke-linecap="round"/>';
      zPill.appendChild(zIcon);
      zPill.appendChild(el("span", "dd-zoom-pill-label", "Zoomed in"));
      zHead.appendChild(zPill);
      zoom.appendChild(zHead);
      zoom.appendChild(zoomRow);
    }

    scene.appendChild(belt);
    if (zoomRow.children.length) scene.appendChild(zoom);
    elBody.appendChild(scene);

    pendingFit = function () { fitRoster(scene, belt, zoom, zoomRow, items); };
    requestAnimationFrame(pendingFit);
  }

  /* `rk` is px per km, and it is the only number the lineup needs. It is
     measured rather than chosen because the same overlay is 768px wide on the
     iPad the book is designed for and 1536px on a laptop, and a scale that
     fitted one would overflow or waste the other. */
  function fitRoster(scene, belt, zoom, zoomRow, items) {
    if (!scene.isConnected) { pendingFit = null; return; }
    var avail = belt.clientWidth;
    if (!avail) return;                     // still hidden; a later pass runs

    /* Undo the previous portrait slack distribution (if any) before
       measuring, so every pass sees the base chrome and never double-counts
       the air it added last time. The two base values must track
       .dd-roster's padding and .dd-roster-zoom's margin-top in deep-dive.css. */
    if (scene._ddDist) {
      scene.style.paddingBottom = "";
      zoom.style.marginTop = "";
      scene._ddDist = false;
    }

    var big = items.filter(function (it) { return !it.zoom; });
    var small = items.filter(function (it) { return it.zoom; });
    if (!big.length) return;
    var gaps = (big.length - 1) * ROCK_GAP;
    var floor = rkFloor(items);
    big.forEach(function (it) {
      var pill = it.node.querySelector(".dd-rock-pill");
      it.pill = pill ? pill.offsetWidth : 0;
    });

    /* THE ROW MUST NOT WRAP. The single baseline is the size statement, and a
       lineup broken across two lines stops being a comparison — the reader has
       no way to tell a rock that wrapped from a rock that is small.

       It cannot be solved in closed form, because a name pill is a fixed width
       and a rock is `km x rk`: below a certain scale the pill is the wider of
       the two and the row stops shrinking. So the largest non-wrapping scale
       is searched for instead. */
    function rowWidth(rk) {
      var w = gaps;
      for (var i = 0; i < big.length; i++) {
        w += Math.max(big[i].f.km * big[i].f.aw * rk, big[i].pill);
      }
      return w;
    }
    var rowRoom = avail - ROW_SLACK;
    var rk = RK_MAX;
    if (rowWidth(rk) > rowRoom) {
      var lo = Math.min(floor, RK_MAX), hi = RK_MAX;
      for (var k = 0; k < 24; k++) {
        var mid = (lo + hi) / 2;
        if (rowWidth(mid) <= rowRoom) lo = mid; else hi = mid;
      }
      rk = lo;
    }

    /* THE ZOOM PANEL: the same measurement for the four small rocks, carried
       over rock HEIGHT rather than `rk`, because each zoom rock is still
       `km x rk` — with its own `rk` solved so the body's height lands on the
       shared `zH`. The name pill is a fixed width either way, so below a
       certain height the rock is not the wider item and the search stops
       shrinking, exactly as it does for the belt. */
    var zs = zoomTargets();
    var zGaps = small.length > 1 ? (small.length - 1) * ZOOM_GAP : 0;
    small.forEach(function (it) {
      var pill = it.node.querySelector(".dd-rock-pill");
      it.pill = pill ? pill.offsetWidth : 0;
      it.tiny = it.node.querySelector(".dd-rock-tiny");
      it.tinyW = it.tiny ? it.tiny.offsetWidth : 0;
    });
    function zoomWidth(zH) {
      var w = zGaps;
      for (var i = 0; i < small.length; i++) {
        /* A zoom cell is the wider of its rock, its name pill and its
           "Actual size" strip — the strip's caption can out-width the pill,
           and a row that ignores that wraps instead of shrinking. */
        w += Math.max(small[i].f.aw / small[i].f.ah * zH,
                      small[i].pill, small[i].tinyW || 0);
      }
      return w;
    }
    var zRoom = (zoomRow.clientWidth || 0) - ROW_SLACK;
    var zH = zs.target;
    if (zRoom > 0 && zoomWidth(zH) > zRoom) {
      var zLo = Math.min(zs.min, zs.target), zHi = zs.target;
      for (var zi = 0; zi < 24; zi++) {
        var zMid = (zLo + zHi) / 2;
        if (zoomWidth(zMid) <= zRoom) zLo = zMid; else zHi = zMid;
      }
      zH = zLo;
    }
    /* zs.min wins last, exactly as the belt's rkFloor does: a zoomed rock
       smaller than the lens art it replaced is a target that shrank, and the
       zoom row scrolls before any rock shrinks below it. (The per-rock `--rk`
       is written at the very end, after the vertical budget below has had its
       say.) */
    zH = Math.max(zH, zs.min);

    /* Height. The two rows share ONE vertical budget and are solved together:
       the zoom row claims its target first, the belt gets the remainder, and
       the belt's floor wins last. Coupled, not sequential — a sequential
       zoom-first solve floored the zoom row at ZOOM_MIN and handed the surplus
       to the belt, which is how round 2 measured zH 96 (the floor) instead of
       the ~115–120px the owner asked for at 1024×768. Here the zoom row is
       allowed to reach its target and it is the belt that gives way, down to
       its floor and never below. `used` counts the copy above the scene and
       the body's own padding: an overflowed grid falls back to `start`, where
       that padding is real space and eats the budget. */
    var used = 0;
    Array.prototype.forEach.call(elBody.children, function (c) {
      if (c !== scene) used += c.offsetHeight + 12;
    });
    var bodyCss = getComputedStyle(elBody);
    var bodyPad = (parseFloat(bodyCss.paddingTop) || 0) +
                  (parseFloat(bodyCss.paddingBottom) || 0);
    var pillBox = big[0].node.querySelector(".dd-rock-pill");
    var pillH = pillBox ? pillBox.offsetHeight : 64;
    /* The two rows carry different fixed chrome. The belt cell is rock + pill
       (the scale dot belongs to the zoom row only), so its fixed part is
       `pillH + cell gap`. The zoom cell is rock + pill + the faint true-scale
       dot under the name, so its fixed part adds the dot's flight: the cell's
       own grid gap plus the dot's measured height. Both are measured live —
       the cells are in the DOM from first paint — and each row's height is
       exactly `chrome + rock`, so the scene divides into three measured,
       non-guessing parts. */
    var cellGap = 4;                        /* .dd-rock-cell's gap */
    var tinyGap = 4;                        /* pill → dot, same cell gap */
    var tinyH = 0;
    small.forEach(function (it) {
      if (it.tiny) tinyH = Math.max(tinyH, it.tiny.offsetHeight);
    });
    var beltChrome = pillH + cellGap;
    var zRowChrome = pillH + cellGap + tinyGap + tinyH;
    var fixedChrome = scene.offsetHeight - belt.offsetHeight -
                      zoomRow.offsetHeight;   /* the scene minus both rows */
    var vertBudget = elBody.clientHeight - bodyPad - used - fixedChrome - 8;

    /* The belt is measured live at the CSS's current rk, and its height scales
       linearly with rk — every SVG is `km x ah x rk` and the pill does not
       scale — so the belt pinned at its floor is one exact division, and the
       zoom row's cap is the budget with the floored belt already subtracted.
       The zoom floor (ZOOM_MIN) wins last: the body scrolls before a zoom rock
       shrinks under it. */
    var beltNow = belt.offsetHeight;
    var beltSvg = beltNow - beltChrome;
    var rkNow = parseFloat(getComputedStyle(scene).getPropertyValue("--rk"));
    if (!(rkNow > 0)) rkNow = 0.21;         /* the CSS fallback, first paint */
    var beltAtFloor = beltChrome + beltSvg * (floor / rkNow);
    if (beltSvg > 0 && vertBudget > 0) {
      var zCap = vertBudget - beltAtFloor - zRowChrome;
      if (zH > zCap) zH = zCap;
    }
    zH = Math.max(zH, zs.min);              /* the zoom floor wins last */

    /* THE BELT comes second: the scale that fits the budget the solved zoom
       row leaves over — again one division from one live measurement, no
       iteration, and the slack inside the SVG view boxes is already IN the
       measurement rather than missing from the estimate. The row's height at
       the solved rk is `beltChrome + beltSvg * (rk / rkNow)`, the same row the
       scene measured before, only shorter. */
    var beltMax = vertBudget - (zH + zRowChrome);
    if (beltSvg > 0 && beltMax > beltChrome) {
      var rkFit = rkNow * (beltMax - beltChrome) / beltSvg;
      if (rkFit > 0) rk = Math.min(rk, rkFit);
    }

    /* The floor wins last. A panel too small to hold the lineup at a tappable
       size scrolls the body instead of shrinking the targets: a rock a child
       cannot reliably hit is worse than a scrollbar. */
    rk = Math.max(rk, floor);

    scene.style.setProperty("--rk", rk.toFixed(5));
    /* The zoom rocks are the same measured scale, only with their OWN `rk`
       solved so each body lands on the shared `zH` — written here, after the
       vertical budget above settled zH. */
    small.forEach(function (it) {
      it.rock.style.setProperty("--rk", (zH / (it.f.km * it.f.ah)).toFixed(5));
      /* The true-scale dot under the name uses the SCENE's `rk`, so it really
         is "what the top row would draw" — floored at 3px of visible art so
         Gaspra's sub-3px dot (12 km) stays findable. `data-clamped` marks the
         one rock the floor moved, so a QA pass can see the honesty bend. */
      if (it.tiny) {
        var dot = it.tiny.querySelector(".dd-rock-svg");
        if (dot) {
          var dotMin = 3 / (it.f.km * Math.min(it.f.aw, it.f.ah));
          var dotRk = Math.max(rk, dotMin);
          dot.style.setProperty("--rk", dotRk.toFixed(5));
          if (dotRk > rk) it.tiny.dataset.clamped = "true";
        }
      }
    });

    /* ------------------------------------------------------------
       PORTRAIT ONLY: FILL THE EMPTY BANDS (owner, 2026-09-25, polish
       round: "fill the large empty bands using the height; no scrolling").

       Held upright a 1024-viewport-high body leaves a dead band above and
       below the roster — measured 375px of air on the 768x1024 iPad before
       this existed. Neither row can grow into it: the belt is width-bound
       (six true-scale rocks and their pills) and so is the zoom row (Ida &
       Dactyl is ~2:1 wide), so the air is distributed INTENTIONALLY instead:
       the zoom panel is pushed down with a larger margin-top and the scene's
       padding-bottom grows by the rest. The scene then fills the body, the
       space reads as deliberate rather than empty, and nothing scrolls.

       The numbers must track deep-dive.css: `12` is .dd-roster-zoom's base
       margin-top and `10` is .dd-roster's base padding. The reset at the top
       of this function cleared the previous distribution (scene._ddDist), so
       every pass measures the base chrome and re-distributes — the function
       is idempotent, exactly like the rest of the fit. `slack` reuses the
       vertical budget above: `vertBudget - beltH - zRowH` is the air left
       once both rows sit at their solved sizes, and the guard (portrait +
       slack > 60) keeps a near-fitting landscape-like layout untouched. */
    var beltH = belt.offsetHeight;
    var zRowH = zoomRow.offsetHeight;
    var slack = vertBudget - beltH - zRowH;
    var portrait = elBody.clientWidth < elBody.clientHeight;
    if (portrait && slack > 60) {
      var dist = Math.round(slack * 0.62);
      zoom.style.marginTop = (12 + dist) + "px";
      scene.style.paddingBottom = (10 + slack - dist) + "px";
      scene._ddDist = true;
    }
  }

  /* A body's own page. The six drawn at true scale keep it here too — one
     shared scale across all ten pages, so paging from Ceres to Gaspra is itself
     the size lesson — and the four small ones keep their lens and their dot. */
  function renderFocus(p) {
    var a = p.asteroid;
    if (!a || !avatars() || !avatars()[a.key]) {
      if (a) console.error("[book-nav] no drawn body for '" +
                           (a && a.key) + "' on its own page.");
      return;
    }
    var f = rockFactors(a.key);
    var lens = isSmall(a.key);
    var wrap = el("div", "dd-focus" + (lens ? " dd-focus-lens" : ""));
    styleRock(wrap, f);
    if (lens && f.aw / f.ah > 1.35) wrap.dataset.wide = "true";

    if (lens) {
      var glass = el("span", "dd-rock-glass");
      glass.appendChild(rockArt(a.key));
      wrap.appendChild(glass);
      var dot = el("span", "dd-rock-true");
      dot.setAttribute("aria-hidden", "true");
      wrap.appendChild(dot);
    } else {
      wrap.appendChild(rockArt(a.key));
    }
    elBody.appendChild(wrap);

    pendingFit = function () { fitFocus(wrap); };
    requestAnimationFrame(pendingFit);
  }

  /* Which side of the line a body falls on is the roster's decision, so the
     body page reads it from the roster rather than keeping its own copy. The
     roster is a menu now, so every menu is searched for it. */
  function isSmall(key) {
    var dd = deepDiveById(state.activeDeepDiveId);
    var list = (dd && dd.menus) || [];
    for (var i = 0; i < list.length; i++) {
      var rocks = list[i].asteroids || [];
      for (var j = 0; j < rocks.length; j++) {
        if (rocks[j].key === key) return rocks[j].family === "small";
      }
    }
    return false;
  }

  /* The same `rk` for every body page, derived from Ceres rather than from
     whichever body is on screen — a scale that changed per page would make all
     ten look the same size again, which is the one thing this must not do. */
  function fitFocus(wrap) {
    if (!wrap.isConnected) { pendingFit = null; return; }
    var used = 0;
    Array.prototype.forEach.call(elBody.children, function (c) {
      if (c !== wrap) used += c.offsetHeight + 12;
    });
    var room = elBody.clientHeight - used - 16;
    var rk = Math.min(room / 940, elBody.clientWidth * 0.62 / 940, RK_MAX);
    rk = Math.max(rk, ROCK_MIN / 222);      // Psyche, the smallest drawn true
    wrap.style.setProperty("--rk", rk.toFixed(5));
    wrap.style.setProperty("--glass",
      Math.max(120, Math.round(940 * rk * 0.5)) + "px");
  }

  function renderFacts(facts) {
    var strip = el("div", "dd-facts");
    facts.forEach(function (f) {
      var cell = el("div", "dd-fact");
      cell.appendChild(el("span", null, f.label));
      cell.appendChild(el("strong", null, f.value));
      strip.appendChild(cell);
    });
    elBody.appendChild(strip);
  }

  /* ============================================================
     Mount: wire what this page actually carries.
     ============================================================ */
  function mount() {
    /* The contents button, wherever a page puts one. */
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-book-nav="toc"]'),
      function (b) { b.addEventListener("click", openTOC); }
    );

    /* A deep-dive launch button, for every deep dive offered on this page.
       A page may carry its own placed button (`[data-deep-dive="<id>"]`); if it
       does not, one is appended to the page's `.actions` row so the button
       lands where the page's other calls to action already are. */
    (NAV.deepDives || []).forEach(function (dd) {
      if (!offeredHere(dd, state.currentMainPage)) return;

      /* `data-deep-dive-page="a1"` opens the mini-book AT a body page instead
         of at its entry menu. `openDeepDive` has taken `opts.page` since
         Phase 1A, and `back()` was written for exactly this case — "a deep
         dive can also be ENTERED at a page … with no history to pop, Back
         steps one page back instead" — but nothing could reach either
         declaratively. §7.2 is what
         needs it: page 10's second button says "About Ceres", so it has to land
         on Ceres. A button whose label names one thing and whose tap shows a
         different one is the kind of small lie a six-year-old notices first. */
      var placed = document.querySelectorAll('[data-deep-dive="' + dd.id + '"]');
      if (placed.length) {
        Array.prototype.forEach.call(placed, function (b) {
          var at = b.dataset.deepDivePage || null;
          b.addEventListener("click", function () { openDeepDive(dd.id, { page: at }); });
        });
        return;
      }

      var host = document.querySelector(".actions") || document.querySelector(".story");
      if (!host) return;
      var b = el("button", "dd-open", dd.launchLabel || dd.title);
      b.type = "button";
      b.dataset.deepDive = dd.id;
      b.addEventListener("click", function () { openDeepDive(dd.id); });
      host.appendChild(b);
    });

    persist();
  }

  /* Public surface. Named `BookNav` rather than `DeepDive` because the contents
     overlay is half of it, and named at all so a QC harness can read the state
     the spec describes instead of guessing at it from the DOM. */
  window.BookNav = {
    state: state,
    config: NAV,
    openTOC: openTOC,
    openDeepDive: openDeepDive,
    openMenu: openMenu,
    back: back,
    next: next,
    close: closeOverlay,
    goToMainPage: goToMainPage,
    isPreview: previewOn
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
