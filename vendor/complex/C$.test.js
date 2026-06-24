import test from 'node:test';
import assert from 'node:assert';
import { C$, cops } from './C$.js';

test('C$ - complex number creation', async t => {
  await t.test('create from real and imaginary parts', () => {
    const c = C$(3, 4);
    assert.strictEqual(c.re, 3);
    assert.strictEqual(c.im, 4);
  });

  await t.test('create from real only', () => {
    const c = C$(5);
    assert.strictEqual(c.re, 5);
    assert.strictEqual(c.im, 0);
  });

  await t.test('create from zero', () => {
    const c = C$(0, 0);
    assert.strictEqual(c.re, 0);
    assert.strictEqual(c.im, 0);
  });

  await t.test('handle -0 values', () => {
    const c = C$(-0, -0);
    assert.strictEqual(Object.is(c.re, -0), false);
    assert.strictEqual(Object.is(c.im, -0), false);
  });
});

test('C$ - expression parsing', async t => {
  await t.test('parse simple number', () => {
    const result = C$('5');
    assert.strictEqual(result.re, 5);
    assert.strictEqual(result.im, 0);
  });

  await t.test('parse imaginary constant i', () => {
    const result = C$('i');
    assert.strictEqual(result.re, 0);
    assert.strictEqual(result.im, 1);
  });

  await t.test('parse pi constant', () => {
    const result = C$('pi');
    assert(Math.abs(result.re - Math.PI) < 1e-14);
    assert.strictEqual(result.im, 0);
  });

  await t.test('parse e constant', () => {
    const result = C$('e');
    assert(Math.abs(result.re - Math.E) < 1e-14);
    assert.strictEqual(result.im, 0);
  });

  await t.test('parse addition', () => {
    const result = C$('3+4*i');
    assert.strictEqual(result.re, 3);
    assert.strictEqual(result.im, 4);
  });

  await t.test('parse subtraction', () => {
    const result = C$('5-2*i');
    assert.strictEqual(result.re, 5);
    assert.strictEqual(result.im, -2);
  });

  await t.test('parse multiplication', () => {
    const result = C$('(1+i)*(1+i)');
    assert.strictEqual(result.re, 0);
    assert.strictEqual(result.im, 2);
  });

  await t.test('parse power', () => {
    const result = C$('i^2');
    assert(Math.abs(result.re - (-1)) < 1e-14);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('parse division', () => {
    const result = C$('1/i');
    assert(Math.abs(result.re) < 1e-14);
    assert(Math.abs(result.im - (-1)) < 1e-14);
  });

  await t.test('parse with parentheses', () => {
    const result = C$('(2+3*i)*(4+5*i)');
    assert.strictEqual(result.re, 2 * 4 - 3 * 5);
    assert.strictEqual(result.im, 2 * 5 + 3 * 4);
  });

  await t.test('parse unary minus', () => {
    const result = C$('-(3+4*i)');
    assert.strictEqual(result.re, -3);
    assert.strictEqual(result.im, -4);
  });

  await t.test('parse unary plus', () => {
    const result = C$('+5');
    assert.strictEqual(result.re, 5);
    assert.strictEqual(result.im, 0);
  });
});

test('C$ - functions with variables', async t => {
  await t.test('parse single variable z=>z^2', () => {
    const f = C$('z=>z^2');
    const result = f(C$(3, 4));
    assert.strictEqual(result.re, 9 - 16);
    assert.strictEqual(result.im, 24);
  });

  await t.test('parse multiple variables (x,y)=>x+y', () => {
    const f = C$('(x,y)=>x+y');
    const result = f(C$(1, 2), C$(3, 4));
    assert.strictEqual(result.re, 4);
    assert.strictEqual(result.im, 6);
  });

  await t.test('parse nested function call', () => {
    const f = C$('z=>sin(z)');
    const result = f(C$(0));
    assert(Math.abs(result.re) < 1e-14);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('throw on wrong argument count', () => {
    const f = C$('(x,y)=>x+y');
    assert.throws(() => f(C$(1)), /Anzahl der Argumente/);
  });
});

test('C$ - math functions', async t => {
  await t.test('sqrt of 4', () => {
    const result = C$('sqrt(4)');
    assert.strictEqual(result.re, 2);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('sin(0)', () => {
    const result = C$('sin(0)');
    assert(Math.abs(result.re) < 1e-14);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('cos(0)', () => {
    const result = C$('cos(0)');
    assert(Math.abs(result.re - 1) < 1e-14);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('exp(0)', () => {
    const result = C$('exp(0)');
    assert(Math.abs(result.re - 1) < 1e-14);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('ln(1)', () => {
    const result = C$('ln(1)');
    assert(Math.abs(result.re) < 1e-14);
    assert(Math.abs(result.im) < 1e-14);
  });
});

test('C$ - binary operations via cops', async t => {
  await t.test('add two complex numbers', () => {
    const result = cops.add({ re: 1, im: 2 }, { re: 3, im: 4 });
    assert.strictEqual(result.re, 4);
    assert.strictEqual(result.im, 6);
  });

  await t.test('subtract complex numbers', () => {
    const result = cops.sub({ re: 5, im: 3 }, { re: 2, im: 1 });
    assert.strictEqual(result.re, 3);
    assert.strictEqual(result.im, 2);
  });

  await t.test('multiply complex numbers', () => {
    const result = cops.mul({ re: 2, im: 3 }, { re: 4, im: 5 });
    assert.strictEqual(result.re, 2 * 4 - 3 * 5);
    assert.strictEqual(result.im, 2 * 5 + 3 * 4);
  });

  await t.test('divide complex numbers', () => {
    const result = cops.div({ re: 1, im: 0 }, { re: 0, im: 1 });
    assert(Math.abs(result.re) < 1e-14);
    assert(Math.abs(result.im - (-1)) < 1e-14);
  });

  await t.test('conjugate', () => {
    const result = cops.conj({ re: 3, im: 4 });
    assert.strictEqual(result.re, 3);
    assert.strictEqual(result.im, -4);
  });

  await t.test('negate', () => {
    const result = cops.neg({ re: 3, im: 4 });
    assert.strictEqual(result.re, -3);
    assert.strictEqual(result.im, -4);
  });

  await t.test('square', () => {
    const result = cops.sqr({ re: 3, im: 4 });
    assert.strictEqual(result.re, 9 - 16);
    assert.strictEqual(result.im, 24);
  });

  await t.test('cube', () => {
    const result = cops.cub({ re: 1, im: 1 });
    assert(Math.abs(result.re - (-2)) < 1e-14);
    assert(Math.abs(result.im - 2) < 1e-14);
  });

  await t.test('power optimization n=4', () => {
    const c = { re: 2, im: 0 };
    const result = cops.pow(c, 4);
    assert.strictEqual(result.re, 16);
    assert.strictEqual(result.im, 0);
  });

  await t.test('power optimization n=5', () => {
    const c = { re: 2, im: 0 };
    const result = cops.pow(c, 5);
    assert.strictEqual(result.re, 32);
    assert.strictEqual(result.im, 0);
  });

  await t.test('power optimization n=6', () => {
    const c = { re: 2, im: 0 };
    const result = cops.pow(c, 6);
    assert.strictEqual(result.re, 64);
    assert.strictEqual(result.im, 0);
  });

  await t.test('power negative exponent', () => {
    const result = cops.pow({ re: 2, im: 0 }, -1);
    assert.strictEqual(result.re, 0.5);
    assert(Math.abs(result.im) < 1e-14);
  });

  await t.test('length (magnitude)', () => {
    const result = cops.len({ re: 3, im: 4 });
    assert.strictEqual(result, 5);
  });

  await t.test('equals with tolerance', () => {
    assert(cops.equals({ re: 1, im: 2 }, { re: 1 + 1e-15, im: 2 }));
    assert(!cops.equals({ re: 1, im: 2 }, { re: 2, im: 2 }));
  });

  await t.test('toString', () => {
    assert.strictEqual(cops.toString({ re: 3, im: 4 }), '3+4i');
    assert.strictEqual(cops.toString({ re: 0, im: 1 }), 'i');
    assert.strictEqual(cops.toString({ re: 3, im: 0 }), '3');
    assert.strictEqual(cops.toString({ re: 0, im: -1 }), '-1i');
  });
});

test('C$ - error handling', async t => {
  await t.test('throw on invalid input type', () => {
    assert.throws(() => C$({}), /False initialisation/);
  });

  await t.test('throw on invalid expression', () => {
    assert.throws(() => C$('@'), /not allowed/);
  });

  await t.test('throw on missing closing paren', () => {
    assert.throws(() => C$('(1+2'), /Closing bracket/);
  });

  await t.test('throw on invalid expression characters', () => {
    assert.throws(() => C$('sin 5'), /Error/);
  });
});
