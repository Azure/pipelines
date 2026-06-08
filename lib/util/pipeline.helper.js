"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineHelper = void 0;
const BuildInterfaces = __importStar(require("azure-devops-node-api/interfaces/BuildInterfaces"));
const pipeline_error_1 = require("./../pipeline.error");
class PipelineHelper {
    static EnsureValidPipeline(projectName, pipelineName, pipelines) {
        // If definition not found then Throw Error
        if (pipelines == null || pipelines.length == 0) {
            const errorMessage = `Pipeline named "${pipelineName}" not found in project "${projectName}"`;
            throw new pipeline_error_1.PipelineNotFoundError(errorMessage);
        }
        if (pipelines.length > 1) {
            // If more than 1 definition found, throw ERROR
            const errorMessage = `More than 1 Pipeline named "${pipelineName}" found in project "${projectName}"`;
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
    static isGitHubArtifact(artifact) {
        if (artifact != null && artifact.type != null && artifact.type.toUpperCase() === "GITHUB") {
            return true;
        }
        return false;
    }
    static getErrorAndWarningMessageFromBuildResult(validationResults) {
        let errorMessage = "";
        let warningMessage = "";
        if (validationResults && validationResults.length > 0) {
            const errors = validationResults.filter((result) => {
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
        const resultMessages = validateResults.map((validationResult) => {
            return validationResult.message;
        });
        const filtered = resultMessages.filter((message) => !!message);
        return filtered.join(",");
    }
    static _getErrorMessageFromServer(validationResult) {
        let errorMessage = "";
        const result = validationResult;
        if (result) {
            errorMessage = result.message || "";
        }
        if (result && result.serverError && errorMessage.length === 0) {
            errorMessage = result.serverError.message || "";
        }
        return errorMessage;
    }
}
exports.PipelineHelper = PipelineHelper;
//# sourceMappingURL=pipeline.helper.js.map