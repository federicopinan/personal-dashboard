(function() {
  'use strict';

  var IDLE = 'idle';
  var ACTIVE = 'active';
  var PAUSED = 'paused';

  var state = createIdleState();
  var notifPermission = 'default';
  var intervalId = null;

  function createIdleState(selectedDuration) {
    return {
      phase: IDLE,
      selectedDuration: selectedDuration || null,
      startedAt: null,
      activeStartedAt: null,
      plannedDuration: null,
      remainingSeconds: null,
      focusedElapsedSeconds: 0
    };
  }

  function startState(current, durationSeconds, now) {
    return {
      phase: ACTIVE,
      selectedDuration: durationSeconds,
      startedAt: now,
      activeStartedAt: now,
      plannedDuration: durationSeconds,
      remainingSeconds: durationSeconds,
      focusedElapsedSeconds: 0
    };
  }

  function tickState(current, now) {
    if (!current || current.phase !== ACTIVE) return current;
    var activeElapsed = Math.max(0, Math.floor((now - current.activeStartedAt) / 1000));
    var focusedElapsed = Math.min(current.plannedDuration, current.focusedElapsedSeconds + activeElapsed);
    return Object.assign({}, current, {
      remainingSeconds: Math.max(0, current.plannedDuration - focusedElapsed)
    });
  }

  function pauseState(current, now) {
    var ticked = tickState(current, now);
    if (!ticked || ticked.phase !== ACTIVE) return ticked;
    return Object.assign({}, ticked, {
      phase: PAUSED,
      activeStartedAt: null,
      focusedElapsedSeconds: ticked.plannedDuration - ticked.remainingSeconds
    });
  }

  function resumeState(current, now) {
    if (!current || current.phase !== PAUSED) return current;
    return Object.assign({}, current, { phase: ACTIVE, activeStartedAt: now });
  }

  function resetState(current) {
    if (!current || (current.phase !== ACTIVE && current.phase !== PAUSED)) return current;
    return Object.assign({}, current, {
      phase: PAUSED,
      activeStartedAt: null,
      remainingSeconds: current.plannedDuration,
      focusedElapsedSeconds: 0
    });
  }

  function finishState(current, status, now) {
    var finalState = current && current.phase === ACTIVE ? tickState(current, now) : current;
    if (!finalState || (finalState.phase !== ACTIVE && finalState.phase !== PAUSED)) return null;
    var actualDuration = status === 'completed'
      ? finalState.plannedDuration
      : Math.round(finalState.plannedDuration - finalState.remainingSeconds);
    return {
      record: {
        id: now + '-' + Math.random().toString(36).slice(2),
        startedAt: finalState.startedAt,
        plannedDuration: finalState.plannedDuration,
        actualDuration: actualDuration,
        status: status,
        completedAt: now
      },
      state: createIdleState(finalState.selectedDuration)
    };
  }

  function storeGet(key) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }

  function storeSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('dashboard-data-changed', { detail: { key: key } }));
  }

  function appendSession(record) {
    var sessions = storeGet('focus:sessions') || [];
    sessions.push(record);
    storeSet('focus:sessions', sessions);
  }

  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (notifPermission !== 'default') return;
    Notification.requestPermission().then(function(result) {
      notifPermission = result;
    });
  }

  function startTimer(durationSeconds) {
    if (state.phase !== IDLE) return;
    if (notifPermission === 'default') requestNotificationPermission();
    state = startState(state, durationSeconds, Date.now());
    intervalId = setInterval(tick, 1000);
    renderFocusOverlay();
  }

  function pauseTimer() {
    if (state.phase !== ACTIVE) return;
    state = pauseState(state, Date.now());
    clearInterval(intervalId);
    intervalId = null;
    renderFocusOverlay();
  }

  function resumeTimer() {
    if (state.phase !== PAUSED) return;
    state = resumeState(state, Date.now());
    intervalId = setInterval(tick, 1000);
    renderFocusOverlay();
  }

  function resetTimer() {
    if (state.phase !== ACTIVE && state.phase !== PAUSED) return;
    clearInterval(intervalId);
    intervalId = null;
    state = resetState(state);
    renderFocusOverlay();
  }

  function stopTimer(status) {
    if (state.phase !== ACTIVE && state.phase !== PAUSED) return;
    clearInterval(intervalId);
    intervalId = null;
    var finalStatus = status || 'stopped-early';
    var result = finishState(state, finalStatus, Date.now());
    if (!result) return;
    if (notifPermission === 'granted' && finalStatus === 'completed') {
      new Notification('Focus session complete', {
        body: Math.round(result.record.actualDuration / 60) + ' min',
        icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22128%22 height=%22128%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%238b5cf6%22/%3E%3C/svg%3E'
      });
    }
    appendSession(result.record);
    state = result.state;
    hideFocusOverlay();
    paintFocusArc();
    syncButtons();
  }

  function tick() {
    if (state.phase !== ACTIVE) return;
    state = tickState(state, Date.now());
    if (state.remainingSeconds <= 0) {
      stopTimer('completed');
      return;
    }
    renderFocusOverlay();
  }

  function formatMMSS(seconds) {
    seconds = Math.max(0, Math.round(seconds || 0));
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function ensureOverlayStyles() {
    if (document.getElementById('focusOverlayStyles')) return;
    var style = document.createElement('style');
    style.id = 'focusOverlayStyles';
    style.textContent = '#focusOverlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 20%,rgba(139,92,246,.26),rgba(6,6,10,.96) 48%,#050507 100%);color:#fff;padding:24px}#focusOverlay .focus-overlay-card{width:min(92vw,420px);text-align:center;border:1px solid rgba(255,255,255,.14);border-radius:32px;padding:30px;background:rgba(255,255,255,.06);box-shadow:0 24px 80px rgba(0,0,0,.55)}#focusOverlay .focus-overlay-ring{width:230px;height:230px;border-radius:50%;display:grid;place-items:center;margin:0 auto 22px;background:conic-gradient(#8b5cf6 var(--focus-progress),rgba(255,255,255,.1) 0);position:relative}#focusOverlay .focus-overlay-ring:after{content:"";position:absolute;inset:12px;border-radius:50%;background:#08080d}#focusOverlay .focus-overlay-time{position:relative;z-index:1;font-size:56px;font-weight:800;letter-spacing:-.05em}#focusOverlay .focus-overlay-state{color:rgba(255,255,255,.65);text-transform:uppercase;font-size:12px;letter-spacing:.18em;margin-bottom:18px}#focusOverlay .focus-overlay-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}#focusOverlay button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.1);color:#fff;padding:12px 18px;font-weight:700}#focusOverlay button.primary{background:#8b5cf6;border-color:#a78bfa}';
    document.head.appendChild(style);
  }

  function renderFocusOverlay() {
    if (state.phase !== ACTIVE && state.phase !== PAUSED) return hideFocusOverlay();
    ensureOverlayStyles();
    hideStickyBanner();
    var overlay = document.getElementById('focusOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'focusOverlay';
      overlay.innerHTML = '<div class="focus-overlay-card" role="dialog" aria-modal="true" aria-label="Focus timer"><div class="focus-overlay-ring"><div class="focus-overlay-time" id="focusOverlayTime"></div></div><div class="focus-overlay-state" id="focusOverlayState"></div><div class="focus-overlay-actions"><button class="primary" id="focusOverlayPause" type="button"></button><button id="focusOverlayReset" type="button">Reset</button><button id="focusOverlayStop" type="button">Stop</button></div></div>';
      document.body.appendChild(overlay);
      document.getElementById('focusOverlayPause').addEventListener('click', function() {
        if (state.phase === ACTIVE) pauseTimer();
        else resumeTimer();
      });
      document.getElementById('focusOverlayReset').addEventListener('click', resetTimer);
      document.getElementById('focusOverlayStop').addEventListener('click', function() { stopTimer('stopped-early'); });
    }
    var progress = state.plannedDuration ? (1 - state.remainingSeconds / state.plannedDuration) * 100 : 0;
    overlay.style.setProperty('--focus-progress', Math.max(0, Math.min(100, progress)) + '%');
    document.getElementById('focusOverlayTime').textContent = formatMMSS(state.remainingSeconds);
    document.getElementById('focusOverlayState').textContent = state.phase === PAUSED ? 'Paused' : 'Focus mode';
    document.getElementById('focusOverlayPause').textContent = state.phase === PAUSED ? 'Resume' : 'Pause';
  }

  function hideFocusOverlay() {
    var overlay = document.getElementById('focusOverlay');
    if (overlay) overlay.remove();
  }

  function hideStickyBanner() {
    var banner = document.getElementById('focusBanner');
    if (banner) banner.style.display = 'none';
  }

  function paintFocusArc() {
    var arc = document.getElementById('focusArc');
    if (!arc) return;
    var sessions = storeGet('focus:sessions') || [];
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var todaySessions = sessions.filter(function(s) {
      var d = new Date(s.startedAt);
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() === todayStr;
    });
    if (todaySessions.length === 0) {
      arc.style.display = 'none';
      arc.setAttribute('stroke-dasharray', '');
      arc.setAttribute('stroke-dashoffset', '');
      arc.setAttribute('transform', '');
      return;
    }
    var lastSession = todaySessions[todaySessions.length - 1];
    var startDate = new Date(lastSession.startedAt);
    var startMinuteOfDay = startDate.getHours() * 60 + startDate.getMinutes();
    var startAngle = (startMinuteOfDay / 1440) * 360 - 90;
    var sweepAngle = (lastSession.actualDuration / 86400) * 360;
    var circumference = 2 * Math.PI * 52;
    arc.style.display = 'block';
    arc.setAttribute('stroke', '#8b5cf6');
    arc.setAttribute('stroke-width', '8');
    arc.setAttribute('stroke-linecap', 'round');
    arc.setAttribute('stroke-dasharray', circumference);
    arc.setAttribute('stroke-dashoffset', circumference * (1 - sweepAngle / 360));
    arc.setAttribute('transform', 'rotate(' + startAngle + ' 60 60)');
  }

  function syncButtons() {
    var startBtn = document.getElementById('focusStartBtn');
    var stopBtn = document.getElementById('focusStopBtn');
    if (startBtn) startBtn.disabled = !state.selectedDuration || state.phase !== IDLE;
    if (stopBtn) stopBtn.style.display = 'none';
  }

  function initPresetButtons() {
    var presetsContainer = document.getElementById('focusPresets');
    var startBtn = document.getElementById('focusStartBtn');
    var stopBtn = document.getElementById('focusStopBtn');
    if (!presetsContainer || !startBtn) return;
    if (stopBtn) stopBtn.style.display = 'none';
    presetsContainer.addEventListener('click', function(e) {
      var btn = e.target.closest('.focus-preset-btn');
      if (!btn) return;
      var duration = parseInt(btn.getAttribute('data-duration'), 10);
      if (!duration) return;
      state.selectedDuration = duration;
      var allPresets = presetsContainer.querySelectorAll('.focus-preset-btn');
      for (var i = 0; i < allPresets.length; i++) allPresets[i].classList.remove('selected');
      btn.classList.add('selected');
      syncButtons();
    });
    startBtn.addEventListener('click', function() {
      if (state.phase !== IDLE || !state.selectedDuration) return;
      startTimer(state.selectedDuration);
      syncButtons();
    });
    if (stopBtn) stopBtn.addEventListener('click', function() { stopTimer('stopped-early'); });
  }

  function init() {
    hideStickyBanner();
    paintFocusArc();
    initPresetButtons();
    window.addEventListener('dashboard-data-changed', paintFocusArc);
  }

  window.FocusTimerTest = {
    IDLE: IDLE,
    ACTIVE: ACTIVE,
    PAUSED: PAUSED,
    createIdleState: createIdleState,
    startState: startState,
    tickState: tickState,
    pauseState: pauseState,
    resumeState: resumeState,
    resetState: resetState,
    finishState: finishState,
    formatMMSS: formatMMSS
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
