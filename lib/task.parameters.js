"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
class TaskParameters {
    constructor() {
        this._azureDevopsProjectUrl = core.getInput('azure-devops-project-url', { required: true });
        this._azurePipelineName = core.getInput('azure-pipeline-name', { required: false });
        this._azurePipelineId = core.getInput('azure-pipeline-id', { required: false });
        this._azureDevopsToken = core.getInput('azure-devops-token', { required: true });
        this._ref = core.getInput('ref', { required: false });
        this._sha = core.getInput('sha', { required: false });
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
    get azurePipelineId() {
        return this._azurePipelineId;
    }
    get azureDevopsToken() {
        return this._azureDevopsToken;
    }
    get ref() {
        return this._ref;
    }
    get sha() {
        return this._sha;
    }
}
exports.TaskParameters = TaskParameters;
