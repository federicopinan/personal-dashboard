const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const rawGoals = JSON.stringify([{ id: 'custom', title: 'Custom', weights: { train: 30, sleep: 20, custom: 30, vitals: 20 } }, { id: 'empty', weights: { vitals: 100 } }])
const storage = new Map([['vitality:goals', rawGoals]])
const context = { exports: {}, window: { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } } }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/tiles/weights.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
const goals = context.exports.goals()
assert.deepEqual(JSON.parse(JSON.stringify(goals[0].weights)), { train: 38, sleep: 25, custom: 37 })
assert.deepEqual(JSON.parse(JSON.stringify(goals[1].weights)), {})
assert.equal(storage.get('vitality:goals'), rawGoals)
for (const goal of context.exports.DEFAULT_GOALS) assert.equal(Object.values(goal.weights).reduce((a, b) => a + b, 0), 100)
assert.ok(!JSON.stringify(context.exports.allGoals()).includes('"vitals"'))

const sleep = fs.readFileSync('public/tiles/sleep.html', 'utf8')
const pure = sleep.slice(sleep.indexOf('/* ═══ PURE:BEGIN'), sleep.indexOf('/* ═══ PURE:END'))
const sc = {}; vm.runInNewContext(pure, sc)
const legacy = { '2024-01-01': { sleepHours: 7 }, '2024-03-11': { sleepHours: 8 }, '2024-03-12': { sleepHours: 6 }, '2024-03-13': { sleepHours: 9 } }
const own = { '2024-03-10': { hours: 5 }, '2024-03-11': { note: 'retain' }, note: 'other data' }
const first = sc.mergeSleepHistory(own, legacy)
assert.equal(first.imported, 2)
assert.equal(first.nights['2023-12-31'].hours, 7)
assert.equal(first.nights['2024-03-10'].hours, 5)
assert.equal(first.nights['2024-03-11'].note, 'retain')
assert.equal(first.nights['2024-03-12'].hours, 9)
assert.equal(sc.mergeSleepHistory(JSON.parse(JSON.stringify(first.nights)), legacy).imported, 0)
assert.equal(legacy['2024-01-01'].sleepHours, 7)
assert.match(sleep, /BRIDGE\.read\('vitals'\)/)
assert.match(sleep, /BRIDGE\.save\(store\)/)

const manifest = JSON.parse(fs.readFileSync('public/tiles/manifest.json'))
assert.ok(!manifest.tiles.includes('vitals'))
const grid = fs.readFileSync('app/app/DashboardGrid.tsx', 'utf8')
assert.match(grid, /id !== 'vee' && filled\[id\] && !removed\.includes\(id\)/)
const peak = fs.readFileSync('public/tiles/peak.html', 'utf8')
assert.doesNotMatch(peak, /read\('vitals'\)|recoveryFromVitals|w\.recovery|whoop\.recovery/)
const math = peak.slice(peak.indexOf('function whoopMultiplier('), peak.indexOf('function tierFor('))
const pc = { BASELINE: Array(25).fill(50), contributionAt: () => 0 }
vm.runInNewContext(math, pc)
assert.equal(pc.computeCurveDetailed([], { recovery: 1 }, 75)[0].score, 50)
assert.equal(pc.computeCurveDetailed([], { recovery: 99 }, 75)[0].score, 50)
for (const tile of ['peak', 'sleep']) assert.equal(fs.readFileSync(`public/tiles/${tile}.html`, 'utf8'), fs.readFileSync(`tiles-library/${tile}.html`, 'utf8'))
console.log('Vitals removal regression checks passed')

// Exercise the actual Sleep boot against a bridge, then reload its saved state.
async function sleepBoot(initial, source) {
  let saved = JSON.parse(JSON.stringify(initial))
  let writes = 0
  const boot = sleep.slice(sleep.indexOf('function boot(){'), sleep.indexOf('\nif(window.ResizeObserver)'))
  const c = { ...sc, store: {}, draft: 7.5, importedCount: 0,
    BRIDGE: { load: async () => saved, read: async (slot) => { assert.equal(slot, 'vitals'); return source }, save: async (v) => { saved = JSON.parse(JSON.stringify(v)); writes++ } },
    document: { getElementById: () => ({}) }, fmtLongDate: () => '', lastNightKey: () => '2024-03-12',
    renderSeg() {}, spawnMotes() {}, renderAll() {}, reportLatest() {}, nightFor: () => null }
  vm.runInNewContext(boot + '\nboot()', c)
  await new Promise((resolve) => setImmediate(resolve))
  return { saved, writes }
}
;(async () => {
  const source = { ...legacy, '2024-02-30': { sleepHours: 4 } }
  const firstBoot = await sleepBoot(own, source)
  assert.equal(firstBoot.writes, 1)
  assert.equal(firstBoot.saved['2023-12-31'].hours, 7)
  assert.equal(firstBoot.saved['2024-03-11'].note, 'retain')
  assert.equal(firstBoot.saved['2024-02-29'], undefined)
  const reload = await sleepBoot(firstBoot.saved, source)
  assert.equal(reload.writes, 0)
  assert.deepEqual(reload.saved, firstBoot.saved)
  console.log('Sleep bridge migration and reload checks passed')
})().catch((error) => { console.error(error); process.exitCode = 1 })

// Exercise the actual settings component and its storage writes, not only helpers.
function settings(initial) {
  storage.set('vitality:goals', JSON.stringify(initial))
  storage.set('vitality:goal:active', initial[0].id)
  const states = [], effects = [], listeners = {}
  let cursor = 0, effect = 0
  const react = {
    useState(value) { const i = cursor++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], (v) => { states[i] = typeof v === 'function' ? v(states[i]) : v }] },
    useEffect(fn) { const i = effect++; if (!effects[i]) { effects[i] = true; fn() } },
  }
  const jsx = (type, props) => ({ type, props: props || {} })
  const win = { ...context.window, addEventListener: (n, f) => { listeners[n] = f }, removeEventListener() {}, dispatchEvent: (e) => listeners[e.type]?.(), setTimeout() {} }
  const source = ts.transpileModule(fs.readFileSync('app/app/Dashboard.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const c = { exports: {}, window: win, Event: class { constructor(type) { this.type = type } },
    require(id) {
      if (id === 'react') return react
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (id === '@/lib/tiles/weights') return context.exports
      if (id === '@/lib/tiles/profile') return { profile: () => ({}) }
      if (id === '@/lib/tiles/tileStore') return { tileStore: { listDataIds: () => [] } }
      return { default: {} }
    } }
  vm.runInNewContext(source + '\nexports.SettingsPanel = SettingsPanel', c)
  function render() { cursor = 0; effect = 0; return c.exports.SettingsPanel({ userId: 'me', onClose() {} }) }
  function findAll(node, predicate, result = []) {
    if (Array.isArray(node)) { node.forEach((item) => findAll(item, predicate, result)); return result }
    if (!node || typeof node !== 'object') return result
    if (predicate(node)) result.push(node)
    findAll(node.props?.children, predicate, result)
    return result
  }
  function find(predicate) { const matches = findAll(render(), predicate); assert.ok(matches.length); return matches[0] }
  find((n) => n.type === 'button' && n.props.children === 'equation').props.onClick()
  return { find, findAll: (p) => findAll(render(), p), saved: () => JSON.parse(storage.get('vitality:goals')) }
}
const original = [
  { id: 'mine', title: 'Mine', weights: { train: 20, vitals: 80 }, extra: 'keep' },
  { id: 'soc-analyst', title: 'SOC', weights: { train: 4, fuel: 6, vitals: 19, peak: 5, finance: 48 } },
]
const panel = settings(original)
assert.equal(panel.findAll((n) => n.type === 'input' && n.props.type === 'range')[0].props.value, 100)
panel.find((n) => n.type === 'button' && n.props.children === 'Save equation changes').props.onClick()
assert.deepEqual(panel.saved(), original)
panel.find((n) => n.type === 'input' && n.props.type === 'text').props.onChange({ target: { value: 'Renamed' } })
panel.find((n) => n.type === 'button' && String(n.props.children).startsWith('Saved')).props.onClick()
assert.deepEqual(panel.saved()[0].weights, original[0].weights)
assert.deepEqual(panel.saved()[1], original[1])
panel.findAll((n) => n.type === 'input' && n.props.type === 'range')[0].props.onChange({ target: { value: '40' } })
panel.find((n) => n.type === 'button' && String(n.props.children).startsWith('Saved')).props.onClick()
assert.equal(panel.saved()[0].weights.vitals, 80)
assert.equal(panel.saved()[0].weights.train, 40)
assert.equal(context.exports.goals()[0].weights.train, 40)
assert.deepEqual(panel.saved()[1], original[1])
panel.find((n) => n.type === 'select').props.onChange({ target: { value: 'soc-analyst' } })
const sliders = panel.findAll((n) => n.type === 'input' && n.props.type === 'range')
assert.ok(sliders[2].props.value > 0 && sliders[3].props.value > 0)
panel.find((n) => n.type === 'button' && String(n.props.children).startsWith('Saved')).props.onClick()
assert.equal(storage.get('vitality:goal:active'), 'soc-analyst')
assert.deepEqual(panel.saved()[1], original[1])
const fallback = context.exports.goals()[1].weights
assert.deepEqual(JSON.parse(JSON.stringify(fallback)), { train: 5, fuel: 8, peak: 6, finance: 59, sleep: 15, screen: 7 })
assert.equal(Object.values(fallback).reduce((a, b) => a + b, 0), 100)
storage.set('vitality:goals', JSON.stringify([{ ...original[1], weights: { train: 4, fuel: 6 } }]))
assert.equal(context.exports.goals()[0].weights.sleep, 12)
assert.equal(context.exports.goals()[0].weights.screen, 6)
storage.set('vitality:goals', JSON.stringify([{ ...original[1], weights: { ...original[1].weights, sleep: 0, screen: 0 } }]))
assert.equal(context.exports.goals()[0].weights.sleep, 0)
assert.equal(context.exports.goals()[0].weights.screen, 0)
storage.set('vitality:goals', JSON.stringify([{ id: 'soc-analyst', title: 'Pending', weights: {} }]))
assert.deepEqual(JSON.parse(JSON.stringify(context.exports.goals()[0].weights)), {})
console.log('Settings save and legacy fallback checks passed')
