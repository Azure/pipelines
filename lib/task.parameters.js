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
        this._azureDevopsUrl = core.getInput('azure-devops-url', { required: true });
        this._azureDevopsProject = core.getInput('azure-devops-project', { required: true });
        this._azurePipelineName = core.getInput('azure-pipeline-name', { required: true });
        this._azureDevopsToken = core.getInput('azure-devops-token', { required: true });
        this._azurePipelineType = 'YAML';
        if (core.getInput('azure-pipeline-type')) {
            this._azurePipelineType = core.getInput('azure-pipeline-type');
        }
    }
    static getTaskParams() {
        if (!this.taskparams) {
            this.taskparams = new TaskParameters();
        }
        return this.taskparams;
    }
    get azureDevopsUrl() {
        return this._azureDevopsUrl;
    }
    get azureDevopsproject() {
        return this._azureDevopsProject;
    }
    get azurePipelineName() {
        return this._azurePipelineName;
    }
    get azureDevopsToken() {
        return this._azureDevopsToken;
    }
    get azurePipelineType() {
        return this._azurePipelineType;
    }
}
exports.TaskParameters = TaskParameters;
