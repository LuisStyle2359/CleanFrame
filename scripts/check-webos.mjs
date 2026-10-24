// LG webOS adapter checks. Mock only the PalmServiceBridge (Luna) boundary; never contact a TV.
import { readFileSync } from 'node:fs';
import { openPreview, root } from './browser.mjs';

const SELF = JSON.parse(readFileSync(root + 'webos/appinfo.json', 'utf8')).id;
let preview, current, failures = 0;

function check(name, pass, detail) {
  console.log((pass ? 'passed: ' : 'FAILED: ') + name + (pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 500)));
  if (!pass) failures++;
}

// installed: app IDs getAppLoadStatus reports; launchPoints: null denies listing like webOS 6+.
// missing/failing: launch errors; silent: status checks that never answer; holdLaunch: launches wait for __luna.release().
function installBridge({ installed, launchPoints, missing, failing, silent, deniedStatus, holdLaunch }) {
  window.__luna = { calls: [], held: [], release() { this.held.splice(0).forEach(f => f()); } };
  window.PalmServiceBridge = function () {};
  window.PalmServiceBridge.prototype.call = function (uri, raw) {
    const params = JSON.parse(raw), method = uri.split('/').pop(), bridge = this;
    let reply;
    window.__luna.calls.push({ method, params });
    if (method === 'launch') reply = missing.includes(params.id) ? { returnValue: false, errorCode: -101, errorText: 'not exist' } : failing.includes(params.id) ? { returnValue: false, errorCode: -1, errorText: 'busy' } : { returnValue: true };
    else if (method === 'getAppLoadStatus' && silent.includes(params.appId)) return;
    else if (method === 'getAppLoadStatus') reply = deniedStatus ? { returnValue: false, errorText: 'Denied method call "getAppLoadStatus"' } : { returnValue: true, exist: installed.includes(params.appId) };
    else if (method === 'listLaunchPoints') reply = launchPoints ? { returnValue: true, launchPoints } : { returnValue: false, errorText: 'Denied method call "listLaunchPoints"' };
    else reply = { returnValue: false, errorText: 'Unexpected method' };
    const answer = () => bridge.onservicecallback(JSON.stringify(reply));
    if (method === 'launch' && holdLaunch) window.__luna.held.push(answer); else setTimeout(answer, 0);
  };
}
async function page(bridge) {
  current = await preview.browser.newPage({ viewport: { width: 1920, height: 1080 } });
  current.on('pageerror', error => check('No page error', false, error.message));
  if (bridge) await current.addInitScript(installBridge, { installed: [], launchPoints: null, missing: [], failing: [], silent: [], deniedStatus: false, holdLaunch: false, ...bridge });
  await current.goto(preview.baseURL + '/home/');
  await current.waitForFunction(() => window.ShoreQA && ShoreQA.ready(), null, { timeout: 15000 });
}
const evaluate = fn => current.evaluate(fn);
const act = action => current.evaluate(a => ShoreQA.activate(a), action);
const calls = () => evaluate(() => window.__luna.calls);
const settle = () => current.waitForTimeout(50);
const sheet = () => evaluate(() => document.getElementById('sheetView').textContent);
async function allApps() {
  await evaluate(() => ShoreQA.scene('home')); await act('util.apps');
  await current.waitForFunction(() => !ShoreQA.state().catalog.loading, null, { timeout: 8000 });
  return evaluate(() => ({ ...ShoreQA.state().catalog, zone: ShoreQA.where().zone }));
}

preview = await openPreview({ publicFonts: true });
try {
  await page(null);
  const home = await evaluate(() => ({ tv: FrameDevice.tv.name, actions: ShoreQA.actions(), dock: ShoreQA.state().dock }));
  check('Browser preview uses the LG adapter', home.tv === 'LG', home);
  check('LG Home has no Art Mode control', !home.actions.includes('util.art') && home.actions.includes('util.apps'), home.actions);
  check('Default Home keeps only brands with LG IDs', JSON.stringify(home.dock) === JSON.stringify(['netflix', 'disneyplus', 'youtube', 'appletv', 'primevideo']), home.dock);
  await evaluate(() => ShoreQA.nav('back'));
  const leave = await evaluate(() => document.getElementById('sheetView').textContent);
  check('Back offers LG Home', leave.includes('Open LG Home?'), leave);
  await act('util.settings');
  check('Settings names the LG group', (await evaluate(() => document.getElementById('stage').textContent)).includes('LG'));
  await current.close();

  await page({ installed: ['netflix', 'lovefilm.de', 'com.webos.app.hdmi1'], missing: ['amazon'] });
  await act('home.app.netflix'); await settle();
  check('Launch uses the LG app ID', JSON.stringify((await calls()).at(-1)) === JSON.stringify({ method: 'launch', params: { id: 'netflix' } }), await calls());
  await evaluate(() => window.dispatchEvent(new Event('focus')));
  await act('home.app.primevideo'); await settle();
  const prime = (await calls()).filter(c => c.method === 'launch').map(c => c.params.id);
  check('Prime Video falls back to the regional ID', JSON.stringify(prime.slice(-2)) === JSON.stringify(['amazon', 'lovefilm.de']), prime);
  await evaluate(() => window.dispatchEvent(new Event('focus')));
  await act('util.settings'); await act('settings.group.samsung'); await act('samsung.home'); await settle();
  check('LG Home opens the webOS Home app', (await calls()).at(-1).params.id === 'com.webos.app.home', (await calls()).at(-1));
  await evaluate(() => window.dispatchEvent(new Event('focus')));
  await evaluate(() => ShoreQA.scene('apps'));
  await current.waitForFunction(() => ShoreQA.state().catalog.loaded, null, { timeout: 5000 });
  const denied = await evaluate(() => ShoreQA.state().catalog.ids);
  check('Denied listing falls back to installed known apps', JSON.stringify(denied) === JSON.stringify(['com.webos.app.hdmi1', 'netflix', 'primevideo']), denied);
  await current.close();

  await page({ launchPoints: [
    { id: 'netflix', title: 'Netflix', icon: '/usr/palm/applications/netflix/icon.png' },
    { id: 'com.wbd.stream', title: 'Max', icon: '' },
    { id: SELF, title: 'CleanFrame' },
    { id: 'com.example.family', title: 'Family <b>TV</b>', icon: 'javascript:alert(1)' }
  ] });
  await evaluate(() => ShoreQA.scene('apps'));
  await current.waitForFunction(() => ShoreQA.state().catalog.loaded, null, { timeout: 5000 });
  const listed = await evaluate(() => ShoreQA.state().catalog.ids);
  check('Launch points list excludes CleanFrame', JSON.stringify(listed) === JSON.stringify(['com.example.family', 'com.wbd.stream', 'netflix']), listed);
  const max = await evaluate(() => document.querySelector('[data-mark="hbomax"]') !== null);
  check('Extra LG brands use their bundled mark', max);
  check('Listed names stay text', await evaluate(() => !document.querySelector('#stage b')));
  check('Unsafe icon paths are dropped', await evaluate(() => !document.querySelector('img[src^="javascript"]')));
  await current.close();

  await page({ installed: ['youtube.leanback.v4', 'lovefilm.de'], missing: ['netflix', 'amazon'], failing: ['com.apple.appletv'] });
  await act('home.app.netflix'); await settle();
  const missingText = await sheet();
  check('A missing app gets a plain message', missingText.includes('This app is not installed on this TV.') && !missingText.includes('not exist'), missingText);
  await evaluate(() => ShoreQA.nav('back')); await evaluate(() => window.dispatchEvent(new Event('focus')));
  await act('home.app.appletv'); await settle();
  check('Other launch errors do not try alternative IDs', (await calls()).filter(c => c.method === 'launch' && c.params.id === 'com.apple.appletv').length === 1 && (await sheet()).includes('could not open this app'), await sheet());
  await current.close();

  await page({ installed: ['netflix', 'youtube.leanback.v4'], silent: ['cdp-30'] });
  const slow = await allApps();
  check('One silent status check does not empty the list', !slow.error && JSON.stringify(slow.ids) === JSON.stringify(['netflix', 'youtube']), slow);
  check('First visit to All apps focuses the grid once apps arrive', slow.zone === 'grid', slow);
  await current.close();

  await page({ installed: [] });
  const none = await allApps();
  check('No installed known apps is an empty list, not an error', !none.error && none.ids.length === 0, none);
  await current.close();

  await page({ deniedStatus: true });
  const refused = await allApps();
  check('Refused status checks explain the limit', refused.error === 'This TV does not let CleanFrame read its installed apps.', refused);
  await evaluate(() => ShoreQA.scene('editor'));
  await act('editor.move.netflix'); await evaluate(() => ShoreQA.nav('back', 'right', 'ok'));
  const status = await evaluate(() => document.getElementById('sheetView').textContent);
  check('Editor notes are not hidden by the catalogue error', !status.includes('does not let CleanFrame') && /Recently removed|stays installed/.test(status), status);
  await current.close();

  await page({ holdLaunch: true });
  await act('home.app.netflix'); await evaluate(() => ShoreQA.nav('back', 'right', 'ok'));
  const pending = await evaluate(() => ShoreQA.where().view);
  check('LG Home waits in the leave dialog while a launch is pending', pending === 'message' && !(await calls()).some(c => c.params.id === 'com.webos.app.home'), pending);
  await evaluate(() => window.__luna.release()); await settle();
  await evaluate(() => ShoreQA.nav('ok')); await settle();
  check('LG Home opens once the launch has finished', (await calls()).some(c => c.params.id === 'com.webos.app.home'), await calls());
} finally {
  if (current && !current.isClosed()) await current.close();
  await preview.close();
}
if (failures) { console.error(failures + ' webOS check(s) failed.'); process.exit(1); }
console.log('webOS adapter checks passed. No TV contacted.');
