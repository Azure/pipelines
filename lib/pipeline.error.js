"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineNotFoundError = void 0;
class PipelineNotFoundError extends Error {
    constructor(m) {
        super(m);
        // Required to allow use of "instanceof"
        Object.setPrototypeOf(this, PipelineNotFoundError.prototype);
    }
}
exports.PipelineNotFoundError = PipelineNotFoundError;
