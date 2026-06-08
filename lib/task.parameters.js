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
exports.TaskParameters = void 0;
const core = __importStar(require("@actions/core"));
class TaskParameters {
    static taskparams;
    _azureDevopsProjectUrl;
    _azurePipelineName;
    _azureDevopsToken;
    _azurePipelineVariables;
    _azurePipelineParameters;
    constructor() {
        this._azureDevopsProjectUrl = core.getInput('azure-devops-project-url', { required: true });
        this._azurePipelineName = core.getInput('azure-pipeline-name', { required: true });
        this._azureDevopsToken = core.getInput('azure-devops-token', { required: true });
        this._azurePipelineVariables = core.getInput('azure-pipeline-variables', { required: false });
        this._azurePipelineParameters = core.getInput('azure-pipeline-parameters', { required: false });
    }
    static getTaskParams() {
        if (!this.taskparams) {
            this.taskparams = new TaskParameters();
        }
        return this.taskparams;
    }
    get azureDevopsProjectUrl() {
        return this._azureDevopsProjectUrl;
    }
    get azurePipelineName() {
        return this._azurePipelineName;
    }
    get azureDevopsToken() {
        return this._azureDevopsToken;
    }
    get azurePipelineVariables() {
        return this._azurePipelineVariables;
    }
    get azurePipelineParameters() {
        return this._azurePipelineParameters;
    }
}
exports.TaskParameters = TaskParameters;
//# sourceMappingURL=task.parameters.js.map