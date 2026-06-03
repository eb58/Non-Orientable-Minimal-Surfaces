const EPSILON = 1e-14;
const asComplex = (re = 0, im = 0) => ({ re, im });
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
const div = (c1, c2) => {
  const den = c2.re ** 2 + c2.im ** 2;
  return adj({ re: (c1.re * c2.re + c1.im * c2.im) / den, im: (c1.im * c2.re - c1.re * c2.im) / den });
};
const ln = c => ({ re: Math.log(len(c)), im: Math.atan2(c.im, c.re) });
const exp = c => adj({ re: Math.exp(c.re) * Math.cos(c.im), im: Math.exp(c.re) * Math.sin(c.im) });
const sin = c => adj({ re: Math.sin(c.re) * Math.cosh(c.im), im: Math.cos(c.re) * Math.sinh(c.im) });
const cos = c => adj({ re: Math.cos(c.re) * Math.cosh(c.im), im: -Math.sin(c.re) * Math.sinh(c.im) });
const powN = (c, n) => n === 0
  ? asComplex(1)
  : n < 0
    ? div(asComplex(1), powN(c, -n))
    : n === 1
      ? c
      : n === 2
        ? sqr(c)
        : n === 3
          ? cub(c)
          : Array.from({ length: n - 1 }).reduce(acc => mul(acc, c), c);
const pow = (c, n) => typeof n === "number" || n.im === 0 ? powN(c, typeof n === "number" ? n : n.re) : exp(mul(n, ln(c)));
const equals = (c1, c2) => Math.abs(c1.re - c2.re) < EPSILON && Math.abs(c1.im - c2.im) < EPSILON;
const toString = c => {
  if (c.im === 0) return c.re.toString();
  const ii = c.im === 1 ? "i" : `${c.im}i`;
  return c.re === 0 ? ii : `${c.re}${c.im < 0 ? "" : "+"}${ii}`;
};

export const cops = {
  i: asComplex(0, 1),
  pi: asComplex(Math.PI),
  e: asComplex(Math.E),
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

const tokenizer = source => {
  const TOKENS = Object.freeze({
    ident: "ident",
    number: "number",
    minus: "minus",
    plus: "plus",
    times: "times",
    divide: "divide",
    pow: "pow",
    lparen: "lparen",
    rparen: "rparen",
    comma: "comma",
    end: "end"
  });
  const mapCharToToken = Object.freeze({
    "+": TOKENS.plus,
    "-": TOKENS.minus,
    "*": TOKENS.times,
    "/": TOKENS.divide,
    "(": TOKENS.lparen,
    ")": TOKENS.rparen,
    "^": TOKENS.pow,
    ",": TOKENS.comma
  });
  const state = { input: source.replace(/\s+/g, ""), strpos: 0, pos: 0 };
  const isLetter = c => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  const isDigit = c => c >= "0" && c <= "9";
  const isNumberChar = c => isDigit(c) || c === ".";
  const isIdentifierChar = c => isLetter(c) || isDigit(c);
  const getIdentOrNumber = qualifier => qualifier(state.input[state.strpos])
    ? state.input[state.strpos++] + getIdentOrNumber(qualifier)
    : "";
  const getIdentifier = () => ({ symbol: TOKENS.ident, name: getIdentOrNumber(isIdentifierChar), strpos: state.strpos });
  const getNumber = () => ({ symbol: TOKENS.number, value: parseFloat(getIdentOrNumber(isNumberChar)), strpos: state.strpos });
  const getToken = () => {
    if (state.strpos >= state.input.length) return { symbol: TOKENS.end, strpos: state.strpos };
    const char = state.input[state.strpos];
    if (isLetter(char)) return getIdentifier();
    if (isDigit(char)) return getNumber();
    if (char === "*" && state.input[state.strpos + 1] === "*") {
      state.strpos += 2;
      return { symbol: TOKENS.pow, strpos: state.strpos };
    }
    if (!mapCharToToken[char]) throw Error(`Char ${char} not allowed. Pos:${state.strpos}`);
    state.strpos++;
    return { symbol: mapCharToToken[char], strpos: state.strpos };
  };
  const allTokens = [];
  const collect = token => token.symbol === TOKENS.end ? allTokens : (allTokens.push(getToken()), collect(allTokens.at(-1)));
  allTokens.push(getToken());
  collect(allTokens.at(-1));
  return {
    getTOKENS: () => TOKENS,
    peek: () => state.pos < allTokens.length ? allTokens[state.pos] : null,
    consume: () => state.pos < allTokens.length ? allTokens[state.pos++] : null
  };
};

const TOKENS = tokenizer("tokens").getTOKENS();
const scope = { current: { ...cops } };
const ops = {
  [TOKENS.plus]: cops.add,
  [TOKENS.minus]: cops.sub,
  [TOKENS.times]: cops.mul,
  [TOKENS.divide]: cops.div,
  [TOKENS.pow]: cops.pow
};

const numberNode = val => ({ eval: () => typeof val === "number" ? asComplex(val) : val });
const unaryNode = (sign, op) => ({ eval: (args, pos) => sign === TOKENS.minus ? cops.neg(op.eval(args, pos)) : op.eval(args, pos) });
const variableNode = name => ({ eval: (args, pos) => typeof args[pos[name]] === "number" ? asComplex(args[pos[name]]) : args[pos[name]] });
const functionNode = (name, params) => ({ eval: (args, pos) => scope.current[name](...params.map(param => param.eval(args, pos))) });
const binaryOpNode = (op, left, right) => ({ eval: (args, pos) => ops[op](left.eval(args, pos), right.eval(args, pos)) });

const parser = source => {
  const { peek, consume } = tokenizer(source);
  const parseExpression = () => parseBinary(parseTerm, [TOKENS.plus, TOKENS.minus]);
  const parseTerm = () => parseBinary(parseFactor, [TOKENS.times, TOKENS.divide]);
  const parseFactor = () => {
    const node = parseOperand();
    return peek().symbol === TOKENS.pow ? binaryOpNode(consume().symbol, node, parseFactor()) : node;
  };
  const parseBinary = (next, symbols) => {
    const parseRest = node => symbols.includes(peek().symbol) ? parseRest(binaryOpNode(consume().symbol, node, next())) : node;
    return parseRest(next());
  };
  const parseOperand = () => peek().symbol === TOKENS.plus || peek().symbol === TOKENS.minus
    ? unaryNode(consume().symbol, parseBase())
    : parseBase();
  const parseArguments = () => {
    const expression = parseExpression();
    return peek().symbol === TOKENS.comma ? (consume(), [expression, ...parseArguments()]) : [expression];
  };
  const parseBase = () => {
    const token = peek();
    if (token.symbol === TOKENS.number) return numberNode(consume().value);
    if (token.symbol === TOKENS.ident) {
      if (!(token.name in scope.current)) return variableNode(consume().name);
      if (typeof scope.current[token.name] !== "function") return numberNode(scope.current[consume().name]);
      const funcName = consume().name;
      if (consume().symbol !== TOKENS.lparen) throw new Error(`Opening paren expected ${peek().strpos}`);
      const expressions = parseArguments();
      if (peek().symbol !== TOKENS.rparen) throw new Error(`Closing bracket not found! Pos:${peek().strpos}`);
      consume();
      return functionNode(funcName, expressions);
    }
    if (token.symbol === TOKENS.lparen) {
      consume();
      const node = parseExpression();
      if (peek().symbol !== TOKENS.rparen) throw new Error(`Closing bracket not found! Pos:${token.strpos}`);
      consume();
      return node;
    }
    throw new Error(`Operand expected. Pos:${token.strpos}`);
  };
  return parseExpression();
};

const splitParam = source => {
  const stripped = source.replace(/\s/g, "");
  const idx = stripped.indexOf("=>");
  return idx < 0
    ? { params: [], expression: stripped }
    : { params: stripped.slice(0, idx).replace(/[()]/g, "").split(","), expression: stripped.slice(idx + 2) };
};

export const C$ = (re, im) => {
  if (typeof re === "number") return asComplex(re || 0, im || 0);
  if (typeof re !== "string") throw Error(`False initialisation of C$ ${re} ${im || ""}`);
  scope.current = { ...scope.current, ...im };
  const { expression, params } = splitParam(re);
  const positions = params.reduce((acc, name, idx) => ({ ...acc, [name]: idx }), {});
  const ast = parser(expression);
  return params.length === 0
    ? ast.eval(im)
    : (...args) => {
        if (args.length !== params.length) throw new Error("Anzahl der Argumente stimmt nicht mit der Anzahl der Variablen überein.");
        return ast.eval(args, positions);
      };
};
