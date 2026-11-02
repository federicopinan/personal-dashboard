const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/tiles/peak.html', 'utf8');
assert.equal(fs.readFileSync('tiles-library/peak.html', 'utf8'), html);
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\nboot\(\);\s*$/, '');

async function mount(storage) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: true, innerHTML: '', style: {}, classList: { toggle() {} },
      addEventListener(type, handler) { this[type] = handler; },
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    document: { getElementById: element, body: {} },
    window: { Vitality: {
      load: async () => structuredClone(storage.value),
      save: value => { storage.value = structuredClone(value); },
    } },
    ResizeObserver: class { observe() {} },
    setTimeout,
  });
  vm.runInContext(script, context);
  vm.runInContext('render=renderStrip=renderGauge=renderReadout=renderOpenBlock=spawnMotes=()=>{}', context);
  await vm.runInContext('boot()', context);
  return { element, context };
}

function click(element, attribute, value) {
  element.click({ target: { closest: selector => selector === `[${attribute}]`
    ? { getAttribute: () => value } : null } });
}

(async () => {
  const initial = {
    quickKeys: ['coffee'],
    logs: [{ id: 'm1', key: 'mate', dose: 40 }, { id: 'c1', key: 'coffee', dose: 95 }],
    events: [{ title: 'Work', startHour: 9 }], taps: [{ hour: 10 }],
    whoop: { recovery: 70 }, weightKg: 80, extra: { keep: true },
  };
  const storage = { value: structuredClone(initial) };
  let tile = await mount(storage);
  tile.element('addBtn').click();
  assert.match(tile.element('addRow').innerHTML, /data-pin="mate"/);
  click(tile.element('addRow'), 'data-pin', 'mate');
  click(tile.element('addRow'), 'data-pin', 'mate');
  assert.deepEqual(storage.value.quickKeys, ['coffee', 'mate']);
  assert.doesNotMatch(tile.element('addRow').innerHTML, /data-pin="mate"/);
  tile = await mount(storage);
  click(tile.element('stackGrid'), 'data-remove', 'mate');
  assert.deepEqual(storage.value.quickKeys, ['coffee']);
  assert.deepEqual({ ...storage.value, quickKeys: initial.quickKeys }, initial);
  tile = await mount(storage);
  tile.element('addBtn').click();
  assert.match(tile.element('addRow').innerHTML, /data-pin="mate"/);
  click(tile.element('addRow'), 'data-pin', 'mate');
  assert.deepEqual({ ...storage.value, quickKeys: initial.quickKeys }, initial);

  const fresh = await mount({ value: null });
  fresh.element('addBtn').click();
  assert.doesNotMatch(fresh.element('addRow').innerHTML, /data-pin="mate"/);
  assert.match(fresh.element('stackGrid').innerHTML, /data-key="mate"/);
  const empty = { value: { quickKeys: [], logs: initial.logs } };
  const emptyTile = await mount(empty);
  emptyTile.element('addBtn').click();
  assert.match(emptyTile.element('addRow').innerHTML, /data-pin="mate"/);
  assert.doesNotMatch(emptyTile.element('stackGrid').innerHTML, /data-key="mate"/);

  for (const key of ['coffee', 'espresso', 'mate', 'matcha']) {
    const saved = { value: { quickKeys: [key], logs: initial.logs } };
    let current = await mount(saved);
    click(current.element('stackGrid'), 'data-remove', key);
    assert.deepEqual(saved.value.quickKeys, []);
    current = await mount(saved);
    current.element('addBtn').click();
    assert.match(current.element('addRow').innerHTML, new RegExp(`data-pin="${key}"`));
    click(current.element('addRow'), 'data-pin', key);
    click(current.element('addRow'), 'data-pin', key);
    assert.deepEqual(saved.value.quickKeys, [key]);
    assert.deepEqual(saved.value.logs, initial.logs);
    current = await mount(saved);
    assert.match(current.element('stackGrid').innerHTML, new RegExp(`data-key="${key}"`));
  }
  console.log('Peak quick-key checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
