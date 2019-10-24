import * as core from '@actions/core';
import { TaskParameters } from './task.parameters';
import { PipelineRunner } from './pipeline.runner';

async function main() {
    try {
        const pipelineRunner = new PipelineRunner(TaskParameters.getTaskParams());
        core.info("Starting pipeline runner");
        await pipelineRunner.start();
        core.info("pipeline runner completed");
    }
    catch (error) {
        const errorMessage = JSON.stringify(error);
        core.setFailed(`Error: "${error.message}" Details: "${errorMessage}"`);
    }
}

main();

