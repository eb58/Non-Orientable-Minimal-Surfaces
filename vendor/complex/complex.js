import { cops } from "./cops.js";
import { tokenizer } from "./tokenizer.js";

const TOKENS = tokenizer("tokens").getTOKENS();
export class ComplexSyntaxError extends SyntaxError {
  constructor(message, expression, token = {}) {
    super(message);
    this.name = "ComplexSyntaxError";
    this.expression = expression;
    this.position = token.strpos ?? 0;
    this.token = token;
  }
}
const syntaxError = (message, expression, token) => new ComplexSyntaxError(message, expression, token);
const splitParam = s => {
  const normalized = s.trim();
  const idx = normalized.indexOf("=>");
  if (idx < 0) return { params: [], expression: normalized };
  const rawParams = normalized.slice(0, idx).trim();
  const paramsSource = rawParams.startsWith("(") && rawParams.endsWith(")") ? rawParams.slice(1, -1).trim() : rawParams;
  if (/[()]/.test(paramsSource)) throw syntaxError("Invalid parameter list", normalized, { strpos: 0 });
  const params = paramsSource ? paramsSource.split(",").map(param => param.trim()) : [];
  if (params.some(param => !/^[A-Za-z_]\w*$/.test(param))) throw syntaxError("Invalid parameter name", normalized, { strpos: 0 });
  if (new Set(params).size !== params.length) throw syntaxError("Duplicate parameter name", normalized, { strpos: 0 });
  const expression = normalized.slice(idx + 2).trim();
  if (!expression) throw syntaxError("Function expression must not be empty", normalized, { strpos: idx + 2 });
  return { params, expression };
};
const ops = { [TOKENS.plus]: cops.add, [TOKENS.minus]: cops.sub, [TOKENS.times]: cops.mul, [TOKENS.divide]: cops.div, [TOKENS.pow]: cops.pow };
const isComplexValue = value => value && typeof value.re === "number" && typeof value.im === "number" && Number.isFinite(value.re) && Number.isFinite(value.im);
const toComplexValue = (value, name = "value") => {
  if (typeof value === "number" && Number.isFinite(value)) return { re: value, im: 0 };
  if (isComplexValue(value)) return value;
  throw new TypeError(`${name} must be a finite number or complex value`);
};
const numberNode = val => ({ eval: () => toComplexValue(val) });
const unaryNode = (sign, op) => ({ eval: (args, pos) => sign === TOKENS.minus ? cops.neg(op.eval(args, pos)) : op.eval(args, pos) });
const variableNode = name => ({ eval: (args, pos) => toComplexValue(args[pos[name]], `Argument ${name}`) });
const functionNode = (name, params, scope) => ({ eval: (args, pos) => toComplexValue(scope[name](...params.map(param => param.eval(args, pos))), `Result of ${name}`) });
const binaryOpNode = (op, left, right) => ({ eval: (args, pos) => ops[op](left.eval(args, pos), right.eval(args, pos)) });
const parser = (s, scope, paramNames = new Set()) => {
  const { peek, consume } = tokenizer(s);
  const is = kind => peek().symbol === kind;
  const parseExpression = () => { const append = node => is(TOKENS.plus) || is(TOKENS.minus) ? append(binaryOpNode(consume().symbol, node, parseTerm())) : node; return append(parseTerm()); };
  const parseTerm = () => { const append = node => { if (!is(TOKENS.times) && !is(TOKENS.divide) && !is(TOKENS.ident)) return node; const op = is(TOKENS.times) || is(TOKENS.divide) ? consume().symbol : TOKENS.times; return append(binaryOpNode(op, node, parseUnary())); }; return append(parseUnary()); };
  const parsePower = () => { const node = parseBase(); return is(TOKENS.pow) ? binaryOpNode(consume().symbol, node, parseUnary()) : node; };
  const parseUnary = () => is(TOKENS.plus) || is(TOKENS.minus) ? unaryNode(consume().symbol, parseUnary()) : parsePower();
  const parseScopeValue = name => { const value = scope[name]; if (!isComplexValue(value) && typeof value !== "number") throw new TypeError(`Invalid value for identifier ${name}`); return numberNode(value); };
  const parseCallArguments = () => { if (is(TOKENS.rparen)) return []; const append = expressions => { if (!is(TOKENS.comma)) return expressions; consume(); return append([...expressions, parseExpression()]); }; return append([parseExpression()]); };
  const parseFunctionCall = name => { if (!is(TOKENS.lparen)) throw syntaxError(`Opening paren expected${peek()}`, s, peek()); consume(); const expressions = parseCallArguments(); if (!is(TOKENS.rparen)) throw syntaxError(`Closing bracket not found! Pos:${peek().strpos}`, s, peek()); consume(); return functionNode(name, expressions, scope); };
  const parseIdentifier = () => { const token = peek(); if (paramNames.has(token.name)) return variableNode(consume().name); if (!Object.hasOwn(scope, token.name)) throw syntaxError(`Unknown identifier ${token.name}. Pos:${token.strpos}`, s, token); const name = consume().name; return typeof scope[name] === "function" ? parseFunctionCall(name) : parseScopeValue(name); };
  const parseParenthesized = () => { const token = consume(); const node = parseExpression(); if (!is(TOKENS.rparen)) throw syntaxError(`Closing bracket not found!. Pos:${token.strpos}`, s, token); consume(); return node; };
  const parseBase = () => { const token = peek(); if (is(TOKENS.number)) return numberNode(consume().value); if (is(TOKENS.ident)) return parseIdentifier(); if (is(TOKENS.lparen)) return parseParenthesized(); throw syntaxError(`Operand expected. Pos:${token.strpos}`, s, token); };
  const node = parseExpression();
  if (!is(TOKENS.end)) throw syntaxError(`Unexpected symbol. Pos:${peek().strpos}`, s, peek());
  return node;
};
const createScope = scope => {
  if (scope === undefined) return cops;
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) throw new TypeError("Scope must be an object");
  return { ...cops, ...scope };
};
const createComplex = (re, im = 0) => { if (!Number.isFinite(re) || !Number.isFinite(im)) throw new TypeError("Complex parts must be finite numbers"); return { re: re || 0, im: im || 0 }; };
export const C$ = (re, im) => {
  if (typeof re === "number") return createComplex(re, im === undefined ? 0 : im);
  if (typeof re === "string") {
    const scope = createScope(im);
    const { expression, params } = splitParam(re);
    const positions = Object.fromEntries(params.map((name, idx) => [name, idx]));
    const ast = parser(expression, scope, new Set(params));
    return params.length === 0 ? ast.eval([], positions) : (...args) => {
      if (args.length !== params.length) throw new RangeError(`Expected ${params.length} arguments, received ${args.length}`);
      return ast.eval(args, positions);
    };
  }
  throw new TypeError(`False initialisation of C$ ${re} ${im ?? ""}`);
};
C$.ComplexSyntaxError = ComplexSyntaxError;
