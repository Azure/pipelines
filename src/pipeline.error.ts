export class PipelineNotFoundError extends Error {
    constructor(m: string) {
        super(m);

         // Required to allow use of "instanceof"
        Object.setPrototypeOf(this, PipelineNotFoundError.prototype);
    }
 }
