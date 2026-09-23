/* ============================================================
   Ari & Dot — book navigation data.

   This file is DATA ONLY. `app/deep-dive.js` is the engine that reads it, and
   it reads nothing else: a new deep dive is an entry here and no new code.
   That is the whole point of DEEP-DIVE-SPEC.md §8 — "implement deep dives as a
   general feature, not one-off special pages" — and §9, which asks for the
   config shape reproduced below.

   It is a .js file rather than .json on purpose. Every one of the twenty story
   pages is a self-contained document that opens straight from the file system
   during authoring, and `fetch()` of a sibling file fails on file:// with no
   network error a person would recognise. The pages already inline their data
   this way (page-10's SF_ROSTER is a `const` in a <script>), so a plain script
   tag defining one global matches what the book already does and has no failure
   mode to fall back from.

   TWO SHAPES LIVE HERE.

   `BOOK_NAV.pages` — the twenty main pages, for the table of contents overlay
   (§7.1). Number, title, subtitle, chapter. Nothing about art or audio: the TOC
   is navigation, not content.

   `BOOK_NAV.deepDives` — the optional mini-books (§8). Each one is:

       id          the deep dive's name, used in state and in the URL flag
       title       shown in the deep-dive title bar
       sourcePage  where it BELONGS in the book (§8's `sourcePage`)
       launchFrom  where its button is actually offered
       menus       the selection menus, OUTSIDE `pages`. `menus[0]` is the ENTRY
                   menu — the surface a child lands on when the deep dive opens
                   with no explicit page. The engine draws them without the page
                   furniture and counts them nowhere
       pages       the body pages, and only these: what the position counter
                   counts, what the dots are drawn for, what Next steps
                   through — within one menu's run of them at a time. Keep
                   `pages` in menu order: a menu's run starts at the first page
                   it points to and ends where the next menu's run begins, and
                   the engine derives every boundary from that

   `sourcePage` and `launchFrom` are deliberately separate, and this is the
   single most important line in the file. The spec's return rule (§3, §11) is
   that closing a deep dive returns the child to "the exact main page that
   launched it". An implementation that returns to `sourcePage` LOOKS correct
   and passes every test where a deep dive is offered from exactly one page —
   and then sends a child from page 9 back to page 7 the first time the same
   mini-book is offered from two places. So the config records where a deep dive
   belongs, the RUNTIME records where it was opened from, and the two are never
   the same field. `moons-intro` below is launched from two pages precisely so
   that a regression here cannot pass unnoticed.
   ============================================================ */
window.BOOK_NAV = {

  /* ---- The twenty main pages (TOC overlay, §7.1) ---- */
  chapters: [
    { id: "night",  title: "The night begins",            pages: [1, 2] },
    { id: "rocky",  title: "The Sun and the rocky worlds", pages: [3, 4, 5, 6, 7, 8, 9, 10] },
    { id: "giants", title: "The giant planets",            pages: [11, 12, 13, 14, 15, 16, 17, 18] },
    { id: "far",    title: "Far from the Sun",             pages: [19, 20] }
  ],

  pages: [
    { id: "page-01", number: 1,  title: "The Question in the Night Sky", subtitle: "Ari opens a book, and Dot wakes up" },
    { id: "page-02", number: 2,  title: "A Moving Family",               subtitle: "Everything travels around the Sun" },
    { id: "page-03", number: 3,  title: "The Sun",                       subtitle: "The star at the centre" },
    { id: "page-04", number: 4,  title: "Mercury",                       subtitle: "The smallest planet, closest to the Sun" },
    { id: "page-05", number: 5,  title: "Venus",                         subtitle: "Earth's almost-twin" },
    { id: "page-06", number: 6,  title: "Earth",                         subtitle: "The ocean planet" },
    { id: "page-07", number: 7,  title: "The Moon",                      subtitle: "Earth's partner" },
    { id: "page-08", number: 8,  title: "Mars",                          subtitle: "A world with a watery past" },
    { id: "page-09", number: 9,  title: "Phobos and Deimos",             subtitle: "Mars keeps two little moons" },
    { id: "page-10", number: 10, title: "The Asteroid Belt and Ceres",   subtitle: "Rocky worlds with room between them" },
    { id: "page-11", number: 11, title: "Jupiter",                       subtitle: "The biggest planet" },
    { id: "page-12", number: 12, title: "Jupiter's Moons",               subtitle: "Four great worlds" },
    { id: "page-13", number: 13, title: "Saturn",                        subtitle: "The planet with bright rings" },
    { id: "page-14", number: 14, title: "Titan and Enceladus",           subtitle: "Two of Saturn's moons" },
    { id: "page-15", number: 15, title: "Uranus",                        subtitle: "The planet that rolls" },
    { id: "page-16", number: 16, title: "Uranus's Literary Moons",       subtitle: "Moons named out of stories" },
    { id: "page-17", number: 17, title: "Neptune",                       subtitle: "The windiest planet" },
    { id: "page-18", number: 18, title: "Triton",                        subtitle: "Neptune's backwards moon" },
    { id: "page-19", number: 19, title: "Pluto and Charon",              subtitle: "A dwarf planet and its big moon" },
    { id: "page-20", number: 20, title: "Our Journey Continues",         subtitle: "Where to go next" }
  ],

  /* ---- Deep dives (§8) ----

     ONE entry today, and it is a preview rather than a shipped chapter.

     Phase 1A builds the system; the four deep dives the spec asks for — pages
     10, 12, 14 and 16 — are Phase 1B and 1C. So this entry exists to give the
     system something real to carry, and it carries `preview: true`, which means
     `deep-dive.js` mounts its launch button only when the page is opened with
     `?deepdive=preview`. A child opening the book sees exactly the book that is
     live today. Phase 1B's entries simply leave `preview` out.

     It is launched from two pages on purpose: see the header. Page 7 is Earth's
     Moon and page 9 is Mars's moons, so "What is a moon?" reads correctly from
     either — and neither page is one of the four the next phases will rework,
     so nothing here has to be unpicked later.

     Every layoutType the engine knows is used at least once below, so the
     preview is also the engine's own coverage: overview-hotspots, single-focus,
     compare, chips. `facts` is the FactStrip and may sit on any page. */
  deepDives: [
    {
      id: "moons-intro",
      title: "What is a moon?",
      sourcePage: "page-07",
      launchFrom: ["page-07", "page-09"],
      launchLabel: "Explore moons",
      preview: true,
      menus: [
        {
          id: "m0",
          title: "What is a moon?",
          subtitle: "Start here",
          layoutType: "overview-hotspots",
          body: "A moon travels around a planet, the way a planet travels around the Sun. Some moons are huge. Some are tiny. Tap one to look closer.",
          hotspots: [
            { id: "big",     label: "Big moons",        targetPage: "m1" },
            { id: "little",  label: "Little moons",     targetPage: "m2" },
            { id: "sidebys", label: "Side by side",     targetPage: "m3" }
          ]
        }
      ],
      pages: [
        {
          id: "m1",
          title: "Big moons",
          subtitle: "Round worlds of their own",
          layoutType: "single-focus",
          body: "The biggest moons are round, like little planets. Ganymede circles Jupiter and is the largest moon in the solar system. Titan circles Saturn and wears a thick orange sky.",
          facts: [
            { label: "Largest moon",  value: "Ganymede" },
            { label: "Thickest air",  value: "Titan" },
            { label: "Earth's moon",  value: "the Moon" }
          ]
        },
        {
          id: "m2",
          title: "Little moons",
          subtitle: "Lumpy and small",
          layoutType: "single-focus",
          body: "Small moons are not round. Gravity is too weak to pull them into a ball, so they keep the lumpy shape they started with. Mars keeps two of them: Phobos and Deimos.",
          facts: [
            { label: "Mars keeps",    value: "2 moons" },
            { label: "Bigger one",    value: "Phobos" },
            { label: "Smaller one",   value: "Deimos" }
          ]
        },
        {
          id: "m3",
          title: "Side by side",
          subtitle: "Three very different moons",
          layoutType: "compare",
          body: "Put three moons together and the difference jumps out.",
          items: [
            { name: "Ganymede", note: "The largest moon of all" },
            { name: "The Moon", note: "The one you can see tonight" },
            { name: "Phobos",   note: "A lumpy rock the size of a city" }
          ]
        },
        {
          id: "m4",
          title: "Moon names",
          subtitle: "A few to say out loud",
          layoutType: "chips",
          body: "Moons carry names from old stories. Here are some to try.",
          chips: [
            { label: "Io" }, { label: "Europa" }, { label: "Ganymede" },
            { label: "Callisto" }, { label: "Titan" }, { label: "Enceladus" },
            { label: "Miranda" }, { label: "Triton" }, { label: "Charon" },
            { label: "Phobos" }, { label: "Deimos" }
          ]
        }
      ]
    },

    /* ============================================================
       PHASE 1B — the two mini-books the spec's §15 asks for next.

       Both are DATA. Nothing below this line has a matching branch in
       `deep-dive.js`; the engine reads the same four layoutTypes it already
       read for `moons-intro`. Neither entry carries `preview`, so both are
       offered to every child the moment the page opts in.

       WHERE THE WORDS COME FROM, AND WHY IT IS NOT `moons.json`.

       The owner was explicit that `asteroid-belt` sources its knowledge from
       the EXISTING page-10 material, and `2026-09-11-deep-dive-spec-amendment.md`
       records §7.2 as deliberately un-amended for that reason. It matters
       because the two sources disagree: `moons.json` says of Vesta "One of the
       biggest asteroids in the belt, and the only one you can spot without a
       telescope", and page 10 says "One of the biggest asteroids in the belt."
       Page 10's shorter line is the one below, and page 10's is also the line
       that has a rendered child-voice clip
       (`p10-narrator-09-vesta-one-of-the-biggest-asteroids.m4a`). Taking the
       longer sentence would have put words on the page that the recorded audio
       does not say, the first time Phase 1D wires it up.

       Ceres is in no `moons.json` row at all — it is the belt's largest body
       and half of page 10's title, and the asteroid family simply does not
       have it. Every Ceres number below (940 km, about 9 hours, about 4.6
       Earth years, Occator's bright salty deposits) is page 10's own fact
       strip, carried across unchanged.

       `jupiter-moons` is the other way round: page 12 names all four Galileans
       but carries no `pron` and no one-line fact for them, so J1-J4 take
       `factShort` / `factExtra` / `pron` / `fame` from `moons.json`, which is
       what the asset inventory §3.2 says is the new material there. J7 exists
       because `2026-09-11-explorer-migration-map.md` homes Amalthea, Thebe,
       Metis, Adrastea and Himalia on it and `moons.json` is their only source
       in the repository: without J7 those five bodies have no page a child can
       reach once M1-M11 retire.

       NO AUDIO HERE. Nine asteroid clips and four moon-name clips exist and
       are unwired. §15 puts audio in Phase 1D and the engine's header says why
       `speechSynthesis` is not an acceptable stand-in, so the pages below are
       written to read correctly in silence.
       ============================================================ */

    /* ---- Page 10: the asteroid belt (§7.2) ----
       The old A0 offered four abstract topics. The owner asked for the bodies
       instead: the entry menu is a ten-body roster, and every rock opens its
       own page. The former compare and chip pages are folded into those
       body pages so a child never has to choose a category before choosing the
       asteroid they came to meet.

       These are the book's belt bodies, not the six names in the visual
       reference. Eros and Bennu stay out: both are near-Earth asteroids. */
    {
      id: "asteroid-belt",
      title: "The asteroid belt",
      sourcePage: "page-10",
      launchFrom: ["page-10"],
      launchLabel: "Explore the belt",
      menus: [
        {
          id: "a0",
          image: { src: "assets-runtime/standard/page-10/asteroid-roster-background-v1.webp", alt: "" },
          title: "Explore the Asteroid Belt",
          subtitle: "Choose one of ten worlds",
          layoutType: "asteroid-roster",
          body: "Tap an asteroid to learn more about it!",
          /* `family` is the only thing declared here, and it is an editorial
             call, not a measurement: "big" means the body is large enough to
             draw at true scale beside Ceres, "small" means it would be a few
             pixels and is shown enlarged in a magnifier instead. Every other
             number the drawing needs — the diameter that sets its size, the
             silhouette, the tap shape — comes from app/asteroid-avatars.js, so
             there is nothing here that can disagree with the picture. */
          asteroids: [
            { key: "ceres",    name: "Ceres",        family: "big",   targetPage: "a1"  },
            { key: "vesta",    name: "Vesta",        family: "big",   targetPage: "a2"  },
            { key: "pallas",   name: "Pallas",       family: "big",   targetPage: "a3"  },
            { key: "hygiea",   name: "Hygiea",       family: "big",   targetPage: "a4"  },
            { key: "juno",     name: "Juno",         family: "big",   targetPage: "a5"  },
            { key: "psyche",   name: "Psyche",       family: "big",   targetPage: "a6"  },
            { key: "lutetia",  name: "Lutetia",      family: "small", targetPage: "a7"  },
            { key: "mathilde", name: "Mathilde",     family: "small", targetPage: "a8"  },
            { key: "ida",      name: "Ida & Dactyl", family: "small", targetPage: "a9"  },
            { key: "gaspra",   name: "Gaspra",       family: "small", targetPage: "a10" }
          ]
        }
      ],
      pages: [
        {
          id: "a1",
          asteroid: { key: "ceres", name: "Ceres" },
          title: "Ceres",
          subtitle: "SEER-eez",
          layoutType: "asteroid-focus",
          body: "Ceres. The largest world in the asteroid belt.",
          narration: "Ceres. The largest world in the asteroid belt.",
          facts: [
            { label: "How wide", value: "940 km" },
            { label: "Kind", value: "dwarf planet" },
            { label: "Visitor", value: "Dawn" }
          ]
        },
        {
          id: "a2",
          asteroid: { key: "vesta", name: "Vesta" },
          title: "Vesta",
          subtitle: "VES-tuh",
          layoutType: "asteroid-focus",
          body: "Vesta. One of the biggest asteroids in the belt.",
          narration: "Vesta. One of the biggest asteroids in the belt.",
          facts: [
            { label: "How wide", value: "525 km" },
            { label: "Visitor", value: "Dawn" },
            { label: "Year", value: "2011" }
          ]
        },
        {
          id: "a3",
          asteroid: { key: "pallas", name: "Pallas" },
          title: "Pallas",
          subtitle: "PAL-us",
          layoutType: "asteroid-focus",
          body: "Pallas. Almost as big as Vesta, on a steeply tilted path.",
          narration: "Pallas. Almost as big as Vesta, on a steeply tilted path.",
          facts: [
            { label: "How wide", value: "513 km" },
            { label: "Closest view", value: "from Earth" },
            { label: "Surface", value: "heavily cratered" }
          ]
        },
        {
          id: "a4",
          asteroid: { key: "hygiea", name: "Hygiea" },
          title: "Hygiea",
          subtitle: "hy-JEE-uh",
          layoutType: "asteroid-focus",
          body: "Hygiea. A dark world, and rounder than anyone expected.",
          narration: "Hygiea. A dark world, and rounder than anyone expected.",
          facts: [
            { label: "How wide", value: "434 km" },
            { label: "Closest view", value: "from Earth" },
            { label: "Shape", value: "nearly round" }
          ]
        },
        {
          id: "a5",
          asteroid: { key: "juno", name: "Juno" },
          title: "Juno",
          subtitle: "JOO-noh",
          layoutType: "asteroid-focus",
          body: "Juno. A stony asteroid with a big bite taken out of one side.",
          narration: "Juno. A stony asteroid with a big bite taken out of one side.",
          facts: [
            { label: "How wide", value: "247 km" },
            { label: "Closest view", value: "from Earth" },
            { label: "Found", value: "1804" }
          ]
        },
        {
          id: "a6",
          asteroid: { key: "psyche", name: "Psyche" },
          title: "Psyche",
          subtitle: "SY-kee",
          layoutType: "asteroid-focus",
          body: "Psyche. A metal-rich world no spacecraft has reached yet.",
          narration: "Psyche. A metal-rich world no spacecraft has reached yet.",
          facts: [
            { label: "How wide", value: "222 km" },
            { label: "Known from", value: "radar" },
            { label: "Next visitor", value: "Psyche" }
          ]
        },
        {
          id: "a7",
          asteroid: { key: "lutetia", name: "Lutetia" },
          title: "Lutetia",
          subtitle: "loo-TEE-shuh",
          layoutType: "asteroid-focus",
          body: "Lutetia. Rosetta flew past and found a battered, grooved surface.",
          narration: "Lutetia. Rosetta flew past and found a battered, grooved surface.",
          facts: [
            { label: "How wide", value: "100 km" },
            { label: "Visitor", value: "Rosetta" },
            { label: "Year", value: "2010" }
          ]
        },
        {
          id: "a8",
          asteroid: { key: "mathilde", name: "Mathilde" },
          title: "Mathilde",
          subtitle: "muh-TIL-duh",
          layoutType: "asteroid-focus",
          body: "Mathilde. So dark it is like coal, with craters nearly as wide as itself.",
          narration: "Mathilde. So dark it is like coal, with craters nearly as wide as itself.",
          facts: [
            { label: "How wide", value: "53 km" },
            { label: "Visitor", value: "NEAR" },
            { label: "Year", value: "1997" }
          ]
        },
        {
          id: "a9",
          asteroid: { key: "ida", name: "Ida & Dactyl" },
          title: "Ida & Dactyl",
          subtitle: "EYE-duh and DAK-til",
          layoutType: "asteroid-focus",
          body: "Ida. This long, lumpy asteroid has its own tiny moon, called Dactyl.",
          narration: "Ida. This long, lumpy asteroid has its own tiny moon, called Dactyl.",
          facts: [
            { label: "Ida is", value: "31 km wide" },
            { label: "Visitor", value: "Galileo" },
            { label: "Year", value: "1993" }
          ]
        },
        {
          id: "a10",
          asteroid: { key: "gaspra", name: "Gaspra" },
          title: "Gaspra",
          subtitle: "GAS-pruh",
          layoutType: "asteroid-focus",
          body: "Gaspra. The first asteroid a spacecraft ever visited up close.",
          narration: "Gaspra. The first asteroid a spacecraft ever visited up close.",
          facts: [
            { label: "How wide", value: "12 km" },
            { label: "Visitor", value: "Galileo" },
            { label: "Year", value: "1991" }
          ]
        }
      ]
    },

    /* ---- Page 12: Jupiter's moons (§7.3, plus J7 from the amendment) ----
       J0 · J1 Io · J2 Europa · J3 Ganymede · J4 Callisto · J5 compare · J7.
       J6 (tap-and-hear) is the one page §7.3 marks optional, and the amendment
       says J7 simply follows J5 when J6 is not built. It is not built here:
       every one of these four names carries its `pron` on its own page
       already, and a tenth page of the same four names would be repetition
       rather than a lesson. The four name clips it would need are recorded and
       unwired, which is Phase 1D's job either way. */
    {
      id: "jupiter-moons",
      title: "Jupiter's moons",
      sourcePage: "page-12",
      launchFrom: ["page-12"],
      launchLabel: "Explore the moons",
      menus: [
        {
          id: "j0",
          image: { src: "assets-runtime/standard/page-12/galilean-moons-group-v1.webp", alt: "Io, Europa, Ganymede and Callisto together" },
          title: "Jupiter's four great moons",
          subtitle: "Galileo saw them first",
          layoutType: "overview-hotspots",
          body: "Jupiter has four large moons that Galileo saw through a telescope four hundred years ago, and they are all completely different from each other. Tap one to look closer.",
          hotspots: [
            { id: "io",       label: "Io",       targetPage: "j1" },
            { id: "europa",   label: "Europa",   targetPage: "j2" },
            { id: "ganymede", label: "Ganymede", targetPage: "j3" },
            { id: "callisto", label: "Callisto", targetPage: "j4" }
          ]
        }
      ],
      pages: [
        {
          id: "j1",
          image: { src: "assets-runtime/standard/page-12/io-hero-v1.webp", alt: "Io, yellow and volcanic" },
          title: "Io",
          subtitle: "say it: EYE-oh",
          layoutType: "single-focus",
          body: "The volcano moon. More volcanoes than anywhere else in the solar system. Jupiter squeezes and stretches Io as it goes round, and all that squeezing makes the inside hot. Some of its volcanoes throw material hundreds of kilometres up.",
          facts: [
            { label: "Famous for", value: "Volcano moon" },
            { label: "Orbits",     value: "Jupiter" }
          ]
        },
        {
          id: "j2",
          image: { src: "assets-runtime/standard/page-12/europa-hero-v1.webp", alt: "Europa, pale and crossed by reddish cracks" },
          title: "Europa",
          subtitle: "say it: yoo-ROH-puh",
          layoutType: "single-focus",
          body: "A shell of ice with an ocean of water underneath it. The cracks all over Europa are in its ice. Underneath there is thought to be more liquid water than in all the oceans of Earth put together.",
          facts: [
            { label: "Famous for", value: "Ocean under the ice" },
            { label: "Orbits",     value: "Jupiter" }
          ]
        },
        {
          id: "j3",
          image: { src: "assets-runtime/standard/page-12/ganymede-hero-v1.webp", alt: "Ganymede, large with grooved terrain" },
          title: "Ganymede",
          subtitle: "say it: GAN-ih-meed",
          layoutType: "single-focus",
          body: "The biggest moon in the solar system — bigger than the planet Mercury. Ganymede is the only moon known to make its own magnetic field, and it has a salty ocean deep inside as well.",
          facts: [
            { label: "Famous for", value: "Biggest moon of all" },
            { label: "Orbits",     value: "Jupiter" }
          ]
        },
        {
          id: "j4",
          image: { src: "assets-runtime/standard/page-12/callisto-hero-v1.webp", alt: "Callisto, dark and densely cratered" },
          title: "Callisto",
          subtitle: "say it: kuh-LIS-toh",
          layoutType: "single-focus",
          body: "The most cratered world we know of. Nothing has smoothed it over. Callisto's surface is so old and so battered that it is almost solid craters. Nothing has happened there to rub them out.",
          facts: [
            { label: "Famous for", value: "Craters everywhere" },
            { label: "Orbits",     value: "Jupiter" }
          ]
        },
        {
          id: "j5",
          image: { src: "assets-runtime/standard/page-12/galilean-moons-group-v1.webp", alt: "Io, Europa, Ganymede and Callisto together" },
          title: "Four moons, four different worlds",
          subtitle: "Side by side",
          layoutType: "compare",
          body: "Four moons going round the same planet, and not one of them is like another.",
          items: [
            { name: "Io",       note: "Volcanic" },
            { name: "Europa",   note: "Icy, with an ocean" },
            { name: "Ganymede", note: "The largest" },
            { name: "Callisto", note: "Ancient and cratered" }
          ]
        },
        {
          id: "j7",
          title: "Jupiter's other little moons",
          subtitle: "Five more, close in and far out",
          layoutType: "chips",
          body: "The four great moons are not the only ones. Tap a name to meet a smaller moon.",
          chips: [
            { label: "Amalthea", pron: "am-al-THEE-uh", note: "The reddest thing in the solar system." },
            { label: "Thebe",    pron: "THEE-bee",      note: "Its dust makes one of Jupiter's faint rings." },
            { label: "Metis",    pron: "MEE-tiss",      note: "The closest moon to Jupiter of them all." },
            { label: "Adrastea", pron: "ad-ruh-STEE-uh", note: "Tiny, and inside Jupiter's faint ring." },
            { label: "Himalia",  pron: "hih-MAY-lee-uh", note: "The biggest of Jupiter's far-out, dark little moons." }
          ]
        }
      ]
    },

    /* ---- Phase 1C: Saturn's moons (§7.4 plus amendment 1) ---- */
    {
      id: "saturn-moons",
      title: "Saturn's moons",
      sourcePage: "page-14",
      launchFrom: ["page-14"],
      launchLabel: "Explore the moons",
      menus: [
        {
          id: "s0",
          image: { src: "assets-runtime/standard/page-14/saturn-limb-page14-v1.webp", alt: "Saturn beyond its moons" },
          title: "Saturn's many moons",
          subtitle: "A family of very different worlds",
          layoutType: "overview-hotspots",
          body: "Saturn has many moons, and they are very different from one another. Some are large round worlds. Others are tiny moons that shape the rings. Tap a path to begin.",
          hotspots: [
            { id: "titan", label: "Titan", targetPage: "s1" },
            { id: "enceladus", label: "Enceladus", targetPage: "s2" },
            { id: "major", label: "More big moons", targetPage: "s3" },
            { id: "strange", label: "Strange little moons", targetPage: "s6" }
          ]
        },
        {
          id: "s6",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/saturn-small-moons-rings-scene-v1.webp", alt: "Small icy moons moving among Saturn's rings" },
          title: "Saturn's strange little moons",
          subtitle: "Eight small moons, each one odd",
          layoutType: "overview-hotspots",
          body: "These moons are small, and every single one of them is odd. Some are shaped like pasta. Two of them swap places. Choose a group to look closer.",
          hotspots: [
            { id: "ravioli", label: "Ring shapers", targetPage: "s7" },
            { id: "sheepdogs", label: "Two sheepdogs", targetPage: "s8" },
            { id: "swap", label: "Swap moons", targetPage: "s9" },
            { id: "phoebe", label: "Far-out Phoebe", targetPage: "s10" }
          ]
        }
      ],
      pages: [
        {
          id: "s1",
          image: { src: "assets-runtime/standard/page-14/titan-hero-v1.webp", alt: "Titan wrapped in thick orange air" },
          title: "Titan",
          subtitle: "say it: TY-tun",
          layoutType: "single-focus",
          body: "Thick orange air, with rivers, lakes and seas on the ground. Titan is the only moon with a proper atmosphere. It rains there — but the rain is methane, because Titan is far too cold for water to be liquid.",
          facts: [
            { label: "Famous for", value: "Thick air, and rain" },
            { label: "Orbits", value: "Saturn" }
          ]
        },
        {
          id: "s2",
          image: { src: "assets-runtime/standard/page-14/enceladus-water-plume-v1.webp", alt: "Jets rising from icy Enceladus" },
          title: "Enceladus",
          subtitle: "say it: en-SELL-uh-dus",
          layoutType: "single-focus",
          body: "Enceladus sprays jets of salty water into space from cracks at its south pole. The spray comes from an ocean under the ice, and some of it becomes part of one of Saturn's rings.",
          facts: [
            { label: "Famous for", value: "Sprays icy jets" },
            { label: "Orbits", value: "Saturn" }
          ]
        },
        {
          id: "s3",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/mimas-herschel-hero-v1.webp", alt: "Mimas with the enormous Herschel crater" },
          title: "Mimas",
          subtitle: "say it: MY-muss",
          layoutType: "single-focus",
          body: "One crater takes up nearly a third of Mimas. The crater is called Herschel, and whatever hit Mimas very nearly broke it apart. Cracks from the impact still cross the far side.",
          facts: [{ label: "Famous for", value: "One giant crater" }]
        },
        {
          id: "s4",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/iapetus-two-tone-ridge-hero-v1.webp", alt: "Iapetus with one dark side, one bright side and a ridge around its middle" },
          title: "Iapetus",
          subtitle: "say it: eye-AP-uh-tus",
          layoutType: "single-focus",
          body: "One side of Iapetus is dark as tar, and the other is bright as snow. It also has a ridge of mountains running right around its middle, like a walnut.",
          facts: [{ label: "Famous for", value: "Two different sides" }]
        },
        {
          id: "s5",
          image: { src: "assets-runtime/standard/page-14/titan-enceladus-space-background-v1.webp", alt: "Saturn's moon family in space" },
          title: "Four very different Saturn moons",
          subtitle: "Side by side",
          layoutType: "compare",
          body: "Four moons circle the same planet, but each one tells a different story.",
          items: [
            { name: "Titan", note: "Thick air, rain and lakes" },
            { name: "Enceladus", note: "Icy jets from an ocean" },
            { name: "Mimas", note: "One enormous crater" },
            { name: "Iapetus", note: "One dark side and one bright side" }
          ]
        },
        {
          id: "s11",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/hyperion-tumbling-hero-v1.webp", alt: "Irregular, deeply pitted Hyperion tumbling" },
          title: "Hyperion",
          subtitle: "say it: hy-PEER-ee-on",
          layoutType: "single-focus",
          body: "Hyperion is full of holes, like a sponge, and it tumbles instead of spinning steadily. Its tumbling is so unpredictable that nobody can say which way it will face next month.",
          facts: [{ label: "Famous for", value: "Tumbling like a sponge" }]
        },
        {
          id: "s12",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/rhea-dione-tethys-group-hero-v1.webp", alt: "Rhea, Dione and Tethys side by side" },
          title: "Saturn's other big moons",
          subtitle: "Three icy worlds",
          layoutType: "compare",
          body: "Rhea, Dione and Tethys are large icy moons covered with signs of a long history.",
          items: [
            { name: "Rhea", note: "REE-uh — Saturn's second-biggest moon, icy and heavily cratered." },
            { name: "Dione", note: "dy-OH-nee — bright streaks that are cliffs of ice." },
            { name: "Tethys", note: "TEE-thiss — a huge crater and a canyon most of the way around it." }
          ]
        },
        {
          id: "s7",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/pan-atlas-daphnis-group-hero-v1.webp", alt: "Pan, Atlas and Daphnis with their unusual equatorial ridges" },
          title: "The ravioli moons",
          subtitle: "Three moons that shape the rings",
          layoutType: "compare",
          body: "Tiny moons can push and sweep Saturn's ring material into surprising shapes.",
          items: [
            { name: "Pan", note: "PAN — shaped like a ravioli, with a ridge of ring material." },
            { name: "Atlas", note: "AT-lus — even flatter than Pan, like a tiny flying saucer." },
            { name: "Daphnis", note: "DAF-nis — flies down a ring gap and makes waves in its edges." }
          ],
          facts: [{ label: "Famous for", value: "The ravioli moon" }]
        },
        {
          id: "s8",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/prometheus-pandora-f-ring-hero-v1.webp", alt: "Prometheus and Pandora on opposite sides of Saturn's thin F ring" },
          title: "The two sheepdogs",
          subtitle: "Herding Saturn's thin F ring",
          layoutType: "compare",
          body: "Prometheus and Pandora travel on opposite sides of Saturn's thin F ring. Their gravity helps herd the ring material and keep it in line.",
          items: [
            { name: "Prometheus", note: "pro-MEE-thee-us — works along one side of the ring." },
            { name: "Pandora", note: "pan-DOR-uh — works along the other side." }
          ]
        },
        {
          id: "s9",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/janus-epimetheus-orbit-swap-hero-v1.webp", alt: "Janus and Epimetheus exchanging close paths around Saturn" },
          title: "The moons that swap places",
          subtitle: "Janus and Epimetheus",
          layoutType: "compare",
          body: "Janus and Epimetheus travel on almost the same path. Every four years they tug on each other and trade places without ever touching.",
          items: [
            { name: "Janus", note: "JAY-nus — one half of the orbital swap." },
            { name: "Epimetheus", note: "ep-ih-MEE-thee-us — the other half of the swap." }
          ],
          facts: [{ label: "Famous for", value: "Swapping orbits" }]
        },
        {
          id: "s10",
          image: { src: "assets-runtime/standard/page-14/deep-dive-moons/phoebe-retrograde-hero-v1.webp", alt: "Dark distant Phoebe on its backward path around Saturn" },
          title: "Phoebe",
          subtitle: "say it: FEE-bee",
          layoutType: "single-focus",
          body: "Phoebe is dark, far from Saturn, and travels around the planet backwards compared with Saturn's large moons. Its backward path is evidence that Saturn captured it long ago.",
          facts: [{ label: "Famous for", value: "A far-out backward path" }]
        }
      ]
    },

    /* ---- Phase 1C: Uranus's moons (§7.5 plus amendment 2) ---- */
    {
      id: "uranus-moons",
      title: "Uranus's moons",
      sourcePage: "page-16",
      launchFrom: ["page-16"],
      launchLabel: "Explore the moons",
      menus: [
        {
          id: "u0",
          image: { src: "assets-runtime/standard/page-16/uranus-distant-limb-v1.webp", alt: "Uranus beside its five major moons" },
          title: "Five moons, five stories",
          subtitle: "Uranus's major moons",
          layoutType: "overview-hotspots",
          body: "Uranus has five major moons. Their names come from literature, and every moon has a different icy surface. Tap one to look closer.",
          hotspots: [
            { id: "miranda", label: "Miranda", targetPage: "u1" },
            { id: "ariel", label: "Ariel", targetPage: "u2" },
            { id: "umbriel", label: "Umbriel", targetPage: "u3" },
            { id: "titania", label: "Titania", targetPage: "u4" },
            { id: "oberon", label: "Oberon", targetPage: "u5" }
          ]
        }
      ],
      pages: [
        {
          id: "u1",
          image: { src: "assets-runtime/standard/page-16/miranda-patchwork-closeup-v1.webp", alt: "Miranda's patchwork cliffs" },
          title: "Miranda",
          subtitle: "say it: mih-RAN-duh",
          layoutType: "single-focus",
          body: "Miranda is a patchwork world with the tallest cliff we know of anywhere. Verona Rupes rises twenty kilometres, and the surface looks as though several different worlds were stuck together.",
          facts: [{ label: "Famous for", value: "The patchwork moon" }]
        },
        {
          id: "u2",
          image: { src: "assets-runtime/standard/page-16/ariel-canyons-closeup-v1.webp", alt: "Ariel's bright fault valleys" },
          title: "Ariel",
          subtitle: "say it: AIR-ee-el",
          layoutType: "single-focus",
          body: "Ariel is the brightest of Uranus's moons. Long fault valleys cut across its icy surface.",
          facts: [{ label: "Surface", value: "Bright, faulted ice" }]
        },
        {
          id: "u3",
          image: { src: "assets-runtime/standard/page-16/umbriel-bright-ring-closeup-v1.webp", alt: "Umbriel's dark surface and bright ring" },
          title: "Umbriel",
          subtitle: "say it: UM-bree-el",
          layoutType: "single-focus",
          body: "Umbriel is the darkest of the five major moons. Its ancient surface holds one bright ring-shaped feature that nobody can explain.",
          facts: [{ label: "Surface", value: "Dark and ancient" }]
        },
        {
          id: "u4",
          image: { src: "assets-runtime/standard/page-16/titania-rift-valley-closeup-v1.webp", alt: "Titania's long rift valleys" },
          title: "Titania",
          subtitle: "say it: ty-TAH-nee-uh",
          layoutType: "single-focus",
          body: "Titania is the biggest moon of Uranus. Long rift valleys cross its icy crust.",
          facts: [{ label: "Famous for", value: "Largest major moon" }]
        },
        {
          id: "u5",
          image: { src: "assets-runtime/standard/page-16/oberon-crater-closeup-v1.webp", alt: "Oberon's ancient craters" },
          title: "Oberon",
          subtitle: "say it: OH-ber-on",
          layoutType: "single-focus",
          body: "Oberon is the outermost of Uranus's five major moons. Its old surface is covered in craters, with dark material on some crater floors.",
          facts: [{ label: "Surface", value: "Old and cratered" }]
        },
        {
          id: "u6",
          title: "More literary names",
          subtitle: "Ten small moons close to Uranus",
          layoutType: "chips",
          body: "These small inner moons also carry names from stories and poems. Tap a name to read how to say it.",
          chips: [
            { label: "Puck", pron: "PUK", note: "A small dark moon inside the big five." },
            { label: "Cordelia", pron: "cor-DEEL-yuh", note: "The closest moon to Uranus." },
            { label: "Ophelia", pron: "oh-FEE-lee-uh", note: "Herds a narrow ring with Cordelia." },
            { label: "Juliet", pron: "JOO-lee-et", note: "Long rather than round." },
            { label: "Portia", pron: "POR-shuh", note: "One of the larger small inner moons." },
            { label: "Mab", pron: "MAB", note: "Tiny, with a faint dusty ring of its own." },
            { label: "Cressida", pron: "KRESS-ih-duh", note: "One of a crowd of small moons close in." },
            { label: "Desdemona", pron: "dez-duh-MOH-nuh", note: "A small inner moon on a crowded path." },
            { label: "Rosalind", pron: "ROZ-uh-lind", note: "Named after a heroine who runs away to the forest." },
            { label: "Belinda", pron: "beh-LIN-duh", note: "Named from a poem rather than a play." }
          ]
        },
        {
          id: "u9",
          image: { src: "assets-runtime/standard/page-16/deep-dive-moons/uranus-irregular-moons-group-hero-v1.webp", alt: "Four distant dark moons on backward paths around Uranus" },
          title: "The far ones that go backwards",
          subtitle: "Four distant captured moons",
          layoutType: "compare",
          body: "These four moons travel far from Uranus and go around it backwards. Their unusual paths tell us that Uranus captured them.",
          items: [
            { name: "Caliban", note: "KAL-ih-ban — far out and dark." },
            { name: "Sycorax", note: "SIK-or-ax — the biggest and reddest of the four." },
            { name: "Prospero", note: "PROSS-per-oh — a small dark moon a very long way out." },
            { name: "Setebos", note: "SET-eh-bos — another distant backward moon." }
          ]
        },
        {
          id: "u7",
          image: { src: "assets-runtime/standard/page-16/uranian-moons-space-background-v1.webp", alt: "Uranus's five major moons compared" },
          title: "Compare their sizes",
          subtitle: "Five moons, from small to large",
          layoutType: "compare",
          body: "Titania is the largest. Oberon is close behind. Ariel and Umbriel are similar in size, while Miranda is less than half as wide as either one.",
          items: [
            { name: "Miranda", note: "The smallest major moon" },
            { name: "Ariel", note: "Similar in size to Umbriel" },
            { name: "Umbriel", note: "Similar in size to Ariel" },
            { name: "Titania", note: "The largest" },
            { name: "Oberon", note: "The second largest" }
          ]
        },
        {
          id: "u8",
          image: { src: "assets-runtime/standard/page-16/dot-voyager-images-study-v1.webp", alt: "Dot studying images from Voyager 2" },
          title: "Voyager views",
          subtitle: "One brief visit in 1986",
          layoutType: "single-focus",
          body: "Voyager 2 photographed all five major moons during its Uranus flyby in January 1986. Those pictures revealed Miranda's patchwork cliffs, Ariel's valleys, Umbriel's bright ring, Titania's rifts and Oberon's craters.",
          facts: [{ label: "Spacecraft", value: "Voyager 2" }, { label: "Flyby", value: "January 1986" }]
        }
      ]
    }
  ]
};
