'use strict';
// Shared by the drop window (as a plain script) and the tests (as a module).
(function (root) {
  /** "12.3 MB" etc.; t is the translator, locale the number format. */
  function formatSize(bytes, t, locale) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 1024) {
      return t('size.bytes', { n: new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0) });
    }
    const units = ['size.kb', 'size.mb', 'size.gb'];
    let v = n / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const digits = v < 10 ? 1 : 0;
    const text = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    return t(units[i], { n: text });
  }
  /** Fill {name} placeholders in a text from a language file. */
  function fill(text, vars) {
    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  }
  const api = { formatSize, fill };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ToolboxFormat = api;
})(this);
