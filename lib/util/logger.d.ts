export declare class Logger {
    static LogOutputUrl(url: string): void;
    static LogInfo(message: string): void;
    static LogPipelineTriggered(pipelineName: string, projectName: string): void;
    static LogPipelineObject(object: any): void;
    static LogPipelineTriggerInput(input: any): void;
    static LogPipelineTriggerOutput(output: any): void;
    static getPrintObject(object: any): string;
}
//# sourceMappingURL=logger.d.ts.map