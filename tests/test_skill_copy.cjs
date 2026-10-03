'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../assets/skill-copy.js'), 'utf8');
function page({ clipboard, secure = true } = {}) {
  const details = { open: false };
  const button = { disabled: false, addEventListener(_, handler) { this.click = handler; } };
  const field = { value: 'Use the attached Paste Inbox skill.', closest: () => details,
    focus() { this.focused = true; }, select() { this.selected = true; } };
  const status = { textContent: '' };
  const elements = { '#copy-paste-inbox': button, '#paste-inbox-prompt': field, '#paste-inbox-copy-status': status };
  vm.runInNewContext(source, { document: { querySelector: selector => elements[selector] }, navigator: { clipboard }, window: { isSecureContext: secure } });
  return { button, field, status, details };
}
test('copies the literal use prompt and never claims installation', async () => {
  const writes = [], p = page({ clipboard: { writeText: async text => writes.push(text) } });
  await p.button.click();
  assert.deepEqual(writes, [p.field.value]);
  assert.match(p.status.textContent, /nothing has been installed/);
  assert.equal(p.button.disabled, false);
});
test('clipboard fallback opens and selects the visible manual-copy field', async () => {
  for (const options of [{}, { clipboard: { writeText: async () => { throw Error('Denied'); } } },
    { secure: false, clipboard: { writeText: async () => assert.fail('Unexpected insecure clipboard access') } }]) {
    const p = page(options); await p.button.click();
    assert.equal(p.details.open, true); assert.equal(p.field.focused, true); assert.equal(p.field.selected, true);
    assert.match(p.status.textContent, /Nothing has been installed/); assert.equal(p.button.disabled, false);
  }
});
test('repeated clicks do not issue overlapping clipboard writes', async () => {
  let resolve, count = 0;
  const p = page({ clipboard: { writeText: () => { count++; return new Promise(r => { resolve = r; }); } } });
  const first = p.button.click(); await p.button.click();
  assert.equal(count, 1); assert.equal(p.button.disabled, true);
  resolve(); await first; assert.equal(p.button.disabled, false);
});
test('absent skill section is a no-op', () => {
  vm.runInNewContext(source, { document: { querySelector: () => null } });
});
