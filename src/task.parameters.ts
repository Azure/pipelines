import * as core from '@actions/core';

export class TaskParameters {
    private static taskparams: TaskParameters;
    private _azureDevopsProjectUrl: string;
    private _azurePipelineName: string;
    private _azurePipelineId: string;
    private _azureDevopsToken: string;
    private _ref: string;
    private _sha: string;

    private constructor() {
        this._azureDevopsProjectUrl = core.getInput('azure-devops-project-url', { required: true });
        this._azurePipelineName = core.getInput('azure-pipeline-name', { required: false });
        this._azurePipelineId = core.getInput('azure-pipeline-id', { required: false });
        this._azureDevopsToken = core.getInput('azure-devops-token', { required: true });
        this._ref = core.getInput('ref', { required: false });
        this._sha = core.getInput('sha', { required: false });
    }

    public static getTaskParams() {
        if (!this.taskparams) {
            this.taskparams = new TaskParameters();
        }

        return this.taskparams;
    }

    public get azureDevopsProjectUrl() {
        return this._azureDevopsProjectUrl;
    }

    public get azurePipelineName() {
        return this._azurePipelineName;
    }

    public get azurePipelineId() {
        return this._azurePipelineId;
    }

    public get azureDevopsToken() {
        return this._azureDevopsToken;
    }

    public get ref() {
        return this._ref;
    }

    public get sha() {
        return this._sha;
    }
}
