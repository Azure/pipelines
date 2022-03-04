import * as core from '@actions/core';
import { TaskParameters } from './task.parameters';
import { PipelineRunner } from './pipeline.runner';

export async function main() {
    try {
        const pipelineRunner = new PipelineRunner(TaskParameters.getTaskParams());
        core.debug("Starting pipeline runner");
        const run = await pipelineRunner.start();
        core.debug("pipeline runner completed");

        console.log({ run });
    }
    catch (error) {
        const errorMessage = JSON.stringify(error);
        core.setFailed(`Error: "${error.message}" Details: "${errorMessage}"`);
    }
}

main();
