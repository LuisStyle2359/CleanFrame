// LG webOS adapter checks. Mock only the PalmServiceBridge (Luna) boundary; never contact a TV.
import { openPreview } from './browser.mjs';

const SELF = 'io.github.luisstyle2359.cleanframe';
let preview, current, failures = 0;

function check(name, pass, detail) {
  console.log((pass ? 'passed: ' : 'FAILED: ') + name + (pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 500)));
  if (!pass) failures++;
}

// installed: app IDs getAppLoadStatus reports; launchPoints: null denies listing like webOS 6+.
function installBridge({ installed, launchPoints, missing }) {
  window.__luna = { calls: [] };
  window.PalmServiceBridge = function () {};
  window.PalmServiceBridge.prototype.call = function (uri, raw) {
    const params = JSON.parse(raw), method = uri.split('/').pop(), bridge = this;
    let reply;
    window.__luna.calls.push({ method, params });
    if (method === 'launch') reply = missing.includes(params.id) ? { returnValue: false, errorCode: -101, errorText: 'not exist' } : { returnValue: true };
    else if (method === 'getAppLoadStatus') reply = { returnValue: true, exist: installed.includes(params.appId) };
    else if (method === 'listLaunchPoints') reply = launchPoints ? { returnValue: true, launchPoints } : { returnValue: false, errorText: 'Denied method call "listLaunchPoints"' };
    else reply = { returnValue: false, errorText: 'Unexpected method' };
    setTimeout(() => bridge.onservicecallback(JSON.stringify(reply)), 0);
  };
}
async function page(bridge) {
  current = await preview.browser.newPage({ viewport: { width: 1920, height: 1080 } });
  current.on('pageerror', error => check('No page error', false, error.message));
  if (bridge) await current.addInitScript(installBridge, { installed: [], launchPoints: null, missing: [], ...bridge });
  await current.goto(preview.baseURL + '/home/');
  await current.waitForFunction(() => window.ShoreQA && ShoreQA.ready(), null, { timeout: 15000 });
}
const evaluate = fn => current.evaluate(fn);
const act = action => current.evaluate(a => ShoreQA.activate(a), action);
const calls = () => evaluate(() => window.__luna.calls);
const settle = () => current.waitForTimeout(50);

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
} finally {
  if (current && !current.isClosed()) await current.close();
  await preview.close();
}
if (failures) { console.error(failures + ' webOS check(s) failed.'); process.exit(1); }
console.log('webOS adapter checks passed. No TV contacted.');
