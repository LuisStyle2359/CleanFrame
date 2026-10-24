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
// query: e.g. '?lang=de'; locale/time set the browser language and a fixed clock (timers keep running).
async function page(bridge, { query = '', locale, time } = {}) {
  current = await preview.browser.newPage({ viewport: { width: 1920, height: 1080 }, ...(locale ? { locale } : {}), timezoneId: 'Europe/Berlin' });
  current.on('pageerror', error => check('No page error', false, error.message));
  if (time) await current.clock.setFixedTime(time);
  if (bridge) await current.addInitScript(installBridge, { installed: [], launchPoints: null, missing: [], failing: [], silent: [], deniedStatus: false, holdLaunch: false, ...bridge });
  await current.goto(preview.baseURL + '/home/' + query);
  await current.waitForFunction(() => window.ShoreQA && ShoreQA.ready(), null, { timeout: 15000 });
}
const evaluate = (fn, arg) => current.evaluate(fn, arg);
const act = action => current.evaluate(a => ShoreQA.activate(a), action);
const calls = () => evaluate(() => window.__luna.calls);
const settle = () => current.waitForTimeout(50);
const sheet = () => evaluate(() => document.getElementById('sheetView').textContent);
const clock = () => evaluate(() => document.querySelector('#caption .clock').textContent);
// Visible text and aria-labels that are still an English template with a different German translation.
const english = () => evaluate(() => {
  const de = CleanFrameI18n.de, found = [], seen = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const walker = document.createTreeWalker(document.getElementById('stage'), NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { const t = n.textContent.trim(); if (de.hasOwnProperty(t) && de[t] !== t && seen(n.parentElement)) found.push(t); }
  document.querySelectorAll('#stage [aria-label]').forEach(el => { const t = el.getAttribute('aria-label'); if (de.hasOwnProperty(t) && de[t] !== t) found.push('aria: ' + t); });
  return found;
});
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

  // German: detection, 24-hour clock, key labels and no untranslated templates in any view.
  await page(null, { locale: 'de-DE', time: '2026-10-24T16:54:00+02:00' });
  const detected = await evaluate(() => ({ lang: CleanFrameI18n.lang, html: document.documentElement.lang, text: document.getElementById('stage').textContent }));
  check('A German browser locale selects German', detected.lang === 'de' && detected.html === 'de' && detected.text.includes('Alle Apps') && detected.text.includes('Einstellungen'), detected);
  check('German uses the 24-hour clock', await clock() === '16:54', await clock());
  await current.clock.setFixedTime('2026-10-24T09:05:00+02:00'); await evaluate(() => window.dispatchEvent(new Event('focus')));
  check('German morning time has no leading zero', await clock() === '9:05', await clock());
  await current.close();
  await page(null, { locale: 'de-DE', query: '?lang=en', time: '2026-10-24T16:54:00+02:00' });
  check('?lang=en keeps English and the 12-hour clock', await evaluate(() => CleanFrameI18n.lang) === 'en' && await clock() === '4:54' && (await evaluate(() => document.getElementById('stage').textContent)).includes('All apps'), await clock());
  await current.close();

  await page({ launchPoints: [{ id: 'netflix', title: 'Netflix' }, { id: 'com.wbd.stream', title: 'Max' }, { id: 'cdp-30', title: 'Plex' }], missing: ['netflix'] }, { query: '?lang=de' });
  const leftover = {}, crawl = async name => { await settle(); const found = await english(); if (found.length) leftover[name] = found; };
  for (const look of [{ layout: 'list', apps: 'both', controls: 'both' }, { layout: 'dock', apps: 'icons', controls: 'icons' }, { layout: 'dock', apps: 'text', controls: 'text', bg: 'dark' }]) {
    await evaluate(l => { ShoreQA.scene('home'); ShoreQA.look(l); }, look); await crawl('home ' + look.layout);
    await evaluate(l => ShoreQA.nav(l === 'list' ? 'right' : 'up', l === 'list' ? 'down' : 'right'), look.layout); await crawl('home controls ' + look.layout);
  }
  await evaluate(() => { ShoreQA.scene('home'); ShoreQA.nav('back'); });
  const leaveDe = await sheet(); await crawl('leave');
  check('German leave dialog offers LG Home', leaveDe.includes('Startseite verlassen?') && leaveDe.includes('LG Home öffnen?') && leaveDe.includes('Bleiben'), leaveDe);
  await evaluate(() => ShoreQA.scene('home')); await act('home.app.netflix'); await settle();
  const missingDe = await sheet(); await crawl('error');
  check('German missing-app message', missingDe.includes('Diese App ist auf diesem TV nicht installiert.') && missingDe.includes('Zurück'), missingDe);
  await evaluate(() => ShoreQA.nav('back')); await evaluate(() => window.dispatchEvent(new Event('focus')));
  const appsDe = await allApps(); await crawl('all apps');
  check('German All apps', (await sheet()).includes('Alle Apps') && (await sheet()).includes('Apps auf der Startseite') && appsDe.ids.length === 3, await sheet());
  await evaluate(() => ShoreQA.scene('editor')); await crawl('editor');
  for (const keys of [['right'], ['ok'], ['up', 'up', 'left'], ['ok'], ['down'], ['left', 'ok']]) { await evaluate(k => ShoreQA.nav(k), keys); await crawl('editor ' + keys.join(' ')); }
  await evaluate(() => ShoreQA.scene('settings')); await crawl('settings');
  check('German Settings', (await sheet()).includes('Einstellungen') && (await sheet()).includes('Hintergrund'), await sheet());
  for (const look of [{ bg: 'photo' }, { bg: 'dark' }]) for (const group of ['background', 'layout', 'typography', 'focus', 'samsung']) {
    await evaluate(l => { ShoreQA.scene('home'); ShoreQA.look(l); ShoreQA.scene('settings'); }, look); await act('settings.group.' + group); await crawl(look.bg + ' ' + group);
    await evaluate(() => ShoreQA.nav('down')); await crawl(look.bg + ' ' + group + ' down');
  }
  await evaluate(() => { ShoreQA.scene('home'); ShoreQA.look({ bg: 'photo' }); ShoreQA.scene('settings'); }); await act('settings.group.background');
  await act('background.rotation'); await crawl('rotation'); await evaluate(() => ShoreQA.nav('back'));
  await act('background.wallpaper'); await evaluate(() => ShoreQA.nav('down')); await current.waitForTimeout(600); await crawl('wallpaper');
  check('German wallpaper picker', /Hintergrundbild[\s\S]*Stille Bucht[\s\S]*2 von 15/.test(await evaluate(() => document.getElementById('appearance').textContent)), await evaluate(() => document.getElementById('appearance').textContent));
  check('No English template is left in any German view', !Object.keys(leftover).length, leftover);
} finally {
  if (current && !current.isClosed()) await current.close();
  await preview.close();
}
if (failures) { console.error(failures + ' webOS check(s) failed.'); process.exit(1); }
console.log('webOS adapter checks passed. No TV contacted.');
