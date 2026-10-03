'use strict';
// Offline behavioral checks with Node's built-in test runner; no browser or packages.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../assets/site.js'), 'utf8');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function page({ clipboard, fetch = async () => ({ ok: true, text: async () => '# Protocol' }), secure = true, timers = { setTimeout, clearTimeout } } = {}) {
  function element(value = '') {
    return { value, disabled: false, textContent: '', addEventListener(_, handler) { this.click = () => handler({ currentTarget: this }); },
      focus() { this.focused = true; }, select() { this.selected = true; } };
  }
  const field = element('Original setup prompt'), label = element(), status = element();
  const prompt = element(), protocol = element();
  const elements = { '#setup-prompt': field, 'label[for="setup-prompt"]': label,
    '#copy-status': status, '#copy-prompt': prompt, '#copy-protocol': protocol };
  vm.runInNewContext(source, { document: { querySelector: selector => elements[selector] },
    navigator: { clipboard }, window: { isSecureContext: secure }, fetch, AbortController, ...timers });
  return { field, label, status, prompt, protocol };
}
test('protocol fetch locks both controls and ignores overlapping/repeated clicks', async () => {
  const pending = deferred(), writes = [];
  let fetches = 0;
  const p = page({ fetch: () => { fetches++; return pending.promise; }, clipboard: { writeText: async text => writes.push(text) } });
  const operation = p.protocol.click();
  assert.equal(p.prompt.disabled, true);
  assert.equal(p.protocol.disabled, true);
  await p.prompt.click(); await p.protocol.click();
  assert.deepEqual(writes, []); assert.equal(fetches, 1);
  pending.resolve({ ok: true, text: async () => '# Protocol' });
  await operation;
  assert.deepEqual(writes, ['# Protocol']);
  assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
  await p.prompt.click();
  assert.deepEqual(writes, ['# Protocol', 'Original setup prompt']);
});
test('clipboard write remains locked until settlement', async () => {
  const pending = deferred();
  const p = page({ clipboard: { writeText: () => pending.promise } });
  const operation = p.prompt.click();
  assert.equal(p.prompt.disabled, true); assert.equal(p.protocol.disabled, true);
  assert.match(p.status.textContent, /Copying/);
  pending.resolve(); await operation;
  assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
  assert.match(p.status.textContent, /Setup prompt copied/);
});
test('manual protocol fallback has an accurate label; setup copy restores original text', async () => {
  const p = page();
  await p.protocol.click();
  assert.equal(p.field.value, '# Protocol');
  assert.match(p.label.textContent, /^Full protocol,/);
  assert.match(p.status.textContent, /^Full protocol selected/);
  assert.equal(p.field.focused, true); assert.equal(p.field.selected, true);
  await p.prompt.click();
  assert.equal(p.field.value, 'Original setup prompt');
  assert.match(p.label.textContent, /^Setup prompt,/);
  assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
});
test('clipboard rejection and insecure context preserve manual copy', async () => {
  for (const options of [
    { clipboard: { writeText: async () => { throw new Error('Denied'); } } },
    { secure: false, clipboard: { writeText: async () => assert.fail('Must not call insecure clipboard') } }
  ]) {
    const p = page(options); await p.prompt.click();
    assert.match(p.status.textContent, /selected above/);
    assert.equal(p.field.selected, true);
    assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
  }
});
test('fetch failures unlock controls and preserve setup content for recovery', async () => {
  for (const fetch of [
    async () => { throw new Error('Offline'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, text: async () => '' }),
    async () => ({ ok: true, text: async () => '<!doctype html><h1>404</h1>' }),
    async () => ({ ok: true, text: async () => { throw new Error('Read failed'); } })
  ]) {
    const p = page({ fetch }); await p.protocol.click();
    assert.match(p.status.textContent, /Could not load/);
    assert.equal(p.field.value, 'Original setup prompt');
    assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
    await p.prompt.click(); assert.match(p.status.textContent, /Setup prompt selected/);
  }
});

function clock() {
  let next = 0;
  const callbacks = new Map();
  return {
    setTimeout(callback, ms) { assert.equal(ms, 10000); callbacks.set(++next, callback); return next; },
    clearTimeout(id) { callbacks.delete(id); },
    expire() { for (const callback of [...callbacks.values()]) callback(); },
    get pending() { return callbacks.size; }
  };
}
test('deadline covers fetch and body read, allows recovery/retry, and ignores late results', async () => {
  for (const stage of ['fetch', 'body']) {
    const stalled = deferred(), timers = clock(), writes = [];
    let signal, attempt = 0;
    const p = page({ timers, clipboard: { writeText: async text => writes.push(text) },
      fetch: async (_, options) => {
        signal = options.signal;
        if (++attempt > 1) return { ok: true, text: async () => '# Retry protocol' };
        if (stage === 'fetch') return stalled.promise;
        return { ok: true, text: () => stalled.promise };
      } });
    const operation = p.protocol.click();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(p.prompt.disabled, true);
    timers.expire(); await operation;
    assert.equal(signal.aborted, true);
    assert.equal(timers.pending, 0);
    assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
    assert.match(p.status.textContent, /Could not load/);
    await p.prompt.click();
    assert.deepEqual(writes, ['Original setup prompt']);
    await p.protocol.click();
    assert.deepEqual(writes, ['Original setup prompt', '# Retry protocol']);
    assert.equal(timers.pending, 0);
    const currentStatus = p.status.textContent;
    stalled.resolve(stage === 'fetch' ? { ok: true, text: async () => '# Stale protocol' } : '# Stale protocol');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(writes, ['Original setup prompt', '# Retry protocol']);
    assert.equal(p.status.textContent, currentStatus);
    assert.equal(p.field.value, 'Original setup prompt');
  }
});
test('late load rejection after deadline is handled without replacing recovered UI', async () => {
  const stalled = deferred(), timers = clock();
  const p = page({ timers, fetch: () => stalled.promise });
  const operation = p.protocol.click();
  timers.expire(); await operation;
  await p.prompt.click();
  const currentStatus = p.status.textContent;
  stalled.reject(new Error('Late network failure'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(p.status.textContent, currentStatus);
  assert.equal(p.prompt.disabled, false); assert.equal(p.protocol.disabled, false);
  assert.equal(timers.pending, 0);
});
