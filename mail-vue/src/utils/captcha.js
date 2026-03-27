const TURNSTILE_SCRIPT_ID = 'cloud-mail-turnstile';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loadPromise = null;

export function isTurnstileCaptchaEnabled(settings = {}) {
  return settings?.captchaEnabled
    && settings?.captchaProvider === 'turnstile'
    && !!settings?.siteKey;
}

export function isTurnstileCaptchaRequired(settings = {}, verifyMode, verifyOpen = false) {
  if (!isTurnstileCaptchaEnabled(settings)) {
    return false;
  }

  return verifyMode === 0 || (verifyMode === 2 && verifyOpen);
}

export async function loadTurnstile(settings = {}) {
  if (!isTurnstileCaptchaEnabled(settings)) {
    return null;
  }

  if (window.turnstile) {
    return window.turnstile;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);

    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('Turnstile script failed to load'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }

      loadPromise = null;
      reject(new Error('Turnstile sdk is unavailable after load'));
    };
    script.onerror = () => {
      loadPromise = null;
      script.remove();
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function renderTurnstileWidget(target, settings = {}, options = {}) {
  const turnstile = await loadTurnstile(settings);

  if (!turnstile) {
    return null;
  }

  if (!target) {
    throw new Error('Turnstile target is required');
  }

  return turnstile.render(target, {
    sitekey: settings.siteKey,
    callback: options.callback,
    'error-callback': options.errorCallback
  });
}

export function resetTurnstileWidget(widgetId) {
  if (widgetId === null || widgetId === undefined || !window.turnstile) {
    return;
  }

  window.turnstile.reset(widgetId);
}

export function removeTurnstileWidget(widgetId) {
  if (widgetId === null || widgetId === undefined || !window.turnstile?.remove) {
    return;
  }

  window.turnstile.remove(widgetId);
}
