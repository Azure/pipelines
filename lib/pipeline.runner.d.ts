import * as azdev from "azure-devops-node-api";
import { TaskParameters } from './task.parameters';
export declare class PipelineRunner {
    taskParameters: TaskParameters;
    readonly repository: string;
    readonly branch: string;
    readonly commitId: string;
    readonly githubRepo = "GitHub";
    constructor(taskParameters: TaskParameters);
    start(): Promise<void>;
    RunYamlPipeline(webApi: azdev.WebApi): Promise<void>;
    RunDesignerPipeline(webApi: azdev.WebApi): Promise<void>;
}
//# sourceMappingURL=pipeline.runner.d.ts.map