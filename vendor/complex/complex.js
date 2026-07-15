import { cops } from "./cops.js";
import { tokenizer } from "./tokenizer.js";

const TOKENS = tokenizer("tokens").getTOKENS();
const splitParam = s => {
  const stripped = s.replace(/\s/g, "");
  const idx = stripped.indexOf("=>");
  return idx < 0
    ? { params: [], expression: stripped }
    : {
        params: stripped.slice(0, idx).replace(/[()]/g, "").split(",").filter(Boolean),
        expression: stripped.slice(idx + 2)
      };
};
const ops = {
  [TOKENS.plus]: cops.add,
  [TOKENS.minus]: cops.sub,
  [TOKENS.times]: cops.mul,
  [TOKENS.divide]: cops.div,
  [TOKENS.pow]: cops.pow
};
const numberNode = val => ({ eval: () => (typeof val === "number" ? { re: val, im: 0 } : val) });
const unaryNode = (sign, op) => ({ eval: (args, pos) => sign === TOKENS.minus ? cops.neg(op.eval(args, pos)) : op.eval(args, pos) });
const variableNode = name => ({ eval: (args, pos) => typeof args[pos[name]] === "number" ? { re: args[pos[name]], im: 0 } : args[pos[name]] });
const functionNode = (name, params, scope) => ({ eval: (args, pos) => scope[name](...params.map(param => param.eval(args, pos))) });
const binaryOpNode = (op, left, right) => ({ eval: (args, pos) => ops[op](left.eval(args, pos), right.eval(args, pos)) });

const parser = (s, scope, paramNames = new Set()) => {
  const { peek, consume } = tokenizer(s);
  const is = kind => peek().symbol === kind;
  const parseExpression = () => {
    let node = parseTerm();
    while (is(TOKENS.plus) || is(TOKENS.minus)) node = binaryOpNode(consume().symbol, node, parseTerm());
    return node;
  };
  const parseTerm = () => {
    let node = parseFactor();
    while (is(TOKENS.times) || is(TOKENS.divide)) node = binaryOpNode(consume().symbol, node, parseFactor());
    return node;
  };
  const parseFactor = () => {
    let node = parseOperand();
    while (is(TOKENS.pow)) node = binaryOpNode(consume().symbol, node, parseFactor());
    return node;
  };
  const parseOperand = () => is(TOKENS.plus) || is(TOKENS.minus)
    ? unaryNode(consume().symbol, parseBase())
    : parseBase();
  const parseBase = () => {
    const token = peek();
    if (is(TOKENS.number)) return numberNode(consume().value);
    if (is(TOKENS.ident)) {
      if (paramNames.has(token.name)) return variableNode(consume().name);
      if (!Object.hasOwn(scope, token.name)) return variableNode(consume().name);
      if (typeof scope[token.name] !== "function") return numberNode(scope[consume().name]);
      const funcName = consume().name;
      if (!is(TOKENS.lparen)) throw new Error(`Opening paren expected${peek()}`);
      consume();
      const expressions = [parseExpression()];
      while (is(TOKENS.comma)) {
        consume();
        expressions.push(parseExpression());
      }
      if (!is(TOKENS.rparen)) throw new Error(`Closing bracket not found! Pos:${peek().strpos}`);
      consume();
      return functionNode(funcName, expressions, scope);
    }
    if (is(TOKENS.lparen)) {
      consume();
      const node = parseExpression();
      if (!is(TOKENS.rparen)) throw new Error(`Closing bracket not found!. Pos:${token.strpos}`);
      consume();
      return node;
    }
    throw new Error(`Operand expected. Pos:${token.strpos}`);
  };
  return parseExpression();
};

export const C$ = (re, im) => {
  if (typeof re === "number") return { re: re || 0, im: im || 0 };
  if (typeof re === "string") {
    const scope = { ...cops, ...(im || {}) };
    const { expression, params } = splitParam(re);
    const positions = params.reduce((acc, name, idx) => ({ ...acc, [name]: idx }), {});
    const ast = parser(expression, scope, new Set(params));
    return params.length === 0
      ? ast.eval(scope)
      : (...args) => {
          if (args.length !== params.length) throw new Error("Anzahl der Argumente stimmt nicht mit der Anzahl der Variablen überein.");
          return ast.eval(args, positions);
        };
  }
  throw Error(`False initialisation of C$ ${re} ${im || ""}`);
};
