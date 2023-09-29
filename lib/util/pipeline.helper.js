"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineHelper = void 0;
const BuildInterfaces = __importStar(require("azure-devops-node-api/interfaces/BuildInterfaces"));
const pipeline_error_1 = require("./../pipeline.error");
class PipelineHelper {
    static EnsureValidPipeline(projectName, pipelineName, pipelines) {
        // If definition not found then Throw Error
        if (pipelines == null || pipelines.length == 0) {
            let errorMessage = `Pipeline named "${pipelineName}" not found in project "${projectName}"`;
            throw new pipeline_error_1.PipelineNotFoundError(errorMessage);
        }
        if (pipelines.length > 1) {
            // If more than 1 definition found, throw ERROR
            let errorMessage = `More than 1 Pipeline named "${pipelineName}" found in project "${projectName}"`;
            throw Error(errorMessage);
        }
    }
    static equals(str1, str2) {
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
    static processEnv(envVarName) {
        const variable = process.env[envVarName];
        if (!variable) {
            throw new Error(`env.${envVarName} is not set`);
        }
        return variable;
    }
    ;
    static isGitHubArtifact(arifact) {
        if (arifact != null && arifact.type != null && arifact.type.toUpperCase() === "GITHUB") {
            return true;
        }
        return false;
    }
    static getErrorAndWarningMessageFromBuildResult(validationResults) {
        let errorMessage = "";
        let warningMessage = "";
        if (validationResults && validationResults.length > 0) {
            let errors = validationResults.filter((result) => {
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
            errorMessage = this._getErrorMessageFromServer(validationResults);
        }
        return {
            errorMessage: errorMessage,
            warningMessage: warningMessage
        };
    }
    static _joinValidateResults(validateResults) {
        let resultMessages = validateResults.map((validationResult) => {
            return validationResult.message;
        });
        resultMessages = resultMessages.filter((message) => !!message);
        return resultMessages.join(",");
    }
    static _getErrorMessageFromServer(validationResult) {
        let errorMessage = "";
        if (validationResult) {
            errorMessage = validationResult.message || "";
        }
        if (validationResult && validationResult.serverError && errorMessage.length === 0) {
            errorMessage = validationResult.serverError.message || "";
        }
        return errorMessage;
    }
}
exports.PipelineHelper = PipelineHelper;
