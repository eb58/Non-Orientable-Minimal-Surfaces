const EPSILON = 1e-14
const I = Object.freeze({ re: 0, im: 1 })
const PI = Object.freeze({ re: Math.PI, im: 0 })
const E = Object.freeze({ re: Math.E, im: 0 })

const isComplex = (value) => value && typeof value === 'object' && Number.isFinite(value.re) && Number.isFinite(value.im)
const asComplex = (value, name = 'value') => {
  if (typeof value === 'number' && Number.isFinite(value)) return { re: value, im: 0 }
  if (isComplex(value)) return value
  throw new TypeError(`${name} must be a finite number or complex value`)
}
const adj = (c) => ({ re: c.re === -0 ? 0 : c.re, im: c.im === -0 ? 0 : c.im })
const zero = () => ({ re: 0, im: 0 })
const one = () => ({ re: 1, im: 0 })
const isZero = (c) => c.re === 0 && c.im === 0
const conj = (c) => {
  const z = asComplex(c)
  return adj({ re: z.re, im: -z.im })
}
const neg = (c) => {
  const z = asComplex(c)
  return adj({ re: -z.re, im: -z.im })
}
const add = (c1, c2) => {
  const z1 = asComplex(c1, 'left operand')
  const z2 = asComplex(c2, 'right operand')
  return adj({ re: z1.re + z2.re, im: z1.im + z2.im })
}
const sub = (c1, c2) => {
  const z1 = asComplex(c1, 'left operand')
  const z2 = asComplex(c2, 'right operand')
  return adj({ re: z1.re - z2.re, im: z1.im - z2.im })
}
const sqr = (c) => {
  const z = asComplex(c)
  return adj({ re: z.re ** 2 - z.im ** 2, im: 2 * z.re * z.im })
}
const cub = (c) => {
  const z = asComplex(c)
  return adj({ re: z.re ** 3 - 3 * z.re * z.im ** 2, im: 3 * z.re ** 2 * z.im - z.im ** 3 })
}
const mul = (c1, c2) => {
  const z1 = asComplex(c1, 'left operand')
  const z2 = asComplex(c2, 'right operand')
  return adj({ re: z1.re * z2.re - z1.im * z2.im, im: z1.re * z2.im + z1.im * z2.re })
}
const len = (c) => {
  const z = asComplex(c)
  return Math.hypot(z.re, z.im)
}
const abs = len
const arg = (c) => {
  const z = asComplex(c)
  return Math.atan2(z.im, z.re)
}
const real = (c) => asComplex(c).re
const imag = (c) => asComplex(c).im
const sqrt = (c) => {
  const z = asComplex(c)
  const radius = len(z)
  const re = Math.sqrt(Math.max(0, (radius + z.re) / 2))
  const belowRealAxis = z.im < 0 || Object.is(z.im, -0)
  const im = (belowRealAxis ? -1 : 1) * Math.sqrt(Math.max(0, (radius - z.re) / 2))
  return adj({ re, im })
}
const ln = (c) => {
  const z = asComplex(c)
  if (isZero(z)) throw new RangeError('Logarithm of zero is undefined')
  return adj({ re: Math.log(len(z)), im: Math.atan2(z.im, z.re) })
}
const exp = (c) => {
  const z = asComplex(c)
  return adj({ re: Math.exp(z.re) * Math.cos(z.im), im: Math.exp(z.re) * Math.sin(z.im) })
}
const sin = (c) => {
  const z = asComplex(c)
  return adj({ re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) })
}
const cos = (c) => {
  const z = asComplex(c)
  return adj({ re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) })
}
const sinh = (c) => {
  const z = asComplex(c)
  return adj({ re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) })
}
const cosh = (c) => {
  const z = asComplex(c)
  return adj({ re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) })
}

const div = (c1, c2) => {
  const z1 = asComplex(c1, 'dividend')
  const z2 = asComplex(c2, 'divisor')
  const den = z2.re ** 2 + z2.im ** 2
  if (den === 0) throw new RangeError('Division by zero')
  return adj({ re: (z1.re * z2.re + z1.im * z2.im) / den, im: (z1.im * z2.re - z1.re * z2.im) / den })
}

const positiveIntegerPow = (c, n) => {
  let result = one()
  let factor = c
  let exponent = n

  while (exponent > 0) {
    if (exponent % 2 === 1) result = mul(result, factor)
    exponent = Math.floor(exponent / 2)
    if (exponent > 0) factor = sqr(factor)
  }
  return result
}

const powN = (c, n) => {
  if (!Number.isFinite(n)) throw new RangeError('Exponent must be finite')
  if (isZero(c)) {
    if (n < 0) throw new RangeError('Zero cannot be raised to a negative power')
    return n === 0 ? one() : zero()
  }
  if (n === 0) return one()
  if (!Number.isSafeInteger(n)) return exp(mul({ re: n, im: 0 }, ln(c)))
  return n < 0 ? div(one(), positiveIntegerPow(c, -n)) : positiveIntegerPow(c, n)
}

const pow = (c, n) => {
  const base = asComplex(c, 'base')
  const exponent = asComplex(n, 'exponent')
  if (exponent.im === 0) return powN(base, exponent.re)
  if (isZero(base)) throw new RangeError('Zero cannot be raised to a complex power')
  return exp(mul(exponent, ln(base)))
}

const tan = (c) => div(sin(c), cos(c))
const asin = (c) => {
  const z = asComplex(c)
  return neg(mul({ re: 0, im: 1 }, ln(add(mul({ re: 0, im: 1 }, z), sqrt(sub(one(), sqr(z)))))))
}
const acos = (c) => sub({ re: Math.PI / 2, im: 0 }, asin(c))
const atan = (c) => {
  const z = asComplex(c)
  return mul({ re: 0, im: -0.5 }, sub(ln(add(one(), mul(I, z))), ln(sub(one(), mul(I, z)))))
}
const tanh = (c) => div(sinh(c), cosh(c))
const asinh = (c) => {
  const z = asComplex(c)
  return ln(add(z, sqrt(add(sqr(z), one()))))
}
const acosh = (c) => {
  const z = asComplex(c)
  return ln(add(z, mul(sqrt(add(z, one())), sqrt(sub(z, one())))))
}
const atanh = (c) => {
  const z = asComplex(c)
  return mul({ re: 0.5, im: 0 }, sub(ln(add(one(), z)), ln(sub(one(), z))))
}
const polar = (radius, angle) => {
  if (!Number.isFinite(radius) || !Number.isFinite(angle)) throw new TypeError('Polar coordinates must be finite numbers')
  if (radius < 0) throw new RangeError('Polar radius must not be negative')
  return adj({ re: radius * Math.cos(angle), im: radius * Math.sin(angle) })
}
const equals = (c1, c2, epsilon = EPSILON) => {
  const z1 = asComplex(c1, 'left operand')
  const z2 = asComplex(c2, 'right operand')
  if (!Number.isFinite(epsilon) || epsilon < 0) throw new RangeError('Tolerance must be a non-negative finite number')
  const scale = Math.max(1, len(z1), len(z2))
  return Math.hypot(z1.re - z2.re, z1.im - z2.im) <= epsilon * scale
}
const toString = (c) => {
  const z = adj(asComplex(c))
  if (z.im === 0) return z.re.toString()
  const imaginary = Math.abs(z.im) === 1 ? 'i' : `${Math.abs(z.im)}i`
  if (z.re === 0) return z.im < 0 ? `-${imaginary}` : imaginary
  return `${z.re}${z.im < 0 ? '-' : '+'}${imaginary}`
}

export const cops = {
  i: I,
  pi: PI,
  e: E,
  neg,
  conj,
  add,
  sub,
  mul,
  div,
  sqr,
  cub,
  len,
  abs,
  arg,
  real,
  imag,
  sqrt,
  ln,
  exp,
  sin,
  cos,
  tan,
  sinh,
  cosh,
  tanh,
  asin,
  acos,
  atan,
  asinh,
  acosh,
  atanh,
  polar,
  pow,
  equals,
  toString
}
