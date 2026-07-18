# Non-Orientable Minimal Surfaces

Interaktive Visualisierung minimaler Flaechen aus der Weierstrass-Darstellung.

Die App berechnet die Flaechen numerisch aus

```text
Re int ( f(1 - g^2) / 2, i f(1 + g^2) / 2, f g ) dz
```

und rendert sie mit Three.js als frei drehbares WebGL-Modell.

## Start

Die App verwendet ES-Module und sollte ueber einen lokalen HTTP-Server geoeffnet werden, nicht direkt per `file://`. Zum Beispiel mit der VS-Code-Erweiterung Live Server:

```text
http://127.0.0.1:5500/index.html
```

## Bedienung

- Flaeche drehen: mit der Maus oder dem Trackpad ziehen
- Zoom: Mausrad oder Trackpad-Scroll
- Ansicht zuruecksetzen: Button `Ansicht zuruecksetzen`
- Parameterbereich aendern: Slider `r min`, `r max`, `w max`
- Flächenparameter ändern: bei S41 steuern die Slider `m` und `n` die Exponenten, bei Cobra steuert `m` den Exponenten, bei Kusner steuert `p` die Familie und bei Katenoid–Helikoid der Winkel den Übergang
- Objekt verschieben: Slider `x`, `y`, `z`
- Objekt verschieben: am Desktop `Ctrl` gedrueckt halten und ziehen, auf Touchscreens mit zwei Fingern ziehen
- Darstellung umschalten: mit den Pfeilen links und rechts neben dem Modus-Badge
- Seitenpanel skalieren: Griff zwischen Viewer und Seitenbereich ziehen

Die Sliderwerte für Bereich, Flächenparameter und Objektposition werden pro Fläche separat gemerkt. Der Button `Bereich zurücksetzen` setzt nur den Bereich der aktuell ausgewählten Fläche zurück. Kreisring-Flächen starten mit einem kleinen Winkel-Overlap über `2pi`, damit an der Naht keine Lücke sichtbar bleibt.

## Enthaltene Flaechen

- S41-Presets mit einstellbaren ungeraden Parametern `m` und `n`, wobei `n < m` gilt
- Cobra mit einstellbarem Parameter `m`
- Kusner-Familie mit einstellbarem ungeraden Parameter `p`; hoehere `p`-Werte werden mit dichterem Mesh und passendem Radiusbereich zwischen den Polradien gerendert
- Lopez Klein Bottle, die einmal punktierte minimale Kleinsche Flasche mit einem Ende; gerendert wird ein stetiger Zweig der orientierbaren Doppelflaeche
- Katenoid–Helikoid-Familie mit einem Assoziationswinkel von `0°` bis `90°`

Die Formeln fuer `f` und `g` stehen in `math.js` direkt bei den Presets.

## Technische Struktur

- `index.html` enthaelt das Layout und die Import Map.
- `math.js` enthaelt die komplexen Formeln, Flaechen-Presets und die Berechnung der Weierstrass-Punktgitter.
- `renderer.js` kapselt die Three.js-Szene, Materialien, Geometrien, Kamera und Animation.
- `ui.js` kapselt DOM-Elemente, Slider, Buttons, Panel und UI-Synchronisation.
- `main.js` verbindet State, Mathematik, Renderer und UI.
- `styles.css` enthaelt das responsive Layout und das resizable Panel.
- `complex.js` ist ein lokaler ESM-Adapter und exportiert `C$`.
- `vendor/complex/` enthaelt die vendorte ESM-Fassung von `cops.js`, `tokenizer.js` und `complex.js` aus dem [algorithms-js-Repository](https://github.com/eb58/algorithms-js), Stand `b7e1b2a3ea1a81219b9bb806b9e9590c988223f9`; die App benoetigt dafuer keinen Laufzeit-Netzwerkzugriff.
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
