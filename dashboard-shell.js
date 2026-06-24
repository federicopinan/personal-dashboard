(() => {
  'use strict';

  const WATER_KEY = 'po_water_v1';
  const SLEEP_KEY = 'po_sleep_v1';

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

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    notifyChange(key);
  }

  function notifyChange(key) {
    window.dispatchEvent(new CustomEvent('dashboard-data-changed', { detail: { key } }));
  }

  function localDateKey(date = new Date()) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
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
      /* ── Page transitions ─────────────────────────────────── */
      @view-transition { navigation: auto; }
      ::view-transition-old(root), ::view-transition-new(root) { animation-duration: 220ms; animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
      body.pd-page-enter { animation: pdPageEnter 220ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      body.pd-page-leave { animation: pdPageLeave 160ms ease both; }
      @keyframes pdPageEnter { from { opacity: 0; transform: translateY(8px) scale(0.995); filter: blur(2px); } to { opacity: 1; transform: none; filter: none; } }
      @keyframes pdPageLeave { to { opacity: 0; transform: translateY(-6px) scale(0.995); filter: blur(2px); } }

      /* ── Dock / Tabbar (fixed top) ───────────────────────── */
      body.pd-has-dock {
        padding-top: calc(68px + env(safe-area-inset-top, 0px));
      }
      .tabbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        display: flex;
        justify-content: center;
        margin: 0;
        padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
        background: linear-gradient(180deg, rgba(5,5,6,0.96) 0%, rgba(5,5,6,0.82) 62%, rgba(5,5,6,0) 100%);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        pointer-events: none;
      }
      .tabbar-inner {
        pointer-events: auto;
        display: flex;
        width: 100%; max-width: 500px;
        gap: 6px; padding: 6px;
        background: rgba(20,20,22,0.72);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(0,0,0,0.55);
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

      /* ── Responsive: hide page-specific nav pills on mobile ── */
      @media (max-width: 767px) {
        .dash-nav { display: none; }
      }

      /* ── Reduced motion ──────────────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        ::view-transition-old(root), ::view-transition-new(root), body.pd-page-enter, body.pd-page-leave { animation: none !important; }
        *, *::before, *::after { scroll-behavior: auto !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderDock() {
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const nav = document.querySelector('nav.tabbar') || document.createElement('nav');
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

    const placeholder = document.getElementById('dock-placeholder');
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(nav, placeholder);
    } else {
      const container = document.querySelector('.container, .shell, .po-shell, .weight-card, main');
      const target = container || document.body;
      if (nav.parentNode !== target) target.appendChild(nav);
    }
  }

  function installNavigationMotion() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest && event.target.closest('a.tab[href]');
      if (!link) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault();
      document.body.classList.add('pd-page-leave');
      setTimeout(() => { window.location.href = link.href; }, 130);
    });
  }

  window.DashboardState = {
    WATER_KEY,
    SLEEP_KEY,
    readJSON,
    writeJSON,
    notifyChange,
    localDateKey,
    activeDateKey,
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
  };

  document.addEventListener('DOMContentLoaded', () => {
    installShellStyles();
    renderDock();
    installNavigationMotion();
    requestAnimationFrame(() => document.body.classList.add('pd-page-enter'));
    notifyChange('dashboard-shell-ready');
  });
})();
