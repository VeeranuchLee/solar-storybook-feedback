/* ==========================================================================
   Ari & Dot Book 1 — Moon Explorer: the nine hero-moon interactions
   --------------------------------------------------------------------------
   The owner's rule: only hero moons get an interaction, and it has to show the
   thing the moon is famous FOR. A card that merely wiggles is not one of these.

   Each entry is { button, cap, svg }. The runtime drops the svg into the detail
   sheet when the child asks for it, so nothing here animates until it is wanted.
   Motion is SMIL, which the story pages already use for their fact icons, and
   the runtime calls pauseAnimations() when Calm mode is on.
   ========================================================================== */
window.MX_LAB = {

  /* Io — the volcanoes, and why it has them ------------------------------- */
  volcano: {
    button: "🌋 Watch a volcano go",
    cap: "Jupiter squeezes Io as it goes round, and the squeezing keeps the inside hot.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="A volcano erupting on Io">' +
      '<circle cx="150" cy="180" r="112" fill="#f2d24e"/>' +
      '<circle cx="96" cy="96" r="9" fill="#c2762c"/><circle cx="214" cy="104" r="7" fill="#c2762c"/>' +
      '<circle cx="150" cy="126" r="11" fill="#a8552a"/>' +
      '<g><ellipse cx="150" cy="72" rx="6" ry="4" fill="#ffe9a8">' +
        '<animate attributeName="ry" values="4;46;4" dur="3.2s" repeatCount="indefinite"/>' +
        '<animate attributeName="rx" values="6;54;6" dur="3.2s" repeatCount="indefinite"/>' +
        '<animate attributeName="cy" values="72;34;72" dur="3.2s" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;.85;0" dur="3.2s" repeatCount="indefinite"/>' +
      "</ellipse></g>" +
      '<g fill="#fff6d0"><circle cx="150" cy="66" r="3"><animate attributeName="cy" values="66;16" ' +
        'dur="3.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" ' +
        'dur="3.2s" repeatCount="indefinite"/></circle>' +
      '<circle cx="130" cy="68" r="2.4"><animate attributeName="cy" values="68;26" dur="3.2s" ' +
        'begin="0.3s" repeatCount="indefinite"/><animate attributeName="cx" values="130;104" ' +
        'dur="3.2s" begin="0.3s" repeatCount="indefinite"/><animate attributeName="opacity" ' +
        'values="1;0" dur="3.2s" begin="0.3s" repeatCount="indefinite"/></circle>' +
      '<circle cx="170" cy="68" r="2.4"><animate attributeName="cy" values="68;26" dur="3.2s" ' +
        'begin="0.55s" repeatCount="indefinite"/><animate attributeName="cx" values="170;196" ' +
        'dur="3.2s" begin="0.55s" repeatCount="indefinite"/><animate attributeName="opacity" ' +
        'values="1;0" dur="3.2s" begin="0.55s" repeatCount="indefinite"/></circle></g>' +
      '<path d="M132 76q18-16 36 0z" fill="#8c3f22"/></svg>'
  },

  /* Europa — the ocean under the ice --------------------------------------- */
  ocean: {
    button: "🧊 Look under the ice",
    cap: "The cracks are in the ice. The water is underneath, and there is more of it than in every ocean on Earth.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="A slice through Europa">' +
      '<defs><clipPath id="mxEuC"><rect x="10" y="8" width="280" height="134" rx="14"/></clipPath></defs>' +
      '<g clip-path="url(#mxEuC)">' +
      '<rect x="10" y="8" width="280" height="134" fill="#123a5e"/>' +
      '<rect x="10" y="52" width="280" height="90" fill="#1f6fa8"/>' +
      '<g stroke="#6fd4f5" stroke-width="2" opacity=".55">' +
        '<path d="M20 96h260"><animate attributeName="opacity" values=".2;.8;.2" dur="4s" repeatCount="indefinite"/></path>' +
        '<path d="M20 118h260"><animate attributeName="opacity" values=".8;.2;.8" dur="4s" repeatCount="indefinite"/></path></g>' +
      '<rect x="10" y="126" width="280" height="16" fill="#6b5b4a"/>' +
      '<rect x="10" y="8" width="280" height="46" fill="#e8f4fb"/>' +
      '<g stroke="#b06a4a" stroke-width="2.4" opacity=".85">' +
        '<path d="M34 14l52 38M120 10l40 44M186 16l58 34M74 50l70-34"/></g>' +
      '<rect x="10" y="8" width="280" height="46" fill="#e8f4fb">' +
        '<animate attributeName="width" values="280;72;280" dur="7s" repeatCount="indefinite"/>' +
      "</rect>" +
      '<g stroke="#b06a4a" stroke-width="2.4" opacity=".85">' +
        '<path d="M34 14l52 38M120 10l40 44M186 16l58 34M74 50l70-34"><animate ' +
        'attributeName="opacity" values=".85;0;.85" dur="7s" repeatCount="indefinite"/></path></g>' +
      "</g>" +
      '<text x="150" y="30" text-anchor="middle" font="900 12px Nunito" fill="#15486d" ' +
        'font-weight="900" font-size="12">ice</text>' +
      '<text x="222" y="92" text-anchor="middle" fill="#dff2ff" font-weight="900" font-size="12">water</text>' +
      '<text x="222" y="138" text-anchor="middle" fill="#f0e2cf" font-weight="900" font-size="11">rock</text></svg>'
  },

  /* Ganymede — bigger than a planet ---------------------------------------- */
  size: {
    button: "📏 Put it beside Mercury",
    cap: "Ganymede is 5,268 km across. Mercury is 4,879. Our Moon is 3,475.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Ganymede compared with Mercury and the Moon">' +
      '<g><circle cx="60" cy="96" r="0" fill="#9b8f80"><animate attributeName="r" values="0;46" ' +
        'dur="1.1s" fill="freeze"/></circle>' +
      '<text x="60" y="146" text-anchor="middle" fill="#15486d" font-weight="900" font-size="12">Ganymede</text></g>' +
      '<g><circle cx="160" cy="100" r="0" fill="#8e8983"><animate attributeName="r" values="0;42.6" ' +
        'dur="1.1s" begin="0.35s" fill="freeze"/></circle>' +
      '<text x="160" y="146" text-anchor="middle" fill="#15486d" font-weight="900" font-size="12">Mercury</text></g>' +
      '<g><circle cx="245" cy="112" r="0" fill="#dedad2"><animate attributeName="r" values="0;30.3" ' +
        'dur="1.1s" begin="0.7s" fill="freeze"/></circle>' +
      '<text x="245" y="146" text-anchor="middle" fill="#15486d" font-weight="900" font-size="12">our Moon</text></g>' +
      '<text x="150" y="18" text-anchor="middle" fill="#2c5878" font-weight="900" font-size="12">' +
        "a moon, bigger than a planet</text></svg>"
  },

  /* Titan — it rains there --------------------------------------------------*/
  titan: {
    button: "🌧 Watch it rain",
    cap: "Titan is the only other place we know of with rivers, lakes and rain — but the rain is methane, not water.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Methane rain falling into a lake on Titan">' +
      '<rect x="0" y="0" width="300" height="150" fill="#e0a53f" rx="12"/>' +
      '<rect x="0" y="0" width="300" height="70" fill="#eebb5c"/>' +
      '<path d="M0 108q40-16 80-6t70 2 70-10 80 6v50H0z" fill="#8a5a24"/>' +
      '<ellipse cx="150" cy="128" rx="96" ry="15" fill="#2f4a56"/>' +
      '<ellipse cx="150" cy="128" rx="96" ry="15" fill="none" stroke="#7fb9c9" stroke-width="2" opacity=".6"/>' +
      '<g stroke="#cfe6ef" stroke-width="2.2" stroke-linecap="round" opacity=".85">' +
      "".concat.apply("", [40, 78, 116, 154, 192, 230, 262].map(function (x, i) {
        return '<line x1="' + x + '" y1="26" x2="' + (x - 6) + '" y2="46">' +
          '<animate attributeName="y1" values="26;96" dur="1.7s" begin="' + (i * 0.19) +
          's" repeatCount="indefinite"/><animate attributeName="y2" values="46;116" dur="1.7s" begin="' +
          (i * 0.19) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" ' +
          'dur="1.7s" begin="' + (i * 0.19) + 's" repeatCount="indefinite"/></line>';
      })) + "</g>" +
      '<text x="150" y="20" text-anchor="middle" fill="#5c3a12" font-weight="900" font-size="12">' +
        "thick orange air, and rain</text></svg>"
  },

  /* Enceladus — the jets ----------------------------------------------------*/
  plume: {
    button: "💦 Turn on the jets",
    cap: "The spray comes from an ocean under the ice — and some of it becomes one of Saturn's rings.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Enceladus spraying jets of ice into space">' +
      '<circle cx="150" cy="128" r="58" fill="#f2f7fa"/>' +
      '<g stroke="#bcd8e6" stroke-width="2.5"><path d="M120 96l14 26M150 90v32M180 96l-14 26"/></g>' +
      "".concat.apply("", [[150, 0], [128, -18], [172, 18], [138, -9], [162, 9]].map(function (p, i) {
        return '<g><circle cx="' + p[0] + '" cy="72" r="3.4" fill="#dff2ff">' +
          '<animate attributeName="cy" values="72;10" dur="2.6s" begin="' + (i * 0.28) +
          's" repeatCount="indefinite"/>' +
          '<animate attributeName="cx" values="' + p[0] + ";" + (p[0] + p[1]) + '" dur="2.6s" begin="' +
          (i * 0.28) + 's" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="1;0" dur="2.6s" begin="' + (i * 0.28) +
          's" repeatCount="indefinite"/>' +
          '<animate attributeName="r" values="3.4;1" dur="2.6s" begin="' + (i * 0.28) +
          's" repeatCount="indefinite"/></circle></g>';
      })) +
      '<text x="150" y="18" text-anchor="middle" fill="#2c5878" font-weight="900" font-size="12">' +
        "salty water, straight into space</text></svg>"
  },

  /* Daphnis — the waves it raises -------------------------------------------*/
  waves: {
    button: "🌊 Make the waves",
    cap: "Eight kilometres of rock, and its gravity is still enough to pull the ring edge into waves.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Daphnis raising waves in a ring edge">' +
      '<rect x="0" y="0" width="300" height="150" fill="#0d1f3d" rx="12"/>' +
      '<path d="M0 14h300v40q-14 10-28 0t-28 0-28 0-28 0-28 0-28 0-28 0-28 0-28 0-28 0-20 0z" fill="#cfe6f2"/>' +
      '<path d="M0 136h300V96q-14-10-28 0t-28 0-28 0-28 0-28 0-28 0-28 0-28 0-28 0-28 0-20 0z" fill="#cfe6f2"/>' +
      '<g><circle cx="30" cy="75" r="7" fill="#e8dfcd">' +
        '<animate attributeName="cx" values="-10;310" dur="5s" repeatCount="indefinite"/></circle></g>' +
      '<g fill="none" stroke="#8fd0ea" stroke-width="3">' +
      '<path d="M0 56q14 12 28 0t28 0 28 0"><animateTransform attributeName="transform" ' +
        'type="translate" values="-10 0;310 0" dur="5s" repeatCount="indefinite"/></path>' +
      '<path d="M0 94q14-12 28 0t28 0 28 0"><animateTransform attributeName="transform" ' +
        'type="translate" values="-10 0;310 0" dur="5s" repeatCount="indefinite"/></path></g>' +
      '<text x="150" y="146" text-anchor="middle" fill="#9fc0e2" font-weight="900" font-size="11">' +
        "the gap Daphnis flies down</text></svg>"
  },

  /* Janus and Epimetheus — the swap -----------------------------------------*/
  // The first version put both moons on one animateMotion path, which showed two
  // moons chasing each other and never swapping -- the one thing the page claims.
  // Each moon now rides its own rotating group at its own radius, and the radii
  // trade at the moment they meet. Same rate for both, which is a simplification
  // (really the inner one is faster and that is WHY it catches up), so the
  // caption says the timing is squashed.
  swap: {
    button: "🔄 Watch them swap",
    cap: "They never touch. The inner one is faster, so it catches the outer one up — then they tug on each other and trade orbits. Squashed here: each trade takes four real years, and they trade back again.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Janus and Epimetheus trading orbits">' +
      '<ellipse cx="150" cy="75" rx="118" ry="46" fill="none" stroke="#2c4d78" stroke-width="1.3" stroke-dasharray="4 5"/>' +
      '<ellipse cx="150" cy="75" rx="96" ry="36" fill="none" stroke="#2c4d78" stroke-width="1.3" stroke-dasharray="4 5"/>' +
      '<circle cx="150" cy="75" r="26" fill="#e3c98d"/>' +
      '<g><g transform="translate(150,75) scale(1,0.39) translate(-150,-75)">' +
        '<g><circle cy="75" r="9" fill="#bcb5a7"><animate attributeName="cx" ' +
          'values="246;246;268;268;246;246" keyTimes="0;.30;.40;.80;.90;1" dur="12s" ' +
          'repeatCount="indefinite" calcMode="linear"/></circle>' +
        '<animateTransform attributeName="transform" type="rotate" from="0 150 75" ' +
          'to="360 150 75" dur="12s" repeatCount="indefinite"/></g></g></g>' +
      '<g><g transform="translate(150,75) scale(1,0.39) translate(-150,-75)">' +
        '<g><circle cy="75" r="8" fill="#e0d9cb"><animate attributeName="cx" ' +
          'values="268;268;246;246;268;268" keyTimes="0;.30;.40;.80;.90;1" dur="12s" ' +
          'repeatCount="indefinite" calcMode="linear"/></circle>' +
        '<animateTransform attributeName="transform" type="rotate" from="14 150 75" ' +
          'to="374 150 75" dur="12s" repeatCount="indefinite"/></g></g></g>' +
      '<text x="150" y="142" text-anchor="middle" fill="#2c5878" font-weight="900" font-size="11">' +
        "two moons, two lanes, and a trade every four years</text></svg>"
  },

  /* Triton — going the wrong way --------------------------------------------*/
  retrograde: {
    button: "↩️ See it go backwards",
    cap: "Every other big moon travels the way its planet spins. Triton does not — which is how we know Neptune caught it.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Triton orbiting Neptune backwards">' +
      '<circle cx="150" cy="75" r="34" fill="#3f6fd8"/>' +
      '<g><path d="M150 41a34 34 0 0 1 0 68" fill="none" stroke="#9fd0ff" stroke-width="3" ' +
        'stroke-linecap="round" opacity=".8"/>' +
        '<animateTransform attributeName="transform" type="rotate" from="0 150 75" to="360 150 75" ' +
        'dur="5s" repeatCount="indefinite"/></g>' +
      '<text x="150" y="20" text-anchor="middle" fill="#2c5878" font-weight="900" font-size="11">' +
        "Neptune spins this way →</text>" +
      '<ellipse cx="150" cy="75" rx="104" ry="46" fill="none" stroke="#2c4d78" stroke-width="1.4" stroke-dasharray="5 5"/>' +
      '<g><circle r="10" fill="#e0a893"><animateMotion dur="7s" repeatCount="indefinite" ' +
        'path="M254 75a104 46 0 1 0 -208 0a104 46 0 1 0 208 0"/></circle></g>' +
      '<text x="150" y="142" text-anchor="middle" fill="#a44e32" font-weight="900" font-size="11">' +
        "← and Triton goes the other way</text></svg>"
  },

  /* Charon — the dance ------------------------------------------------------*/
  barycentre: {
    button: "💫 Watch them dance",
    cap: "Charon is so big that the point they both go round is outside Pluto — so Pluto swings too. The gap between them is squashed here to fit; the yellow dot really is outside Pluto.",
    svg: '<svg viewBox="0 0 300 150" role="img" aria-label="Pluto and Charon circling a point between them">' +
      '<circle cx="150" cy="75" r="3" fill="#ffd457"/>' +
      '<text x="150" y="20" text-anchor="middle" fill="#2c5878" font-weight="900" font-size="11">' +
        "they both go round this yellow dot</text>" +
      '<g><g><circle cx="118" cy="75" r="24" fill="#c9a389"/>' +
        '<animateTransform attributeName="transform" type="rotate" from="0 150 75" to="360 150 75" ' +
        'dur="6.4s" repeatCount="indefinite"/></g></g>' +
      '<g><g><circle cx="214" cy="75" r="13" fill="#9d9187"/>' +
        '<animateTransform attributeName="transform" type="rotate" from="0 150 75" to="360 150 75" ' +
        'dur="6.4s" repeatCount="indefinite"/></g></g>' +
      '<text x="60" y="142" fill="#2c5878" font-weight="900" font-size="11">Pluto</text>' +
      '<text x="236" y="142" fill="#2c5878" font-weight="900" font-size="11">Charon</text></svg>'
  }
};
