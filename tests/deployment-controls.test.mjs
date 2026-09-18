import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const retired = ['deploy.yml', 'agent-autopilot.yml', 'agent-open-pr.yml'];
function forbidden(text) {
  const executable = text.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
  return /\bvercel\b[^\n]*(?:--prod|\bdeploy\b)|(?:^|[|;&]\s*)\s*(?:npx\s+)?vercel\s*$/m.test(executable) ||
    /DEPLOY_HOOK|\/integrations\/deploy\//.test(executable) ||
    /gh\s+pr\s+merge|pulls\.merge|enablePullRequestAutoMerge/.test(executable);
}

test('the old duplicate and automated release workflows stay retired', () => {
  for (const name of retired) assert.equal(existsSync(resolve(root, '.github/workflows', name)), false, name);
});
test('GitHub validation does not introduce a second Vercel publisher or release agent', () => {
  for (const name of readdirSync(resolve(root, '.github/workflows')).filter(name => /\.ya?ml$/.test(name))) {
    assert.equal(forbidden(readFileSync(resolve(root, '.github/workflows', name), 'utf8')), false, name);
  }
});
test('the existing direct CI invokes this guard', () => {
  const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /pull_request:/);
  assert.match(ci, /node --test tests\/deployment-controls\.test\.mjs/);
});
test('the guard rejects the actual duplicate command and merge automation', () => {
  const provider = ['ver', 'cel'].join('');
  assert.equal(forbidden(`run: ${provider} --prod --token=example --yes`), true);
  assert.equal(forbidden(`run: npx ${provider} deploy`), true);
  assert.equal(forbidden('run: gh pr merge 42 --auto --squash'), true);
  assert.equal(forbidden('run: node --test tests/deployment-controls.test.mjs'), false);
  assert.equal(forbidden('# Retired: ' + provider + ' --prod'), false);
});
