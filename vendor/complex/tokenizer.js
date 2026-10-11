export class TokenizerError extends SyntaxError {
  constructor(message, input, position) {
    super(`${message} at position ${position}`)
    this.name = 'TokenizerError'
    this.input = input
    this.position = position
  }
}

export const TOKENS = Object.freeze({
  ident: 'ident',
  number: 'number',
  minus: 'minus',
  plus: 'plus',
  times: 'times',
  divide: 'divide',
  pow: 'pow',
  lparen: 'lparen',
  rparen: 'rparen',
  lbracket: 'lbracket',
  rbracket: 'rbracket',
  comma: 'comma',
  end: 'end'
})

const CHAR_TOKENS = Object.freeze({
  '+': TOKENS.plus,
  '-': TOKENS.minus,
  '*': TOKENS.times,
  '/': TOKENS.divide,
  '(': TOKENS.lparen,
  ')': TOKENS.rparen,
  '[': TOKENS.lbracket,
  ']': TOKENS.rbracket,
  '^': TOKENS.pow,
  ',': TOKENS.comma
})

const NUMBER_PATTERN = /^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/
const IDENTIFIER_PATTERN = /^\w+/

export const tokenizer = (input) => {
  if (typeof input !== 'string') throw new TypeError('Tokenizer input must be a string')

  let scanIndex = 0
  const fail = (message, position) => {
    throw new TokenizerError(message, input, position)
  }

  const getIdentifier = () => {
    const start = scanIndex
    const match = input.slice(start).match(IDENTIFIER_PATTERN)
    scanIndex += match[0].length
    return { symbol: TOKENS.ident, name: match[0], start, end: scanIndex, strpos: scanIndex }
  }

  const getNumber = () => {
    const start = scanIndex
    const match = input.slice(start).match(NUMBER_PATTERN)
    if (!match || input[start + match[0].length] === '.') fail('Invalid number', start)

    scanIndex += match[0].length
    const value = Number(match[0])
    if (!Number.isFinite(value)) fail('Invalid number', start)
    return { symbol: TOKENS.number, value, start, end: scanIndex, strpos: scanIndex }
  }

  const scanToken = () => {
    while (scanIndex < input.length && /\s/.test(input[scanIndex])) scanIndex++
    if (scanIndex >= input.length) {
      return { symbol: TOKENS.end, start: scanIndex, end: scanIndex, strpos: scanIndex }
    }

    const start = scanIndex
    const c = input[start]
    if (/\d/.test(c) || c === '.') return getNumber()
    if (/\w/.test(c)) return getIdentifier()
    if (c === '*' && input[start + 1] === '*') {
      scanIndex += 2
      return { symbol: TOKENS.pow, start, end: scanIndex, strpos: scanIndex }
    }
    if (!CHAR_TOKENS[c]) fail(`Unexpected character "${c}"`, start)
    scanIndex++
    return { symbol: CHAR_TOKENS[c], start, end: scanIndex, strpos: scanIndex }
  }

  const allTokens = []
  do {
    allTokens.push(scanToken())
  } while (allTokens.at(-1).symbol !== TOKENS.end)

  const state = { pos: 0, position: 0 }
  const consume = () => {
    const token = allTokens[state.pos++] ?? null
    if (token) state.position = token.end
    return token
  }

  return {
    strpos: () => state.position,
    getTOKENS: () => TOKENS,
    getToken: consume,
    peek: () => allTokens[state.pos] ?? null,
    consume
  }
}

tokenizer.TokenizerError = TokenizerError
tokenizer.TOKENS = TOKENS
