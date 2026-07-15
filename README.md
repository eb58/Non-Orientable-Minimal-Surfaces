# Non-Orientable Minimal Surfaces

Interaktive Visualisierung minimaler Flaechen aus der Weierstrass-Darstellung.

Die App berechnet die Flaechen numerisch aus

```text
Re int ( f(1 - g^2) / 2, i f(1 + g^2) / 2, f g ) dz
```

und rendert sie mit Three.js als frei drehbares WebGL-Modell.

## Start

Zum einfachen Anschauen kann `standalone.html` direkt im Browser geoeffnet werden. Diese Datei enthaelt CSS, Three.js, OrbitControls, die `C$`-Bibliothek und den App-Code inline und funktioniert dadurch auch per `file://`.

Fuer die Entwicklung ist `index.html` gedacht. Diese Variante verwendet ES-Module. Darum sollte sie ueber einen lokalen HTTP-Server geoeffnet werden, nicht direkt per `file://`. Es gibt keine npm-Abhaengigkeiten; Node.js reicht zum Starten.

Mit dem enthaltenen kleinen Node-Server:

```powershell
npm start
```

Danach im Browser oeffnen:

```text
http://127.0.0.1:8765/
```

Der Server bindet lokal an `127.0.0.1`. Falls der Port belegt ist, kann er in PowerShell so geaendert werden:

```powershell
$env:PORT = "9000"
npm start
```

Alternativ funktioniert jeder statische Webserver, der das Projektverzeichnis ausliefert.

Nach Aenderungen an `main.js`, `math.js`, `renderer.js`, `ui.js`, `styles.css` oder den vendorten Bibliotheken wird die Standalone-Datei neu erzeugt mit:

```powershell
node scripts/build-standalone.js
```

## Bedienung

- Flaeche drehen: mit der Maus oder dem Trackpad ziehen
- Zoom: Mausrad oder Trackpad-Scroll
- Ansicht zuruecksetzen: Button `Ansicht zuruecksetzen`
- Parameterbereich aendern: Slider `r min`, `r max`, `w max`
- Flaechenparameter aendern: bei S41 steuern die Slider `m` und `n` die Exponenten, bei Cobra steuert `m` den Exponenten, bei Kusner steuert `p` die Familie
- Objekt verschieben: Slider `x`, `y`, `z`
- Objekt mit der Maus verschieben: `Ctrl` gedrueckt halten und im Viewer ziehen
- Darstellung umschalten: Button `Gedengeltes Kupfer`
- Seitenpanel skalieren: Griff zwischen Viewer und Seitenbereich ziehen

Die Sliderwerte fuer Bereich, Flaechenparameter und Objektposition werden pro Flaeche separat gemerkt. Der Button `Bereich zuruecksetzen` setzt nur den Bereich der aktuell ausgewaehlten Flaeche zurueck. Kreisring-Flaechen starten mit einem kleinen Winkel-Overlap ueber `2pi`, damit an der Naht keine Luecke sichtbar bleibt.

## Enthaltene Flaechen

- S41-Presets mit einstellbaren ungeraden Parametern `m` und `n`, wobei `n < m` gilt
- Cobra mit einstellbarem Parameter `m`
- Kusner-Familie mit einstellbarem ungeraden Parameter `p`; hoehere `p`-Werte werden mit dichterem Mesh und passendem Radiusbereich zwischen den Polradien gerendert
- Lopez Klein Bottle, die einmal punktierte minimale Kleinsche Flasche mit einem Ende; gerendert wird ein stetiger Zweig der orientierbaren Doppelflaeche
- Catenoid

Die Formeln fuer `f` und `g` stehen in `math.js` direkt bei den Presets.

## Technische Struktur

- `index.html` enthaelt das Layout und die Import Map.
- `math.js` enthaelt die komplexen Formeln, Flaechen-Presets und die Berechnung der Weierstrass-Punktgitter.
- `renderer.js` kapselt die Three.js-Szene, Materialien, Geometrien, Kamera und Animation.
- `ui.js` kapselt DOM-Elemente, Slider, Buttons, Panel und UI-Synchronisation.
- `main.js` verbindet State, Mathematik, Renderer und UI.
- `styles.css` enthaelt das responsive Layout und das resizable Panel.
- `server.cjs` ist ein minimaler lokaler Static-File-Server.
- `complex.js` ist ein ESM-Adapter, der `cops.js`, `tokenizer.js` und `complex.js` aus dem GitHub-Repo [algorithms-js](https://github.com/eb58/algorithms-js) laedt und `C$` exportiert.
- `standalone.html` ist die direkt oeffenbare Einzeldatei.
- `scripts/build-standalone.js` erzeugt `standalone.html` aus den Projektdateien.
- `vendor/three/` enthaelt Three.js und OrbitControls lokal, damit die App ohne CDN laeuft.

## Neue Flaechen hinzufuegen

Ein neues Preset wird in `math.js` im Array `surfaces` angelegt. Beispiel:

```js
{
  name: "Meine Flaeche",
  ...annulus(1, 1.2, 58, 221),
  f: C$("z => ..."),
  g: C$("z => ..."),
  fText: "z => ...",
  gText: "z => ..."
}
```

Fuer Kreisringe wird `annulus(r1, r2, uSegments, vSegments)` verwendet. `C$` wertet komplexe Ausdruecke wie `z^3`, `i`, `sqrt(z)`, `sin(z)`, `cos(z)` und `exp(z)` aus.
