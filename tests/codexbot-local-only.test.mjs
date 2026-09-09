import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { transform, build } from 'esbuild';
import { reconstructedUpdaterGuard } from '../scripts/lib/build-asar.mjs';

test('direct packaged launch establishes an independent profile before startup', () => {
  const env = JSON.parse(execFileSync(process.execPath, ['-e', reconstructedUpdaterGuard + '\nconsole.log(JSON.stringify(process.env));'], { encoding: 'utf8' }));
  assert.equal(env.CODEXBOT_LOCAL_ONLY, '1');
  assert.match(env.SAND_USER_DATA_DIR, /Application Support\/Grok Bot 0.18 Reconstructed$/);
  assert.equal(env.SAND_DATA_ROOT, `${env.SAND_USER_DATA_DIR}/data`);
  assert.equal(env.SAND_BACKEND_URL, 'http://127.0.0.1:9');
});
test('local account requires no secret store, browser, or Cursor token', async () => {
  const source = await readFile(new URL('../source/electron-main/account/local-account.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { createLocalAccountService } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const service = createLocalAccountService();
  assert.equal((await service.getStatus()).authId, 'local:codexbot');
  assert.equal((await service.login()).kind, 'logged-in');
  assert.equal(await service.peekAccessToken(), null);
  await assert.rejects(service.getValidAccessToken(), /Cursor services are disabled/);
});
test('vendor policy rejects fetch, HTTP, HTTP2, TLS and DNS before connecting; localhost works', () => {
  const policy = new URL('../assets/codexbot/network-policy.cjs', import.meta.url).pathname;
  const script = `
    const assert = require('node:assert/strict');
    (async () => {
      await assert.rejects(fetch('https://api2.cursor.sh/test'), { code: 'ERR_CODEXBOT_VENDOR_BLOCKED' });
      for (const [module, method, arg] of [
        ['https','get','https://cursor.com'], ['http2','connect','https://api3.cursor.sh'],
        ['tls','connect',{host:'api.cursor.com',port:443}], ['dns','lookup','API2.CURSOR.SH.']
      ]) assert.throws(() => require('node:'+module)[method](arg), {code:'ERR_CODEXBOT_VENDOR_BLOCKED'});
      const server = require('node:http').createServer((req,res) => res.end('local'));
      await new Promise(r => server.listen(0,'127.0.0.1',r));
      assert.equal(await (await fetch('http://127.0.0.1:'+server.address().port)).text(),'local');
      await new Promise(r => server.close(r));
    })().catch(e => { console.error(e); process.exitCode=1; });
  `;
  execFileSync(process.execPath, ['--require', policy, '-e', script], { env: {...process.env, CODEXBOT_LOCAL_ONLY:'1'}, timeout:15000 });
});
test('local gateway satisfies credential interface without calling Cursor', async () => {
  const bundled = await build({ entryPoints: [new URL('../source/electron-main/box/local-docker-host-connector.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  const code = bundled.outputFiles[0].text;
  const { createSettingsRoutedHostConnector } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const saved = process.env.CODEXBOT_LOCAL_ONLY;
  process.env.CODEXBOT_LOCAL_ONLY = '1';
  try {
    const unexpected = () => { throw new Error('Cursor must not be called'); };
    const connector = createSettingsRoutedHostConnector({ connect: unexpected, issueLocalExecDaemonCredential: unexpected, issueInferenceCredential: unexpected }, {});
    assert.equal(typeof connector.issueLocalExecDaemonCredential, 'function');
    assert.equal(await connector.issueLocalExecDaemonCredential(), undefined);
    assert.equal(connector.issueInferenceCredential, undefined);
  } finally { if (saved === undefined) delete process.env.CODEXBOT_LOCAL_ONLY; else process.env.CODEXBOT_LOCAL_ONLY=saved; }
});
test('Codex action review preserves blocks and fails closed on malformed responses', async () => {
  const source = await readFile(new URL('../source/host/extensions/auto-review/codex-review-decision.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { parseCodexReviewDecision } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  assert.deepEqual(parseCodexReviewDecision('{"decision":"allow","reason":"Requested read-only inspection"}'), {decision:'allow',reason:'Requested read-only inspection'});
  assert.equal(parseCodexReviewDecision('{"decision":"block","reason":"User approval required"}').decision, 'block');
  for (const value of ['{}','null','{"decision":"allow"}','{"decision":"ALLOW","reason":"x"}','allow','{"decision":"allow","reason":""}']) assert.throws(() => parseCodexReviewDecision(value));
});
