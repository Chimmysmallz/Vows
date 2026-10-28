export const PROJECT = 'demo-vows-test';
export const HOSTS = Object.freeze({auth: '127.0.0.1:9099', firestore: '127.0.0.1:8080'});

export function demoEnvironment(input, confirmed = false) {
  if (!confirmed) throw Error('Refusing seed/test without --confirm-demo.');
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_KEYFILE_JSON', 'FIREBASE_CONFIG']) {
    if (key in input) throw Error(`Remove ${key}; credentials/configuration are forbidden for the emulator kit.`);
  }
  const env = {...input};
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']) {
    if (env[key] !== undefined && env[key] !== PROJECT) throw Error(`Refusing non-demo project in ${key}.`);
  }
  env.GCLOUD_PROJECT = PROJECT;
  for (const [key, expected] of [['FIREBASE_AUTH_EMULATOR_HOST', HOSTS.auth], ['FIRESTORE_EMULATOR_HOST', HOSTS.firestore]]) {
    if (env[key] !== undefined && env[key] !== expected && env[key] !== expected.replace('127.0.0.1', 'localhost')) {
      throw Error(`Refusing non-loopback or unexpected emulator endpoint in ${key}.`);
    }
    if (env[key] === undefined) throw Error(`Missing required ${key}; use the explicit npm local demo launcher.`);
  }
  return env;
}

export const browserConfig = Object.freeze({
  apiKey: 'DEMO-ONLY-NOT-A-PRODUCTION-KEY', authDomain: 'localhost',
  projectId: PROJECT, storageBucket: 'demo-vows-test.invalid',
  messagingSenderId: '000000000000', appId: 'demo-vows-test-local-only'
});

export function browserGuard(projectId, hostname, port, protocol) {
  if (projectId !== PROJECT || !['127.0.0.1', 'localhost'].includes(hostname) || port !== '5000' || protocol !== 'http:') {
    throw Error('DEMO BLOCKED: use http://127.0.0.1:5000 only. Never deploy this demo copy.');
  }
}
