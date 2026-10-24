# CleanFrame auf LG-Fernsehern (webOS)

Dieser Fork bringt CleanFrame auf LG-Fernseher mit webOS. Oberfläche, Einstellungen und Bedienung mit der Fernbedienung sind dieselben wie beim Samsung-Original. Nur die Anbindung an den Fernseher ist neu.

![LG-Fassung in der Browser-Vorschau](images/cleanframe-lg-preview.jpg)

**Stand:** Der LG-Adapter ist im Browser mit einem nachgebauten webOS-Dienst getestet (`npm run check:webos`). Auf einem echten LG-Fernseher ist er noch **nicht** ausprobiert worden. Rechne damit, dass beim ersten Test auf dem Gerät noch Kleinigkeiten anzupassen sind.

## Was anders ist als bei Samsung

| Bereich | Samsung (Tizen) | LG (webOS) |
| --- | --- | --- |
| TV-Anbindung | `app/device.js` | `app/device-webos.js`, übernimmt automatisch, wenn keine Tizen-API da ist |
| App-Beschreibung | `app/config.xml` | `webos/appinfo.json` |
| Paket | `.wgt`, signiert mit Samsung-Zertifikat | `.ipk`, gebaut mit dem offiziellen LG-Werkzeug `ares-package` |
| Art Mode | vorhanden | entfällt, der Knopf wird ausgeblendet |
| „Samsung Home" | Samsung-Startseite | „LG Home" (`com.webos.app.home`) und LG-Einstellungen |
| Installierte Apps finden | vollständige Liste | siehe unten |

Die Zurück-Taste der LG-Fernbedienung (Code 461) kommt bei CleanFrame an, weil `disableBackHistoryAPI` gesetzt ist. Ein Druck auf Zurück auf der Startseite fragt deshalb, ob LG Home geöffnet werden soll. Die Magic-Remote-Maus funktioniert ebenfalls, weil alle Elemente anklickbar sind.

### Installierte Apps

webOS erlaubt selbst installierten Apps normalerweise nicht, die Liste aller Apps zu lesen. CleanFrame versucht es trotzdem; auf gerooteten oder älteren Geräten klappt es. Wird die Anfrage abgelehnt, fragt CleanFrame für eine Liste bekannter Apps einzeln nach, ob sie installiert sind, und zeigt nur die vorhandenen. Diese Liste steht in `KNOWN` in `app/device-webos.js` und enthält unter anderem Netflix, YouTube, Disney+, Prime Video, Apple TV, Max, Spotify, Plex, Jellyfin, Live TV, HDMI 1–4 und den Browser.

**Eigene Apps ergänzen:** Füge in `KNOWN` ein Paar `['app-id', 'Name']` hinzu. Die App-ID findest du mit dem LG-Werkzeug, solange der Entwicklermodus aktiv ist:

```sh
npx -p @webos-tools/cli@3.2.6 ares-launch -d tv --running   # zeigt die gerade laufende App
```

Starte dafür die gewünschte App auf dem Fernseher und führe den Befehl dann aus. Auf gerooteten Geräten listet `luna-send -n 1 luna://com.webos.applicationManager/listLaunchPoints '{}'` alle Apps auf.

Die Standard-Apps auf der Startseite sind Netflix, Disney+, YouTube, Apple TV und Prime Video. Prime Video wird zuerst als `amazon`, dann als älteres deutsches `lovefilm.de` gestartet.

## Voraussetzungen

- LG-Fernseher mit **webOS 22 oder neuer** (Modelle ab 2022). Ältere Versionen nutzen einen zu alten Browser; Abstände in der Oberfläche wären dort falsch.
- Rechner mit Node.js 22+ und Python 3.10+ im selben Netzwerk wie der Fernseher.
- Ein kostenloses Konto bei [LG Developer](https://webostv.developer.lge.com/).

## 1. Im Browser ausprobieren

```sh
npm ci
npm run dev:public
```

Öffne <http://localhost:4795/home/>. Die Vorschau zeigt die LG-Fassung. Apps starten dort nicht; das geht nur auf dem Fernseher.

## 2. Entwicklermodus auf dem Fernseher

1. Im LG Content Store die App **Developer Mode** installieren und mit dem LG-Developer-Konto anmelden.
2. **Dev Mode Status** und **Key Server** einschalten. Der Fernseher startet neu.
3. In der Developer-Mode-App die angezeigte IP-Adresse und den Passphrase notieren.

Die Entwicklermodus-Sitzung läuft laut LG nach einer begrenzten Zeit ab und muss in der Developer-Mode-App verlängert werden (**Extend**). Läuft sie ab, verschwinden selbst installierte Apps wieder. Prüfe die aktuelle Dauer in der App.

## 3. Fernseher am Rechner einrichten

```sh
npx -p @webos-tools/cli@3.2.6 ares-setup-device      # Gerät "tv" mit der IP-Adresse anlegen, Port 9922, Benutzer prisoner
npx -p @webos-tools/cli@3.2.6 ares-novacom --device tv --getkey   # Passphrase aus der Developer-Mode-App eingeben
npx -p @webos-tools/cli@3.2.6 ares-device -d tv --system-info    # Verbindung und webOS-Version prüfen
```

Heißt dein Gerät nicht `tv`, setze `LG_DEVICE=<name>` vor die folgenden Befehle.

## 4. Bauen, installieren, starten

```sh
npm run package:webos   # erzeugt dist/io.github.luisstyle2359.cleanframe_<version>_all.ipk
npm run lg:install
npm run lg:launch
```

Danach erscheint CleanFrame auch in der normalen LG-App-Leiste.

## Home-Taste und Start beim Einschalten

Ohne Root lässt sich die Home-Taste der LG-Fernbedienung **nicht** auf CleanFrame umlegen, und CleanFrame startet nicht automatisch beim Einschalten. Praktische Wege:

- CleanFrame in der LG-App-Leiste ganz nach vorn schieben.
- Auf gerooteten Fernsehern (Homebrew Channel) kann das Homebrew-Werkzeug *Input Hook* eine Taste auf die App-ID `io.github.luisstyle2359.cleanframe` legen. Root ist ein Eingriff auf eigenes Risiko und nicht Teil dieses Projekts.

## App-ID ändern

Die App-ID steht in `webos/appinfo.json` und als `SELF` in `app/device-webos.js`. Ändere beide gemeinsam; `npm run check` prüft, dass sie übereinstimmen. IDs, die mit `com.webos.`, `com.lge.` oder `com.palm.` beginnen, gehören LG und werden abgelehnt.

## Prüfen

```sh
npm run check
CLEANFRAME_PUBLIC_FONTS=1 npm run check:browser   # Samsung-Pfad
npm run check:webos                               # LG-Pfad, ohne Fernseher
```

## Offene Punkte

- Auf echter LG-Hardware testen: Start von Apps, LG Home, Zurück-Taste, Darstellung und Tempo der Glas-Effekte.
- Ob `getAppLoadStatus` auf allen webOS-Versionen erlaubt ist, ist nur aus einem anderen Projekt ([webos-launcher](https://github.com/partridgeworks/webos-launcher), getestet auf webOS 6) bekannt.
- LG verlangt künftig möglicherweise die Angabe `requiredACG` in `appinfo.json`. `ares-package` weist beim Bauen darauf hin; für die Installation im Entwicklermodus ist sie derzeit nicht nötig.
