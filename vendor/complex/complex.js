import { cops as copsRef } from './cops.js'
import { tokenizer as tokenizerRef } from './tokenizer.js'

const TOKENS = tokenizerRef.TOKENS ?? tokenizerRef('').getTOKENS()

export class ComplexSyntaxError extends SyntaxError {
  constructor(message, expression, token = {}) {
    super(message)
    this.name = 'ComplexSyntaxError'
    this.expression = expression
    this.position = token.start ?? token.strpos ?? 0
    this.token = token
  }
}

const syntaxError = (message, expression, token) => new ComplexSyntaxError(message, expression, token)

const splitParam = (s) => {
  const normalized = s.trim()
  const idx = normalized.indexOf('=>')
  if (idx < 0) return { params: [], expression: normalized, isFunction: false }

  const rawParams = normalized.slice(0, idx).trim()
  const paramsSource = rawParams.startsWith('(') && rawParams.endsWith(')') ? rawParams.slice(1, -1).trim() : rawParams
  if (/[()]/.test(paramsSource)) throw syntaxError('Invalid parameter list', normalized, { strpos: 0 })

  const params = paramsSource ? paramsSource.split(',').map((param) => param.trim()) : []
  if (params.some((param) => !/^[A-Za-z_]\w*$/.test(param))) {
    throw syntaxError('Invalid parameter name', normalized, { strpos: 0 })
  }
  if (new Set(params).size !== params.length) throw syntaxError('Duplicate parameter name', normalized, { strpos: 0 })

  const expression = normalized.slice(idx + 2).trim()
  if (!expression) throw syntaxError('Function expression must not be empty', normalized, { strpos: idx + 2 })
  return { params, expression, isFunction: true }
}

const normalizeZero = (value) => (value === 0 ? 0 : value)
const rawMultiply = (a, b) => ({
  re: normalizeZero(a.re * b.re - a.im * b.im),
  im: normalizeZero(a.re * b.im + a.im * b.re)
})
const rawIntegerPow = (base, exponent) => {
  let result = { re: 1, im: 0 }
  let factor = base
  let remaining = Math.abs(exponent)
  while (remaining > 0) {
    if (remaining % 2 === 1) result = rawMultiply(result, factor)
    remaining = Math.floor(remaining / 2)
    if (remaining > 0) factor = rawMultiply(factor, factor)
  }
  if (exponent >= 0) return result
  const denominator = result.re ** 2 + result.im ** 2
  if (denominator === 0) throw new RangeError('Zero cannot be raised to a negative power')
  return { re: normalizeZero(result.re / denominator), im: normalizeZero(-result.im / denominator) }
}
const rawPower = (base, exponent) => {
  if (exponent.im === 0 && Number.isSafeInteger(exponent.re)) return rawIntegerPow(base, exponent.re)
  return copsRef.pow(base, exponent)
}
const rawOps = {
  [TOKENS.plus]: (a, b) => ({ re: normalizeZero(a.re + b.re), im: normalizeZero(a.im + b.im) }),
  [TOKENS.minus]: (a, b) => ({ re: normalizeZero(a.re - b.re), im: normalizeZero(a.im - b.im) }),
  [TOKENS.times]: rawMultiply,
  [TOKENS.divide]: (a, b) => {
    const denominator = b.re ** 2 + b.im ** 2
    if (denominator === 0) throw new RangeError('Division by zero')
    return {
      re: normalizeZero((a.re * b.re + a.im * b.im) / denominator),
      im: normalizeZero((a.im * b.re - a.re * b.im) / denominator)
    }
  },
  [TOKENS.pow]: rawPower
}

const BUILTIN_ARITIES = Object.freeze({
  neg: [1, 1],
  conj: [1, 1],
  add: [2, 2],
  sub: [2, 2],
  mul: [2, 2],
  div: [2, 2],
  sqr: [1, 1],
  cub: [1, 1],
  len: [1, 1],
  abs: [1, 1],
  arg: [1, 1],
  real: [1, 1],
  imag: [1, 1],
  sqrt: [1, 1],
  ln: [1, 1],
  exp: [1, 1],
  sin: [1, 1],
  cos: [1, 1],
  tan: [1, 1],
  sinh: [1, 1],
  cosh: [1, 1],
  tanh: [1, 1],
  asin: [1, 1],
  acos: [1, 1],
  atan: [1, 1],
  asinh: [1, 1],
  acosh: [1, 1],
  atanh: [1, 1],
  polar: [2, 2],
  pow: [2, 2],
  equals: [2, 2],
  toString: [1, 1]
})

const functionArity = (name, fn) => fn.complexArity ?? (fn === copsRef[name] ? BUILTIN_ARITIES[name] : undefined)

const validateFunctionArity = (name, fn, received, expression, token) => {
  const arity = functionArity(name, fn)
  if (!arity) return

  const [minimum, maximum] = arity
  if (received >= minimum && received <= maximum) return

  const expected = minimum === maximum ? `${minimum}` : `${minimum} to ${maximum}`
  throw syntaxError(`Function "${name}" expects ${expected} arguments, received ${received}`, expression, token)
}

const isComplexValue = (value) =>
  value && typeof value.re === 'number' && typeof value.im === 'number' && Number.isFinite(value.re) && Number.isFinite(value.im)
const toComplexValue = (value, name = 'value') => {
  if (typeof value === 'number' && Number.isFinite(value)) return { re: value, im: 0 }
  if (isComplexValue(value)) return value
  throw new TypeError(`${name} must be a finite number or complex value`)
}
const constantNode = (value) => {
  const normalized = Object.freeze({ ...toComplexValue(value) })
  return { constant: true, value: normalized, eval: () => ({ ...normalized }) }
}
const numberNode = constantNode
const unaryNode = (sign, op) => {
  if (sign === TOKENS.plus) return op
  if (op.constant) return constantNode({ re: normalizeZero(-op.value.re), im: normalizeZero(-op.value.im) })
  return {
    constant: false,
    eval: (args) => {
      const value = op.eval(args)
      return { re: normalizeZero(-value.re), im: normalizeZero(-value.im) }
    }
  }
}
const variableNode = (name, index) => ({ constant: false, eval: (args) => toComplexValue(args[index], `Argument ${name}`) })
const evaluateFunction = (name, fn, params, args) => {
  if (params.length === 0) return toComplexValue(fn(), `Result of ${name}`)
  if (params.length === 1) return toComplexValue(fn(params[0].eval(args)), `Result of ${name}`)
  if (params.length === 2) return toComplexValue(fn(params[0].eval(args), params[1].eval(args)), `Result of ${name}`)
  const values = new Array(params.length)
  for (let index = 0; index < params.length; index++) values[index] = params[index].eval(args)
  return toComplexValue(fn(...values), `Result of ${name}`)
}
const functionNode = (name, params, scope) => {
  const fn = scope[name]
  if (fn === copsRef[name] && params.every((param) => param.constant)) {
    return constantNode(evaluateFunction(name, fn, params, []))
  }
  return { constant: false, eval: (args) => evaluateFunction(name, fn, params, args) }
}
const binaryOpNode = (op, left, right) => {
  if (left.constant && right.constant) return constantNode(rawOps[op](left.value, right.value))
  return { constant: false, eval: (args) => rawOps[op](left.eval(args), right.eval(args)) }
}

const parser = (s, scope, paramPositions = new Map()) => {
  const { peek, consume } = tokenizerRef(s)
  const is = (kind) => peek().symbol === kind
  const position = () => peek().start

  const parseExpression = () => {
    let node = parseTerm()
    while (is(TOKENS.plus) || is(TOKENS.minus)) {
      node = binaryOpNode(consume().symbol, node, parseTerm())
    }
    return node
  }

  const parseTerm = () => {
    let node = parseUnary()
    while (is(TOKENS.times) || is(TOKENS.divide) || is(TOKENS.ident)) {
      const op = is(TOKENS.times) || is(TOKENS.divide) ? consume().symbol : TOKENS.times
      node = binaryOpNode(op, node, parseUnary())
    }
    return node
  }

  const parsePower = () => {
    const node = parseBase()
    return is(TOKENS.pow) ? binaryOpNode(consume().symbol, node, parseUnary()) : node
  }

  const parseUnary = () => (is(TOKENS.plus) || is(TOKENS.minus) ? unaryNode(consume().symbol, parseUnary()) : parsePower())

  const parseScopeValue = (name) => {
    const value = scope[name]
    if (!isComplexValue(value) && typeof value !== 'number') throw new TypeError(`Invalid value for identifier ${name}`)
    return numberNode(value)
  }

  const parseCallArguments = () => {
    if (is(TOKENS.rparen)) return []
    const expressions = [parseExpression()]
    while (is(TOKENS.comma)) {
      consume()
      expressions.push(parseExpression())
    }
    return expressions
  }

  const parseFunctionCall = (name, identifierToken) => {
    if (!is(TOKENS.lparen)) throw syntaxError(`Expected "(" after function "${name}" at position ${position()}`, s, peek())
    consume()
    const expressions = parseCallArguments()
    if (!is(TOKENS.rparen)) throw syntaxError(`Expected ")" to close function call at position ${position()}`, s, peek())
    consume()
    validateFunctionArity(name, scope[name], expressions.length, s, identifierToken)
    return functionNode(name, expressions, scope)
  }

  const parseIdentifier = () => {
    const token = peek()
    if (paramPositions.has(token.name)) return variableNode(consume().name, paramPositions.get(token.name))
    if (!Object.hasOwn(scope, token.name)) throw syntaxError(`Unknown identifier "${token.name}" at position ${token.start}`, s, token)
    const name = consume().name
    return typeof scope[name] === 'function' ? parseFunctionCall(name, token) : parseScopeValue(name)
  }

  const parseParenthesized = () => {
    consume()
    const node = parseExpression()
    if (!is(TOKENS.rparen)) throw syntaxError(`Expected ")" to close expression at position ${position()}`, s, peek())
    consume()
    return node
  }

  const parseBase = () => {
    const token = peek()
    if (is(TOKENS.number)) return numberNode(consume().value)
    if (is(TOKENS.ident)) return parseIdentifier()
    if (is(TOKENS.lparen)) return parseParenthesized()
    throw syntaxError(`Expected an operand at position ${token.start}`, s, token)
  }

  const node = parseExpression()
  if (!is(TOKENS.end)) throw syntaxError(`Unexpected token at position ${position()}`, s, peek())
  return node
}

const createScope = (scope) => {
  if (scope === undefined) return copsRef
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) throw new TypeError('Scope must be an object')
  return { ...copsRef, ...scope }
}

const createComplex = (re, im = 0) => {
  if (!Number.isFinite(re) || !Number.isFinite(im)) throw new TypeError('Complex parts must be finite numbers')
  return { re: re || 0, im: im || 0 }
}

const AST_CACHE_LIMIT = 256
const astCache = new Map()
const cachedParser = (expression, scope, paramPositions) => {
  if (scope !== copsRef) return parser(expression, scope, paramPositions)
  const key = `${[...paramPositions.keys()].join(',')}=>${expression}`
  if (astCache.has(key)) {
    const ast = astCache.get(key)
    astCache.delete(key)
    astCache.set(key, ast)
    return ast
  }
  const ast = parser(expression, scope, paramPositions)
  astCache.set(key, ast)
  if (astCache.size > AST_CACHE_LIMIT) astCache.delete(astCache.keys().next().value)
  return ast
}

const evaluateExpression = (expression, scope) => cachedParser(expression, scope, new Map()).eval([])

const compileExpression = (expression, params, scope) => {
  const positions = new Map(params.map((name, index) => [name, index]))
  const ast = cachedParser(expression, scope, positions)

  const compiled = (...args) => {
    if (args.length !== params.length) throw new RangeError(`Expected ${params.length} arguments, received ${args.length}`)
    return ast.eval(args)
  }
  Object.defineProperty(compiled, 'complexArity', { value: [params.length, params.length] })
  return compiled
}

const parseExpressionInput = (source, customScope) => {
  const scope = createScope(customScope)
  const { expression, params, isFunction } = splitParam(source)
  return isFunction ? compileExpression(expression, params, scope) : evaluateExpression(expression, scope)
}

const evaluate = (source, customScope) => {
  if (typeof source !== 'string') throw new TypeError('C$.evaluate expects an expression string')
  const scope = createScope(customScope)
  const { expression, isFunction } = splitParam(source)
  if (isFunction) throw syntaxError('C$.evaluate expects an expression, not a function definition', source, { start: 0 })
  return evaluateExpression(expression, scope)
}

const compile = (source, customScope) => {
  if (typeof source !== 'string') throw new TypeError('C$.compile expects a function definition string')
  const scope = createScope(customScope)
  const { expression, params, isFunction } = splitParam(source)
  if (!isFunction) throw syntaxError('C$.compile expects a function definition', source, { start: 0 })
  return compileExpression(expression, params, scope)
}

export const C$ = (value, secondArgument) => {
  if (typeof value === 'number') return createComplex(value, secondArgument === undefined ? 0 : secondArgument)
  if (typeof value === 'string') return parseExpressionInput(value, secondArgument)
  throw new TypeError('C$ expects a finite number or an expression string')
}

C$.ComplexSyntaxError = ComplexSyntaxError
C$.fromParts = createComplex
C$.evaluate = evaluate
C$.compile = compile
