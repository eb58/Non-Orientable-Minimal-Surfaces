const EPSILON = 1e-14;

const adj = c => ({ re: c.re === -0 ? 0 : c.re, im: c.im === -0 ? 0 : c.im });
const conj = c => adj({ re: c.re, im: -c.im });
const neg = c => adj({ re: -c.re, im: -c.im });
const add = (c1, c2) => adj({ re: c1.re + c2.re, im: c1.im + c2.im });
const sub = (c1, c2) => adj({ re: c1.re - c2.re, im: c1.im - c2.im });
const sqr = c => adj({ re: c.re ** 2 - c.im ** 2, im: 2 * c.re * c.im });
const cub = c => adj({ re: c.re ** 3 - 3 * c.re * c.im ** 2, im: 3 * c.re ** 2 * c.im - c.im ** 3 });
const mul = (c1, c2) => adj({ re: c1.re * c2.re - c1.im * c2.im, im: c1.re * c2.im + c1.im * c2.re });
const len = c => Math.sqrt(c.re ** 2 + c.im ** 2);
const sqrt = c => {
  const radius = len(c);
  const re = Math.sqrt(Math.max(0, (radius + c.re) / 2));
  const im = (c.im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (radius - c.re) / 2));
  return adj({ re, im });
};
const ln = c => ({ re: Math.log(len(c)), im: Math.atan2(c.im, c.re) });
const exp = c => adj({ re: Math.exp(c.re) * Math.cos(c.im), im: Math.exp(c.re) * Math.sin(c.im) });
const sin = c => adj({ re: Math.sin(c.re) * Math.cosh(c.im), im: Math.cos(c.re) * Math.sinh(c.im) });
const cos = c => adj({ re: Math.cos(c.re) * Math.cosh(c.im), im: -Math.sin(c.re) * Math.sinh(c.im) });
const pow = (c, n) => (typeof n === "number" || n.im === 0 ? powN(c, typeof n === "number" ? n : n.re) : exp(mul(n, ln(c))));

const div = (c1, c2) => {
  const den = c2.re ** 2 + c2.im ** 2;
  return adj({ re: (c1.re * c2.re + c1.im * c2.im) / den, im: (c1.im * c2.re - c1.re * c2.im) / den });
};

const powN = (c, n) => {
  if (n === 0) return { re: 1, im: 0 };
  if (n === 1) return c;
  if (n === 2) return sqr(c);
  if (n === 3) return cub(c);
  if (n === 4) return sqr(sqr(c));
  if (n === 5) return mul(cub(c), sqr(c));
  if (n === 6) return sqr(cub(c));
  return Array.from({ length: n - 1 }).reduce(acc => mul(acc, c), c);
};

const equals = (c1, c2) => Math.abs(c1.re - c2.re) < EPSILON && Math.abs(c1.im - c2.im) < EPSILON;
const toString = c => {
  if (c.im === 0) return c.re.toString();
  const ii = c.im === 1 ? "i" : `${c.im}i`;
  return c.re === 0 ? ii : `${c.re}${c.im < 0 ? "" : "+"}${ii}`;
};

export const cops = {
  i: { re: 0, im: 1 },
  pi: { re: Math.PI, im: 0 },
  e: { re: Math.E, im: 0 },
  neg,
  conj,
  add,
  sub,
  mul,
  div,
  sqr,
  cub,
  len,
  sqrt,
  ln,
  pow,
  sin,
  cos,
  exp,
  equals,
  toString
};
