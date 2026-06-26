const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

process.env.TZ = 'Asia/Tokyo';

const ROOT = __dirname;

function createLocalStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    key(index) {
      return Array.from(data.keys())[index] || null;
    },
    get length() {
      return data.size;
    },
  };
}

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    parentNode: null,
    attributes: {},
    classList: {
      values: new Set(),
      add(value) {
        this.values.add(value);
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function loadDashboardShell(pathname = '/index.html') {
  const listeners = {};
  const elementsById = new Map();
  const appended = [];
  const containerAppended = [];
  const mainContainer = createElement('div');
  mainContainer.className = 'shell';
  mainContainer.appendChild = function appendChild(element) {
    element.parentNode = this;
    containerAppended.push(element);
  };
  const document = {
    head: {
      appendChild(element) {
        element.parentNode = this;
        if (element.id) elementsById.set(element.id, element);
      },
    },
    body: {
      appended,
      classList: {
        values: new Set(),
        add(value) {
          this.values.add(value);
        },
      },
      appendChild(element) {
        element.parentNode = this;
        appended.push(element);
      },
    },
    createElement,
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector(selector) {
      if (selector === 'nav.tabbar') {
        return [...containerAppended, ...appended].find((element) => element.tagName === 'NAV' && element.className === 'tabbar') || null;
      }
      if (selector === '.container, .shell, .po-shell, .weight-card, main') return mainContainer;
      return null;
    },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatch(type, event = {}) {
      (listeners[type] || []).forEach((handler) => handler(event));
    },
  };
  const events = [];
  const window = {
    document,
    location: { origin: 'https://example.test', pathname, href: `https://example.test${pathname}` },
    dispatchEvent(event) {
      events.push(event);
    },
    addEventListener(type, handler) {
      document.addEventListener(type, handler);
    },
    matchMedia() {
      return { matches: false };
    },
  };
  const context = {
    window,
    document,
    location: window.location,
    localStorage: createLocalStorage(),
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    },
    URL,
    setTimeout,
    requestAnimationFrame(callback) {
      callback();
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'dashboard-shell.js'), 'utf8'), context, { filename: 'dashboard-shell.js' });
  return { context, document, events, appended, containerAppended, mainContainer };
}

function loadFocusTimer() {
  const listeners = {};
  const document = {
    readyState: 'loading',
    head: { appendChild() {} },
    body: { appendChild() {} },
    createElement,
    getElementById() { return null; },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
  };
  const window = {
    document,
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatchEvent() {},
  };
  const context = {
    window,
    document,
    localStorage: createLocalStorage(),
    CustomEvent: class CustomEvent {},
    setInterval() { return 1; },
    clearInterval() {},
    Date,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'focus-timer.js'), 'utf8'), context, { filename: 'focus-timer.js' });
  return context.window.FocusTimerTest;
}

function readCachedAppShell() {
  const source = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
  let installHandler;
  let cachedShell;
  const context = {
    self: {
      addEventListener(type, handler) {
        if (type === 'install') installHandler = handler;
      },
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      open() {
        return Promise.resolve({
          addAll(items) {
            cachedShell = items;
            return Promise.resolve();
          },
        });
      },
      keys() {
        return Promise.resolve([]);
      },
      match() {
        return Promise.resolve(null);
      },
      delete() {
        return Promise.resolve(true);
      },
    },
    fetch() {
      return Promise.resolve({ clone: () => ({}) });
    },
    Promise,
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'service-worker.js' });
  assert.strictEqual(typeof installHandler, 'function', 'service worker registers an install handler');
  return new Promise((resolve, reject) => {
    installHandler({
      waitUntil(promise) {
        promise.then(() => resolve(cachedShell)).catch(reject);
      },
    });
  });
}

async function main() {
  const { context, document, appended, containerAppended, mainContainer } = loadDashboardShell('/water.html');
  const state = context.window.DashboardState;

  const localLateNight = new Date(2026, 0, 1, 0, 30, 0);
  assert.strictEqual(state.localDateKey(localLateNight), '2026-01-01', 'local date keys use local calendar parts');
  assert.notStrictEqual(localLateNight.toISOString().slice(0, 10), state.localDateKey(localLateNight), 'regression fixture would drift if date keys used UTC ISO strings');

  const activeDate = new Date(2026, 0, 2, 2, 30, 0);
  assert.strictEqual(state.activeDateKey(activeDate), '2026-01-01', 'early morning sleep logs stay attached to the active day');
  state.setSleepLogs([{ date: '2026-01-01', hours: 7.5, quality: 'good', bed: '23:30', wake: '07:00' }]);
  assert.strictEqual(state.getSleepSnapshot(activeDate).today.hours, 7.5, 'Home snapshot can read today/active-day sleep saved through DashboardState');

  state.setWaterState({ unit: 'glass', glassMl: 250, logs: {}, targetMode: 'custom', dailyGoalMl: 1250 });
  const waterSnapshot = state.getWaterSnapshot(new Date(2026, 0, 1, 12, 0, 0));
  assert.strictEqual(waterSnapshot.targetUnits, 5, 'custom water goals convert into the selected target unit');
  assert.strictEqual(waterSnapshot.unitPlural, 'glasses', 'custom water goals preserve the selected unit label');
  assert.strictEqual(waterSnapshot.customTarget, true, 'custom water goals are marked for Home copy');

  document.dispatch('DOMContentLoaded');
  const dock = appended.find((element) => element.tagName === 'NAV' && element.className === 'tabbar');
  assert.ok(dock, 'dashboard shell renders the dock');
  assert.strictEqual(dock.parentNode, document.body, 'dock renders as a direct child of body');
  const dockHrefs = [...dock.innerHTML.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepStrictEqual(dockHrefs, ['index.html', 'gym.html', 'water.html', 'weight.html', 'sleep.html', 'finance.html'], 'dock renderer outputs exactly the six required destinations');

  const appShell = await readCachedAppShell();
  // Supplements is outside the shared 6-item dock and no longer loads dashboard-shell.js
  ['dashboard-shell.js', 'index.html', 'gym.html', 'water.html', 'weight.html', 'sleep.html', 'finance.html'].forEach((asset) => {
    assert.ok(appShell.includes(asset), `APP_SHELL precaches ${asset}`);
  });
  assert.ok(!appShell.includes('supplements.html'), 'APP_SHELL intentionally omits supplements.html (outside shared dock)');
  assert.strictEqual(new Set(appShell).size, appShell.length, 'APP_SHELL does not duplicate precache entries');

  // Test storage memoization
  assert.ok(state.storageCache, 'storageCache Map is exposed');
  state.storageCache.clear();
  
  // Set in localStorage directly to bypass write cache
  context.localStorage.setItem('test_cache_key', JSON.stringify({ a: 1 }));
  
  const val1 = state.readJSON('test_cache_key', null);
  assert.strictEqual(JSON.stringify(val1), JSON.stringify({ a: 1 }), 'reads from localStorage initially');
  assert.ok(state.storageCache.has('test_cache_key'), 'value is cached');
  
  // Modify localStorage directly (simulate out-of-cache state)
  context.localStorage.setItem('test_cache_key', JSON.stringify({ a: 2 }));
  
  const val2 = state.readJSON('test_cache_key', null);
  assert.strictEqual(JSON.stringify(val2), JSON.stringify({ a: 1 }), 'reads from cache map on consecutive read, ignoring direct localStorage update');
  
  // Write via DashboardState
  state.writeJSON('test_cache_key', { a: 3 });
  const cachedVal = state.storageCache.get('test_cache_key');
  assert.strictEqual(JSON.stringify(cachedVal), JSON.stringify({ a: 3 }), 'updates cache map on writeJSON');
  assert.strictEqual(context.localStorage.getItem('test_cache_key'), JSON.stringify({ a: 3 }), 'updates localStorage on writeJSON');
  
  // Dispatch dashboard-data-changed to invalidate
  document.dispatch('dashboard-data-changed', { detail: { key: 'test_cache_key' } });
  assert.ok(!state.storageCache.has('test_cache_key'), 'dashboard-data-changed event invalidates cache');
  
  // Repopulate
  state.readJSON('test_cache_key', null);
  assert.ok(state.storageCache.has('test_cache_key'), 're-cached');
  
  // Dispatch storage event to invalidate
  document.dispatch('storage', { key: 'test_cache_key' });
  assert.ok(!state.storageCache.has('test_cache_key'), 'storage event invalidates cache');

  // Versioned backup and import validation
  context.localStorage.clear();
  state.storageCache.clear();
  state.writeJSON('hub_notes', [{ id: 'n1', title: 'Note', content: 'One', createdAt: '2026-01-01' }]);
  state.writeJSON('focus:sessions', [{ startedAt: 1000, plannedDuration: 1500, actualDuration: 300, status: 'stopped-early' }]);
  state.writeJSON('goals:2026-01-01', [{ id: 't1', text: 'Old task', done: false }]);
  const backup = state.collectBackup();
  assert.strictEqual(backup.schemaVersion, 1, 'backup exports a supported schema version');
  assert.ok(Array.isArray(backup.data.hub_notes), 'backup stores parsed collection values');
  const invalidSnapshot = context.localStorage.getItem('hub_notes');
  const invalid = state.applyBackup({ schemaVersion: 99, data: { hub_notes: [] } }, 'replace');
  assert.strictEqual(invalid.ok, false, 'unsupported import is rejected');
  assert.strictEqual(context.localStorage.getItem('hub_notes'), invalidSnapshot, 'invalid import does not modify localStorage');

  const legacy = { items: { hub_notes: JSON.stringify([{ id: 'n2', title: 'Legacy', content: 'Two', createdAt: '2026-01-02' }]) } };
  assert.strictEqual(state.validateBackup(legacy).ok, true, 'legacy raw-string backup shape is accepted');

  const mergePayload = {
    schemaVersion: 1, source: 'personal-dashboard', exportedAt: '2026-01-03T00:00:00.000Z',
    data: {
      hub_notes: [{ id: 'n1', title: 'Note', content: 'One', createdAt: '2026-01-01' }, { id: 'n2', title: 'Note 2', content: 'Two', createdAt: '2026-01-02' }],
      'focus:sessions': [{ startedAt: 1000, plannedDuration: 1500, actualDuration: 300, status: 'stopped-early' }, { startedAt: 2000, plannedDuration: 1500, actualDuration: 1500, status: 'completed' }],
      'goals:2026-01-01': [{ id: 't1', text: 'Old task', done: false }, { id: 't2', text: 'Another task', done: false }],
    },
  };
  assert.strictEqual(state.applyBackup(mergePayload, 'merge').ok, true, 'valid merge import succeeds');
  assert.deepStrictEqual([state.readJSON('hub_notes', []).length, state.readJSON('focus:sessions', []).length, state.readJSON('goals:2026-01-01', []).length], [2, 2, 2], 'merge dedupes notes, focus sessions, and tasks');

  const overdue = state.getOverdueTasks('2026-01-02');
  assert.strictEqual(overdue.length, 2, 'overdue selectors derive incomplete older tasks from source date keys');
  assert.strictEqual(state.resolveOverdueTask(overdue[0]), true, 'resolving pending task updates source goal key');
  assert.strictEqual(state.readJSON('goals:2026-01-01', [])[0].done, true, 'source dated task is marked complete');

  const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const rolloverBody = indexSource.match(/function runRollover\(\) \{([\s\S]*?)\n    \}/)[1];
  assert.ok(!/removeItem|storeDelete|storeSet\('goals:/.test(rolloverBody), 'runRollover no longer moves or deletes overdue goals');

  const timer = loadFocusTimer();
  const started = timer.startState(timer.createIdleState(1500), 1500, 1000);
  assert.strictEqual(started.phase, timer.ACTIVE, 'timer starts active');
  const ticked = timer.tickState(started, 11000); assert.strictEqual(ticked.remainingSeconds, 1490, 'active tick reduces remaining time');
  const paused = timer.pauseState(ticked, 21000);
  assert.strictEqual(paused.phase, timer.PAUSED, 'pause transitions to paused');
  assert.strictEqual(timer.tickState(paused, 31000).remainingSeconds, paused.remainingSeconds, 'paused timer does not keep ticking');
  const resumed = timer.resumeState(paused, 31000);
  assert.strictEqual(timer.tickState(resumed, 41000).remainingSeconds, paused.remainingSeconds - 10, 'resume continues from paused remaining time');
  const reset = timer.resetState(resumed);
  assert.strictEqual(reset.remainingSeconds, 1500, 'reset returns to planned duration');
  const stopped = timer.finishState(paused, 'stopped-early', 42000);
  assert.strictEqual(stopped.record.status, 'stopped-early', 'early stop logs stopped-early');
  assert.ok(stopped.record.actualDuration > 0, 'early stop logs focused elapsed seconds');
  const completed = timer.finishState(Object.assign({}, started, { remainingSeconds: 0, focusedElapsedSeconds: 1500 }), 'completed', 51000);
  assert.strictEqual(completed.record.actualDuration, 1500, 'completion logs planned duration');

  console.log('dashboard-shell regression tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
