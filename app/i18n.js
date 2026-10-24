/* Interface language. German when the TV is set to German, otherwise English.
   ?lang=de or ?lang=en overrides detection for previews and checks. English templates are the keys. */
(function () {
  'use strict';
  var DE = {
    // Home and controls
    'All apps': 'Alle Apps', 'Settings': 'Einstellungen', 'Arrange': 'Anordnen',
    'Home controls': 'Bedienelemente', 'TV stage, 1920 by 1080. Click it, then use the arrow keys, Enter for OK and Escape for Back.': 'TV-Bühne, 1920 × 1080. Anklicken, dann Pfeiltasten, Eingabe für OK und Esc für Zurück.',
    'Leave Home?': 'Startseite verlassen?', 'Open {home}?': '{home} öffnen?', 'Stay': 'Bleiben', 'Back': 'Zurück',
    'Open Samsung’s Home screen': 'Samsung-Startbildschirm öffnen', 'Open LG’s Home screen': 'LG-Startbildschirm öffnen',
    'Home holds nine apps. Remove one first.': 'Die Startseite fasst neun Apps. Zuerst eine entfernen.', 'Home needs one app': 'Eine App ist nötig',
    'Home is full': 'Startseite ist voll', 'Add app': 'App hinzufügen', 'Add apps': 'Apps hinzufügen', 'No apps on Home': 'Keine Apps auf der Startseite',
    'Restore {app}': '{app} wiederherstellen', 'Remove {app}': '{app} entfernen',
    'Not saved. OK tries again.': 'Nicht gespeichert. OK versucht es erneut.', 'Couldn’t save. Nothing changed.': 'Nicht gespeichert. Nichts wurde geändert.',
    'The TV could not open this screen.': 'Der TV konnte diese Ansicht nicht öffnen.', 'TV settings': 'TV-Einstellungen',
    // All apps and the Home editor
    'Apps on Home': 'Apps auf der Startseite', 'On Home': 'Auf Startseite', 'Not on Home': 'Nicht auf der Startseite', '{n} of {total}': '{n} von {total}',
    'Try again': 'Erneut versuchen', 'Undo': 'Rückgängig', 'Done': 'Fertig', 'Then scroll': 'Weitere per Scrollen',
    'Recently removed': 'Zuletzt entfernt', 'Other installed apps': 'Weitere installierte Apps', 'Add to Home': 'Hinzufügen', 'Remove from Home': 'Entfernen',
    'Loading installed apps…': 'Installierte Apps werden geladen …', 'No installed apps found.': 'Keine installierten Apps gefunden.', 'Could not read installed apps.': 'Installierte Apps konnten nicht gelesen werden.',
    'Nothing to undo': 'Nichts rückgängig zu machen',
    'Undo remove {app}': 'Entfernen von {app} rückgängig machen', 'Undo add {app}': 'Hinzufügen von {app} rückgängig machen', 'Undo move {app}': 'Verschieben von {app} rückgängig machen',
    'Undone: Remove {app}.': 'Entfernen von {app} rückgängig gemacht.', 'Undone: Add {app}.': 'Hinzufügen von {app} rückgängig gemacht.', 'Undone: Move {app}.': 'Verschieben von {app} rückgängig gemacht.',
    '{app} is in Recently removed. OK puts it back.': '{app} ist unter „Zuletzt entfernt“. OK holt die App zurück.',
    '{app} is on Home, position {n}.': '{app} ist auf der Startseite, Position {n}.', '{app} moved to position {n}.': '{app} auf Position {n} verschoben.',
    '{app} stays installed.': '{app} bleibt installiert.', 'Moving {app}. OK places it, Back puts it back.': '{app} verschieben: OK legt ab, Zurück bricht ab.',
    // Settings
    'Open selected group': 'Ausgewählte Gruppe öffnen', 'Background': 'Hintergrund', 'Layout': 'Layout', 'Typography': 'Schrift', 'Focus': 'Fokus',
    'Rotation': 'Wechsel', 'Wallpaper': 'Hintergrundbild', 'Font': 'Schrift', 'Material': 'Material', 'Apps': 'Apps',
    '{n} app': '{n} App', '{n} apps': '{n} Apps', 'Home and TV settings': 'Startbildschirm und TV-Einstellungen',
    'Background type': 'Hintergrundart', 'App display': 'App-Anzeige', 'Focus style': 'Fokusstil',
    'Choose Photo to use wallpaper and rotation.': 'Für Hintergrundbild und Wechsel Foto wählen.',
    'Materials are available with a Photo background.': 'Materialien gibt es nur mit Foto-Hintergrund.',
    'Choose Glass focus or the Dock layout to use materials.': 'Für Materialien Glas-Fokus oder Dock-Layout wählen.',
    'Choose Photo in Background to use rotation.': 'Für den Wechsel unter Hintergrund Foto wählen.',
    'Timed changes pause while Settings or another panel is open.': 'Zeitgesteuerte Wechsel pausieren, solange Einstellungen oder ein anderes Fenster offen sind.',
    'Picture, sound and network settings': 'Bild, Ton und Netzwerk',
    'Dark': 'Dunkel', 'Light': 'Hell', 'Photo': 'Foto', 'List': 'Liste', 'Dock': 'Dock', 'Type': 'Schrift', 'Glass': 'Glas',
    'Soft': 'Weich', 'Frost': 'Milchglas', 'Clear tint': 'Klar', 'Icons': 'Symbole', 'Icons and text': 'Symbole und Text', 'Text': 'Text', 'Both': 'Beides',
    'Fixed': 'Fest', 'Each time Home opens': 'Bei jedem Öffnen', 'Every 5 minutes': 'Alle 5 Minuten', 'Every 15 minutes': 'Alle 15 Minuten', 'Every hour': 'Stündlich',
    'Loading {name}…': '{name} wird geladen …', 'Loading your choice…': 'Auswahl wird geladen …', 'Back cancels this change.': 'Zurück bricht die Änderung ab.',
    'Couldn’t save this change.': 'Änderung nicht gespeichert.', 'Couldn’t load {name}.': '{name} konnte nicht geladen werden.',
    'Couldn’t load this appearance.': 'Darstellung konnte nicht geladen werden.', 'Your current choice is kept.': 'Die bisherige Auswahl bleibt.',
    'Return to Background': 'Zurück zu Hintergrund', 'Return to Settings': 'Zurück zu Einstellungen', 'Retry this change': 'Änderung erneut versuchen',
    'Apply selected setting': 'Auswahl übernehmen', 'Choose a wallpaper': 'Hintergrundbild wählen', 'Choose a rotation interval': 'Wechselintervall wählen', 'Open on the TV': 'Auf dem TV öffnen',
    // Wallpaper picker
    'Preparing {name}…': '{name} wird vorbereitet …', 'Applying {name}…': '{name} wird übernommen …', 'Applied': 'Übernommen', 'Preview': 'Vorschau',
    'Couldn’t save {name}.': '{name} nicht gespeichert.', 'Retry this photo': 'Foto erneut laden', 'Apply selected photo': 'Ausgewähltes Foto übernehmen',
    'Misty coast': 'Nebelküste', 'Quiet cove': 'Stille Bucht', 'Forest mist': 'Waldnebel', 'Mountain valley': 'Bergtal', 'Desert stars': 'Wüstensterne',
    'Blue peaks': 'Blaue Gipfel', 'Bridge at dusk': 'Brücke am Abend', 'Sunlit ridges': 'Sonnige Grate', 'Golden hour': 'Goldene Stunde',
    'Sunlit summits': 'Sonnige Gipfel', 'Gold Coast dusk': 'Gold Coast am Abend', 'Sydney Harbour': 'Hafen von Sydney', 'Amber hills': 'Bernsteinhügel',
    'Mint wave': 'Mintgrüne Welle', 'Alpine glow': 'Alpenglühen',
    // Device adapters
    'Open CleanFrame on the TV to use this control.': 'CleanFrame auf dem TV öffnen, um diese Funktion zu nutzen.', 'The web preview cannot control the TV.': 'Die Webvorschau kann den TV nicht steuern.',
    'Try again, or press the remote’s Home button to return to CleanFrame.': 'Erneut versuchen oder die Home-Taste der Fernbedienung drücken, um zu CleanFrame zurückzukehren.',
    'Try again, or press the remote’s Home button to return to the LG Home screen.': 'Erneut versuchen oder die Home-Taste der Fernbedienung drücken, um zum LG-Startbildschirm zurückzukehren.',
    'The TV did not respond. Please try again.': 'Der TV hat nicht reagiert. Bitte erneut versuchen.', 'This app has no launch target.': 'Für diese App gibt es kein Startziel.',
    'This app is not installed on this TV.': 'Diese App ist auf diesem TV nicht installiert.',
    'Install it from the LG Content Store, or remove it from Home in Settings.': 'Im LG Content Store installieren oder in den Einstellungen von der Startseite entfernen.',
    'The TV could not open this app.': 'Der TV konnte diese App nicht öffnen.', 'This TV does not let CleanFrame read its installed apps.': 'Dieser TV lässt CleanFrame die installierten Apps nicht lesen.'
  };
  function detect() {
    var query = /[?&]lang=(de|en)(?:&|#|$)/.exec(window.location.search || ''), nav = window.navigator || {};
    if (query) return query[1];
    return /^de(?:[-_]|$)/i.test(String(nav.language || nav.languages && nav.languages[0] || '')) ? 'de' : 'en';
  }
  var lang = detect();
  function t(template, vars) {
    var text = lang === 'de' && DE.hasOwnProperty(template) ? DE[template] : template;
    return vars ? text.replace(/\{(\w+)\}/g, function (all, name) { return vars.hasOwnProperty(name) ? String(vars[name]) : all; }) : text;
  }
  if (lang === 'de') document.documentElement.lang = 'de';
  window.CleanFrameI18n = { lang: lang, t: t, de: DE };
}());
