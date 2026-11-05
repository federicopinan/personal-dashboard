const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = ts.transpileModule(fs.readFileSync('components/FadeContent.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText

function mount(reduced, props = {}) {
  const node = {}, scroller = {}, calls = {}, events = []
  let effect
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
      add(query, fn) { calls.query = query; if (!reduced) this.cleanup = fn() },
      revert() { events.push('revert'); this.cleanup?.() },
    } },
    set(el, vars) { assert.equal(el, node); calls.initial = vars },
    timeline(options) { calls.timeline = options; return timeline },
    to(el, vars) { assert.equal(el, node); calls.disappear = vars },
    killTweensOf(el) { assert.equal(el, node); events.push('tweens killed') },
  }
  const jsx = (type, props) => ({ type, props })
  const context = { exports: {}, window: {}, document: { getElementById: () => null, querySelector: (selector) => { assert.equal(selector, '#scroll'); return scroller } },
    require: (id) => id === 'react' ? react : id === 'gsap' ? { gsap } : id === 'gsap/ScrollTrigger' ? { ScrollTrigger: trigger } : { jsx } }
  vm.runInNewContext(source, context)
  const tree = context.exports.default({ children: 'Accessible content', className: 'example', ...props })
  assert.equal(tree.props.children, 'Accessible content')
  assert.equal(tree.props.className, 'example')
  assert.equal(tree.props.style, undefined)
  return { calls, events, scroller, cleanup: effect() }
}

let completed = 0, disappeared = 0
const active = mount(false, { container: '#scroll', blur: true, initialOpacity: 0.75, duration: 1200, delay: 200, threshold: 0.25,
  ease: 'linear', disappearAfter: 2000, disappearDuration: 300, disappearEase: 'power1.in',
  onComplete: () => completed++, onDisappearanceComplete: () => disappeared++ })
assert.equal(active.calls.query, '(prefers-reduced-motion: no-preference)')
assert.equal(active.calls.initial.autoAlpha, 0.75)
assert.equal(active.calls.initial.filter, 'blur(10px)')
assert.equal(active.calls.timeline.paused, true)
assert.equal(active.calls.timeline.delay, 0.2)
assert.equal(active.calls.reveal.duration, 1.2)
assert.equal(active.calls.reveal.ease, 'linear')
assert.equal(active.calls.trigger.scroller, active.scroller)
assert.equal(active.calls.trigger.start, 'top 75%')
assert.equal(active.calls.trigger.once, true)
active.calls.trigger.onEnter()
assert.equal(active.events[0], 'play')
active.calls.timeline.onComplete()
assert.equal(completed, 1)
assert.equal(active.calls.disappear.delay, 2)
assert.equal(active.calls.disappear.duration, 0.3)
assert.equal(active.calls.disappear.ease, 'power1.in')
active.calls.disappear.onComplete()
assert.equal(disappeared, 1)
active.cleanup()
assert.deepEqual(active.events.slice(1), ['revert', 'trigger killed', 'timeline killed', 'tweens killed'])

const reduced = mount(true)
assert.equal(reduced.calls.query, '(prefers-reduced-motion: no-preference)')
assert.equal(reduced.calls.initial, undefined)
assert.equal(reduced.calls.trigger, undefined)
reduced.cleanup()
console.log('fade content checks passed')
