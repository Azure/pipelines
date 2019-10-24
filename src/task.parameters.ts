import * as core from '@actions/core';

export class TaskParameters {
    private static taskparams: TaskParameters;
    private _azureDevopsUrl: string;
    private _azureDevopsProject: string;
    private _azurePipelineName: string;
    private _azureDevopsToken: string;
    private _azurePipelineType?: string;

    private constructor() {
        this._azureDevopsUrl = core.getInput('azure-devops-url', { required: true });
        this._azureDevopsProject = core.getInput('azure-devops-project', { required: true });
        this._azurePipelineName = core.getInput('azure-pipeline-name', { required: true });
        this._azureDevopsToken = core.getInput('azure-devops-token', { required: true });
        this._azurePipelineType = 'YAML';

        if (core.getInput('azure-pipeline-type')){
            this._azurePipelineType = core.getInput('azure-pipeline-type');
        }
    }

    public static getTaskParams() {
        if (!this.taskparams) {
            this.taskparams = new TaskParameters();
        }

        return this.taskparams;
    }

    public get azureDevopsUrl() {
        return this._azureDevopsUrl;
    }

    public get azureDevopsproject() {
        return this._azureDevopsProject;
    }

    public get azurePipelineName() {
        return this._azurePipelineName;
    }

    public get azureDevopsToken() {
        return this._azureDevopsToken;
    }

    public get azurePipelineType() {
        return this._azurePipelineType;
    }
}