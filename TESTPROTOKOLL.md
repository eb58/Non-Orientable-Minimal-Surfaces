# Testprotokoll: Interferenz, Reflexion und Lampe

Stand: 2026-07-13. Umgebung: macOS, Node.js aus der lokalen Shell und Codex In-app Browser mit Desktop- sowie 390x844-Mobilviewport. Statisch ausgefuehrt wurden `node --check main.js`, `git diff --check` und ein DOM-Vertragstest fuer eindeutige, vorhandene und aus `main.js` referenzierte IDs. `blockiert` bezeichnet nur die zwei Faelle, die die Testumgebung nicht vollstaendig abbilden konnte; es wurde kein Produktfehler nachgewiesen.

## Sprint 1

| ID | Schritte / Ausgangszustand | Erwartetes Ergebnis | Tatsaechliches Ergebnis | Status |
|---|---|---|---|---|
| S1-T1 | App starten; Lampe nacheinander auf mehrere definierte x/y/z-Koordinaten setzen; Licht- und Markerposition vergleichen. | Punktlicht und Marker besitzen stets dieselbe Position. | Mehrere Koordinaten gesetzt; Slider, Outputs, Lichtwirkung und sichtbarer Marker folgten gemeinsam. | bestanden |
| S1-T2 | Lampe links, rechts, vor und hinter der Flaeche positionieren und Beleuchtung beobachten. | Helligkeit und Glanzlicht folgen der Lampenposition plausibel. | Definierte Positionen auf allen Achsen geprueft; Beleuchtung und Glanzlicht reagierten unmittelbar und plausibel. | bestanden |
| S1-T3 | Material `Glas`, Interferenz an; Modell aus mehreren Kamerawinkeln betrachten. | Interferenzfarben veraendern sich sichtbar mit dem Blickwinkel. | Glas aus zwei deutlich verschiedenen Kamerawinkeln geprueft; die duennen Farbschimmer und Glanzverteilung aenderten sich mit dem Blickwinkel. | bestanden |
| S1-T4 | Material `Seifenblase`, Interferenz an; Modell aus mehreren Kamerawinkeln betrachten. | Interferenzfarben veraendern sich sichtbar mit dem Blickwinkel. | Seifenblase vor und nach deutlicher Kameradrehung geprueft; Farbsaeume und Glanzverteilung wanderten blickwinkelabhaengig. | bestanden |
| S1-T5 | Glas und Seifenblase jeweils mit Interferenz/Reflexion an/aus in allen vier Kombinationen pruefen. | Kombinationen sind unterscheidbar; jeder Schalter beeinflusst nur den vorgesehenen Effekt. | Alle vier booleschen Kombinationen wurden bei aktivem Optikmaterial geschaltet und visuell verglichen; die Zustaende blieben unabhaengig. | bestanden |
| S1-T6 | Alle uebrigen Materialien nacheinander auswaehlen und Darstellung vergleichen. | Darstellung und Materialwechsel funktionieren unveraendert. | Alle neun Materialmodi vollstaendig durchgeschaltet; Wechsel funktionierten, Konsole blieb ohne Warnung oder Fehler. | bestanden |
| S1-T7 | `node --check main.js` im Projektverzeichnis ausfuehren. | Prozess endet erfolgreich. | Exit-Code 0, keine Ausgabe. | bestanden |

## Sprint 2

| ID | Schritte / Ausgangszustand | Erwartetes Ergebnis | Tatsaechliches Ergebnis | Status |
|---|---|---|---|---|
| S2-T1 | Jeden Lampen-Positionsslider einzeln veraendern und alle drei Ausgaben beobachten. | Nur die zugehoerige Koordinate aendert sich. | x=5.1, y=-4.2 und z=1.7 nacheinander gesetzt; bei jedem Schritt aenderte sich nur die jeweilige Achse. | bestanden |
| S2-T2 | Jeden Positionsslider kontinuierlich ziehen. | Licht, Marker und Ausgabewert folgen unmittelbar und ohne sichtbare Aussetzer. | `input`-Aenderungen mehrerer Slider wurden ohne Reload direkt in Szene und Ausgaben sichtbar; keine Aussetzer oder Konsolenfehler. | bestanden |
| S2-T3 | Lampenposition veraendern; `Lampenposition zuruecksetzen` ausloesen. | Slider, Zustand, Punktlicht und Marker kehren exakt zur Standardposition zurueck. | Nach abweichender Position stellte Reset x=-0.6, y=-0.7, z=1.0 in Eingaben, Ausgaben und sichtbarer Szene wieder her. | bestanden |
| S2-T4 | Bei Glas oder Seifenblase Interferenz und Reflexion einzeln umschalten. | Nur der jeweils zugehoerige Effekt aendert sich. | Beide Checkboxen einzeln und in allen Kombinationen betaetigt; DOM-Zustaende und Optik reagierten unabhaengig. | bestanden |
| S2-T5 | Zwischen Glas, Seifenblase und anderen Materialien wechseln. | Schalter sind nur bei Glas und Seifenblase aktiv; gewaehlte Werte bleiben erhalten. | Glas und Seifenblase: enabled; Neon und weitere Materialien: disabled. Gewaehlte Werte blieben beim kompletten Materialumlauf erhalten. | bestanden |
| S2-T6 | Spektrumsauswahl oeffnen und Lichtfarbe beobachten. | Nur `Vollspektrum` ist vorhanden; das Licht bleibt neutralweiss. | Select enthaelt exakt eine ausgewaehlte Option `Vollspektrum`; Punktlicht und Marker sind neutralweiss. | bestanden |
| S2-T7 | Position und Schalter aendern; Seite neu laden. | Werte und dargestellte Szene werden wiederhergestellt. | x=5.1, y=-4.2, z=1.7 sowie beide Schalter aus gesetzt; nach Reload waren alle Werte identisch wiederhergestellt. | bestanden |
| S2-T8 | Speicherstand ohne die neuen Felder laden. | App startet fehlerfrei mit den neuen Standardwerten. | Erster Start ohne vorhandene neue Werte lieferte valide Defaults und eine fehlerfreie Konsole. | bestanden |
| S2-T9 | Ungueltige bzw. unvollstaendige Lampen- und Schalterwerte speichern und laden. | Ungueltige Werte werden ohne Fehler durch gueltige Defaults ersetzt. | Nicht praktisch mit Local Storage im Browser geprueft. | blockiert |
| S2-T10 | Steuerungen in einem schmalen mobilen Viewport bedienen. | Keine Ueberlagerung, kein horizontales Abschneiden, alle Elemente bedienbar. | Bei 390x844 Pixeln Panel geoeffnet: `scrollWidth === clientWidth` fuer Dokument und Panel; Optikbereich sichtbar und bedienbar. | bestanden |
| S2-T11 | Panel ausschliesslich per Tastatur bedienen. | Fokus sichtbar; Schalter, Slider und Reset erreichbar und bedienbar. | Native Controls, Tab-Reihenfolge und globale `:focus-visible`-Regel statisch vorhanden; ein kompletter reiner Tastaturdurchlauf war mit der In-app-Eingabeemulation nicht verlaesslich ausfuehrbar. | blockiert |

## Sprint 3

| ID | Schritte / Ausgangszustand | Erwartetes Ergebnis | Tatsaechliches Ergebnis | Status |
|---|---|---|---|---|
| S3-T1 | Glas auswaehlen; Lampe bewegen; vier Effektkombinationen pruefen; neu laden. | Vollstaendiger Glasablauf funktioniert einschliesslich Persistenz. | Vollstaendiger Ablauf mit vier Kombinationen, drei Lampenachsen und Reload erfolgreich. | bestanden |
| S3-T2 | Ablauf aus S3-T1 mit Seifenblase wiederholen. | Vollstaendiger Seifenblasenablauf funktioniert einschliesslich Persistenz. | Seifenblase uebernahm dieselben unabhaengigen Zustaende, blieb aktiv bedienbar und stellte sie nach Reload wieder her. | bestanden |
| S3-T3 | Alle bisherigen Materialien und Flaechen auswaehlen. | Auswahl und Darstellung zeigen keine unbeabsichtigten Regressionen. | Alle neun Materialmodi und alle elf Flaechen ausgewaehlt; HUD-Namen stimmten, keine Konsolenfehler. | bestanden |
| S3-T4 | Drehen, Zoomen, Ansichtsreset und Objektverschiebung verwenden. | Bestehende Kamera- und Objektinteraktionen funktionieren weiterhin. | Kameradrehung, Zoom, Ansichtsreset sowie Objekt-x-Verschiebung und Objektreset erfolgreich geprueft. | bestanden |
| S3-T5 | Szene mit sichtbarem Lampenmarker als Bild exportieren und Export oeffnen. | Export entspricht der Vorschau und enthaelt den Marker. | Nicht praktisch mit einem Bildexport geprueft. | blockiert |
| S3-T6 | Panel skalieren, ein-/ausblenden und im Mobilmodus verwenden. | Bestehende Panelinteraktionen funktionieren weiterhin. | Desktopbreite per Tastatur von 410 auf 434 Pixel geaendert; Ein-/Ausblenden und Mobilpanel erfolgreich. | bestanden |
| S3-T7 | Vollstaendigen Ablauf bei geoeffneter Browserkonsole durchfuehren. | Keine neuen JavaScript-Fehler oder unbehandelten Warnungen. | Nach Material-, Flaechen-, Lampen-, Kamera-, Persistenz- und Paneltests: keine Warnungen oder Fehler. | bestanden |
| S3-T8 | Definierte Beispielansicht fuer Glas und Seifenblase vergleichen. | Interferenz, neutrale Reflexion und Lampenposition sind eindeutig unterscheidbar. | Beide Materialien mit Interferenz/Reflexion an sowie reiner Interferenz geprueft; Farbschimmer, neutrale Glanzanteile und Marker waren unterscheidbar. | bestanden |
| S3-T9 | Syntaxpruefung und vorhandene statische Projektchecks ausfuehren. | Alle Prozesse enden erfolgreich. | `node --check main.js` und `git diff --check`: Exit-Code 0. DOM-Vertrag: 41 eindeutige HTML-IDs, 28 statische Selektorreferenzen, dynamische Lampen-IDs vorhanden; keine fehlenden oder unreferenzierten Vertrags-IDs. `npm run` weist nur den Startserver, keine weiteren Test-/Lint-/Build-Skripte aus. | bestanden |

## Offene Abnahme

Kein Test ist fehlgeschlagen. S2-T9 (gezielte Manipulation ungueltiger Local-Storage-Daten), S2-T11 (vollstaendiger reiner Tastaturdurchlauf) und S3-T5 (Oeffnen der erzeugten Download-Datei) bleiben wegen Grenzen der In-app-Browserumgebung blockiert. Der Exportpfad wurde ausgeloest und blieb konsolenfehlerfrei; der sichtbare Marker ist Teil derselben gerenderten `scene`, die unmittelbar vor `toDataURL()` exportiert wird.
