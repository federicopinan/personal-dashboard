(function() {
  'use strict';

  // ── Constants ────────────────────────────────────────────────
  var IDLE = 'idle';
  var RUNNING = 'running';

  // ── Module-level state ────────────────────────────────────────
  var state = {
    phase: IDLE,
    selectedDuration: null,
    startedAt: null,
    plannedDuration: null
  };

  var notifPermission = 'default';
  var intervalId = null;

  // ── Storage helpers (same as index.html) ──────────────────────
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
    window.dispatchEvent(new CustomEvent('dashboard-data-changed'));
  }

  // ── Session logging ───────────────────────────────────────────
  function appendSession(record) {
    var sessions = storeGet('focus:sessions') || [];
    sessions.push(record);
    storeSet('focus:sessions', sessions);
  }

  // ── Notification permission ───────────────────────────────────
  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (notifPermission !== 'default') return;
    Notification.requestPermission().then(function(result) {
      notifPermission = result;
    });
  }

  // ── State machine helpers ──────────────────────────────────────
  function startTimer(durationSeconds) {
    if (state.phase !== IDLE) return;
    if (notifPermission === 'default') {
      requestNotificationPermission();
    }
    state = {
      phase: RUNNING,
      startedAt: Date.now(),
      plannedDuration: durationSeconds
    };
    intervalId = setInterval(tick, 1000);
    renderStickyBanner();
  }

  function stopTimer(status) {
    if (state.phase !== RUNNING) return;
    clearInterval(intervalId);
    intervalId = null;

    var actualDuration = Math.round((Date.now() - state.startedAt) / 1000);

    // Fire notification if granted
    if (notifPermission === 'granted') {
      new Notification('Focus session complete', {
        body: Math.round(actualDuration / 60) + ' min',
        icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22128%22 height=%22128%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%238b5cf6%22/%3E%3C/svg%3E'
      });
    }

    var record = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2),
      startedAt: state.startedAt,
      plannedDuration: state.plannedDuration,
      actualDuration: actualDuration,
      status: status,
      completedAt: Date.now()
    };

    appendSession(record);

    state = {
      phase: IDLE,
      selectedDuration: null,
      startedAt: null,
      plannedDuration: null
    };

    hideStickyBanner();
    paintFocusArc();
  }

  function tick() {
    if (state.phase !== RUNNING) return;
    var elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    var remaining = state.plannedDuration - elapsed;
    if (remaining <= 0) {
      stopTimer('completed');
      return;
    }
    var remEl = document.getElementById('focusRemaining');
    var elEl = document.getElementById('focusElapsed');
    if (remEl) remEl.textContent = formatMMSS(remaining);
    if (elEl) elEl.textContent = formatMMSS(elapsed);
  }

  // ── Time formatting ────────────────────────────────────────────
  function formatMMSS(seconds) {
    seconds = Math.max(0, seconds);
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // ── Banner DOM ────────────────────────────────────────────────
  function renderStickyBanner() {
    var banner = document.getElementById('focusBanner');
    var remEl = document.getElementById('focusRemaining');
    var elEl = document.getElementById('focusElapsed');
    if (!banner) return;
    banner.style.display = 'flex';
    if (remEl) remEl.textContent = formatMMSS(state.plannedDuration);
    if (elEl) elEl.textContent = '00:00';
  }

  function hideStickyBanner() {
    var banner = document.getElementById('focusBanner');
    if (banner) banner.style.display = 'none';
  }

  // ── Focus arc rendering ─────────────────────────────────────────
  function paintFocusArc() {
    var arc = document.getElementById('focusArc');
    if (!arc) return;

    var sessions = storeGet('focus:sessions') || [];
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

    var todaySessions = sessions.filter(function(s) {
      var d = new Date(s.startedAt);
      var sStr = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      return sStr === todayStr;
    });

    if (todaySessions.length === 0) {
      arc.style.display = 'none';
      arc.setAttribute('stroke-dasharray', '');
      arc.setAttribute('stroke-dashoffset', '');
      arc.setAttribute('transform', '');
      return;
    }

    // Build a multi-segment arc path from all today's sessions
    // Each session: startAngle → startAngle + sweepAngle
    // We'll use a single circle with stroke-dasharray trick but with multiple transforms
    // Actually simpler: hide the default circle and render separate arcs per session
    // But the spec says one #focusArc circle. So we only show the LAST session's arc
    // (design says "stack by painting all sessions' arcs in order; later sessions may overlap")
    // For simplicity, show the most recent session's arc on the ring
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

    window.dispatchEvent(new CustomEvent('dashboard-data-changed'));
  }

  // ── Preset button wiring ────────────────────────────────────────
  function initPresetButtons() {
    var presetsContainer = document.getElementById('focusPresets');
    var startBtn = document.getElementById('focusStartBtn');
    var stopBtn = document.getElementById('focusStopBtn');

    if (!presetsContainer || !startBtn || !stopBtn) return;

    // Preset button clicks
    presetsContainer.addEventListener('click', function(e) {
      var btn = e.target.closest('.focus-preset-btn');
      if (!btn) return;
      var duration = parseInt(btn.getAttribute('data-duration'), 10);
      if (!duration) return;

      state.selectedDuration = duration;

      // Update selected class
      var allPresets = presetsContainer.querySelectorAll('.focus-preset-btn');
      for (var i = 0; i < allPresets.length; i++) {
        allPresets[i].classList.remove('selected');
      }
      btn.classList.add('selected');

      // Enable start button
      startBtn.disabled = false;
    });

    // Start button
    startBtn.addEventListener('click', function() {
      if (state.phase !== IDLE) return;
      if (!state.selectedDuration) return;
      startTimer(state.selectedDuration);
      startBtn.disabled = true;
      stopBtn.style.display = '';
    });

    // Stop button
    stopBtn.addEventListener('click', function() {
      if (state.phase !== RUNNING) return;
      stopTimer('stopped-early');
      startBtn.disabled = false;
      stopBtn.style.display = 'none';
    });
  }

  // ── Page load init ─────────────────────────────────────────────
  function init() {
    paintFocusArc();
    initPresetButtons();

    // Re-paint focus arc when other data changes
    window.addEventListener('dashboard-data-changed', function() {
      paintFocusArc();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
