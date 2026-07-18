import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { C$ } from "../complex.js";

const assertNear = (value, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(value.re - expected.re) < epsilon, `re: ${value.re} != ${expected.re}`);
  assert.ok(Math.abs(value.im - expected.im) < epsilon, `im: ${value.im} != ${expected.im}`);
};

describe("C$", () => {
  it("baut eine komplexe Zahl aus re/im", () => {
    assertNear(C$(2, 3), { re: 2, im: 3 });
  });
  it("wertet eine einparametrige Formel aus", () => {
    const square = C$("z => z^2");
    assertNear(square(C$(2, 3)), { re: -5, im: 12 });
  });
  it("nutzt Konstanten aus dem scope", () => {
    const scaled = C$("z => a * z", { a: 2 });
    assertNear(scaled(C$(1, 1)), { re: 2, im: 2 });
  });
  it("kennt eingebaute Funktionen wie sqrt und i", () => {
    const withSqrt = C$("z => sqrt(z)");
    assertNear(withSqrt(C$(-1, 0)), { re: 0, im: 1 });
  });
  it("wirft bei ungueltiger Syntax", () => {
    assert.throws(() => C$("z => ("));
  });
  it("wirft bei falscher Argumentanzahl", () => {
    const f = C$("(a, b) => a + b");
    assert.throws(() => f(C$(1, 0)));
  });
});
