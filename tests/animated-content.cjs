const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = ts.transpileModule(fs.readFileSync('components/AnimatedContent.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function mount(reduced, props = {}) {
  const node = {}, scroller = {}, calls = {}, events = []
  let effect, mediaCleanup
  const react = { useRef: () => ({ current: node }), useEffect: (fn) => { effect = fn } }
  const timeline = {
    to(el, vars) { assert.equal(el, node); calls.reveal = vars },
    play() { events.push('play') },
    kill() { events.push('timeline killed') },
  }
  const trigger = { create(options) { calls.trigger = options; return { kill() { events.push('trigger killed') } } } }
  const gsap = {
    registerPlugin(plugin) { assert.equal(plugin, trigger) },
    matchMedia() { return {
      add(query, fn) { calls.query = query; if (!reduced) mediaCleanup = fn() },
      revert() { events.push('revert'); mediaCleanup?.() },
    } },
    set(el, vars) { assert.equal(el, node); calls.initial = vars },
    timeline(options) { calls.timeline = options; return timeline },
    to(el, vars) { assert.equal(el, node); calls.disappear = vars },
    killTweensOf(el) { assert.equal(el, node); events.push('tweens killed') },
  }
  const jsx = (type, props) => ({ type, props })
  vm.runInNewContext(source, { exports: (calls.exports = {}), window: {},
    document: { getElementById: () => null, querySelector: () => scroller },
    require: (id) => id === 'react' ? react : id === 'gsap' ? { gsap } : id === 'gsap/ScrollTrigger' ? { ScrollTrigger: trigger } : { jsx },
  })
  const tree = calls.exports.default({ children: 'Accessible content', ...props })
  assert.equal(tree.props.children, 'Accessible content')
  assert.equal(tree.props.style, undefined)
  return { calls, events, scroller, cleanup: effect(), reduce: () => mediaCleanup?.() }
}

let complete = 0, disappeared = 0
const active = mount(false, { container: '#scroll', direction: 'horizontal', reverse: true, distance: 12,
  scale: 0.9, initialOpacity: 0.85, threshold: 0.25, delay: 0.2, duration: 0.5,
  disappearAfter: 2, disappearDuration: 0.3, onComplete: () => complete++, onDisappearanceComplete: () => disappeared++ })
assert.equal(active.calls.query, '(prefers-reduced-motion: no-preference)')
assert.equal(active.calls.initial.x, -12)
assert.equal(active.calls.initial.opacity, 0.85)
assert.equal(active.calls.initial.scale, 0.9)
assert.equal(active.calls.reveal.x, 0)
assert.equal(active.calls.reveal.duration, 0.5)
assert.equal(active.calls.trigger.scroller, active.scroller)
assert.equal(active.calls.trigger.start, 'top 75%')
active.calls.trigger.onEnter()
active.calls.timeline.onComplete()
assert.equal(complete, 1)
assert.equal(active.calls.disappear.x, 12)
assert.equal(active.calls.disappear.delay, 2)
active.calls.disappear.onComplete()
assert.equal(disappeared, 1)
active.reduce()
assert.deepEqual(active.events, ['play', 'trigger killed', 'timeline killed', 'tweens killed'])

const reduced = mount(true)
assert.equal(reduced.calls.initial, undefined)
assert.equal(reduced.calls.trigger, undefined)
reduced.cleanup()
assert.deepEqual(reduced.events, ['revert'])
console.log('animated content checks passed')
