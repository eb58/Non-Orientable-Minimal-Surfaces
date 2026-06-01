# Non-Orientable Minimal Surfaces

Interaktive Visualisierung minimaler Flaechen aus der Weierstrass-Darstellung.

Die App berechnet die Flaechen numerisch aus

```text
Re int ( f(1 - g^2) / 2, i f(1 + g^2) / 2, f g ) dz
```

und rendert sie mit Three.js als frei drehbares WebGL-Modell.

## Start

Dieses Projekt verwendet ES-Module. Darum sollte die Seite ueber einen lokalen HTTP-Server geoeffnet werden, nicht direkt per `file://`.

Mit dem enthaltenen kleinen Node-Server:

```powershell
node server.js
```

Danach im Browser oeffnen:

```text
http://127.0.0.1:8765/
```

Alternativ funktioniert jeder statische Webserver, der das Projektverzeichnis ausliefert.

## Bedienung

- Flaeche drehen: mit der Maus oder dem Trackpad ziehen
- Zoom: Mausrad oder Trackpad-Scroll
- Ansicht zuruecksetzen: Button `Ansicht zuruecksetzen`
- Parameterbereich aendern: Slider `r min`, `r max`, `w min`, `w max`
- Seitenpanel skalieren: Griff zwischen Viewer und Seitenbereich ziehen

Die Sliderwerte werden pro Flaeche separat gemerkt. Der Button `Bereich zuruecksetzen` setzt nur den Bereich der aktuell ausgewaehlten Flaeche zurueck.

## Enthaltene Flaechen

- Catenoid
- Twisted Catenoid
- Cobra
- Cobra 7
- Cobra 9
- S42
- Trefoil
- Double Trefoil
- UFO

Die Formeln fuer `f` und `g` stehen in `main.js` direkt bei den Presets.

## Technische Struktur

- `index.html` enthaelt das Layout und die Import Map.
- `main.js` berechnet die Weierstrass-Daten, erzeugt Three.js-Geometrien und steuert die UI.
- `styles.css` enthaelt das responsive Layout und das resizable Panel.
- `server.js` ist ein minimaler lokaler Static-File-Server.
- `vendor/complex/c-dollar.js` ist eine ES-Modul-Version der `C$`-Bibliothek.
- `vendor/three/` enthaelt Three.js und OrbitControls lokal, damit die App ohne CDN laeuft.

## Neue Flaechen hinzufuegen

Ein neues Preset wird in `main.js` im Array `surfaces` angelegt. Beispiel:

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

Fuer Kreisringe wird `annulus(r1, r2, uSegments, vSegments)` verwendet. `C$` wertet komplexe Ausdruecke wie `z^3`, `i`, `sin(z)`, `cos(z)` und `exp(z)` aus.
