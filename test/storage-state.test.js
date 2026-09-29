import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { constrainDomain, migrateStorageState, resetDomainState } from "../storage-state.js";

describe("migrateStorageState", () => {
  it("verwirft beim Wechsel auf Version 3 nur den alten Kusner-Bereich", () => {
    const state = {
      version: 1,
      domains: {
        Kusner: { uRange: [0.976, 1.036], vRange: [0, 6.38] },
        Richmond: { uRange: [0.4, 1.2], vRange: [0, 6.38] }
      },
      materialMode: "copper"
    };
    assert.deepEqual(migrateStorageState(state, 3), {
      version: 3,
      domains: {
        Richmond: { uRange: [0.4, 1.2], vRange: [0, 6.38] }
      },
      materialMode: "copper"
    });
    assert.ok(state.domains.Kusner);
  });

  it("verwirft auch einen Kusner-Bereich aus der Zwischenversion 2", () => {
    const state = {
      version: 2,
      domains: { Kusner: { uRange: [0.976, 1.043], vRange: [0, 6.383] } }
    };
    assert.deepEqual(migrateStorageState(state, 3), { version: 3, domains: {} });
  });

  it("erhaelt einen Kusner-Bereich aus der aktuellen Version", () => {
    const state = {
      version: 3,
      domains: { Kusner: { uRange: [1, 1.1], vRange: [0, 6.38] } }
    };
    assert.equal(migrateStorageState(state, 3), state);
  });

  it("behandelt einen Zustand ohne Versionsnummer als Version 1", () =>
    assert.deepEqual(migrateStorageState({ domains: { Kusner: {} } }, 3), { version: 3, domains: {} })
  );
});

describe("resetDomainState", () => {
  it("entfernt den gespeicherten Bereich und liefert eine Kopie des Standards", () => {
    const richmond = { uRange: [0.4, 1.2], vRange: [0, 6.38] };
    const domains = new Map([
      ["Kusner", { uRange: [0.976, 1.043], vRange: [0, 6.38] }],
      ["Richmond", richmond]
    ]);
    const defaultValue = { uRange: [1, 1.115], vRange: [0, 6.383] };
    const reset = resetDomainState(domains, "Kusner", defaultValue);
    assert.equal(reset.domains.has("Kusner"), false);
    assert.equal(reset.domains.get("Richmond"), richmond);
    assert.deepEqual(reset.domain, defaultValue);
    assert.ok(domains.has("Kusner"));
    assert.notEqual(reset.domain.uRange, defaultValue.uRange);
    assert.notEqual(reset.domain.vRange, defaultValue.vRange);
  });
});

describe("constrainDomain", () => {
  it("kappt einen gespeicherten Kusner-p7-Bereich bei r gleich 1.05", () => {
    const surface = {
      uRange: [1, 1.05],
      uBounds: [0.927, 1.05],
      vRange: [0, 6.383]
    };
    assert.deepEqual(
      constrainDomain({ uRange: [0.976, 1.065], vRange: [0, 6.5] }, surface),
      { uRange: [0.976, 1.05], vRange: [0, 6.383] }
    );
  });
});
