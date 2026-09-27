import type { I18n } from '../model/types'

export interface Chapter {
  id: 'plan' | 'shop' | 'workshop' | 'test'
  title: I18n
  /** Step of the vollständige Handlung. */
  phase: I18n
  mentor: string
  lernfelder: string[]
}

export const MENTOR = 'Meisterin Linde'

/** The four stations of the workshop, in the order a carpenter works. */
export const CHAPTERS: Chapter[] = [
  {
    id: 'plan',
    title: { en: 'Drafting table', de: 'Zeichentisch' },
    phase: { en: 'Inform & plan', de: 'Informieren & Planen' },
    lernfelder: ['LF 4', 'LF 5', 'LF 12'],
    mentor:
      'Welcome to the workshop! We are building a desk that one person moves between sitting and standing with one hand. ' +
      'Two drawer pedestals hide the trick: cobblestones on a cord balance the top, like an old sash window. ' +
      'Tell me your height, shape the desk, and watch the checks on the right.',
  },
  {
    id: 'shop',
    title: { en: 'DIY store', de: 'Baumarkt' },
    phase: { en: 'Decide', de: 'Entscheiden' },
    lernfelder: ['LF 1', 'LF 2'],
    mentor:
      'Everything comes from a normal DIY store: glued panels, a little beech for the parts that move, linen cord and ' +
      'granite cobbles from the garden aisle. Check the sizes in your store, type in the prices, then buy the wood.',
  },
  {
    id: 'workshop',
    title: { en: 'Workshop', de: 'Werkstatt' },
    phase: { en: 'Execute', de: 'Durchführen' },
    lernfelder: ['LF 2', 'LF 3', 'LF 5'],
    mentor: 'Step by step: saw the parts for each assembly, then fit and glue them. Measure twice, cut once.',
  },
  {
    id: 'test',
    title: { en: 'Acceptance test', de: 'Abnahme' },
    phase: { en: 'Check & evaluate', de: 'Kontrollieren & Bewerten' },
    lernfelder: ['LF 12'],
    mentor:
      'Moment of truth. Squeeze the release handle, move the top, let go and it drops into the next detent. ' +
      'Then try it without the stones, or without wax, and feel why they matter.',
  },
]

export interface BuildStep {
  id: string
  title: I18n
  lernfelder: string[]
  tools: string[]
  /** Part kinds lit up in the 3D view. */
  highlight: string[]
  text: string
  safety?: string
  terms: string[]
}

export const BUILD_STEPS: BuildStep[] = [
  {
    id: 'acclimatise', title: { en: 'Buy & acclimatise', de: 'Einkaufen & akklimatisieren' }, lernfelder: ['LF 1'],
    tools: ['Shopping list', 'Folding rule'], highlight: [],
    text: 'Pick straight panels without cracks, and look along each edge. Stack them flat with spacer sticks in the room where the desk will live for 1–2 weeks, so their moisture settles before you cut.',
    terms: ['moisture', 'movement', 'leimholz'],
  },
  {
    id: 'cut', title: { en: 'Cut to size', de: 'Zuschnitt' }, lernfelder: ['LF 2'],
    tools: ['Cutting plan', 'Track saw or store cutting service', 'Try square', 'Pencil'],
    highlight: ['side', 'cap', 'floor', 'divider', 'guide'],
    text: 'Many stores cut panels to size for a small fee; bring the cutting plan. Mark every piece with its name and an arrow for the grain. Cut on the waste side of the line.',
    safety: 'Circular saws: riving knife fitted, push stick, hearing and eye protection.',
    terms: ['cutting', 'kerf', 'grain'],
  },
  {
    id: 'columns', title: { en: 'Laminate the columns', de: 'Säulen lamellieren' }, lernfelder: ['LF 2'],
    tools: ['Wood glue D3', 'Clamps (6+)', 'Hand plane or sander'], highlight: ['column'],
    text: 'Glue three strips per column. Alternate the growth-ring direction so they pull against each other. Clamp every 15 cm, wipe off squeeze-out after 20 minutes, and plane the faces flat and square once it has cured.',
    terms: ['lamination', 'column', 'clamp'],
  },
  {
    id: 'pedestals', title: { en: 'Build the pedestals', de: 'Korpusse bauen' }, lernfelder: ['LF 4', 'LF 5'],
    tools: ['Dowel jig', 'Drill', 'Clamps', 'Glue', 'Chisel for the finger joints'], highlight: ['side', 'cap', 'floor', 'back', 'divider', 'guide'],
    text: 'Cut the finger joints between sides and top first (a jig on the router table or saw + chisel). Dowel the rest together. Glue the guide walls around a spacer that is the column plus 0.4 mm: a layer of packing tape on the column works.',
    terms: ['fingerjoint', 'dowel', 'guide', 'clearance', 'pedestal'],
  },
  {
    id: 'rack', title: { en: 'Detent racks & pawls', de: 'Rastleisten & Sperrklinken' }, lernfelder: ['LF 5'],
    tools: ['Notching jig', 'Japanese saw', 'Chisel 12 mm'], highlight: ['rack', 'pawl'],
    text: 'Make a jig that indexes every 25 mm so all notches match. Undercut each notch by about 5° so the load pulls the pawl in. Round the pawl tip slightly.',
    safety: 'Beech dust: extraction + FFP2 mask.',
    terms: ['rack', 'pawl', 'detent', 'dust'],
  },
  {
    id: 'pulleys', title: { en: 'Pulleys, boxes & cords', de: 'Rollen, Kästen & Seile' }, lernfelder: ['LF 3', 'LF 5'],
    tools: ['Hole saw Ø60', 'Round file', 'Drill Ø12'], highlight: ['pulley', 'axle', 'sheave', 'box-side', 'box-end', 'box-floor'],
    text: 'Cut beech discs with a hole saw and file a groove for the cord. Drill the axle holes slightly oversize and wax the axles. Glue up the weight boxes and tie the cords with bowline knots.',
    terms: ['pulley', 'tackle', 'counterweight'],
  },
  {
    id: 'base', title: { en: 'Plinth, rail, drawers & battens', de: 'Sockel, Traverse, Schubkästen & Gratleisten' }, lernfelder: ['LF 5'],
    tools: ['Glue', 'Clamps', 'Dowel jig'], highlight: ['plinth', 'rail', 'drawer-front', 'batten'],
    text: 'Fit the plinth and the rear floor rail between the pedestals. Build the drawers with 3 mm of air around each front. On the top, glue the battens only in the middle 10 cm and let the ends float in wooden buttons, so the top can move with the seasons.',
    terms: ['batten', 'movement', 'wedgedTenon'],
  },
  {
    id: 'finish', title: { en: 'Sand & oil', de: 'Schleifen & Ölen' }, lernfelder: ['LF 5'],
    tools: ['Sander', 'Grits 80/120/180', 'Hardwax oil', 'Lint-free rags'], highlight: ['top', 'side', 'cap', 'drawer-front', 'handle'],
    text: 'Sand 80 → 120 → 180 with the grain and soften every edge. Oil thinly, wipe off the excess after 15 minutes, leave it overnight, then give it a second coat. Leave the guides unoiled; they get wax.',
    safety: 'Oil-soaked rags can self-ignite: lay them flat outside to dry or keep them in a closed jar of water.',
    terms: ['grit', 'hardwaxoil', 'oilrags', 'dust'],
  },
  {
    id: 'assemble', title: { en: 'Assemble & balance', de: 'Montage & Austarieren' }, lernfelder: ['LF 12'],
    tools: ['Wax', 'Scale', 'Spirit level'], highlight: ['column', 'ballast', 'top'],
    text: 'Wax the guides, drop in the columns, hang the boxes and fit the top. Load your usual things onto the desk. Add cobbles until the top stays put when released half-way, then fine-tune with the sand bag.',
    terms: ['counterweight', 'wax'],
  },
]
