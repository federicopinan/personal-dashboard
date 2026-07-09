(() => {
  'use strict';

  const WATER_KEY = 'po_water_v1';
  const SLEEP_KEY = 'po_sleep_v1';
  const DASHBOARD_BACKUP_SCHEMA_VERSION = 1;
  const FOCUS_SESSIONS_KEY = 'focus:sessions';
  const NOTES_KEY = 'hub_notes';

  const DEFAULT_WATER_STATE = {
    unit: 'bottle',
    bottleMl: 500,
    glassMl: 250,
    weightUnit: 'kg',
    profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
    caffeineMgPerDay: 200,
    substances: [],
    logs: {},
    targetMode: 'auto',
    dailyGoalMl: null,
  };

  const NAV_ITEMS = [
    { label: 'Home', href: 'index.html', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    { label: 'Gym', href: 'gym.html', icon: '<path d="M6.5 6.5h11M6.5 17.5h11M3 12h3M18 12h3"/><path d="M6.5 6.5V4a1 1 0 011-1h2a1 1 0 011 1v2.5M6.5 17.5V20a1 1 0 001 1h2a1 1 0 001-1v-2.5"/><path d="M17.5 6.5V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v2.5M17.5 17.5V20a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2.5"/>' },
    { label: 'Water', href: 'water.html', icon: '<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>' },
    { label: 'Weight', href: 'weight.html', icon: '<path d="M3 3v18h18M7 16l4-8 4 5 5-9"/>' },
    { label: 'Sleep', href: 'sleep.html', icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
    { label: 'Finance', href: 'finance.html', icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>' },
  ];

  const storageCache = new Map();

  function readJSON(key, fallback) {
    if (storageCache.has(key)) {
      return storageCache.get(key);
    }
    try {
      const raw = localStorage.getItem(key);
      const val = raw ? JSON.parse(raw) : fallback;
      storageCache.set(key, val);
      return val;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      storageCache.set(key, value);
      localStorage.setItem(key, JSON.stringify(value));
      notifyChange(key);
    } catch (_) {
      // Graceful error handling for quota exceptions
    }
  }

  function removeStorageKey(key) { storageCache.delete(key); localStorage.removeItem(key); notifyChange(key); }

  function notifyChange(key) {
    window.dispatchEvent(new CustomEvent('dashboard-data-changed', { detail: { key } }));
  }

  window.addEventListener('storage', (event) => {
    if (event.key) {
      storageCache.delete(event.key);
    } else {
      storageCache.clear();
    }
  });

  window.addEventListener('dashboard-data-changed', (event) => {
    if (event.detail && event.detail.key) {
      storageCache.delete(event.detail.key);
    }
  });

  function localDateKey(date = new Date()) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function isGoalKey(key) { return /^goals:\d{4}-\d{2}-\d{2}$/.test(key); }

  function isCoveredDashboardKey(key) {
    return isGoalKey(key) || key === FOCUS_SESSIONS_KEY || key === NOTES_KEY ||
      key.startsWith('hub_') || key.startsWith('nw:') || key.startsWith('po_') ||
      key === 'goal_streak_v1' || key === 'subs' || key === 'subscriptions:v1' ||
      key === 'subscriptions:v1:legacy-subs-copied' || key === 'incoming_orders' ||
      key === 'wishlist' || key === 'finance_active_tab';
  }

  function listStorageKeys(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (!prefix || key.startsWith(prefix))) keys.push(key);
    }
    return keys;
  }

  function parseStorageValue(raw) { if (raw == null) return null; try { return JSON.parse(raw); } catch (_) { return undefined; } }

  function collectBackup() {
    const data = {};
    listStorageKeys().forEach((key) => {
      if (!isCoveredDashboardKey(key)) return;
      const parsed = parseStorageValue(localStorage.getItem(key));
      if (parsed !== undefined) data[key] = parsed;
    });
    return {
      schemaVersion: DASHBOARD_BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      source: 'personal-dashboard',
      data,
    };
  }

  function normalizeBackupPayload(input) {
    if (!input || typeof input !== 'object') return null;
    if (input.schemaVersion === DASHBOARD_BACKUP_SCHEMA_VERSION && input.data && typeof input.data === 'object' && !Array.isArray(input.data)) {
      return {
        schemaVersion: input.schemaVersion,
        exportedAt: input.exportedAt || new Date().toISOString(),
        source: input.source || 'personal-dashboard',
        data: Object.assign({}, input.data),
      };
    }
    if (input.items && typeof input.items === 'object' && !Array.isArray(input.items)) {
      const data = {};
      Object.keys(input.items).forEach((key) => {
        if (!isCoveredDashboardKey(key) || typeof input.items[key] !== 'string') return;
        const parsed = parseStorageValue(input.items[key]);
        if (parsed !== undefined) data[key] = parsed;
      });
      return {
        schemaVersion: DASHBOARD_BACKUP_SCHEMA_VERSION,
        exportedAt: input.exportedAt || new Date().toISOString(),
        source: input.source || 'personal-dashboard',
        data,
      };
    }
    return null;
  }

  function isValidCoveredValue(key, value) {
    if (key === FOCUS_SESSIONS_KEY || key === NOTES_KEY || isGoalKey(key)) return Array.isArray(value);
    return true;
  }

  function validateBackup(input) {
    const payload = normalizeBackupPayload(input);
    if (!payload) return { ok: false, error: 'Unsupported backup format' };
    if (payload.schemaVersion !== DASHBOARD_BACKUP_SCHEMA_VERSION) return { ok: false, error: 'Unsupported schema version' };
    for (const key of Object.keys(payload.data)) {
      if (!isCoveredDashboardKey(key)) return { ok: false, error: 'Unsupported key: ' + key };
      if (!isValidCoveredValue(key, payload.data[key])) return { ok: false, error: 'Invalid value for ' + key };
    }
    return { ok: true, payload };
  }

  function noteIdentity(note) {
    if (note && note.id != null) return 'id:' + note.id;
    return note && (note.createdAt || note.title || note.content) ? 'stable:' + [note.createdAt || '', note.title || '', note.content || ''].join('|') : 'legacy:' + [(note && note.time) || '', (note && note.text) || ''].join('|');
  }

  function taskIdentity(task, date) { return task && task.id != null ? date + '|id:' + task.id : date + '|text:' + ((task && task.text) || ''); }

  function focusSessionIdentity(session) { return [session && session.startedAt, session && session.plannedDuration, session && session.actualDuration, session && session.status].join('|'); }

  function dedupeBy(items, identityFn) {
    const seen = new Set();
    const out = [];
    (Array.isArray(items) ? items : []).forEach((item) => {
      const identity = identityFn(item);
      if (seen.has(identity)) return;
      seen.add(identity);
      out.push(item);
    });
    return out;
  }

  function mergeArrayForKey(key, current, imported) {
    const combined = (Array.isArray(current) ? current : []).concat(Array.isArray(imported) ? imported : []);
    if (key === NOTES_KEY) return dedupeBy(combined, noteIdentity);
    if (key === FOCUS_SESSIONS_KEY) return dedupeBy(combined, focusSessionIdentity);
    if (isGoalKey(key)) {
      const date = key.replace('goals:', '');
      return dedupeBy(combined, (task) => taskIdentity(task, date));
    }
    return combined;
  }

  function hasDashboardData() { return listStorageKeys().some(isCoveredDashboardKey); }

  function applyBackup(payloadOrInput, mode) {
    const result = validateBackup(payloadOrInput);
    if (!result.ok) return result;
    const payload = result.payload;
    const restoreMode = mode === 'replace' ? 'replace' : 'merge';
    if (restoreMode === 'replace') {
      listStorageKeys().filter(isCoveredDashboardKey).forEach(removeStorageKey);
      Object.keys(payload.data).forEach((key) => writeJSON(key, payload.data[key]));
    } else {
      Object.keys(payload.data).forEach((key) => {
        const imported = payload.data[key];
        const current = readJSON(key, null);
        if (Array.isArray(imported)) writeJSON(key, mergeArrayForKey(key, current, imported));
        else if (current == null) writeJSON(key, imported);
      });
    }
    notifyChange('dashboard-import');
    return { ok: true, mode: restoreMode, payload };
  }

  function getOverdueTasks(today = localDateKey(new Date())) {
    const pending = [];
    const seen = new Set();
    listStorageKeys('goals:').sort().forEach((key) => {
      const date = key.replace('goals:', '');
      if (!isGoalKey(key) || date >= today) return;
      const goals = readJSON(key, []);
      if (!Array.isArray(goals)) return;
      goals.forEach((goal, index) => {
        if (!goal || goal.done) return;
        const identity = taskIdentity(goal, date);
        if (seen.has(identity)) return;
        seen.add(identity);
        pending.push({ key, date, index, id: goal.id, text: goal.text || '', goal });
      });
    });
    return pending;
  }

  function resolveOverdueTask(taskRef) {
    if (!taskRef || !isGoalKey(taskRef.key)) return false;
    const goals = readJSON(taskRef.key, []);
    if (!Array.isArray(goals)) return false;
    const date = taskRef.key.replace('goals:', '');
    let index = Number.isInteger(taskRef.index) ? taskRef.index : -1;
    if (!goals[index] || taskIdentity(goals[index], date) !== taskIdentity(taskRef.goal || taskRef, date)) {
      index = goals.findIndex((goal) => taskIdentity(goal, date) === taskIdentity(taskRef.goal || taskRef, date));
    }
    if (index < 0) return false;
    goals[index] = Object.assign({}, goals[index], { done: true, doneAt: Date.now() });
    writeJSON(taskRef.key, goals);
    return true;
  }

  function activeDateKey(date = new Date()) {
    const d = new Date(date);
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    return localDateKey(d);
  }

  function normalizeWaterState(state) {
    const next = Object.assign({}, DEFAULT_WATER_STATE, state || {});
    next.profile = Object.assign({}, DEFAULT_WATER_STATE.profile, (state && state.profile) || {});
    next.substances = Array.isArray(next.substances) ? next.substances : [];
    next.logs = next.logs && typeof next.logs === 'object' ? next.logs : {};
    next.targetMode = next.targetMode === 'custom' ? 'custom' : 'auto';
    next.dailyGoalMl = Number(next.dailyGoalMl) > 0 ? Number(next.dailyGoalMl) : null;
    return next;
  }

  function getWaterState() {
    return normalizeWaterState(readJSON(WATER_KEY, {}));
  }

  function setWaterState(state) {
    writeJSON(WATER_KEY, normalizeWaterState(state));
  }

  function subExtraMl(substance) {
    const dose = (substance && substance.dose != null ? substance.dose : substance && substance.defaultDose) || 0;
    return Math.max(0, dose * ((substance && substance.mlPerUnit) || 0));
  }

  function computeAutoWaterTargetMl(state) {
    const p = state.profile || DEFAULT_WATER_STATE.profile;
    const weightKg = state.weightUnit === 'lb' ? (Number(p.weightKg) || 0) / 2.20462 : Number(p.weightKg) || 75;
    const base = weightKg * 35;
    const exercise = ((Number(p.activityHrsPerWeek) || 0) / 7) * 500;
    const caffeine = Math.max(0, ((Number(state.caffeineMgPerDay) || 0) - 200) * 1.5);
    const subs = (state.substances || []).reduce((sum, item) => sum + subExtraMl(item), 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((Number(p.age) || 0) >= 50) adjust += 100;
    return { base, exercise, caffeine, subs, adjust, total: Math.max(500, base + exercise + caffeine + subs + adjust) };
  }

  function computeWaterTargetMl(state) {
    const auto = computeAutoWaterTargetMl(state);
    if (state.targetMode === 'custom' && state.dailyGoalMl) {
      return Object.assign({}, auto, { total: Math.max(500, state.dailyGoalMl), custom: true });
    }
    return Object.assign({}, auto, { custom: false });
  }

  function waterUnitVolumeMl(state) {
    if (state.unit === 'glass') return state.glassMl || 250;
    if (state.unit === 'oz') return 30;
    if (state.unit === 'ml') return 1;
    return state.bottleMl || 500;
  }

  function unitLabelPlural(state) {
    if (state.unit === 'glass') return 'glasses';
    if (state.unit === 'oz') return 'oz';
    if (state.unit === 'ml') return 'ml';
    return 'bottles';
  }

  function unitLabelSingular(state) {
    if (state.unit === 'glass') return 'glass';
    if (state.unit === 'oz') return 'oz';
    if (state.unit === 'ml') return 'ml';
    return 'bottle';
  }

  function getWaterSnapshot(date = new Date()) {
    const state = getWaterState();
    const target = computeWaterTargetMl(state);
    const targetUnits = Math.max(1, Math.ceil(target.total / waterUnitVolumeMl(state)));
    const key = localDateKey(date);
    return {
      state,
      key,
      count: (state.logs || {})[key] || 0,
      targetMl: target.total,
      targetUnits,
      unitPlural: unitLabelPlural(state),
      unitSingular: unitLabelSingular(state),
      customTarget: !!target.custom,
      breakdown: target,
    };
  }

  function setTodayWaterCount(count) {
    const state = getWaterState();
    const key = localDateKey(new Date());
    if (count <= 0) delete state.logs[key];
    else state.logs[key] = count;
    setWaterState(state);
    return state;
  }

  function getSleepLogs() {
    const logs = readJSON(SLEEP_KEY, []);
    return Array.isArray(logs) ? logs : [];
  }

  function setSleepLogs(logs) {
    writeJSON(SLEEP_KEY, Array.isArray(logs) ? logs : []);
  }

  function getSleepSnapshot(date = new Date()) {
    const logs = getSleepLogs();
    const key = activeDateKey(date);
    const today = logs.find((log) => log.date === key) || null;
    const recent = logs.slice(-7);
    const average = recent.length ? recent.reduce((sum, log) => sum + (Number(log.hours) || 0), 0) / recent.length : 0;
    return { key, logs, today, recent, average };
  }

  function installShellStyles() {
    if (document.getElementById('dashboardShellStyles')) return;
    const style = document.createElement('style');
    style.id = 'dashboardShellStyles';
    style.textContent = `
      /* ── Page transitions — cascade top-to-bottom ──────────── */
      @view-transition { navigation: auto; }
      ::view-transition-old(root) { animation: pdCascadeLeave 180ms cubic-bezier(0.4, 0, 1, 1) both; }
      ::view-transition-new(root) { animation: pdCascadeEnter 320ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      body.pd-page-enter { animation: pdCascadeEnter 320ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      body.pd-page-leave { animation: pdCascadeLeave 180ms cubic-bezier(0.4, 0, 1, 1) both; }
      @keyframes pdCascadeEnter {
        from { opacity: 0; transform: translateY(-28px); clip-path: inset(0 0 100% 0); }
        40%  { opacity: 1; clip-path: inset(0 0 0% 0); }
        to   { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0% 0); }
      }
      @keyframes pdCascadeLeave {
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(18px); }
      }

      /* ── Dock / Tabbar (fixed top) ─────────────────────────
         Tabbar height = .tabbar padding (10+10) + .tabbar-inner padding (5+5)
         + .tab content (9 + 22 icon + 3 gap + 11 label + 9) + 2px line-height
         overflow = 88px when env(safe-area-inset-top)=0.
         Body padding must match or content is hidden behind the dock. */
      body.pd-has-dock {
        padding-top: calc(88px + env(safe-area-inset-top, 0px));
      }
      .tabbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        display: flex;
        justify-content: center;
        margin: 0;
        padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
        background: transparent;
        pointer-events: none;
      }
      .tabbar-inner {
        view-transition-name: main-navigation;
        pointer-events: auto;
        display: flex;
        width: 100%; max-width: 500px;
        gap: 4px; padding: 5px;
        background: rgba(255, 255, 255, 0.065);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 22px;
        backdrop-filter: blur(40px) saturate(2.2) brightness(1.08);
        -webkit-backdrop-filter: blur(40px) saturate(2.2) brightness(1.08);
        box-shadow:
          inset 0 1.5px 0 rgba(255, 255, 255, 0.14),
          inset 0 -1px 0 rgba(0, 0, 0, 0.12),
          0 8px 32px rgba(0, 0, 0, 0.45),
          0 2px 8px rgba(0, 0, 0, 0.25);
      }
      .tab {
        flex: 1 1 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 3px;
        padding: 9px 4px;
        border-radius: 13px;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.01em;
        color: rgba(255,255,255,0.5);
        text-decoration: none;
        background: transparent;
        border: 1px solid transparent;
        transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .tab:hover { color: rgba(255,255,255,0.85); }
      .tab[aria-current="page"] {
        color: #fff;
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.10);
      }
      .tab-icon {
        width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center;
      }
      .tab-icon svg { width: 100%; height: 100%; display: block; }

      /* ── Cascade entrance animations ────────────────────── */
      .cascade-item {
        opacity: 0;
        transform: translateY(12px);
        animation: pdStaggerCascadeEnter 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        animation-delay: calc(var(--stagger-index, 0) * 45ms);
      }
      @keyframes pdStaggerCascadeEnter {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* ── Touch Target expansions (44x44px minimum) ──────── */
      .goal-checkbox,
      .goal-delete,
      [data-action="del"],
      [data-action="toggle"],
      [data-action="low"],
      .wt-delete,
      .delete-btn,
      .remove-btn,
      .se-delete,
      .wish-delete {
        position: relative;
      }
      .goal-checkbox::before,
      .goal-delete::before,
      [data-action="del"]::before,
      [data-action="toggle"]::before,
      [data-action="low"]::before,
      .wt-delete::before,
      .delete-btn::before,
      .remove-btn::before,
      .se-delete::before,
      .wish-delete::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 44px;
        height: 44px;
        transform: translate(-50%, -50%);
        cursor: pointer;
        z-index: 10;
      }

      /* ── Responsive: hide page-specific nav pills on mobile ── */
      @media (max-width: 767px) {
        .dash-nav { display: none; }
      }

      /* ── Reduced motion ──────────────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        ::view-transition-old(root), ::view-transition-new(root),
        body.pd-page-enter, body.pd-page-leave { animation: none !important; clip-path: none !important; }
        *, *::before, *::after { scroll-behavior: auto !important; }
        .cascade-item {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function renderDock() {
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const existing = document.querySelector('nav.tabbar');
    const nav = existing || document.createElement('nav');
    nav.className = 'tabbar';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = '<div class="tabbar-inner">' + NAV_ITEMS.map((item) => {
      const active = current === item.href || (current === '' && item.href === 'index.html');
      return '<a class="tab" href="' + item.href + '"' + (active ? ' aria-current="page"' : '') + '>'
        + '<span class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + item.icon + '</svg></span>'
        + item.label
        + '</a>';
    }).join('') + '</div>';

    document.body.classList.add('pd-has-dock');

    // Always ensure nav is a direct child of body, not inside any scrollable container
    if (nav.parentNode !== document.body) {
      document.body.appendChild(nav);
    }

    // Remove placeholder if present (it causes the nav to be moved inside container)
    const placeholder = document.getElementById('dock-placeholder');
    if (placeholder) placeholder.remove();
  }

  function installNavigationMotion() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest && event.target.closest('a[href]');
      if (!link) return;

      // Screen out modifier keys and non-left-clicks
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return; // External Origin
      if (link.getAttribute('target') === '_blank') return; // New tab

      // Hash/anchor links referencing the current page
      if (url.pathname === location.pathname && url.hash !== '') return;

      // If native view transitions are supported, the browser manages the page switch smoothly.
      // We let the navigation happen immediately.
      if ('startViewTransition' in document) {
        return;
      }

      // If reduced motion is preferred, bypass the artificial transition delay
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      // Fallback transition
      event.preventDefault();
      document.body.classList.add('pd-page-leave');
      setTimeout(() => {
        window.location.href = link.href;
      }, 130);
    });
  }

  window.DashboardState = {
    WATER_KEY,
    SLEEP_KEY,
    DASHBOARD_BACKUP_SCHEMA_VERSION,
    FOCUS_SESSIONS_KEY,
    NOTES_KEY,
    readJSON,
    writeJSON,
    removeStorageKey,
    notifyChange,
    localDateKey,
    activeDateKey,
    isCoveredDashboardKey,
    collectBackup,
    validateBackup,
    applyBackup,
    hasDashboardData,
    mergeArrayForKey,
    getOverdueTasks,
    resolveOverdueTask,
    getWaterState,
    setWaterState,
    computeAutoWaterTargetMl,
    computeWaterTargetMl,
    waterUnitVolumeMl,
    unitLabelPlural,
    unitLabelSingular,
    getWaterSnapshot,
    setTodayWaterCount,
    getSleepLogs,
    setSleepLogs,
    getSleepSnapshot,
    storageCache,
  };

  function applyCascadeStagger() {
    if (typeof document.querySelectorAll !== 'function') return;
    const targets = document.querySelectorAll('.cascade-item, .summary-card, .section, .gm-card');
    targets.forEach((el, index) => {
      el.style.setProperty('--stagger-index', index);
      el.classList.add('cascade-item');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    installShellStyles();
    renderDock();
    installNavigationMotion();
    applyCascadeStagger();
    requestAnimationFrame(() => document.body.classList.add('pd-page-enter'));
    notifyChange('dashboard-shell-ready');
  });
})();
