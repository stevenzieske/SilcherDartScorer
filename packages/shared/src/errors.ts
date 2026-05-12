export class ParseError extends Error {
  constructor(public readonly notation: string) {
    super(`Invalid dart notation: ${notation}`)
    this.name = 'ParseError'
  }
}
