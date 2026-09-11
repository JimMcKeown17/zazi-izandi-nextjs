import assert from 'node:assert/strict';
import {before, test} from 'node:test';
import {build} from 'esbuild';

let renderPage;
before(async () => {
  const built = await build({
    stdin: {
      contents: "export {default} from './app/(site)/mobile-app/reassign/page';",
      resolveDir: process.cwd(), loader: 'tsx',
    },
    absWorkingDir: process.cwd(), bundle: true, write: false,
    platform: 'node', format: 'esm',
    plugins: [{name: 'closed-server-boundaries', setup(b) {
      const stubs = {
        '@/lib/mobile/auth': `export async function requireMobileReassignSession() {
          globalThis.reassignPageFixture.calls.push('authorize');
          if(globalThis.reassignPageFixture.denied) throw Error('Synthetic authorization refusal');
        }`,
        '@/lib/mobile/api': `export async function getMobileUserHealth(args) {
          globalThis.reassignPageFixture.calls.push(args);
          return globalThis.reassignPageFixture.result;
        }`,
        '@/components/mobile-app/reassign/reassign-roster-flow':
          'export function MobileReassignRosterFlow() { return null; }',
      };
      b.onResolve({filter: /^@\//}, args => stubs[args.path]
        ? {path: args.path, namespace: 'fixture'} : undefined);
      b.onLoad({filter: /.*/, namespace: 'fixture'}, args => ({
        contents: stubs[args.path], loader: 'js',
      }));
    }}],
  });
  renderPage = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)).default;
});

test('the actual route carries failed reads separately from an empty successful list', async () => {
  for (const result of [{ok: false, status: 502, message: 'Synthetic failure'},
    {ok: true, data: {users: []}}]) {
    globalThis.reassignPageFixture = {calls: [], result};
    const element = await renderPage();
    assert.deepEqual(element.props.candidates, []);
    assert.equal(element.props.candidatesUnavailable, !result.ok);
    assert.deepEqual(globalThis.reassignPageFixture.calls, ['authorize', {days: 30, schoolId: null}]);
  }
});

test('the actual route preserves candidate identity and never fetches after authorization refusal', async () => {
  const user = {user_id: '00000000-0000-4000-8000-000000000001',
    display_name: 'Fixture EA', current_school: 'Fixture school', employment_status: 'active'};
  globalThis.reassignPageFixture = {calls: [], result: {ok: true, data: {users: [user]}}};
  const element = await renderPage();
  assert.deepEqual(element.props.candidates, [{userId: user.user_id,
    displayName: user.display_name, school: user.current_school, employmentStatus: 'active'}]);
  assert.equal(element.props.candidatesUnavailable, false);
  globalThis.reassignPageFixture = {calls: [], denied: true};
  await assert.rejects(renderPage, /Synthetic authorization refusal/);
  assert.deepEqual(globalThis.reassignPageFixture.calls, ['authorize']);
});
