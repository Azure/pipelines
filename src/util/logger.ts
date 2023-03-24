import * as core from '@actions/core';

export class Logger {

    public static LogOutputUrl(url: string) {
        if (url) {
            core.setOutput('pipeline-url', url);
            core.info(`More details on triggered pipeline can be found here : "${url}"`);
        }
    }

    public static LogInfo(message: string) {
        core.info(message);
    }

    public static LogPipelineTriggered(pipelineName: string, projectName: string) {
        core.info(`\Pipeline '${pipelineName}' is triggered in project '${projectName}'`);
    }

    public static LogPipelineObject(object: any) {
        core.debug("Pipeline object : " + this.getPrintObject(object));
    }

    public static LogPipelineTriggerInput(input: any) {
        core.debug("Input: " + this.getPrintObject(input));
    }

    public static LogPipelineTriggerOutput(output: any) {
        core.debug("Output: " + this.getPrintObject(output));
    }

    public static getPrintObject(object: any): string {
        return JSON.stringify(object, null, 4);
    }
}
