// Optional overrides hook (keep file so existing HTML reference works).
// If you want to override copy at runtime, set window.TRUELOCK_OVERRIDES and call TrueLock.applyTranslations().
window.TRUELOCK_OVERRIDES = window.TRUELOCK_OVERRIDES || {};
if (window.TrueLock && typeof window.TrueLock.applyTranslations === 'function') {
  window.TrueLock.applyTranslations();
}
