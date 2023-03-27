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
        this._azurePipelineName = core.getInput('azure-pipeline-name', { required: true });
        this._azureDevopsToken = core.getInput('azure-devops-token', { required: true });
        this._azurePipelineVariables = core.getInput('azure-pipeline-variables', { required: false });
        this._azurePipelineBranch = core.getInput('azure-pipeline-branch', { required: false });
        let _waitForResult = core.getInput('azure-pipeline-branch', { required: false });
        this._waitForResult = _waitForResult && _waitForResult[0].match(/[yYiItT]/) !== null;
        this._waitPeriod = Number(core.getInput('wait-period', { required: false }) || '10') * 1000;
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
    get azurePipelineBranch() {
        return this._azurePipelineBranch;
    }
    get waitForResult() {
        return this._waitForResult;
    }
    get waitPeriod() {
        return this._waitPeriod;
    }
}
exports.TaskParameters = TaskParameters;
