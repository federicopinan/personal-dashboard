(function() {
  'use strict';

  // ── Constants ────────────────────────────────────────────────
  var ALLOWED_CURRENCIES = ['ARS', 'USD'];
  var LEGACY_CURRENCIES = ['EUR', 'GBP', 'CHF'];
  var SUBSCRIPTIONS_KEY = 'subscriptions:v1';

  // ── Storage helpers ──────────────────────────────────────────
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

  // ── Currency helpers ─────────────────────────────────────────
  function coerceCurrency(currency) {
    return ALLOWED_CURRENCIES.indexOf(currency) >= 0 ? currency : 'ARS';
  }

  function isLegacyCurrency(currency) {
    return LEGACY_CURRENCIES.indexOf(currency) >= 0;
  }

  function isAllowedCurrency(currency) {
    return ALLOWED_CURRENCIES.indexOf(currency) >= 0;
  }

  // ── Migration steps ──────────────────────────────────────────
  function normalizeCurrencyFields(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    var changed = false;
    ['currency', 'entered_currency', 'ccy'].forEach(function(field) {
      var current = record[field];
      if (isLegacyCurrency(current) && !record.currencyMigratedFrom) {
        record.currencyMigratedFrom = current;
        record[field] = 'ARS';
        if (field === 'entered_currency') record.currency = 'ARS';
        if (record.entered_amount != null) record.amount = Number(record.entered_amount) || record.amount;
        changed = true;
      } else if (current && !isAllowedCurrency(current) && !record.currencyMigratedFrom) {
        record[field] = 'ARS';
        changed = true;
      } else if (record.currencyMigratedFrom && isLegacyCurrency(current)) {
        record[field] = 'ARS';
        changed = true;
      }
    });
    return changed;
  }

  function migrateArrayKey(key) {
    var arr = readRaw(key);
    if (!Array.isArray(arr)) return false;
    var changed = false;
    arr.forEach(function(item) {
      if (normalizeCurrencyFields(item)) changed = true;
    });
    if (changed) writeRaw(key, arr);
    return changed;
  }

  function migrateNetWorthKeys() {
    var changed = false;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('nw:') === 0 && key !== 'nw:activity' && key !== 'nw:history') {
          if (migrateArrayKey(key)) changed = true;
        }
      }
    } catch (e) {}
    var savedCurrency = readRaw('nw_currency');
    if (savedCurrency && !isAllowedCurrency(savedCurrency)) {
      writeRaw('nw_currency', 'ARS');
      changed = true;
    }
    return changed;
  }

  function runMigration() {
    var changed = migrateNetWorthKeys();
    ['subs', 'incoming_orders', 'wishlist', SUBSCRIPTIONS_KEY].forEach(function(key) {
      if (migrateArrayKey(key)) changed = true;
    });
    return changed;
  }

  window.currencyMigration = {
    runMigration: runMigration,
    normalizeCurrencyFields: normalizeCurrencyFields,
    migrateArrayKey: migrateArrayKey,
    migrateNetWorthKeys: migrateNetWorthKeys,
    coerceCurrency: coerceCurrency,
    isLegacyCurrency: isLegacyCurrency,
    isAllowedCurrency: isAllowedCurrency
  };
})();
