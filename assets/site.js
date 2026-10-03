'use strict';
const promptField = document.querySelector('#setup-prompt');
const promptLabel = document.querySelector('label[for="setup-prompt"]');
const status = document.querySelector('#copy-status');
const promptButton = document.querySelector('#copy-prompt');
const protocolButton = document.querySelector('#copy-protocol');
let copyPending = false;

// Both controls share one clipboard and manual-copy field. Keep an unfinished
// operation from replacing the result of a second click.
function beginCopy() {
  if (copyPending) return false;
  copyPending = true;
  promptButton.disabled = true;
  protocolButton.disabled = true;
  return true;
}
function endCopy() {
  copyPending = false;
  promptButton.disabled = false;
  protocolButton.disabled = false;
}
function showText(text, label) {
  promptField.value = text;
  promptLabel.textContent = `${label}, available to select and copy manually`;
}
async function copyText(text, label, success) {
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    status.textContent = success;
  } catch (_) {
    showText(text, label);
    promptField.focus();
    promptField.select();
    status.textContent = `${label} selected above. Automatic copying is unavailable; use your device’s Copy command.`;
  }
}
// Bound both the request and body read. A timed-out result can finish later,
// but cannot reach clipboard or UI updates because only this race is awaited.
async function loadProtocol() {
  const controller = new AbortController();
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error('Protocol load timed out'));
      controller.abort();
    }, 10000);
  });
  const read = async () => {
    const response = await fetch('PROTOCOL.md', { signal: controller.signal });
    if (!response.ok) throw new Error('Protocol unavailable');
    const text = await response.text();
    if (!text.trim() || /^\s*<!doctype html/i.test(text)) throw new Error('Unexpected response');
    return text;
  };
  try {
    return await Promise.race([read(), deadline]);
  } finally {
    clearTimeout(timeout);
  }
}
const setupPrompt = promptField.value;
promptButton.addEventListener('click', async () => {
  if (!beginCopy()) return;
  showText(setupPrompt, 'Setup prompt');
  status.textContent = 'Copying the setup prompt…';
  try {
    await copyText(setupPrompt, 'Setup prompt', 'Setup prompt copied. Attach PROTOCOL.md before using it.');
  } finally {
    endCopy();
  }
});
protocolButton.addEventListener('click', async () => {
  if (!beginCopy()) return;
  status.textContent = 'Loading the protocol…';
  try {
    const text = await loadProtocol();
    await copyText(text, 'Full protocol', 'Full protocol copied. Review it before adoption.');
  } catch (_) {
    status.textContent = 'Could not load the protocol. Use “Open file” or download PROTOCOL.md and copy its contents manually.';
  } finally {
    endCopy();
  }
});
