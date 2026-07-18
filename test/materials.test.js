import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MATERIAL_MODES, MATERIAL_MODE_LABELS, adjacentMaterialMode } from "../materials.js";

describe("MATERIAL_MODE_LABELS", () => {
  it("hat fuer jeden Modus eine Beschriftung", () => {
    MATERIAL_MODES.forEach(mode => assert.equal(typeof MATERIAL_MODE_LABELS[mode], "string"));
  });
});

describe("adjacentMaterialMode", () => {
  it("liefert den naechsten Modus", () => {
    assert.equal(adjacentMaterialMode(MATERIAL_MODES[0], 1), MATERIAL_MODES[1]);
  });
  it("liefert den vorherigen Modus", () => {
    assert.equal(adjacentMaterialMode(MATERIAL_MODES[1], -1), MATERIAL_MODES[0]);
  });
  it("springt am Ende vorwaerts zum Anfang", () => {
    const last = MATERIAL_MODES[MATERIAL_MODES.length - 1];
    assert.equal(adjacentMaterialMode(last, 1), MATERIAL_MODES[0]);
  });
  it("springt am Anfang rueckwaerts zum Ende", () => {
    const last = MATERIAL_MODES[MATERIAL_MODES.length - 1];
    assert.equal(adjacentMaterialMode(MATERIAL_MODES[0], -1), last);
  });
});
