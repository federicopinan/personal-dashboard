const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, data = {}) {
  const values = new Map(Object.entries(data))
  const storage = { getItem: (k) => values.has(k) ? values.get(k) : null, setItem: (k, v) => values.set(k, v) }
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const context = { exports: {}, window: { localStorage: storage } }
  vm.runInNewContext(source, context)
  return { api: context.exports, values }
}
const fresh = load('lib/tiles/weights.ts')
assert.equal(fresh.api.goals().length, 0)
assert.equal(fresh.api.allGoals().length, 0)
assert.equal(fresh.api.noticedFeed().length, 0)
assert.equal(load('lib/tiles/profile.ts').api.profile().name, undefined)
const savedGoal = JSON.stringify([{ id: 'mine', title: 'My goal', weights: { train: 100 } }])
const saved = load('lib/tiles/weights.ts', { 'vitality:goals': savedGoal })
assert.equal(saved.api.goals()[0].title, 'My goal')
assert.equal(saved.values.get('vitality:goals'), savedGoal)
assert.equal(load('lib/tiles/profile.ts', { 'vitality:profile': '{"name":"Alex"}' }).api.profile().name, 'Alex')

const train = fs.readFileSync('public/tiles/train.html', 'utf8')
const functionSource = train.slice(train.indexOf('  function loadLog(){'), train.indexOf('  function saveLog(){'))
function boot(data) {
  const values = new Map(Object.entries(data))
  const context = { DATA: null, LIFTS: [], FRESH_START: false, DEMO_MODE: false, STORE: 'v3', STORE2: 'v4',
    VStore: { getItem: (key) => values.get(key) || null }, uid: () => 'new', activeDay: () => context.DATA.days.find((d) => d.id === context.DATA.activeDayId) }
  vm.runInNewContext(`${functionSource}\nloadLog()`, context)
  return { context, values }
}
assert.equal(boot({}).context.FRESH_START, true)
assert.equal(boot({ v4: '{bad json' }).context.FRESH_START, false)
const routine = JSON.stringify({ days: [{ id: 'old', name: 'Push', lifts: [{ name: 'Barbell bench', weight: 85, history: [{ w: 72.5 }, {}, {}, {}, {}, {}] }] }], activeDayId: 'old' })
const existing = boot({ v4: routine })
assert.equal(existing.context.FRESH_START, false)
assert.equal(existing.context.DATA.days[0].lifts[0].weight, 85)
assert.equal(existing.values.get('v4'), routine)
assert.match(train, /<button type="button" class="su-card"/)
assert.match(train, /'<\/button>'\)\.join/)
console.log('onboarding checks passed')

function onboarding(initial) {
  const values = new Map(Object.entries(initial))
  const events = []
  const state = []
  let index = 0
  let mounted = false
  let gymOpened = 0
  let effectIndex = 0
  const effectDeps = []
  const storage = { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) }
  const react = {
    useState(value) { const i = index++; if (!(i in state)) state[i] = value; return [state[i], (v) => { state[i] = typeof v === 'function' ? v(state[i]) : v }] },
    useEffect(fn, deps) { const i = effectIndex++; const previous = effectDeps[i]; if (!previous || deps.some((value, j) => value !== previous[j])) { effectDeps[i] = deps; fn() } },
  }
  const jsx = (type, props) => ({ type, props: props || {} })
  const source = ts.transpileModule(fs.readFileSync('app/app/Onboarding.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const context = { exports: {}, localStorage: storage, window: { dispatchEvent: (event) => events.push(event.type) }, Event: class { constructor(type) { this.type = type } }, Date, Math,
    require: (id) => id === 'react' ? react : id === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { default: {} } }
  vm.runInNewContext(source, context)
  function render() { index = 0; effectIndex = 0; const tree = context.exports.default({ onGym: () => events.push('gym'), gymOpened }); mounted = true; return tree }
  function find(node, type) {
    if (!node || typeof node !== 'object') return null
    if (node.type === type) return node
    const children = node.props?.children
    for (const child of Array.isArray(children) ? children : [children]) { const result = find(child, type); if (result) return result }
    return null
  }
  render()
  return { values, events, state, render, find, opened: () => { gymOpened++; render() } }
}
const flow = onboarding({})
assert.equal(flow.state[1], 'details')
flow.state[2] = 'Alex'; flow.state[3] = 'Run a 5k'
flow.find(flow.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(JSON.parse(flow.values.get('vitality:profile')).name, 'Alex')
assert.equal(JSON.parse(flow.values.get('vitality:goals'))[0].title, 'Run a 5k')
assert.equal(flow.state[1], 'gym')
assert.equal(onboarding(Object.fromEntries(flow.values)).state[1], 'gym')
const partialProfile = '{"name":"Existing","weightKg":70}'
const partial = onboarding({ 'vitality:profile': partialProfile })
partial.state[3] = 'New goal'
partial.find(partial.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(partial.values.get('vitality:profile'), partialProfile)
const complete = onboarding({ 'vitality:profile': partialProfile, 'vitality:goals': savedGoal })
assert.equal(complete.state[1], 'hidden')
const concurrent = onboarding({})
concurrent.state[2] = 'New'; concurrent.state[3] = 'New goal'
concurrent.values.set('vitality:profile', partialProfile)
concurrent.find(concurrent.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(concurrent.values.get('vitality:profile'), partialProfile)
console.log('onboarding flow checks passed')

const partialGoals = onboarding({ 'vitality:goals': savedGoal })
partialGoals.state[2] = 'New name'
partialGoals.find(partialGoals.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(partialGoals.values.get('vitality:goals'), savedGoal)
const gymButton = partialGoals.find(partialGoals.render(), 'button')
gymButton.props.onClick()
assert.equal(partialGoals.events.includes('gym'), true)
assert.equal(onboarding(Object.fromEntries(partialGoals.values)).state[1], 'gym')
partialGoals.opened()
assert.equal(onboarding(Object.fromEntries(partialGoals.values)).state[1], 'hidden')
console.log('partial setup and gym handoff checks passed')

// Regression: an existing overall goal must remain selectable from another goal.
const legacy = load('lib/tiles/weights.ts', { 'vitality:goals': savedGoal, 'vitality:goal:active': 'mine' })
assert.ok(legacy.api.allGoals().some((goal) => goal.id === 'overall'))

// Dangling Overall must not shadow a newly created goal.
const dangling = onboarding({ 'vitality:goal:active': 'overall' })
dangling.state[2] = 'Alex'; dangling.state[3] = 'Run'
dangling.find(dangling.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(dangling.values.get('vitality:goal:active'), JSON.parse(dangling.values.get('vitality:goals'))[0].id)
assert.equal(load('lib/tiles/weights.ts', Object.fromEntries(dangling.values)).api.activeGoal().title, 'Run')

for (const raw of ['{}', '', '{bad', 'null', '[]']) {
  const candidate = onboarding({ 'vitality:profile': raw, 'vitality:goals': savedGoal })
  assert.equal(candidate.state[1], 'details', `invalid profile ${raw}`)
  candidate.state[2] = 'New name'
  candidate.find(candidate.render(), 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(candidate.values.get('vitality:profile:onboarding-backup'), raw)
  assert.equal(JSON.parse(candidate.values.get('vitality:profile')).name, 'New name')
  assert.equal(candidate.values.get('vitality:goals'), savedGoal)
}
const profileWithFields = onboarding({ 'vitality:profile': '{"weightKg":72}', 'vitality:goals': savedGoal })
profileWithFields.state[2] = 'Alex'
profileWithFields.find(profileWithFields.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(JSON.parse(profileWithFields.values.get('vitality:profile')).weightKg, 72)
for (const raw of ['[]', '', '{bad', 'null', '{}', '[{"id":"x"}]']) {
  const candidate = onboarding({ 'vitality:profile': partialProfile, 'vitality:goals': raw, 'vitality:goal:active': 'overall' })
  assert.equal(candidate.state[1], 'details', `invalid goals ${raw}`)
  candidate.state[3] = 'New goal'
  candidate.find(candidate.render(), 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(candidate.values.get('vitality:goals:onboarding-backup'), raw)
  assert.equal(candidate.values.get('vitality:profile'), partialProfile)
  assert.equal(candidate.values.get('vitality:goal:active'), JSON.parse(candidate.values.get('vitality:goals'))[0].id)
}
const mixedRaw = JSON.stringify([JSON.parse(savedGoal)[0], { unknown: 'retain in backup' }])
const mixed = onboarding({ 'vitality:profile': partialProfile, 'vitality:goals': mixedRaw, 'vitality:goal:active': 'mine' })
mixed.state[3] = 'Another goal'
mixed.find(mixed.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(mixed.values.get('vitality:goals:onboarding-backup'), mixedRaw)
assert.equal(JSON.parse(mixed.values.get('vitality:goals')).length, 2)
assert.equal(mixed.values.get('vitality:goal:active'), 'mine')
const oldBackup = onboarding({ 'vitality:profile': '{}', 'vitality:profile:onboarding-backup': 'older', 'vitality:goals': savedGoal })
oldBackup.state[2] = 'Alex'
oldBackup.find(oldBackup.render(), 'form').props.onSubmit({ preventDefault() {} })
assert.equal(oldBackup.values.get('vitality:profile:onboarding-backup'), 'older')
assert.equal(oldBackup.values.get('vitality:profile:onboarding-backup:1'), '{}')
console.log('regression checks passed')

// Execute the grid's real handoff effect: discovery failure must not acknowledge it.
const grid = fs.readFileSync('app/app/DashboardGrid.tsx', 'utf8')
const effect = grid.match(/useEffect\(\(\) => \{\s*if \(gymRequest && loaded\) \{[\s\S]*?\}\s*\}, \[gymRequest, loaded, filled\.train\]\)/)
assert.ok(effect, 'Train discovery handoff effect is present')
function gridHandoff(loaded, trainHtml) {
  const actions = []
  const context = { gymRequest: 1, loaded, filled: { train: trainHtml }, gymAwaiting: { current: false },
    setOpenId: (id) => actions.push(`open:${id}`), setConnectId: (id) => actions.push(`connect:${id}`), useEffect: (fn) => fn() }
  vm.runInNewContext(effect[0], context)
  return { actions, awaiting: context.gymAwaiting.current }
}
assert.deepEqual(gridHandoff(false, undefined), { actions: [], awaiting: false })
assert.deepEqual(gridHandoff(true, undefined), { actions: ['connect:train'], awaiting: false })
assert.deepEqual(gridHandoff(true, '<html>'), { actions: ['open:train'], awaiting: true })
assert.equal(dangling.values.get('vitality:goal:active:onboarding-backup'), 'overall')
console.log('gym discovery regression checks passed')
