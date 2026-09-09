// CodexBot's application-level vendor block. Also preloaded in Docker Node services.
(() => {
  if (process.env.CODEXBOT_LOCAL_ONLY !== '1') return;
  const marker = Symbol.for('codexbot.network-policy');
  if (globalThis[marker]) return;
  globalThis[marker] = true;
  const domains = ['cursor.com', 'cursor.sh', 'cursorapi.com', 'anysphere.co', 'anysphere.com', 'grokbot.com', 'statsig.com', 'statsigapi.net', 'sentry.io'];
  function hostname(value) {
    if (value == null) return '';
    if (typeof value === 'object') return hostname(value.hostname || value.host || value.url || value.href || '');
    const text = String(value);
    try { return new URL(text.includes('://') ? text : `https://${text}`).hostname.toLowerCase().replace(/\.$/, ''); } catch { return ''; }
  }
  function blocked(value) { const host = hostname(value); return domains.some(d => host === d || host.endsWith(`.${d}`)); }
  function check(value) {
    if (blocked(value)) { const e = new Error(`CodexBot blocks vendor connection: ${hostname(value)}`); e.code = 'ERR_CODEXBOT_VENDOR_BLOCKED'; throw e; }
  }
  const wrap = (object, key, target = args => args[0]) => {
    const original = object[key];
    if (typeof original !== 'function') return;
    object[key] = function(...args) { check(target(args)); return Reflect.apply(original, this, args); };
  };
  if (globalThis.fetch) { const fetch = globalThis.fetch; globalThis.fetch = async function(...args) { check(args[0]); return Reflect.apply(fetch, this, args); }; }
  for (const name of ['node:http', 'node:https']) for (const key of ['request', 'get']) wrap(require(name), key);
  wrap(require('node:http2'), 'connect');
  for (const key of ['connect', 'createConnection']) wrap(require('node:net'), key, a => typeof a[0] === 'number' ? a[1] : a[0]);
  wrap(require('node:tls'), 'connect', a => typeof a[0] === 'number' ? a[1] : a[0]);
  const dns = require('node:dns');
  for (const key of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname']) { wrap(dns, key); wrap(dns.promises, key); }
  require('node:module').syncBuiltinESMExports();
  if (process.versions.electron && process.type === 'browser') {
    const { app, shell } = require('electron');
    app.on('session-created', session => session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: blocked(details.url) })));
    wrap(shell, 'openExternal');
  }
})();
