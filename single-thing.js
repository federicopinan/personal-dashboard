(function() {
  'use strict';

  // ── Constants ────────────────────────────────────────────────
  var STORAGE_PREFIX = 'singleThing:';
  var ROOT_ID = 'singleThingRoot';
  var PLACEHOLDER = 'Lo único que tiene que salir hoy';

  // ── Module-level state ────────────────────────────────────────
  var state = {
    item: null,
    editing: false
  };

  var root = null;

  // ── Date + storage helpers ────────────────────────────────────
  function getLocalDateString() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function getStorageKey() {
    return STORAGE_PREFIX + getLocalDateString();
  }

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

  // ── Schema validation ─────────────────────────────────────────
  function isValidItem(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (typeof value.text !== 'string' || value.text.trim() === '') return false;
    if (typeof value.done !== 'boolean') return false;
    if (typeof value.setAt !== 'number' || !isFinite(value.setAt)) return false;
    if (value.done) return typeof value.doneAt === 'number' && isFinite(value.doneAt);
    return value.doneAt === null;
  }

  function loadToday() {
    var item = readRaw(getStorageKey());
    state.item = isValidItem(item) ? item : null;
    state.editing = false;
  }

  function saveItem(text) {
    var cleanText = text.trim();
    if (!cleanText) return false;
    if (state.item && state.item.done) return false;

    state.item = {
      text: cleanText,
      done: false,
      setAt: Date.now(),
      doneAt: null
    };
    state.editing = false;
    writeRaw(getStorageKey(), state.item);
    render();
    return true;
  }

  function markDone() {
    if (!state.item || state.item.done) return;
    state.item = {
      text: state.item.text,
      done: true,
      setAt: state.item.setAt,
      doneAt: Date.now()
    };
    state.editing = false;
    writeRaw(getStorageKey(), state.item);
    toast('Single thing done');
    render();
  }

  // ── Rendering ─────────────────────────────────────────────────
  function clearRoot() {
    while (root.firstChild) root.removeChild(root.firstChild);
  }

  function buildInput(value, buttonText, allowCancel) {
    var wrap = document.createElement('div');
    wrap.className = 'gm-input-wrap single-thing-input-wrap';

    var input = document.createElement('input');
    input.className = 'goal-input single-thing-input';
    input.placeholder = PLACEHOLDER;
    input.autocomplete = 'off';
    input.value = value || '';

    var save = document.createElement('button');
    save.className = 'goal-add-btn single-thing-save';
    save.type = 'button';
    save.textContent = buttonText || 'Save';

    function commit() {
      saveItem(input.value);
    }

    save.addEventListener('click', commit);
    input.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') commit();
      if (event.key === 'Escape' && allowCancel) {
        state.editing = false;
        render();
      }
    });
    input.addEventListener('blur', function() {
      if (input.value.trim()) commit();
    });

    wrap.appendChild(input);
    wrap.appendChild(save);

    if (allowCancel) {
      var cancel = document.createElement('button');
      cancel.className = 'goal-polish-btn single-thing-cancel';
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('mousedown', function(event) {
        event.preventDefault();
      });
      cancel.addEventListener('click', function() {
        state.editing = false;
        render();
      });
      wrap.appendChild(cancel);
    }

    return wrap;
  }

  function renderEmpty() {
    root.appendChild(buildInput('', 'Set', false));
  }

  function renderEditing() {
    root.appendChild(buildInput(state.item ? state.item.text : '', 'Save', true));
    var input = root.querySelector('.single-thing-input');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function renderDisplay() {
    var row = document.createElement('div');
    row.className = 'single-thing-row' + (state.item.done ? ' is-done' : '');

    var done = document.createElement('button');
    done.className = 'goal-checkbox single-thing-done' + (state.item.done ? ' checked' : '');
    done.type = 'button';
    done.setAttribute('aria-label', state.item.done ? 'Single thing completed' : 'Mark single thing done');
    done.disabled = state.item.done;
    done.addEventListener('click', markDone);

    var text = document.createElement('button');
    text.className = 'single-thing-text';
    text.type = 'button';
    text.textContent = state.item.text;
    text.disabled = state.item.done;
    text.addEventListener('click', function() {
      if (state.item.done) return;
      state.editing = true;
      render();
    });

    row.appendChild(done);
    row.appendChild(text);

    if (!state.item.done) {
      var edit = document.createElement('button');
      edit.className = 'single-thing-edit';
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Edit single thing');
      edit.textContent = '✎';
      edit.addEventListener('click', function() {
        state.editing = true;
        render();
      });
      row.appendChild(edit);
    }

    root.appendChild(row);
  }

  function render() {
    if (!root) return;
    clearRoot();
    if (!state.item) return renderEmpty();
    if (state.editing && !state.item.done) return renderEditing();
    renderDisplay();
  }

  function init() {
    root = document.getElementById(ROOT_ID);
    if (!root) return;
    loadToday();
    render();
  }

  init();
})();
