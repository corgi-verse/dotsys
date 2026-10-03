'use strict';
(() => {
  const button = document.querySelector('#copy-paste-inbox');
  const field = document.querySelector('#paste-inbox-prompt');
  const status = document.querySelector('#paste-inbox-copy-status');
  if (!button || !field || !status) return;
  let pending = false;
  button.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    button.disabled = true;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(field.value);
      status.textContent = 'Use prompt copied. Attach the skill through your host’s supported flow; nothing has been installed.';
    } catch (_) {
      field.closest('details').open = true;
      field.focus();
      field.select();
      status.textContent = 'Use prompt selected above. Use your device’s Copy command. Nothing has been installed.';
    } finally {
      pending = false;
      button.disabled = false;
    }
  });
})();
