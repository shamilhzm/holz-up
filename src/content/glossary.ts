export interface Term {
  en: string
  de: string
  explain: string
}

/** Fachbegriffe: English ↔ German trade terms with a one-line explanation. */
export const GLOSSARY: Record<string, Term> = {
  wange: { en: 'End panel', de: 'Wange', explain: 'The solid side support of a table or desk. Here it hides the column guide and the counterweights.' },
  column: { en: 'Column', de: 'Säule', explain: 'The upright that carries the top. Ours is laminated from three 18 mm boards so it stays straight.' },
  lamination: { en: 'Lamination', de: 'Lamellieren', explain: 'Gluing several thin boards into one thick piece. Stresses in the wood cancel out, so it warps less than solid stock.' },
  guide: { en: 'Guide', de: 'Führung', explain: 'The channel a moving part slides in. Its length and fit decide how smoothly and how tightly it moves.' },
  clearance: { en: 'Clearance / play', de: 'Spiel', explain: 'The small gap that lets a part slide. Too little and it binds when the wood swells; too much and it wobbles.' },
  jam: { en: 'Jamming (drawer effect)', de: 'Verkanten', explain: 'A sliding part pushed off-centre tilts and wedges in its guide, like a drawer pulled at one corner. Rule: guided length > 2 × friction × offset.' },
  wax: { en: 'Slide wax', de: 'Gleitwachs', explain: 'Paraffin or candle wax rubbed on wooden slides roughly halves the friction. The old cabinetmaker trick for drawers.' },
  counterweight: { en: 'Counterweight', de: 'Gegengewicht', explain: 'A hidden weight that balances a moving part, like in a sash window or a gym cable machine. The top then feels almost weightless.' },
  sash: { en: 'Sash window', de: 'Schiebefenster', explain: 'A window that slides up and down, balanced by weights on cords over pulleys hidden in the frame. Around since the 1600s.' },
  pulley: { en: 'Pulley', de: 'Umlenkrolle', explain: 'A grooved wheel that turns a cord around a corner. Every pulley costs a little force to friction.' },
  tackle: { en: 'Block and tackle', de: 'Flaschenzug', explain: 'With a running pulley on the weight, it moves half as far but must be twice as heavy (2:1).' },
  detent: { en: 'Detent', de: 'Raste', explain: 'A notch a catch drops into, holding a position. Ours sits every 25 mm.' },
  rack: { en: 'Detent rack', de: 'Rastleiste', explain: 'A strip with a row of notches, the wooden cousin of a gym bench ladder.' },
  pawl: { en: 'Pawl', de: 'Sperrklinke', explain: 'A pivoting catch that drops into the rack by its own weight. The notches are slightly hooked so load pulls it deeper.' },
  tip: { en: 'Tip stability', de: 'Kippsicherheit', explain: 'How hard you can push the top edge before the desk tips. Higher desks tip sooner; long feet and low weight help.' },
  knee: { en: 'Knee space', de: 'Beinraum', explain: 'The clear space under the desk for your legs.' },
  pinch: { en: 'Pinch point', de: 'Quetschstelle', explain: 'A closing gap that can trap fingers. Gaps between 8 and 25 mm are the dangerous ones.' },
  leimholz: { en: 'Glued laminated panel', de: 'Leimholz', explain: 'Panel made of solid strips glued edge to edge. Standard stock in every DIY store; flatter and more stable than one wide board.' },
  kiefer: { en: 'Pine', de: 'Kiefer', explain: 'Soft, light, resinous softwood with visible knots. Yellows to honey over the years.' },
  buche: { en: 'Beech', de: 'Buche', explain: 'Hard, dense, fine-grained hardwood. Good for parts that move and wear: pulleys, pawls, handles.' },
  grain: { en: 'Grain direction', de: 'Faserrichtung', explain: 'The direction the wood fibres run. Wood is strong along the grain and moves (swells/shrinks) across it.' },
  endgrain: { en: 'End grain', de: 'Hirnholz', explain: 'The cut ends where you see the growth rings. Soaks up oil and glue, and splits easily.' },
  moisture: { en: 'Moisture content', de: 'Holzfeuchte', explain: 'Water in the wood as % of its dry weight. Indoor furniture wants ~8–10 %; let new boards acclimatise for 1–2 weeks.' },
  movement: { en: 'Wood movement', de: 'Schwinden und Quellen', explain: 'Wood shrinks in dry air and swells in humid air, mostly across the grain. Designs must let it move.' },
  batten: { en: 'Cross batten', de: 'Gratleiste', explain: 'A batten across a solid top that keeps it flat while letting it move. Glue only the middle.' },
  dowel: { en: 'Dowel', de: 'Dübel', explain: 'A fluted wooden pin glued into matching holes to join parts. No metal needed.' },
  wedgedTenon: { en: 'Wedged through-tenon', de: 'Keilzapfen', explain: 'A tenon passing through a mortise and locked with a wedge. Strong, beautiful and can be taken apart.' },
  kerf: { en: 'Kerf', de: 'Schnittfuge', explain: 'The width of wood the saw blade turns into dust, about 2–4 mm. Always cut on the waste side of the line.' },
  hardwaxoil: { en: 'Hardwax oil', de: 'Hartwachsöl', explain: 'Oil-and-wax finish that soaks in, keeps the wood feel and is easy to repair.' },
  oilrags: { en: 'Self-igniting rags', de: 'Selbstentzündung', explain: 'Crumpled rags soaked in drying oil heat up as the oil cures and can catch fire. Lay them flat outside or keep them in water.' },
  dust: { en: 'Hardwood dust', de: 'Hartholzstaub', explain: 'Beech and oak dust can cause nasal cancer. Use dust extraction and an FFP2 mask when sanding beech.' },
  grit: { en: 'Grit', de: 'Körnung', explain: 'Sandpaper coarseness: lower is coarser. Step through 80 → 120 → 180 and never skip more than one step.' },
  clamp: { en: 'Clamp', de: 'Schraubzwinge', explain: 'Holds glued parts under pressure while the glue sets.' },
  bom: { en: 'Bill of materials', de: 'Stückliste', explain: 'Every part with quantity, size, material and grain direction.' },
  cutting: { en: 'Cutting plan', de: 'Zuschnittplan', explain: 'How the parts are laid out on the boards you buy, including saw kerfs.' },
  handlung: { en: 'Complete action cycle', de: 'Vollständige Handlung', explain: 'Inform → plan → decide → execute → check → evaluate. How vocational schools structure a project.' },
  lernfeld: { en: 'Learning field', de: 'Lernfeld', explain: 'A unit of the Tischler vocational-school curriculum, built around a real work task.' },
  berichtsheft: { en: 'Training log', de: 'Berichtsheft', explain: 'The weekly record every apprentice keeps of what they did and learned.' },
}
