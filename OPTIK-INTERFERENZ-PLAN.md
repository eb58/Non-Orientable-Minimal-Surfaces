# Implementierungsplan: Interferenz, Reflexion und positionierbare Lampe

## 1. Ziel

Die vorhandenen Materialien **Glas** und **Seifenblase** sollen blickwinkelabhängige Dünnschichtinterferenz darstellen. Interferenz und Reflexion werden unabhängig ein- und ausschaltbar. Zusätzlich erhält die Szene eine positionierbare Lampe mit auswählbarem Spektrum; in der ersten Ausbaustufe steht ausschließlich neutrales weißes **Vollspektrum** zur Verfügung.

Die Umsetzung verwendet das bereits in der vendorten Three.js-Version vorhandene Irideszenzmodell. Ein eigener Shader, neue Abhängigkeiten oder ein neues Testframework sind nicht erforderlich.

## 2. Funktionsumfang

### 2.1 Materialien

- `Glas` und `Seifenblase` verwenden Three.js-Irideszenz als Dünnschichtmodell.
- `Interferenz` setzt die Irideszenz beider Materialien unabhängig von der normalen Reflexion ein oder aus.
- `Reflexion` steuert Umgebungsreflexion, normale Spiegelreflexion und Clearcoat.
- Beide Schalter sind standardmäßig aktiv und erlauben vier Kombinationen:
  1. Interferenz und Reflexion an
  2. nur Interferenz an
  3. nur Reflexion an
  4. beide aus
- Bei Glas repräsentiert die Interferenz eine dünne Beschichtung; gewöhnliches massives Glas allein würde keine sichtbaren Dünnschichtfarben erzeugen.
- Transmission und die übrigen grundlegenden Materialeigenschaften bleiben erhalten.
- Alle anderen Materialien bleiben optisch und funktional unverändert.

### 2.2 Beleuchtung

- Die drei vorhandenen Richtungslichter werden durch ein positionierbares weißes `THREE.PointLight` ersetzt.
- Das vorhandene Hemisphere-Licht bleibt mit reduzierter Intensität als Fülllicht erhalten, damit unbeleuchtete Flächenteile lesbar bleiben.
- Die Lampe erhält eine feste Standardposition und kann über x-, y- und z-Slider bewegt werden.
- Ein kleiner leuchtender Kugelmarker zeigt die Lampenposition im Raum.
- Ein Reset stellt Slider, Punktlicht und Marker gemeinsam auf die Standardposition zurück.
- Der Marker ist Bestandteil der dargestellten Szene und bleibt deshalb auch im Bildexport sichtbar.

### 2.3 Spektrum

- Die Oberfläche erhält ein Spektrum-Auswahlfeld.
- In dieser Ausbaustufe enthält es ausschließlich `Vollspektrum`.
- Vollspektrum wird zunächst durch neutrales weißes Licht angenähert; es erfolgt noch keine wellenlängengenaue spektrale Simulation.
- Weitere Spektren und eine physikalische spektrale Leistungsverteilung sind ausdrücklich nicht Bestandteil dieser Ausbaustufe.

### 2.4 Bedienoberfläche

Im Seitenpanel wird ein neuer Bereich `Lampe und Optik` ergänzt mit:

- Spektrum-Auswahl `Vollspektrum`
- Schalter `Interferenz`
- Schalter `Reflexion`
- x-, y- und z-Slider für die Lampenposition
- Button `Lampenposition zurücksetzen`

Die Effektschalter sind nur bei `Glas` und `Seifenblase` bedienbar. Bei allen anderen Materialien werden sie sichtbar, aber deaktiviert dargestellt. Die Lampensteuerung bleibt materialunabhängig bedienbar.

Alle Eingaben erhalten sichtbare Labels, passende native HTML-Eingabeelemente und eine klare Fokusdarstellung. Die Steuerung muss im Desktop- und Mobilpanel ohne horizontales Abschneiden funktionieren.

## 3. Technische Umsetzung

### 3.1 Zustand und Persistenz

Der vorhandene Anwendungszustand wird um folgende globale Felder ergänzt:

```js
lampPosition: { x, y, z }
interferenceEnabled: true
reflectionEnabled: true
```

- Die Lampenposition ist global und nicht pro Fläche gespeichert.
- Schalterzustände und Lampenposition werden in der bestehenden Local-Storage-Struktur gespeichert.
- Fehlende Felder aus älteren Speicherständen erhalten die neuen Standardwerte.
- Koordinaten werden nur übernommen, wenn x, y und z endliche Zahlen sind.
- Schalter werden nur übernommen, wenn sie boolesche Werte sind.
- Ungültige oder unvollständige Werte fallen ohne Fehler auf die Defaults zurück.
- Der bestehende Storage-Key bleibt erhalten, weil die Erweiterung rückwärtskompatibel gelesen werden kann.

### 3.2 Materialsteuerung

- Die bestehenden `glassMaterial`- und `iridMaterial`-Instanzen werden weiterverwendet.
- Glas erhält dieselben bereits unterstützten Irideszenzparameter wie die Seifenblase.
- Eine kleine gemeinsame Aktualisierungsfunktion überträgt die beiden Schalterzustände auf beide Materialien.
- Bei deaktivierter Interferenz wird `iridescence` auf `0` gesetzt.
- Bei deaktivierter Reflexion werden Environment-Map-Einfluss, normale Spiegelreflexion und Clearcoat deaktiviert beziehungsweise auf `0` gesetzt.
- Wird eine Shader-relevante Materialoption geändert, wird das Material bei Bedarf mit `needsUpdate` neu kompiliert.
- Ein Materialwechsel synchronisiert den Enabled-Zustand der UI, ohne die gewählten Schalterwerte zu verwerfen.

### 3.3 Lampe und Marker

- `PointLight` und Marker verwenden dieselbe `THREE.Vector3`-Position.
- Änderungen eines Sliders aktualisieren Zustand, Licht, Marker und Ausgabewert unmittelbar.
- Die Standardposition orientiert sich an der bisherigen Hauptlicht-Richtung und liegt außerhalb der normalisierten Fläche.
- Slidergrenzen werden so gewählt, dass die Lampe die normalisierte Fläche auf allen Seiten erreichen kann, ohne unnötig große Wertebereiche anzubieten.
- Der Marker verwendet eine kleine Kugelgeometrie und ein emissives Material; er beleuchtet die Szene nicht zusätzlich.
- Beim Entfernen oder Ersetzen der Lampe werden Geometrie und Material des Markers ordnungsgemäß freigegeben.

### 3.4 Betroffene Dateien

- `main.js`: Zustand, Persistenz, Punktlicht, Marker, Materialsteuerung und Ereignisbindung
- `index.html`: neue native Steuerungselemente
- `styles.css`: Layout, Disabled- und Fokuszustände sowie Mobilanpassung
- `README.md`: Bedienung und technische Einschränkungen

## 4. Definition of Done

Die Funktion gilt als abgeschlossen, wenn:

- Glas und Seifenblase sichtbare, blickwinkelabhängige Dünnschichtinterferenz darstellen.
- Interferenz und Reflexion unabhängig schaltbar sind und alle vier Kombinationen funktionieren.
- Eine weiße Vollspektrum-Punktlampe über x, y und z positionierbar ist.
- Lampenmarker, Slider und gespeicherte Position jederzeit übereinstimmen.
- Beleuchtung, Glanzlicht und Interferenz unmittelbar auf Lampen- und Kamerabewegungen reagieren.
- der Lampenreset exakt die definierte Standardposition wiederherstellt.
- die Spektrumsauswahl vorhanden ist und ausschließlich `Vollspektrum` anbietet.
- die Effektschalter außerhalb von Glas und Seifenblase deaktiviert sind.
- alle anderen Materialien optisch und funktional unverändert bleiben.
- Lampenposition und Effektzustände nach einem Neuladen wiederhergestellt werden.
- alte, unvollständige und ungültige gespeicherte Zustände sicher auf Standardwerte zurückfallen.
- Desktop-, Mobil- und Bildexportdarstellung funktionieren.
- der Bildexport den sichtbaren Lampenmarker enthält.
- Labels, Tastaturfokus und Disabled-Zustände zugänglich bedienbar sind.
- die README den neuen Funktionsumfang und die Vollspektrum-Näherung beschreibt.
- alle nachfolgenden Sprinttests bestanden sind.
- die Browserkonsole keine neuen Fehler oder unbehandelten Warnungen enthält.
- Syntaxprüfung und vorhandene Projektchecks erfolgreich enden.

## 5. Sprintplan

### Sprint 1: Licht- und Materialkern

**Ziel:** Licht, Marker und Materialeffekte funktionieren über den internen Zustand, zunächst unabhängig von der vollständigen Bedienoberfläche.

**Aufgaben:**

- gemeinsamen DOM- und Zustandsvertrag festlegen
- Richtungslichter durch Punktlicht und reduziertes Fülllicht ersetzen
- Lampenmarker und Standardposition implementieren
- Glas um Irideszenz erweitern
- Interferenz- und Reflexionszustände auf Glas und Seifenblase anwenden
- Regressionen der übrigen Materialien vermeiden

**Tests:**

| ID | Test | Erwartetes Ergebnis |
|---|---|---|
| S1-T1 | Lampe nacheinander auf mehrere definierte Koordinaten setzen | Punktlicht und Marker besitzen stets dieselbe Position |
| S1-T2 | Lampe links, rechts, vor und hinter der Fläche positionieren | Helligkeit und Glanzlicht folgen der Lampenposition plausibel |
| S1-T3 | Glas mit Interferenz aus mehreren Kamerawinkeln betrachten | Interferenzfarben verändern sich sichtbar mit dem Blickwinkel |
| S1-T4 | Seifenblase aus mehreren Kamerawinkeln betrachten | Interferenzfarben verändern sich sichtbar mit dem Blickwinkel |
| S1-T5 | Beide Materialien mit allen vier Effektkombinationen prüfen | Die Kombinationen sind unterscheidbar und beeinflussen nur den vorgesehenen Effekt |
| S1-T6 | Alle übrigen Materialien auswählen | Darstellung und Materialwechsel funktionieren unverändert |
| S1-T7 | `node --check main.js` ausführen | Der Prozess endet erfolgreich |

**Sprint-Gate:** Alle S1-Tests sind bestanden; Licht, Marker und Materialzustände erzeugen keine Konsolenfehler.

### Sprint 2: Bedienung und Persistenz

**Ziel:** Alle neuen Funktionen sind über die Oberfläche bedienbar und dauerhaft gespeichert.

**Aufgaben:**

- Lampenbereich mit x-, y- und z-Slider ergänzen
- Positionsausgaben und Reset ergänzen
- Spektrumsauswahl `Vollspektrum` ergänzen
- Interferenz- und Reflexionsschalter ergänzen
- materialabhängige Disabled-Zustände implementieren
- Local-Storage-Lesen, Validierung und Speichern erweitern
- Desktop- und Mobilstyles ergänzen

**Tests:**

| ID | Test | Erwartetes Ergebnis |
|---|---|---|
| S2-T1 | Jeden Positionsslider einzeln verändern | Nur die zugehörige Koordinate ändert sich |
| S2-T2 | Slider kontinuierlich ziehen | Licht, Marker und Ausgabewert folgen ohne Neuladen oder sichtbare Aussetzer |
| S2-T3 | Position verändern und Reset auslösen | Slider, Zustand, Punktlicht und Marker kehren zur Standardposition zurück |
| S2-T4 | Jeden Effektschalter einzeln betätigen | Nur der zugehörige Effekt ändert sich |
| S2-T5 | Zwischen Glas, Seifenblase und anderen Materialien wechseln | Schalter sind nur bei Glas und Seifenblase aktiviert; ihre Werte bleiben erhalten |
| S2-T6 | Spektrumsauswahl öffnen | Ausschließlich `Vollspektrum` ist vorhanden; das Licht bleibt neutralweiß |
| S2-T7 | Position und Schalter ändern und Seite neu laden | Alle neuen Werte und die dargestellte Szene werden wiederhergestellt |
| S2-T8 | Speicherstand ohne neue Felder laden | Die Anwendung startet fehlerfrei mit den neuen Defaults |
| S2-T9 | Ungültige oder unvollständige neue Speicherwerte laden | Die ungültigen Werte werden durch gültige Defaults ersetzt |
| S2-T10 | Steuerungen in einem schmalen Viewport bedienen | Keine Überlagerung, kein horizontales Abschneiden und keine unbedienbaren Elemente |
| S2-T11 | Steuerungen ausschließlich per Tastatur bedienen | Fokus ist sichtbar; Schalter, Slider und Reset sind erreichbar |

**Sprint-Gate:** Alle S2-Tests sind bestanden; Bedienung und Persistenz funktionieren auf Desktop und Mobil.

### Sprint 3: Integration, Dokumentation und Abnahme

**Ziel:** Der vollständige Funktionsablauf ist regressionsfrei und auslieferbar.

**Aufgaben:**

- vollständige visuelle Integration prüfen
- Bildexport prüfen
- README aktualisieren
- kleine Integrationsfehler nach Zuständigkeit beheben
- abschließendes Testprotokoll erstellen

**Tests:**

| ID | Test | Erwartetes Ergebnis |
|---|---|---|
| S3-T1 | Glas auswählen, Lampe bewegen, vier Effektkombinationen prüfen und neu laden | Der gesamte Glasablauf funktioniert einschließlich Persistenz |
| S3-T2 | Den gleichen Ablauf mit Seifenblase durchführen | Der gesamte Seifenblasenablauf funktioniert einschließlich Persistenz |
| S3-T3 | Alle bisherigen Materialien und Flächen auswählen | Auswahl und Darstellung zeigen keine unbeabsichtigten Regressionen |
| S3-T4 | Drehen, Zoomen, Ansichtsreset und Objektverschiebung verwenden | Bestehende Kamera- und Objektinteraktionen funktionieren weiterhin |
| S3-T5 | Szene mit sichtbarem Lampenmarker exportieren | Export entspricht der Vorschau und enthält den Marker |
| S3-T6 | Panel skalieren, ein- und ausblenden und im Mobilmodus verwenden | Bestehende Panelinteraktionen funktionieren weiterhin |
| S3-T7 | Vollständigen Ablauf bei geöffneter Browserkonsole durchführen | Keine neuen JavaScript-Fehler oder unbehandelten Warnungen treten auf |
| S3-T8 | Definierte Beispielansicht für beide Materialien prüfen | Interferenz, neutrale Reflexion und Lampenposition sind eindeutig unterscheidbar |
| S3-T9 | Syntaxprüfung und vorhandene Projektchecks ausführen | Alle Prozesse enden erfolgreich |

**Sprint-Gate:** Alle DoD-Punkte und Tests sind erfüllt; es bestehen keine offenen kritischen oder hohen Fehler.

## 6. Worker-Aufteilung

| Worker | Verantwortung | Dateieigentum |
|---|---|---|
| Worker A – UI | HTML-Steuerungen, Labels, Disabled-Zustände, Layout und Responsive Design | `index.html`, `styles.css` |
| Worker B – Rendering und Zustand | Punktlicht, Marker, Materialeffekte, Zustand, Validierung, Persistenz und Event-Bindings | `main.js` |
| Worker C – QA und Dokumentation | Testfälle vorbereiten und ausführen, Regressionen dokumentieren und Bedienungsanleitung aktualisieren | `README.md`, Testprotokoll |
| Integrator | Schnittstellenvertrag bestätigen, Änderungen zusammenführen, Sprint-Gates und finale Abnahme durchführen | keine parallele Featureentwicklung |

Da der Großteil der Anwendung in `main.js` liegt, besitzt diese Datei über alle Sprints genau einen Worker. Dadurch können UI, Rendering und QA parallel arbeiten, ohne konkurrierende Änderungen an der zentralen Datei.

### 6.1 Schnittstellenvertrag vor Arbeitsbeginn

Worker A, Worker B und der Integrator legen einmalig fest:

- DOM-IDs und native Eingabetypen
- Slidergrenzen, Schrittweiten und Standardposition
- Zustandsfelder und Standardwerte
- genaue Wirkung der beiden Effektschalter
- Speicherformat und Validierungsregeln
- Materialnamen, für die die Effektschalter aktiviert werden

Nach Freigabe dieses Vertrags ändern Worker A und Worker B die vereinbarten Namen nicht unabhängig voneinander.

### 6.2 Parallelisierung je Sprint

#### Sprint 1

- Worker A erstellt die neuen HTML-Steuerungen und Grundstyles gegen den vereinbarten DOM-Vertrag.
- Worker B implementiert Licht-, Marker- und Materialkern in `main.js`.
- Worker C schreibt das Testprotokoll für S1 und bereitet die visuellen Vergleichsszenen vor.

#### Sprint 2

- Worker A vervollständigt Disabled-, Fokus-, Desktop- und Mobilstyles.
- Worker B bindet UI, Zustand, Reset, Validierung und Persistenz zusammen.
- Worker C führt S1 erneut sowie S2 vollständig aus und dokumentiert Abweichungen.

#### Sprint 3

- Worker A behebt ausschließlich bestätigte UI-Probleme.
- Worker B behebt ausschließlich bestätigte Rendering- oder Zustandsprobleme.
- Worker C aktualisiert README und führt die End-to-End- sowie Regressionstests aus.
- Der Integrator nimmt die finale Version anhand von DoD und Testprotokoll ab.

### 6.3 Übergaben

1. **Worker A an Worker B:** Liste der DOM-IDs mit Eingabetyp, Grenzen, Schrittweite, Default und Disabled-Regel.
2. **Worker B an Worker C:** Zustandsschema, Rücksetzwerte und Sollverhalten der vier Effektkombinationen.
3. **Worker C an die jeweiligen Owner:** Fehlgeschlagene Test-ID, Reproduktionsschritte, Ist- und Sollverhalten.
4. **Worker C an den Integrator:** vollständiges Testprotokoll mit `bestanden`, `fehlgeschlagen` oder `blockiert` je Test.
5. **Integrator an das Team:** Sprint-Gate-Entscheidung und abschließender Abnahmebericht.

## 7. Testprotokoll

Für jeden Testfall wird mindestens Folgendes festgehalten:

```text
Test-ID:
Datum/Browser:
Ausgangszustand:
Durchgeführte Schritte:
Erwartetes Ergebnis:
Tatsächliches Ergebnis:
Status: bestanden | fehlgeschlagen | blockiert
Bemerkung/Screenshot:
```

Ein fehlgeschlagener Test wird dem Worker zugeordnet, dem die betroffene Datei gehört. Ein Sprint darf erst geschlossen werden, wenn alle Tests seines Gates bestanden sind oder eine ausdrücklich akzeptierte Abweichung dokumentiert wurde.

## 8. Nicht Bestandteil dieser Ausbaustufe

- eigene GLSL-Shader oder eine zweite Rendering-Pipeline
- physikalisch exakte spektrale Leistungsverteilungen
- weitere Spektren, Wellenlängenslider oder monochromatische Lichtquellen
- Schattenberechnung
- direktes Ziehen der Lampe im Viewer
- ein neues Testframework oder zusätzliche Laufzeitabhängigkeiten

Diese Punkte werden erst ergänzt, wenn die Vollspektrum-Ausbaustufe nachweislich nicht ausreicht.
