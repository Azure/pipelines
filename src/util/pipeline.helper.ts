import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import { PipelineNotFoundError } from './../pipeline.error';

export interface IErrorAndWarningMessage {
    errorMessage: string;
    warningMessage: string;
}

export class PipelineHelper {

    public static EnsureValidPipeline(projectName: string, pipelineName: string, pipelines: unknown[] | null | undefined): void {
        // If definition not found then Throw Error
        if (pipelines == null || pipelines.length == 0) {
            const errorMessage = `Pipeline named "${pipelineName}" not found in project "${projectName}"`;
            throw new PipelineNotFoundError(errorMessage);
        }

        if (pipelines.length > 1) {
            // If more than 1 definition found, throw ERROR
            const errorMessage = `More than 1 Pipeline named "${pipelineName}" found in project "${projectName}"`;
            throw Error(errorMessage);
        }
    }

    public static equals(str1: string | null, str2: string | null): boolean {

        if (str1 === str2) {
            return true;
        }

        if (str1 === null) {
            return false;
        }

        if (str2 === null) {
            return false;
        }

        return str1.trim().toUpperCase() === str2.trim().toUpperCase();
    }

    public static processEnv(envVarName: string): string {
        const variable = process.env[envVarName];
        if (!variable) {
            throw new Error(`env.${envVarName} is not set`);
        }
        return variable;
    }

    public static isGitHubArtifact(artifact: ReleaseInterfaces.Artifact): boolean {
        if (artifact != null && artifact.type != null && artifact.type.toUpperCase() === "GITHUB") {
            return true;
        }

        return false;
    }

    public static getErrorAndWarningMessageFromBuildResult(validationResults: BuildInterfaces.BuildRequestValidationResult[]): IErrorAndWarningMessage {
        let errorMessage: string = "";
        let warningMessage: string = "";

        if (validationResults && validationResults.length > 0) {
            const errors = validationResults.filter((result: BuildInterfaces.BuildRequestValidationResult) => {
                return result.result === BuildInterfaces.ValidationResult.Error;
            });

            if (errors.length > 0) {
                errorMessage = this._joinValidateResults(errors);
            }
            else {
                warningMessage = this._joinValidateResults(validationResults);
            }
        }
        // Taking into account server errors also which comes not in form of array, like no build queue permissions
        else if (validationResults) {
            errorMessage = this._getErrorMessageFromServer(validationResults as unknown);
        }

        return {
            errorMessage: errorMessage,
            warningMessage: warningMessage
        };
    }

    private static _joinValidateResults(validateResults: BuildInterfaces.BuildRequestValidationResult[]): string {
        const resultMessages: (string | undefined)[] = validateResults.map((validationResult: BuildInterfaces.BuildRequestValidationResult) => {
            return validationResult.message;
        });

        const filtered = resultMessages.filter((message): message is string => !!message);
        return filtered.join(",");
    }

    private static _getErrorMessageFromServer(validationResult: unknown): string {
        let errorMessage: string = "";
        const result = validationResult as { message?: string; serverError?: { message?: string } };
        if (result) {
            errorMessage = result.message || "";
        }
        if (result && result.serverError && errorMessage.length === 0) {
            errorMessage = result.serverError.message || "";
        }

        return errorMessage;
    }
}