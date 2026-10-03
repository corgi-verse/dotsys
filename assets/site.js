'use strict';
const promptField = document.querySelector('#setup-prompt');
const status = document.querySelector('#copy-status');
async function copyText(text, success) {
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    status.textContent = success;
  } catch (_) {
    promptField.value = text;
    promptField.focus();
    promptField.select();
    status.textContent = 'Automatic copying is unavailable. The text is selected above; use your device’s Copy command.';
  }
}
const setupPrompt = promptField.value;
document.querySelector('#copy-prompt').addEventListener('click', () => {
  promptField.value = setupPrompt;
  copyText(setupPrompt, 'Setup prompt copied. Attach PROTOCOL.md before using it.');
});
document.querySelector('#copy-protocol').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  status.textContent = 'Loading the protocol…';
  try {
    const response = await fetch('PROTOCOL.md');
    if (!response.ok) throw new Error('Protocol unavailable');
    const text = await response.text();
    if (!text.trim() || /^\s*<!doctype html/i.test(text)) throw new Error('Unexpected response');
    await copyText(text, 'Full protocol copied. Review it before adoption.');
  } catch (_) {
    status.textContent = 'Could not load the protocol. Use “Open file” or download PROTOCOL.md and copy its contents manually.';
  } finally {
    button.disabled = false;
  }
});
