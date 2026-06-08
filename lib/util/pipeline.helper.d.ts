import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
export interface IErrorAndWarningMessage {
    errorMessage: string;
    warningMessage: string;
}
export declare class PipelineHelper {
    static EnsureValidPipeline(projectName: string, pipelineName: string, pipelines: unknown[] | null | undefined): void;
    static equals(str1: string | null, str2: string | null): boolean;
    static processEnv(envVarName: string): string;
    static isGitHubArtifact(artifact: ReleaseInterfaces.Artifact): boolean;
    static getErrorAndWarningMessageFromBuildResult(validationResults: BuildInterfaces.BuildRequestValidationResult[]): IErrorAndWarningMessage;
    private static _joinValidateResults;
    private static _getErrorMessageFromServer;
}
//# sourceMappingURL=pipeline.helper.d.ts.map