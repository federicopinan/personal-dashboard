(function() {
  'use strict';

  // ── Constants ────────────────────────────────────────────────
  var STORAGE_KEY = 'subscriptions:v1';
  var LEGACY_SUBS_KEY = 'subs';
  var LEGACY_COPY_FLAG = 'subscriptions:v1:legacy-subs-copied';
  var ROOT_ID = 'subscriptionsRoot';

  // ── Module-level state ────────────────────────────────────────
  var state = {
    subscriptions: [],
    editingId: null
  };

  var root = null;

  // ── Storage + UI helpers ──────────────────────────────────────
  function readRaw(key) {
    try {
      if (typeof window.storeGet === 'function') return window.storeGet(key);
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      if (typeof window.storeSet === 'function') {
        window.storeSet(key, value);
        return true;
      }
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('dashboard-data-changed'));
      return true;
    } catch (e) {
      return false;
    }
  }

  function toast(message) {
    if (typeof window.showToast === 'function') window.showToast(message);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function coerceCurrency(currency) {
    if (window.currencyMigration && typeof window.currencyMigration.coerceCurrency === 'function') {
      return window.currencyMigration.coerceCurrency(currency);
    }
    return currency === 'USD' ? 'USD' : 'ARS';
  }

  function isAllowedCurrency(currency) {
    if (window.currencyMigration && typeof window.currencyMigration.isAllowedCurrency === 'function') {
      return window.currencyMigration.isAllowedCurrency(currency);
    }
    return currency === 'ARS' || currency === 'USD';
  }

  function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + 'T00:00');
    return !isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
  }

  function getTodayDateString() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function formatMoney(amount, currency) {
    var safeCurrency = coerceCurrency(currency);
    var num = Number(amount) || 0;
    if (safeCurrency === 'USD') {
      return 'USD ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCycle(record) {
    var cycle = record && (record.cycle || record.period);
    return cycle === 'yearly' ? 'yearly' : 'monthly';
  }

  function getRenewal(record) {
    return record && (record.nextRenewal || record.renewal || '');
  }

  // ── Subscription schema ───────────────────────────────────────
  function makeId() {
    return 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  }

  function normalizeSubscription(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    var name = String(record.name || '').trim();
    var amount = Number(record.amount);
    var currency = coerceCurrency(record.currency || record.entered_currency || record.ccy || 'ARS');
    var cycle = getCycle(record);
    var nextRenewal = getRenewal(record);
    var createdAt = Number(record.createdAt || record.ts || Date.now());
    if (!name || !isFinite(amount) || amount <= 0 || !isValidDate(nextRenewal)) return null;
    var normalized = {
      id: String(record.id || record.sourceId || makeId()),
      name: name,
      amount: amount,
      currency: currency,
      cycle: cycle,
      nextRenewal: nextRenewal,
      createdAt: createdAt,
      updatedAt: Number(record.updatedAt || createdAt)
    };
    if (record.currencyMigratedFrom) normalized.currencyMigratedFrom = record.currencyMigratedFrom;
    if (record.sourceKey) normalized.sourceKey = record.sourceKey;
    if (record.sourceId) normalized.sourceId = record.sourceId;
    return normalized;
  }

  function listSubscriptions() {
    var records = readRaw(STORAGE_KEY) || [];
    if (!Array.isArray(records)) return [];
    return records.map(normalizeSubscription).filter(Boolean);
  }

  function persistSubscriptions(records) {
    return writeRaw(STORAGE_KEY, records);
  }

  function validateInput(input) {
    var name = String(input.name || '').trim();
    var amount = Number(input.amount);
    var rawCurrency = input.currency || 'ARS';
    var currency = coerceCurrency(rawCurrency);
    var cycle = input.cycle;
    var nextRenewal = input.nextRenewal || '';
    if (!name) return { ok: false, message: 'Subscription name is required' };
    if (!isFinite(amount) || amount <= 0) return { ok: false, message: 'Amount must be positive' };
    if (!isAllowedCurrency(rawCurrency)) return { ok: false, message: 'Currency must be ARS or USD' };
    if (['monthly', 'yearly'].indexOf(cycle) < 0) return { ok: false, message: 'Cycle must be monthly or yearly' };
    if (!isValidDate(nextRenewal)) return { ok: false, message: 'Renewal date is required' };
    return { ok: true, value: { name: name, amount: amount, currency: currency, cycle: cycle, nextRenewal: nextRenewal } };
  }

  function addSubscription(input) {
    var result = validateInput(input);
    if (!result.ok) return result;
    var now = Date.now();
    var records = listSubscriptions();
    records.push(Object.assign({ id: makeId(), createdAt: now, updatedAt: now }, result.value));
    persistSubscriptions(records);
    return { ok: true };
  }

  function updateSubscription(id, input) {
    var result = validateInput(input);
    if (!result.ok) return result;
    var records = listSubscriptions();
    var idx = records.findIndex(function(record) { return record.id === id; });
    if (idx < 0) return { ok: false, message: 'Subscription not found' };
    records[idx] = Object.assign({}, records[idx], result.value, { updatedAt: Date.now() });
    persistSubscriptions(records);
    return { ok: true };
  }

  function deleteSubscription(id) {
    var records = listSubscriptions().filter(function(record) { return record.id !== id; });
    persistSubscriptions(records);
    return { ok: true };
  }

  function computeTotals(records) {
    var totals = {
      monthly: { ARS: 0, USD: 0 },
      annual: { ARS: 0, USD: 0 }
    };
    (records || listSubscriptions()).forEach(function(record) {
      var currency = coerceCurrency(record.currency);
      var amount = Number(record.amount) || 0;
      if (getCycle(record) === 'yearly') {
        totals.monthly[currency] += amount / 12;
        totals.annual[currency] += amount;
      } else {
        totals.monthly[currency] += amount;
        totals.annual[currency] += amount * 12;
      }
    });
    return totals;
  }

  function migrateLegacySubsToV1() {
    var legacy = readRaw(LEGACY_SUBS_KEY);
    if (!Array.isArray(legacy) || readRaw(LEGACY_COPY_FLAG)) return false;
    var records = listSubscriptions();
    var existingSources = records.reduce(function(set, record) {
      if (record.sourceKey) set[record.sourceKey] = true;
      return set;
    }, {});
    legacy.forEach(function(item, idx) {
      var sourceKey = 'subs:' + (item.id || item.name || idx) + ':' + idx;
      if (existingSources[sourceKey]) return;
      var normalized = normalizeSubscription(Object.assign({}, item, {
        id: item.id || sourceKey,
        currency: item.currency || item.entered_currency || 'ARS',
        cycle: getCycle(item),
        nextRenewal: getRenewal(item),
        createdAt: item.createdAt || item.ts || Date.now(),
        sourceKey: sourceKey,
        sourceId: item.id || null
      }));
      if (normalized) records.push(normalized);
    });
    persistSubscriptions(records);
    writeRaw(LEGACY_COPY_FLAG, true);
    return true;
  }

  // ── Rendering ─────────────────────────────────────────────────
  function getEls() {
    return {
      monthly: document.getElementById('subscriptionsMonthlyTotal'),
      annual: document.getElementById('subscriptionsAnnualTotal'),
      next: document.getElementById('subscriptionsNextRenewal'),
      list: document.getElementById('subscriptionsList'),
      empty: document.getElementById('subscriptionsEmpty'),
      form: document.getElementById('subscriptionsForm'),
      name: document.getElementById('subscriptionName'),
      amount: document.getElementById('subscriptionAmount'),
      currency: document.getElementById('subscriptionCurrency'),
      cycle: document.getElementById('subscriptionBillingCycle'),
      renewal: document.getElementById('subscriptionRenewalDate'),
      save: document.getElementById('subscriptionSaveBtn'),
      cancel: document.getElementById('subscriptionCancelBtn')
    };
  }

  function totalsText(totals, bucket) {
    return formatMoney(totals[bucket].ARS, 'ARS') + ' · ' + formatMoney(totals[bucket].USD, 'USD');
  }

  function renderNext(records, el) {
    if (!el) return;
    if (!records.length) {
      el.textContent = 'No renewals yet';
      return;
    }
    var sorted = records.slice().sort(function(a, b) { return getRenewal(a).localeCompare(getRenewal(b)); });
    var next = sorted[0];
    el.textContent = 'Next: ' + next.name + ' · ' + getRenewal(next);
  }

  function resetForm() {
    var els = getEls();
    state.editingId = null;
    if (els.name) els.name.value = '';
    if (els.amount) els.amount.value = '';
    if (els.currency) els.currency.value = 'ARS';
    if (els.cycle) els.cycle.value = 'monthly';
    if (els.renewal) els.renewal.value = getTodayDateString();
    if (els.save) els.save.textContent = '+ Add';
    if (els.cancel) els.cancel.hidden = true;
  }

  function fillForm(record) {
    var els = getEls();
    state.editingId = record.id;
    if (els.name) els.name.value = record.name;
    if (els.amount) els.amount.value = String(record.amount);
    if (els.currency) els.currency.value = coerceCurrency(record.currency);
    if (els.cycle) els.cycle.value = getCycle(record);
    if (els.renewal) els.renewal.value = getRenewal(record);
    if (els.save) els.save.textContent = 'Save';
    if (els.cancel) els.cancel.hidden = false;
    if (els.name) els.name.focus();
  }

  function render() {
    var els = getEls();
    if (!root || !els.list) return;
    state.subscriptions = listSubscriptions();
    var totals = computeTotals(state.subscriptions);
    if (els.monthly) els.monthly.textContent = totalsText(totals, 'monthly') + ' / mo';
    if (els.annual) els.annual.textContent = totalsText(totals, 'annual') + ' / year';
    renderNext(state.subscriptions, els.next);
    els.list.innerHTML = '';
    if (!state.subscriptions.length) {
      if (els.empty) els.empty.style.display = 'block';
      return;
    }
    if (els.empty) els.empty.style.display = 'none';
    state.subscriptions.forEach(function(record) {
      var row = document.createElement('div');
      row.className = 'subscription-row';
      row.innerHTML =
        '<div class="subscription-row-main">' +
          '<div class="subscription-row-name">' + escapeHtml(record.name) + '</div>' +
          '<div class="subscription-row-meta">' + formatMoney(record.amount, record.currency) + ' · ' + getCycle(record) + ' · renews ' + getRenewal(record) + '</div>' +
        '</div>' +
        '<div class="subscription-row-actions">' +
          '<button type="button" data-edit="' + record.id + '">Edit</button>' +
          '<button type="button" data-delete="' + record.id + '">Delete</button>' +
        '</div>';
      els.list.appendChild(row);
    });
  }

  function readFormInput() {
    var els = getEls();
    return {
      name: els.name ? els.name.value : '',
      amount: els.amount ? els.amount.value : '',
      currency: els.currency ? els.currency.value : 'ARS',
      cycle: els.cycle ? els.cycle.value : 'monthly',
      nextRenewal: els.renewal ? els.renewal.value : ''
    };
  }

  function saveFromForm() {
    var result = state.editingId ? updateSubscription(state.editingId, readFormInput()) : addSubscription(readFormInput());
    if (!result.ok) {
      toast(result.message);
      return;
    }
    toast(state.editingId ? 'Subscription updated' : 'Subscription added');
    resetForm();
    render();
  }

  function bindEvents() {
    var els = getEls();
    if (els.save) els.save.addEventListener('click', saveFromForm);
    if (els.cancel) els.cancel.addEventListener('click', function() { resetForm(); render(); });
    if (els.form) {
      els.form.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveFromForm();
        }
      });
    }
    if (els.list) {
      els.list.addEventListener('click', function(e) {
        var edit = e.target.closest('[data-edit]');
        var del = e.target.closest('[data-delete]');
        if (edit) {
          var record = state.subscriptions.find(function(item) { return item.id === edit.dataset.edit; });
          if (record) fillForm(record);
        }
        if (del) {
          deleteSubscription(del.dataset.delete);
          toast('Subscription deleted');
          resetForm();
          render();
        }
      });
    }
  }

  function init() {
    if (window.currencyMigration && typeof window.currencyMigration.runMigration === 'function') {
      window.currencyMigration.runMigration();
    }
    migrateLegacySubsToV1();
    root = document.getElementById(ROOT_ID);
    if (!root) return;
    bindEvents();
    resetForm();
    render();
  }

  window.DashboardSubscriptions = {
    migrateLegacyCurrencies: function() {
      return window.currencyMigration && typeof window.currencyMigration.runMigration === 'function'
        ? window.currencyMigration.runMigration()
        : false;
    },
    migrateLegacySubsToV1: migrateLegacySubsToV1,
    listSubscriptions: listSubscriptions,
    addSubscription: addSubscription,
    updateSubscription: updateSubscription,
    deleteSubscription: deleteSubscription,
    computeTotals: computeTotals,
    formatMoney: formatMoney,
    coerceCurrency: coerceCurrency
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
