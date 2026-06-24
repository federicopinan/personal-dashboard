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
      if (selector === 'nav.tabbar') return appended.find((element) => element.tagName === 'NAV' && element.className === 'tabbar') || null;
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
    addEventListener() {},
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
  return { context, document, events, appended };
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
  const { context, document, appended } = loadDashboardShell('/water.html');
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
  const dockHrefs = [...dock.innerHTML.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepStrictEqual(dockHrefs, ['index.html', 'gym.html', 'water.html', 'weight.html', 'sleep.html', 'finance.html'], 'dock renderer outputs exactly the six required destinations');

  const appShell = await readCachedAppShell();
  // Supplements is outside the shared 6-item dock and no longer loads dashboard-shell.js
  ['dashboard-shell.js', 'index.html', 'gym.html', 'water.html', 'weight.html', 'sleep.html', 'finance.html'].forEach((asset) => {
    assert.ok(appShell.includes(asset), `APP_SHELL precaches ${asset}`);
  });
  assert.ok(!appShell.includes('supplements.html'), 'APP_SHELL intentionally omits supplements.html (outside shared dock)');
  assert.strictEqual(new Set(appShell).size, appShell.length, 'APP_SHELL does not duplicate precache entries');

  console.log('dashboard-shell regression tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
