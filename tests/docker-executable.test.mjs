import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform } from 'esbuild';
const source=await readFile(new URL('../source/electron-main/box/docker-executable.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {resolveDockerExecutable}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('Finder launch finds Docker outside the system PATH',()=>{
  assert.equal(resolveDockerExecutable({path:'/usr/bin:/bin:/usr/sbin:/sbin',home:'/Users/test',isExecutable:p=>p==='/usr/local/bin/docker'}),'/usr/local/bin/docker');
});
test('Docker discovery supports OrbStack, Homebrew, and Docker Desktop',()=>{
  for(const path of ['/opt/homebrew/bin/docker','/Users/test/.orbstack/bin/docker','/Users/test/.docker/bin/docker','/Applications/Docker.app/Contents/Resources/bin/docker']) {
    assert.equal(resolveDockerExecutable({path:'/usr/bin',home:'/Users/test',isExecutable:p=>p===path}),path);
  }
});
test('Docker discovery honors an existing CLI on PATH and reports a missing CLI',()=>{
  assert.equal(resolveDockerExecutable({path:'/custom/bin:/usr/bin',isExecutable:()=>true}),'/custom/bin/docker');
  assert.throws(()=>resolveDockerExecutable({path:'/usr/bin',isExecutable:()=>false}),/Docker CLI was not found/);
});
