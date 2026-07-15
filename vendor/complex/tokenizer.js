export const tokenizer = input => {
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
    lbracket: "lbracket",
    rbracket: "rbracket",
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
    "[": TOKENS.lbracket,
    "]": TOKENS.rbracket,
    "^": TOKENS.pow,
    ",": TOKENS.comma
  });

  input = input.replace(/\s+/g, "");
  let strpos = 0;
  const isLetter = c => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  const isDigit = c => c >= "0" && c <= "9";
  const isNumberChar = c => isDigit(c) || c === ".";
  const isIdentifierChar = c => isLetter(c) || isDigit(c);
  const getIdentOrNumber = qualifier => qualifier(input[strpos]) ? input[strpos++] + getIdentOrNumber(qualifier) : "";
  const getIdentifier = () => ({ symbol: TOKENS.ident, name: getIdentOrNumber(isIdentifierChar), strpos });
  const getNumber = () => ({ symbol: TOKENS.number, value: parseFloat(getIdentOrNumber(isNumberChar)) });
  const getToken = () => {
    if (strpos >= input.length) return { symbol: TOKENS.end, strpos };
    const c = input[strpos];
    if (isLetter(c)) return getIdentifier();
    if (isDigit(c)) return getNumber();
    if (c === "*" && input[strpos + 1] === "*") {
      strpos += 2;
      return { symbol: TOKENS.pow, strpos };
    }
    if (!mapCharToToken[c]) throw Error(`Char ${c} not allowed. Pos:${strpos}`);
    if (strpos < input.length) strpos++;
    return { symbol: mapCharToToken[c], strpos };
  };

  const allTokens = [];
  do allTokens.push(getToken()); while (allTokens.at(-1).symbol !== TOKENS.end);
  let pos = 0;
  strpos = 0;

  return {
    strpos: () => strpos,
    getTOKENS: () => TOKENS,
    getToken,
    peek: () => (pos < allTokens.length ? allTokens[pos] : null),
    consume: () => (pos < allTokens.length ? allTokens[pos++] : null)
  };
};
