# Fire-TV-App bauen und installieren

Die Anwendung liegt unter `android/` als schlanker Android-WebView-Wrapper vor. Alle Web-Dateien werden beim Build lokal in die APK kopiert. Die App benötigt deshalb weder einen Webserver noch eine Internetverbindung.

## Voraussetzungen

- JDK 17
- Android SDK Platform 35 und Android SDK Build-Tools
- zum Installieren auf dem Fire TV: Android Platform Tools (`adb`)

Am einfachsten installiert Android Studio die benötigten SDK-Komponenten. Das Android-Projekt kann direkt über den Ordner `android/` geöffnet werden.

## Debug-APK bauen

In PowerShell:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Die fertige APK liegt anschließend hier:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Der Build-Task `syncWebAssets` übernimmt automatisch die aktuellen Dateien aus dem Projektstamm. Nach Änderungen an der Web-App genügt deshalb ein neuer APK-Build.

## Fire TV vorbereiten

1. Auf dem Fire TV unter **Einstellungen → Mein Fire TV → Info** den Gerätenamen siebenmal auswählen, um die Entwickleroptionen einzublenden.
2. Unter **Entwickleroptionen** `ADB-Debugging` und die Installation unbekannter Apps aktivieren.
3. Unter **Info → Netzwerk** die IP-Adresse des Fire TV notieren.
4. Rechner und Fire TV müssen sich im selben Netzwerk befinden.

## APK per WLAN installieren

```powershell
adb connect FIRE_TV_IP:5555
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Die Verbindungsanfrage auf dem Fernseher bestätigen. Die App erscheint danach unter **Meine Apps** als **Minimalflächen**.

## Bedienung

- **Steuerkreuz**, während die Fläche fokussiert ist: Fläche drehen
- **Play/Pause (`▶‖`)**: automatische Drehung starten oder stoppen
- **Menü halten + Links/Rechts**: vorheriges oder nächstes Material
- **Menü halten + Hoch/Runter**: vorheriger oder nächster Hintergrund
- **Zurückspulen / Vorspulen**: heraus- oder hineinzoomen
- **Menü kurz drücken**: Einstellungsbereich öffnen oder schließen
- **Tab / Shift+Tab**: zyklisch zum nächsten oder vorherigen sichtbaren Bedienelement wechseln
- **Steuerkreuz im Einstellungsbereich**: zyklisch durch die sichtbaren Bedienelemente wechseln; Links/Rechts verändert einen fokussierten Regler
- **OK**: den fokussierten Button auslösen
- **Zurück**: zuerst den Einstellungsbereich schließen, danach die App verlassen
- Im Einstellungsbereich werden Buttons und Regler regulär mit dem Steuerkreuz bedient.

Bild- und Videoexport sind im TV-Modus ausgeblendet, da Android WebView keine verlässliche Download-Ablage für diese Browserfunktionen bietet. Die Desktop-Web-App behält beide Funktionen.

## Release-APK

Für eine private Installation reicht die Debug-APK. Für die Veröffentlichung im Amazon Appstore muss in Android Studio ein signiertes Release-Bundle beziehungsweise eine signierte Release-APK erzeugt und die Versionsnummer in `android/app/build.gradle` erhöht werden.
