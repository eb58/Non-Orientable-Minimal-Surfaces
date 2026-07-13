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

Nach Aenderungen an `main.js`, `styles.css` oder den vendorten Bibliotheken wird die Standalone-Datei neu erzeugt mit:

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
- Optische Effekte: Bei `Glas` und `Seifenblase` lassen sich `Interferenz` und `Reflexion` unabhaengig ein- und ausschalten. Bei allen anderen Materialien sind die beiden Schalter deaktiviert.
- Fancy Interferenz: Eine prozedurale Dickenkarte variiert die Duennschicht ueber die gesamte Flaeche und verteilt dadurch deutlich mehr Interferenzfarbzonen auf die sichtbare Figur. Der Schalter ist nur bei aktiver Interferenz verfuegbar.
- Lampe positionieren: Im Bereich `Lampe und Optik` verschieben die Slider `x`, `y` und `z` die globale Lampe. Der leuchtende Kugelmarker zeigt ihre Position in der Szene und ist auch im Bildexport sichtbar.
- Lampenposition zuruecksetzen: Button `Lampenposition zuruecksetzen`; Slider, Lampe und Marker kehren gemeinsam zur Standardposition zurueck.
- Spektrum waehlen: In dieser Ausbaustufe steht ausschliesslich `Vollspektrum` zur Verfuegung. Es wird als neutrales weisses Licht angenaehert.
- Seitenpanel skalieren: Griff zwischen Viewer und Seitenbereich ziehen

Die Sliderwerte fuer Bereich, Flaechenparameter und Objektposition werden pro Flaeche separat gemerkt. Der Button `Bereich zuruecksetzen` setzt nur den Bereich der aktuell ausgewaehlten Flaeche zurueck. Kreisring-Flaechen starten mit einem kleinen Winkel-Overlap ueber `2pi`, damit an der Naht keine Luecke sichtbar bleibt.

Die Lampenposition ist dagegen global und gilt beim Wechsel zwischen allen Flaechen und Materialien weiter. Lampenposition sowie die gewaehlten Interferenz- und Reflexionszustaende werden im Browser gespeichert und nach einem Neuladen wiederhergestellt. Bei aelteren, unvollstaendigen oder ungueltigen Speicherstaenden verwendet die App sichere Standardwerte.

Bei Glas steht die Interferenz fuer eine duenne Beschichtung; massives Glas allein wuerde keine sichtbaren Duennschichtfarben erzeugen. Die Darstellung ist eine anschauliche Three.js-Naeherung. Sie simuliert weder eine physikalisch genaue spektrale Leistungsverteilung noch einzelne Wellenlaengen. Weitere Spektren, Wellenlaengenslider, monochromatische Lichtquellen, Schatten und direktes Ziehen der Lampe im Viewer sind derzeit nicht vorgesehen.

## Enthaltene Flaechen

- S41-Presets mit einstellbaren ungeraden Parametern `m` und `n`, wobei `n < m` gilt
- Cobra mit einstellbarem Parameter `m`
- Kusner-Familie mit einstellbarem ungeraden Parameter `p`; hoehere `p`-Werte werden mit dichterem Mesh und passendem Radiusbereich zwischen den Polradien gerendert
- Lopez Klein Bottle, die einmal punktierte minimale Kleinsche Flasche mit einem Ende; gerendert wird ein stetiger Zweig der orientierbaren Doppelflaeche
- Catenoid

Die Formeln fuer `f` und `g` stehen in `main.js` direkt bei den Presets.

## Technische Struktur

- `index.html` enthaelt das Layout und die Import Map.
- `main.js` berechnet die Weierstrass-Daten, erzeugt Three.js-Geometrien und steuert die UI.
- `styles.css` enthaelt das responsive Layout und das resizable Panel.
- `server.cjs` ist ein minimaler lokaler Static-File-Server.
- `complex.js` ist ein ESM-Adapter, der `cops.js`, `tokenizer.js` und `complex.js` aus dem GitHub-Repo [algorithms-js](https://github.com/eb58/algorithms-js) laedt und `C$` exportiert.
- `standalone.html` ist die direkt oeffenbare Einzeldatei.
- `scripts/build-standalone.js` erzeugt `standalone.html` aus den Projektdateien.
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

Fuer Kreisringe wird `annulus(r1, r2, uSegments, vSegments)` verwendet. `C$` wertet komplexe Ausdruecke wie `z^3`, `i`, `sqrt(z)`, `sin(z)`, `cos(z)` und `exp(z)` aus.
