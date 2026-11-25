// ─────────────────────────────────────────────────────────────
//  EDIT HERE — all copy, paths and per-design theme live in this file
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  introSrc: 'video/video_intro.mp4',
  introSeconds: 0,                   // 0 = play full video; >0 = hard cap in seconds
  introMuted: true,                  // browsers block autoplay with sound; user can unmute via the Sound button
  outroSrc: 'video/video_outro.mp4',
  outroMuted: false,                 // triggered by user click on Shop Now, so sound can play by default
  defaultShopUrl: 'https://www.tanishq.co.in', // fallback URL when a design's shopUrl is '#'
  logoSrc: 'assets/tanishq-logo.png',
  modelSrc: 'assets/designs.glb',
  brandTag: 'A TATA PRODUCT',
  logoTagline: 'Singular brilliance, infinite charm',
  shopLabel: 'SHOP NOW',
  modelHeight: 3.4,                  // world units of the tallest design
  modelYaw: -Math.PI / 2,            // which face of the flat GLB looks at camera (diamond-set side)
  focusZoom: 1.9,                    // zoom when a feature is clicked
  // glossy metal surface — multiplies the roughness/metalness baked in the GLB texture
  material: {
    metalness: 1.0,
    roughness: 0.5,                 // lower = more mirror-like (texture value × this)
    clearcoat: 1.0,                  // extra polished lacquer layer
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.35,            // strength of reflections
    normalScale: 0.9,
  },
};

// fu / fv = feature position on the model, 0..1 from left / top of the pair
export const DESIGNS = [
  {
    node: 'design_1',
    name: 'Anantha Infinity',
    category: 'Diamond drop earrings',
    tagline: 'Where a single stone floats in endless grace',
    thumb: 'assets/thumb-1.png',
    shopUrl: '#',
    theme: { a: '#040c20', b: '#10306a', accent: '#e2b96b' },
    features: [
      { title: 'Pavé marquise crown', text: 'A sculpted marquise stud set flush with tiny diamonds, framing the ear in light.', at: [0.2, 0.12] },
      { title: 'Infinity ribbon', text: 'A twisting figure-eight of polished and satin gold, edged with a trail of diamonds.', at: [0.22, 0.55] },
      { title: 'Floating solitaire', text: 'A brilliant round diamond suspended in the heart of the loop, catching light with every move.', at: [0.21, 0.76] },
    ],
  },
  {
    node: 'design_2',
    name: 'Mogra Cascade',
    category: 'Diamond drop earrings',
    tagline: 'Petals of light falling in perfect harmony',
    thumb: 'assets/thumb-2.png',
    shopUrl: '#',
    theme: { a: '#031a22', b: '#0c4a5a', accent: '#e8c477' },
    features: [
      { title: 'Blossom crown', text: 'Three round diamonds open like petals at the top of a sweeping gold vine.', at: [0.21, 0.08] },
      { title: 'Marquise accent', text: 'A marquise-cut diamond nestles inside the curl, echoing the leaf of the vine.', at: [0.32, 0.28] },
      { title: 'Cascading drops', text: 'Round diamonds on slender branches fall in a graceful, moving cascade.', at: [0.21, 0.94] },
    ],
  },
  {
    node: 'design_3',
    name: 'Patra Vine',
    category: 'Diamond climber earrings',
    tagline: 'A vine of marquise leaves, set in gold',
    thumb: 'assets/thumb-3.png',
    shopUrl: '#',
    theme: { a: '#16081f', b: '#4a1b63', accent: '#e6bd78' },
    features: [
      { title: 'Marquise leaves', text: 'Marquise-cut diamonds fan out like leaves along the golden stem.', at: [0.29, 0.16] },
      { title: 'Sculpted vine', text: 'A flowing, satin-finish gold stem that curves gracefully down the ear.', at: [0.15, 0.28] },
      { title: 'Leaf drop', text: 'A single marquise diamond hangs at the tip, completing the vine.', at: [0.19, 0.91] },
    ],
  },
  {
    node: 'design_4',
    name: 'Champa Bloom',
    category: 'Diamond drop earrings',
    tagline: 'A blooming flower over a drop of pure solitaire',
    thumb: 'assets/thumb-4.png',
    shopUrl: '#',
    theme: { a: '#04160f', b: '#0d4b36', accent: '#e4bc6e' },
    features: [
      { title: 'Five-petal bloom', text: 'Five diamond petals around a bright centre stone form a flower stud.', at: [0.25, 0.1] },
      { title: 'Pavé ribbon', text: 'A ribbon of pavé diamonds winds through the golden teardrop frame.', at: [0.32, 0.49] },
      { title: 'Solitaire drop', text: 'A round solitaire floats inside the frame, with a finishing diamond below.', at: [0.2, 0.92] },
    ],
  },
];
