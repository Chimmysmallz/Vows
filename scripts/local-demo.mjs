import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {demoEnvironment,HOSTS} from '../demo/guard.mjs';
const [operation,...args]=process.argv.slice(2);
if(!['seed','rules'].includes(operation))throw Error('Choose only seed or rules. No arbitrary script execution.');
if(operation==='rules'&&args.length)throw Error('Rules launcher accepts no extra arguments.');
// Only this explicitly selected local launcher supplies missing loopback values.
// Supplied values are never overwritten: the strict guard rejects unsafe values.
const input={...process.env,FIREBASE_AUTH_EMULATOR_HOST:process.env.FIREBASE_AUTH_EMULATOR_HOST??HOSTS.auth,FIRESTORE_EMULATOR_HOST:process.env.FIRESTORE_EMULATOR_HOST??HOSTS.firestore};
const env=demoEnvironment(input,operation==='rules'||args.includes('--confirm-demo'));
const command=operation==='seed'?['scripts/seed-demo.mjs',...args]:['--test','--test-concurrency=1','test/rules.emulator.mjs'];
const result=spawnSync(process.execPath,command,{cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
