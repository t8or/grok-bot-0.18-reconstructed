import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

test('turn restores its durable journal checkpoint before preparing a new one', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'codexbot-recovery-'));
  try {
    const result = await build({entryPoints:[new URL('../source/host/runner/turn-settle.ts',import.meta.url).pathname], bundle:true, platform:'node',format:'cjs',write:false,logLevel:'silent'});
    const file=path.join(dir,'settle.cjs'); await writeFile(file,result.outputFiles[0].contents);
    const {createTurnSettle}=createRequire(import.meta.url)(file);
    const events=[];
    const initial={summaryArchives:[],turnTimings:[]};
    const next={summaryArchives:[],turnTimings:[]};
    const settle=createTurnSettle({
      isSubagentRunner:false, getTranscriptId:()=> 'test', getBlobStore:()=> ({}), ownsRunner:()=>false,
      transcriptMirror:{
        recover:async (_ctx,_id,state)=>{assert.equal(state,initial);events.push('recover');},
        prepareCheckpoint:async()=>{assert.deepEqual(events,['recover']);events.push('prepare');},
        commitCheckpoint:async()=>events.push('commit'),
      },
      agentStore:()=>({handleCheckpoint:async()=>events.push('persist'),getMetadata:()=>undefined}),
    },{conversationId:'test',profilePromptSnapshots:{}});
    await settle.noteBaseState(initial,true,{});
    await settle.persistStepCheckpoint({},next);
    assert.deepEqual(events,['recover','prepare','persist','commit']);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
