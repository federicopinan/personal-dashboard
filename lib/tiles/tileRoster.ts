/**
 * tileRoster — which tile ids the board looks for, and what it says when the
 * roster and the folder disagree.
 *
 * WHY A FILE AT ALL: the board used to take its roster from DEFAULT_HOME_ORDER,
 * a constant compiled into a .tsx file. So the only tiles that could ever exist
 * were the ones baked into the app, and a tile an AI harness dropped into
 * public/tiles/ stayed invisible until someone also edited that .tsx and
 * rebuilt. A static host cannot list a directory, so the roster has to be a FILE
 * the board fetches: public/tiles/manifest.json, written by whoever adds the
 * tile, next to the tile it ships with. DEFAULT_HOME_ORDER keeps its own
 * separate job — the default ARRANGEMENT a fresh board starts from — and is no
 * longer the list of tiles that exist.
 *
 * FAIL LOUD, NEVER SILENT: the one direction a static host cannot check is "a
 * file is sitting in public/tiles/ that the manifest forgot". That one is
 * documented (.claude/commands/tile.md, public/tiles/README.md) and the
 * "+ New tile" panel spells out the two-file rule. Every direction the board
 * CAN check comes back as a RosterProblem and is rendered on the board: no
 * manifest, a manifest that does not parse, an id that is not a legal file
 * name, an id whose file is not there. A short, broken or stale roster is never
 * quietly accepted, because a silently short roster is exactly how "I built a
 * tile and it did not show up" happens.
 *
 * Pure, apart from discoverTiles, which takes its fetch as an argument so all
 * of it is exercisable without a browser.
 */

/** The roster file, in the repo and on the wire. */
export const TILE_MANIFEST_PATH = 'public/tiles/manifest.json'
export const TILE_MANIFEST_URL = '/tiles/manifest.json'

/** Where a tile's sealed HTML lives, in the repo and on the wire. */
export const TILE_DIR = 'public/tiles'
export const tileFileUrl = (id: string) => `/tiles/${id}.html`
export const tileFilePath = (id: string) => `${TILE_DIR}/${id}.html`

/**
 * Ceiling on the roster. The board fetches every id in parallel, so a manifest
 * pasted from somewhere wrong could otherwise turn one page load into thousands
 * of requests. Over the ceiling the roster is truncated AND reported — never
 * silently.
 */
export const MAX_TILE_IDS = 64

/**
 * A legal tile id: it becomes both a file name and part of a localStorage key
 * (`vitality:<user>:tile:<id>:data`), so it stays short, boring and lowercase.
 * The first character must be alphanumeric, which alone rules out `.`, `..`
 * and every path-traversal shape.
 */
const TILE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/

/** Is this string usable as a tile id (a file name we are willing to fetch)? */
export function isTileId(value: unknown): value is string {
  return typeof value === 'string' && TILE_ID_RE.test(value)
}

export type RosterProblemCode =
  | 'manifest_missing'
  | 'manifest_malformed'
  | 'tile_id_rejected'
  | 'roster_truncated'
  | 'tile_file_missing'

export interface RosterProblem {
  code: RosterProblemCode
  /** One plain-English sentence, ready to render as-is. */
  message: string
}

export interface TileRoster {
  /** The ids to probe, de-duplicated, in manifest order. */
  ids: string[]
  /** Everything the board could not make sense of, in the order it hit it. */
  problems: RosterProblem[]
}

/** The outcome of one discovery pass: the roster, the tile files, and the problems. */
export interface TileScan extends TileRoster {
  /** id -> sealed HTML, for the roster ids whose file was actually there. */
  html: Record<string, string>
}

/** What a re-scan reports back to whoever asked for it. */
export interface TileRescan {
  /** Ids on the board now that were not on it before this re-scan. */
  added: string[]
  problems: RosterProblem[]
}

/**
 * The minimal shape discoverTiles needs from fetch. Structurally a real fetch
 * response, so a test can hand it a plain object.
 */
export type TileFetcher = (url: string) => Promise<{
  ok: boolean
  status: number
  text: () => Promise<string>
}>

const FALLBACK_NOTE = 'the board fell back to its built-in roster'

/**
 * Read a roster file. A bare `["coffee"]` is accepted as well as the canonical
 * `{"version": 1, "tiles": [...]}`, because a hand-written manifest from an AI
 * harness is exactly where the two shapes get confused and a rejected roster
 * means an invisible tile.
 *
 * `builtin` is the roster to use when the file cannot be read: the ids the app
 * ships with, which the board keeps working from rather than blanking itself.
 */
export function parseTileManifest(raw: string, builtin: readonly string[]): TileRoster {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallback(builtin, 'manifest_malformed', `The tile manifest at ${TILE_MANIFEST_PATH} is not valid JSON, so ${FALLBACK_NOTE}.`)
  }

  const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? (parsed as { tiles?: unknown }).tiles : undefined
  if (!Array.isArray(list)) {
    return fallback(
      builtin,
      'manifest_malformed',
      `The tile manifest at ${TILE_MANIFEST_PATH} does not list tile ids, so ${FALLBACK_NOTE}. It needs {"tiles":["coffee"]}, or a plain array of ids.`,
    )
  }

  const ids: string[] = []
  const seen = new Set<string>()
  const problems: RosterProblem[] = []
  list.forEach((entry, i) => {
    if (!isTileId(entry)) {
      problems.push({
        code: 'tile_id_rejected',
        message: `The tile manifest entry ${i + 1} is not a usable tile id (${typeof entry === 'string' ? `"${entry}"` : typeof entry}), so it was skipped. Ids are lowercase letters, digits, dot and dash, up to 40 characters.`,
      })
      return
    }
    // A duplicate id would only probe the same file twice, so it is collapsed
    // quietly: it costs nothing and there is nothing for the user to fix.
    if (seen.has(entry)) return
    seen.add(entry)
    ids.push(entry)
  })

  if (ids.length === 0) {
    return fallback(builtin, 'manifest_malformed', `The tile manifest at ${TILE_MANIFEST_PATH} lists no usable tile id, so ${FALLBACK_NOTE}.`)
  }
  if (ids.length > MAX_TILE_IDS) {
    problems.push({
      code: 'roster_truncated',
      message: `The tile manifest lists ${ids.length} tile ids; only the first ${MAX_TILE_IDS} were read.`,
    })
    return { ids: ids.slice(0, MAX_TILE_IDS), problems }
  }
  return { ids, problems }
}

function fallback(builtin: readonly string[], code: RosterProblemCode, message: string): TileRoster {
  return { ids: [...builtin], problems: [{ code, message }] }
}

/**
 * Read the roster, then read every tile it names.
 *
 * A roster id with no file is an empty slot, which is normal and silent — that
 * is how a fresh board with the manifest installed and no tiles behaves. An id
 * that is NOT one the app ships with, missing its file, is the opposite: it is a
 * registration without a tile, which is the failure a user hits right after an
 * AI harness half-finished a job. That one is reported.
 */
export async function discoverTiles(fetchTile: TileFetcher, builtin: readonly string[]): Promise<TileScan> {
  const problems: RosterProblem[] = []
  let roster: TileRoster

  try {
    const res = await fetchTile(TILE_MANIFEST_URL)
    if (!res.ok) {
      roster = fallback(
        builtin,
        'manifest_missing',
        `There is no tile manifest at ${TILE_MANIFEST_PATH}, so ${FALLBACK_NOTE}. A tile you add will not appear until that file lists its id.`,
      )
    } else {
      roster = parseTileManifest(await res.text(), builtin)
    }
  } catch {
    // A network blip is not a broken manifest; say the same thing either way,
    // because the outcome is identical — the board runs on its built-in roster.
    roster = fallback(
      builtin,
      'manifest_missing',
      `The tile manifest at ${TILE_MANIFEST_PATH} could not be read, so ${FALLBACK_NOTE}.`,
    )
  }

  problems.push(...roster.problems)

  const pairs = await Promise.all(
    roster.ids.map(async (id) => {
      try {
        const res = await fetchTile(tileFileUrl(id))
        if (!res.ok) return null
        const html = await res.text()
        return html.trim() ? ([id, html] as const) : null
      } catch {
        return null
      }
    }),
  )

  const html: Record<string, string> = {}
  for (const p of pairs) if (p) html[p[0]] = p[1]

  // A shipped id with no file is an empty slot, which is how a board starts:
  // silent, exactly as it always was. An id the app does NOT ship with is the
  // other thing entirely — a registration with no tile behind it, which is what
  // a user sees right after a harness wrote the manifest and not the file.
  const shipped = new Set(builtin)
  for (const id of roster.ids) {
    if (html[id] || shipped.has(id)) continue
    problems.push({
      code: 'tile_file_missing',
      message: `The tile manifest lists "${id}" but ${tileFilePath(id)} is not there, so that tile is not on the board.`,
    })
  }

  return { ids: roster.ids, html, problems }
}

/**
 * The name to show for a tile id the registry does not know. Derived from the
 * id itself rather than thrown on: a tile an AI harness added has no descriptor
 * in coreTiles.tsx, and the board still has to put a human name on it.
 */
export function humanizeTileId(id: string): string {
  const words = id.replace(/[-_.]+/g, ' ').trim()
  if (!words) return 'Tile'
  return words.charAt(0).toUpperCase() + words.slice(1)
}
