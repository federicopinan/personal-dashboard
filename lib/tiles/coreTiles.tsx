import type { ReactNode } from 'react'
import type { TileSize } from './tileSkin'
import type { DashboardTileStats } from '@/lib/vitality/dashboardStats'

/**
 * The core tiles are Vitality's pre-installed apps (Train, Fuel, Vitals, Peak,
 * Brand, Finance). On the fused dashboard they live in the SAME grid as
 * a user's own built tiles, so they can be dragged, resized, removed, and
 * re-added from the library just like any tile. This registry is the static
 * source of truth for each one: its route, index, label, glyph, the bespoke
 * animated orb art, the animation data-attributes, and a default size.
 *
 * Vee is intentionally NOT in this list. Vee is the locked centrepiece, rendered
 * by its own component (it carries the live score, the wire feeds, the ring
 * pulse). It can never be dragged or removed. See VEE_TILE below + DashboardGrid.
 *
 * The art SVGs use the default preserveAspectRatio (meet), so they scale without
 * distortion as a tile is resized; the orb animation in veeTilesAnim.ts reads
 * path geometry in viewBox coordinates, so the living orbs keep tracking their
 * path at any tile size.
 */

export type CoreTileId =
  | 'train'
  | 'fuel'
  | 'vitals'
  | 'sleep'
  | 'screen'
  | 'water'
  | 'peak'
  | 'finance'

/** A single live metric to surface on a tile (Train day, Fuel kcal). */
export interface CoreStat {
  value: string
  unit: string
}

export interface CoreTile {
  id: CoreTileId
  href: string
  /** Corner index label, e.g. "01". */
  index: string
  /** Bottom-left tile title. */
  label: string
  /** Extra tile classes: 'live' = graph tile (metric on the title baseline),
   *  'fin' = finance gold accent. */
  variant?: string
  /** Animation hooks consumed by veeTilesAnim.ts. */
  orb?: { mode?: string; roam?: string; pt?: string }
  /** The top-right glyph. */
  glyph: ReactNode
  /** The animated orb art layer (the .art SVG contents). */
  art: ReactNode
  /** Default size on a fresh dashboard (matches the approved customize mockup). */
  defaultSize: TileSize
  /** Resolve this tile's one glanceable live stat, or null to show none. */
  stat?: (stats: DashboardTileStats) => CoreStat | null
}

export const CORE_TILES: Record<CoreTileId, CoreTile> = {
  train: {
    id: 'train',
    href: '/app/fitness/log',
    index: '01',
    label: 'Train',
    variant: 'live',
    orb: { mode: 'wander' },
    defaultSize: 'hero',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="-10" y="-3" width="2.8" height="6" rx="0.6" strokeWidth="1.3" />
        <rect x="7.2" y="-3" width="2.8" height="6" rx="0.6" strokeWidth="1.3" />
        <line x1="-7.2" y1="0" x2="7.2" y2="0" strokeWidth="1.3" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 658 118">
        <path className="mot" d="M44 66 L180 54 L300 60 L440 37 L530 45 L616 27" />
        <g className="orb"><circle className="glow" r="10" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
    stat: (s) => (s.trainDay ? { value: s.trainDay, unit: 'day' } : null),
  },
  fuel: {
    id: 'fuel',
    href: '/app/starter',
    index: '02',
    label: 'Fuel',
    orb: { mode: 'wander' },
    defaultSize: 'tall',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 -10 C0 -10 -7 -2 -7 3 a7 7 0 0 0 14 0 C7 -2 0 -10 0 -10 Z" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 210 250">
        <path className="mot" d="M46 110 Q82 94 106 110 T168 110" />
        <path className="motd" d="M46 132 Q82 116 106 132 T168 132" />
        <g className="orb"><circle className="glow" r="10" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
    stat: (s) =>
      s.fuelKcalToday != null
        ? { value: s.fuelKcalToday.toLocaleString('en-US'), unit: 'kcal' }
        : null,
  },
  vitals: {
    id: 'vitals',
    href: '/app/starter',
    index: '04',
    label: 'Vitals',
    variant: 'live',
    orb: { mode: 'wander' },
    defaultSize: 's',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-10 0 L-5 0 L-2 -7 L2 7 L5 0 L10 0" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 210 118">
        <path className="mot" d="M38 47 L74 47 L89 27 L104 70 L119 47 L172 47" />
        <g className="orb"><circle className="glow" r="8" /><circle className="node" r="3.2" /></g>
      </svg>
    ),
  },
  sleep: {
    id: 'sleep',
    href: '/app/starter',
    index: '07',
    label: 'Sleep',
    // The orb drifts the moon's ring, then settles onto the pillow line below.
    // Both are .mot/.motd paths so 'wander' walks them and swaps between the
    // two — a night that never quite holds still, which is the whole idea.
    orb: { mode: 'wander' },
    defaultSize: 'm',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-1.5 -5.6 A9 9 0 1 1 -6.4 -10.5 A7 7 0 0 0 -1.5 -5.6 Z" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 210 250">
        <path className="mot" d="M105 62 a50 50 0 1 1 -0.1 0" />
        <path className="motd" d="M34 182 Q105 164 176 182" />
        <g className="orb"><circle className="glow" r="10" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
  },
  screen: {
    id: 'screen',
    href: '/app/starter',
    index: '08',
    label: 'Screen',
    // The orb rests mid-panel and walks out to the bezel corners: 'spoke'
    // reads the x2/y2 endpoint of every .motd element, so the bezel is four
    // <line>s and the glow traces the frame. The first core tile on this mode —
    // a screen is the one input on the board that actually has a frame.
    orb: { mode: 'still', roam: 'spoke', pt: '105,126' },
    defaultSize: 'm',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <rect x="-9" y="-8" width="18" height="12" rx="1.6" />
        <path d="M0 4 L0 7.5" />
        <path d="M-4 7.5 L4 7.5" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 210 250">
        <line className="motd" x1="52" y1="88" x2="158" y2="88" />
        <line className="motd" x1="158" y1="88" x2="158" y2="164" />
        <line className="motd" x1="158" y1="164" x2="52" y2="164" />
        <line className="motd" x1="52" y1="164" x2="52" y2="88" />
        <path className="mot" d="M105 164 L105 186 M84 186 L126 186" />
        <path className="mot" d="M68 126 L142 126" />
        <g className="orb"><circle className="glow" r="9" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
  },
  water: {
    id: 'water',
    href: '/app/starter',
    index: '09',
    label: 'Water',
    // The orb walks down the glass wall, then swaps to the water line inside
    // it: the same two-path 'wander' the Sleep tile uses for its ring and its
    // pillow, on a path pair that is unmistakably a drink.
    orb: { mode: 'wander' },
    defaultSize: 's',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-6 -8 L6 -8 L4.5 8 L-4.5 8 Z" />
        <path d="M-5.4 -3 L5.4 -3" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 210 250">
        <path className="mot" d="M64 92 L73 198 L137 198 L146 92" />
        <path className="motd" d="M68 150 Q80 142 92 150 T116 150 T140 150" />
        <g className="orb"><circle className="glow" r="10" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
  },
  peak: {
    id: 'peak',
    href: '/app/starter',
    index: '03',
    label: 'Peak',
    orb: { mode: 'still', roam: 'ring', pt: '105,125' },
    defaultSize: 'tall',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M2 -10 L-5 1 L0 1 L-2 10 L5 -1 L0 -1 L2 -10 Z" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 210 250">
        <circle className="mot" cx="105" cy="125" r="40" />
        <g className="orb"><circle className="glow" r="12" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
  },
  finance: {
    id: 'finance',
    href: '/app/starter',
    index: '05',
    label: 'Finance',
    variant: 'fin',
    orb: { mode: 'hop' },
    defaultSize: 'm',
    glyph: (
      <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-9 6 L-3 0 L2 5 L9 -4" /><path d="M4 -4 L9 -4 L9 1" />
      </svg>
    ),
    art: (
      <svg className="art" viewBox="0 0 434 118">
        <g style={{ opacity: 0.8 }}>
          <line className="mot" x1="190" y1="50" x2="190" y2="88" /><rect className="candle" x="184" y="58" width="12" height="20" rx="2" />
          <line className="mot" x1="252" y1="44" x2="252" y2="84" /><rect className="candle" x="246" y="51" width="12" height="23" rx="2" />
          <line className="mot" x1="314" y1="36" x2="314" y2="78" /><rect className="candle" x="308" y="43" width="12" height="25" rx="2" />
          <line className="mot" x1="376" y1="26" x2="376" y2="70" /><rect className="candle" x="370" y="33" width="12" height="27" rx="2" />
        </g>
        <g className="orb"><circle className="glow" r="9" /><circle className="node" r="3.4" /></g>
      </svg>
    ),
  },
}

/**
 * The Library descriptor. Like Vee, this is a special locked tile (NOT an href
 * CoreTile): tapping it opens the full-screen app-manager overlay, not a route.
 * It is always present on every dashboard and can never be removed. It still
 * drags, resizes, and can be re-designed in edit mode. Rendered by DashboardGrid
 * which reads this descriptor and the same glyph + animated orb art pattern as
 * the core tiles, so it sits in the grid looking native.
 */
export const LIBRARY_TILE = {
  id: 'library' as const,
  label: 'Library',
  index: '00',
  defaultSize: 'm' as TileSize,
  /** The living orb wanders the two shelf lines, exactly like the core tiles.
   *  Without this descriptor the tile emitted no `data-orb`, so veeTilesAnim never
   *  positioned the orb — it sat glowing at viewBox (0,0), a stray light clipped at
   *  the tile's top edge. With it, the orb tracks the shelf like its siblings. */
  orb: { mode: 'wander' },
  /** Top-right stacked-books glyph (open book, two facing leaves). */
  glyph: (
    <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 -6 C-1.7 -7.4 -3.9 -8 -7 -7.5 L-7 7.5 C-3.9 8 -1.7 7.4 0 6" />
      <path d="M0 -6 C1.7 -7.4 3.9 -8 7 -7.5 L7 7.5 C3.9 8 1.7 7.4 0 6" />
      <line x1="0" y1="-6" x2="0" y2="6" />
    </svg>
  ),
  /** Animated orb art: the orb roams a gentle shelf line, matching core tiles. */
  art: (
    <svg className="art" viewBox="0 0 210 118">
      <path className="motd" d="M46 46 H164" />
      <path className="motd" d="M46 72 H164" />
      <g className="orb" transform="translate(105 59)"><circle className="glow" r="9" /><circle className="node" r="3.4" /></g>
    </svg>
  ),
}

/** Is this id the special locked Library tile? */
export const isLibraryId = (id: string) => id === LIBRARY_TILE.id

/** The Vee centrepiece descriptor. Vee is locked: never draggable or removable. */
export const VEE_TILE = {
  id: 'vee' as const,
  href: '/app/starter',
  index: '06',
  label: 'Mentor',
  kicker: 'Notices everything',
}

export type HomeTileId = CoreTileId | 'vee' | 'library'

/**
 * The default home order on a fresh dashboard. Combined with the seeded sizes
 * (Train hero, Fuel/Brand/Peak tall, Library/Finance m, Vee big) and the grid's
 * dense auto-flow: Train the wide hero up top, Fuel a tall on the right, Library a
 * 2-wide band high in the second row (the always-on "your apps" shelf, the
 * platform's front door; building and uploading tiles live inside it), Vee the
 * 2x2 centre, talls down the sides, Finance a 2-wide band at the foot. Sleep
 * sits beside Vitals because it feeds it, Screen goes straight after it because
 * that pairing is the whole reason Screen exists, and Water follows as the
 * second half of what the Fuel stub was really logging. Every tile drags,
 * resizes, and can be removed. User-built tiles append.
 *
 * Adding a tile here is SAFE for existing boards: DashboardGrid seeds its order
 * from this list only when `vitality:eq:order` is empty, and a saved order
 * always gets anything missing from this list appended rather than dropped.
 */
export const DEFAULT_HOME_ORDER: HomeTileId[] = [
  'train',
  'fuel',
  'library',
  'vitals',
  'sleep',
  'screen',
  'water',
  'vee',
  'peak',
  'finance',
]

/** Is this id one of the pre-installed core tiles (incl. Vee)? */
export function isCoreId(id: string): id is CoreTileId | 'vee' {
  return id === 'vee' || id in CORE_TILES
}

/** Is this id any home tile (a core tile, Vee, or the locked Library)? */
export const isHomeId = (id: string): id is HomeTileId => isLibraryId(id) || isCoreId(id)

/** Default size for any home tile id. Vee defaults to the 2x2 centrepiece. */
export function coreDefaultSize(id: HomeTileId): TileSize {
  if (id === 'vee') return 'big'
  if (id === 'library') return LIBRARY_TILE.defaultSize
  return CORE_TILES[id].defaultSize
}
