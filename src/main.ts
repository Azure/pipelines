import * as core from '@actions/core';
import { TaskParameters } from './task.parameters';
import { PipelineRunner } from './pipeline.runner';

export async function main(): Promise<void> {
    try {
        const pipelineRunner = new PipelineRunner(TaskParameters.getTaskParams());
        core.debug("Starting pipeline runner");
        await pipelineRunner.start();
        core.debug("pipeline runner completed");
    }
    catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const errorMessage = JSON.stringify(error);
        core.setFailed(`Error: "${err.message}" Details: "${errorMessage}"`);
    }
}

main();
