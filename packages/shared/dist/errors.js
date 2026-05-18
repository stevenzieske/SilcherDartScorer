"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = void 0;
class ParseError extends Error {
    constructor(notation) {
        super(`Invalid dart notation: ${notation}`);
        this.notation = notation;
        this.name = 'ParseError';
    }
}
exports.ParseError = ParseError;
