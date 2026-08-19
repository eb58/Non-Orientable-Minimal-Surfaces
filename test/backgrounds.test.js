import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BACKGROUNDS, BACKGROUND_IDS } from "../backgrounds.js";

describe("BACKGROUNDS", () => {
  it("bietet den urspruenglichen Viewer ohne Bildhintergrund an", () => {
    assert.deepEqual(BACKGROUNDS[0], { id: "none", label: "Keinen Hintergrund" });
  });
  it("hat eindeutige ids", () => {
    assert.equal(new Set(BACKGROUND_IDS).size, BACKGROUND_IDS.length);
  });
  it("hat fuer jeden Eintrag ein nicht-leeres label", () => {
    BACKGROUNDS.forEach(background => assert.ok(background.label.length > 0));
  });
  it("BACKGROUND_IDS spiegelt die Reihenfolge von BACKGROUNDS", () => {
    assert.deepEqual(BACKGROUND_IDS, BACKGROUNDS.map(({ id }) => id));
  });
});
