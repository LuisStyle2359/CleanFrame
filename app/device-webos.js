/* LG webOS application APIs. Replaces the Tizen adapter unless the Tizen API is present. */
(function () {
  'use strict';
  if (window.tizen) return;
  // Keep in step with webos/appinfo.json; scripts/check.py compares them.
  var SELF = 'io.github.luisstyle2359.cleanframe';
  // Brand IDs from LG's store. Later IDs are regional or older variants, tried in order.
  var IDS = {
    netflix: ['netflix'], youtube: ['youtube.leanback.v4'], disneyplus: ['com.disney.disneyplus-prod'],
    primevideo: ['amazon', 'lovefilm.de'], appletv: ['com.apple.appletv']
  };
  var EXTRA_BRANDS = { 'spotify-beehive': 'spotify', 'com.wbd.stream': 'hbomax', 'com.tubitv.ott.tubi': 'tubi' };
  var HOME = ['com.webos.app.home'];
  var SETTINGS = ['com.palm.app.settings'];
  // webOS denies launcher listing to most developer apps but answers per-app load status,
  // so these known apps are offered when they exist. Add your own [id, name] pairs here.
  var KNOWN = [
    ['netflix', 'Netflix'], ['youtube.leanback.v4', 'YouTube'], ['com.disney.disneyplus-prod', 'Disney+'],
    ['amazon', 'Prime Video'], ['lovefilm.de', 'Prime Video'], ['com.apple.appletv', 'Apple TV'],
    ['com.wbd.stream', 'Max'], ['spotify-beehive', 'Spotify'], ['cdp-30', 'Plex'], ['org.jellyfin.webos', 'Jellyfin'],
    ['com.tubitv.ott.tubi', 'Tubi'], ['com.plutotv.app', 'Pluto TV'], ['tv.twitch.tv.starshot.lg', 'Twitch'],
    ['com.webos.app.livetv', 'Live TV'], ['com.webos.app.hdmi1', 'HDMI 1'], ['com.webos.app.hdmi2', 'HDMI 2'],
    ['com.webos.app.hdmi3', 'HDMI 3'], ['com.webos.app.hdmi4', 'HDMI 4'], ['com.webos.app.browser', 'Web Browser'],
    ['com.webos.app.mediadiscovery', 'Media Player'], ['com.webos.app.igallery', 'Art Gallery']
  ];
  var bridges = [];
  function api() { return typeof window.PalmServiceBridge !== 'undefined'; }
  function unavailable(done) {
    done({ message: 'Open CleanFrame on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  // Luna reports an unknown app ID as error -101 ("... not exist").
  function missing(err) { return !!err && (err.errorCode === -101 || /not (?:exist|found)|cannot find/i.test(String(err.errorText || ''))); }
  // Luna's own error text stays out of the UI; it is technical and English-only.
  function failure(err, what) {
    if (what === 'app' && missing(err)) return { message: 'This app is not installed on this TV.', detail: 'Install it from the LG Content Store, or remove it from Home in Settings.' };
    return { message: 'The TV could not open this ' + (what || 'screen') + '.', detail: 'Try again, or press the remote’s Home button to return to the LG Home screen.' };
  }
  function bounded(done) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    finish.done = function () { return finished; };
    return finish;
  }
  // One Luna call. The bridge is retained until it answers so it is not collected early.
  // With ms, a call that has not answered by then reports { timeout: true }.
  function luna(uri, params, done, ms) {
    var bridge, answered = false, timer;
    function answer(err, reply) {
      if (answered) return;
      answered = true; clearTimeout(timer);
      if (bridges.indexOf(bridge) >= 0) bridges.splice(bridges.indexOf(bridge), 1);
      done(err, reply);
    }
    try { bridge = new window.PalmServiceBridge(); }
    catch (err) { done(err); return; }
    bridges.push(bridge);
    if (ms) timer = setTimeout(function () { answer({ returnValue: false, timeout: true }); }, ms);
    bridge.onservicecallback = function (raw) {
      var reply;
      try { reply = JSON.parse(raw); } catch (err) { reply = { returnValue: false, errorText: 'Unreadable TV reply' }; }
      if (!reply || typeof reply !== 'object' || reply.returnValue === false) answer(reply && typeof reply === 'object' ? reply : {});
      else answer(null, reply);
    };
    try { bridge.call(uri, JSON.stringify(params || {})); }
    catch (err) { answer(err); }
  }
  // Later IDs are alternatives for an app that is not installed, never retries after other errors.
  function launchFirst(ids, done, what) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done), i = 0;
    (function attempt() {
      luna('luna://com.webos.applicationManager/launch', { id: ids[i] }, function (err) {
        if (finish.done()) return;
        if (!err) finish(null);
        else if (missing(err) && ++i < ids.length) attempt();
        else finish(failure(err, what));
      });
    }());
  }
  function launchApp(id, done) {
    var ids = [id];
    Object.keys(IDS).forEach(function (brand) { if (IDS[brand][0] === id) ids = IDS[brand]; });
    launchFirst(ids, done, 'app');
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({ message: 'This app has no launch target.' }); return; }
    launchFirst(IDS[brand], done, 'app');
  }
  function home(done) { launchFirst(HOME, done); }
  function settings(done) { launchFirst(SETTINGS, done); }
  function catalogue(list) {
    var known = {}, seen = {}, result = [], primary = Object.keys(IDS);
    primary.forEach(function (brand) { IDS[brand].forEach(function (id) { known[id] = brand; }); });
    list.forEach(function (a) {
      var name = a && typeof a === 'object' ? a.title || a.name : '';
      if (typeof name !== 'string' || !name || typeof a.id !== 'string' || !a.id || a.id === SELF || seen[a.id]) return;
      seen[a.id] = true;
      result.push({ appId: a.id, name: name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: typeof a.icon === 'string' ? a.icon : '', rank: known[a.id] ? primary.indexOf(known[a.id]) : 30 });
    });
    result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
    return result;
  }
  // A check that does not answer in time counts as not installed, so one slow app cannot empty the list.
  function installed(done) {
    var left = KNOWN.length, found = [], refused = 0;
    KNOWN.forEach(function (a, i) {
      luna('luna://com.webos.applicationManager/getAppLoadStatus', { appId: a[0] }, function (err, reply) {
        if (!err && reply.exist === true) found[i] = { id: a[0], title: a[1] };
        else if (err && !err.timeout) refused++;
        if (--left) return;
        if (refused === KNOWN.length) done({ message: 'This TV does not let CleanFrame read its installed apps.' });
        else done(null, found.filter(Boolean));
      }, 2500);
    });
  }
  function apps(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    function reply(list) {
      try { finish(null, catalogue(list)); }
      catch (err) { finish({ message: 'Could not read installed apps.' }); }
    }
    // Launch points are what the LG launcher shows; only rooted TVs allow them to developer apps.
    luna('luna://com.webos.applicationManager/listLaunchPoints', {}, function (err, answer) {
      if (finish.done()) return;
      if (!err && Array.isArray(answer.launchPoints) && answer.launchPoints.length) { reply(answer.launchPoints); return; }
      installed(function (err, list) { if (err) finish(err); else reply(list); });
    }, 2500);
  }
  var appIds = {};
  Object.keys(IDS).forEach(function (brand) { appIds[brand] = IDS[brand][0]; });
  window.FrameDevice = {
    launch: launch, launchApp: launchApp, home: home, settings: settings, apps: apps, appIds: appIds,
    tv: { name: 'LG', home: 'LG Home', homeNote: 'Open LG’s Home screen' }
  };
}());
