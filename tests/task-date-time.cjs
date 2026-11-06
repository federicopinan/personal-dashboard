const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/taskSchedule.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
const { readTasks, withTime, validTime, carryTasks, moveTask } = context.exports
const json = value => JSON.parse(JSON.stringify(value))
const key = day => `vitality:tasks:${day}`
const source = '2026-12-31', destination = '2027-01-01'
const legacy = { id: 'old', text: 'Legacy', done: false, extra: 'preserved' }
const other = { id: 'other', text: 'Other', done: true }
const values = new Map([[key(source), JSON.stringify([legacy])], [key(destination), JSON.stringify([other])]])
let fail = ''
const storage = { getItem: k => values.get(k) ?? null, setItem(k, v) { if (k === fail) throw Error('quota'); values.set(k, v) } }
assert.deepEqual(json(readTasks(storage, source)), [legacy])
assert.equal(validTime('23:59'), true)
assert.equal(validTime('24:00'), false)
assert.equal(validTime('9:00'), false)
const timed = json(withTime(legacy, '09:30'))
assert.equal(timed.time, '09:30')
assert.equal('time' in withTime(timed, ''), false)
assert.deepEqual(json(carryTasks([other], [timed, timed, other])), [other, timed])
assert.deepEqual(json(readTasks(storage, source)), [legacy])
fail = key(destination)
assert.throws(() => moveTask(storage, source, destination, [legacy], timed))
assert.deepEqual(json(readTasks(storage, source)), [legacy])
fail = key(source)
assert.throws(() => moveTask(storage, source, destination, [legacy], timed))
assert.deepEqual(json(readTasks(storage, source)), [legacy])
assert.deepEqual(json(readTasks(storage, destination)), [other, timed])
assert.throws(() => moveTask(storage, source, destination, [legacy], timed))
values.set(key(destination), '{broken')
fail = ''
assert.throws(() => moveTask(storage, source, destination, [legacy], timed))
assert.deepEqual(json(readTasks(storage, source)), [legacy])
values.set(key(destination), JSON.stringify([other]))
moveTask(storage, source, destination, [legacy], timed)
assert.deepEqual(json(readTasks(storage, source)), [])
assert.deepEqual(json(readTasks(storage, destination)), [other, timed])

// Exercise the actual local-date parser and stepper in contrasting time zones.
const section = fs.readFileSync('app/tasks/TasksSection.tsx', 'utf8')
const dateFunctions = section.slice(section.indexOf('function dayFromKey('), section.indexOf('// The readable form'))
const localDate = ts.transpileModule(fs.readFileSync('lib/localDate.ts', 'utf8').replace('export function', 'function'), { compilerOptions: { module: ts.ModuleKind.None } }).outputText
for (const zone of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
  process.env.TZ = zone
  const ctx = {}
  vm.runInNewContext(localDate + '\n' + ts.transpileModule(dateFunctions, { compilerOptions: { module: ts.ModuleKind.None } }).outputText, ctx)
  assert.equal(ctx.normaliseDayKey('2024-2-29'), '2024-02-29')
  assert.equal(ctx.normaliseDayKey('2023-2-29'), null)
  assert.equal(ctx.shiftDayKey('2026-12-31', 1), '2027-01-01')
  assert.equal(ctx.shiftDayKey('2024-03-10', 1), '2024-03-11')
}
console.log('Task date/time regression checks passed')

// Browser scenario (manual): seed a legacy vitality:tasks:YYYY-MM-DD array,
// add a dated/timed task, edit its date and time, clear the time, and reload.
// Carry it forward, verify the source and dashboard count, then repeat controls
// with the keyboard at 320px. Simulate failed writes before confirming a move.
