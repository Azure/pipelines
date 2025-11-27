import * as core from '@actions/core';
import * as azdev from "azure-devops-node-api";
import { TaskParameters } from './task.parameters';
import { PipelineNotFoundError } from './pipeline.error';

import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import * as PipelineInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces';
import { PipelineHelper as p } from './util/pipeline.helper';
import { Logger as log } from './util/logger';
import { UrlParser } from './util/url.parser';

export class PipelineRunner {
    public taskParameters: TaskParameters;
    readonly repository = p.processEnv("GITHUB_REPOSITORY");
    readonly branch = p.processEnv("GITHUB_REF");
    readonly commitId = p.processEnv("GITHUB_SHA");
    readonly githubRepo = "GitHub";

    constructor(taskParameters: TaskParameters) {
        this.taskParameters = taskParameters
    }

    public async start(): Promise<any> {
        try {
            var taskParams = TaskParameters.getTaskParams();
            let authHandler = azdev.getPersonalAccessTokenHandler(taskParams.azureDevopsToken);
            let collectionUrl = UrlParser.GetCollectionUrlBase(this.taskParameters.azureDevopsProjectUrl);
            core.info(`Creating connection with Azure DevOps service : "${collectionUrl}"`)
            let webApi = new azdev.WebApi(collectionUrl, authHandler);
            core.info("Connection created");

            let pipelineName = this.taskParameters.azurePipelineName;
            try {
                core.debug(`Triggering Yaml pipeline : "${pipelineName}"`);
                await this.RunYamlPipeline(webApi);
            }
            catch (error) {
                if (error instanceof PipelineNotFoundError) {
                    core.debug(`Triggering Designer pipeline : "${pipelineName}"`);
                    await this.RunDesignerPipeline(webApi);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            let errorMessage: string = `${error.message}`;
            core.setFailed(errorMessage);
        }
    }

    public async RunYamlPipeline(webApi: azdev.WebApi): Promise<any> {
        let projectName = UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        let pipelineName = this.taskParameters.azurePipelineName;
        let pipelinesApi = await webApi.getPipelinesApi();

        // Get all pipelines for the project
        const pipelines = await pipelinesApi.listPipelines(projectName);
        // Find the pipeline by name
        const pipeline = pipelines.find((x: PipelineInterfaces.PipelineReference) => x.name === pipelineName);

        if (!pipeline) {
            throw new PipelineNotFoundError(`Pipeline "${pipelineName}" not found in project "${projectName}"`);
        }

        p.EnsureValidPipeline(projectName, pipelineName, [pipeline]);

        log.LogPipelineObject(pipeline);

        // Prepare run parameters
        let runParameters: PipelineInterfaces.RunPipelineParameters = {
            variables: undefined,
            resources: {
                repositories: {
                    self: {
                        refName: this.branch,
                        version: this.commitId
                    }
                }
            }
        };

        // Set variables if provided
        if (this.taskParameters.azurePipelineVariables) {
            try {
                const varsJson = JSON.parse(this.taskParameters.azurePipelineVariables);
                // Convert to Pipeline API format: {key: {value: string, isSecret?: boolean}}
                runParameters.variables = {};
                Object.keys(varsJson).forEach(key => {
                    runParameters.variables![key] = { value: varsJson[key] };
                });
            } catch (e) {
                core.warning("Failed to parse pipeline variables: " + e.message);
            }
        }

        if (this.taskParameters.azurePipelineParameters) {
            try {
                runParameters.templateParameters = JSON.parse(this.taskParameters.azurePipelineParameters);
            } catch (e) {
                core.warning("Failed to parse pipeline template parameters: " + e.message);
            }
        }

        log.LogPipelineTriggerInput(runParameters);

        // Run pipeline
        const runResult = await pipelinesApi.runPipeline(runParameters, projectName, pipeline.id!);
        log.LogPipelineTriggered(pipelineName, projectName);
        log.LogPipelineTriggerOutput(runResult);
        if (runResult._links && runResult._links.web) {
            log.LogOutputUrl(runResult._links.web.href);
        }
    }

    public async RunDesignerPipeline(webApi: azdev.WebApi): Promise<any> {
        let projectName = UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        let pipelineName = this.taskParameters.azurePipelineName;
        let releaseApi = await webApi.getReleaseApi();
        // Get release definitions for the given project name and pipeline name
        const releaseDefinitions: ReleaseInterfaces.ReleaseDefinition[] = await releaseApi.getReleaseDefinitions(projectName, pipelineName, ReleaseInterfaces.ReleaseDefinitionExpands.Artifacts);

        p.EnsureValidPipeline(projectName, pipelineName, releaseDefinitions);

        let releaseDefinition = releaseDefinitions[0];

        log.LogPipelineObject(releaseDefinition);

        // Create ConfigurationVariableValue objects from the input variables
        let variables = undefined
        if (this.taskParameters.azurePipelineVariables) {
            variables = JSON.parse(this.taskParameters.azurePipelineVariables);
            Object.keys(variables).map(function (key, index) {
                let oldValue = variables[key]
                variables[key] = { value: oldValue }
            });
        }

        // Filter Github artifacts from release definition
        let gitHubArtifacts = releaseDefinition.artifacts.filter(p.isGitHubArtifact);
        let artifacts: ReleaseInterfaces.ArtifactMetadata[] = new Array();

        if (gitHubArtifacts == null || gitHubArtifacts.length == 0) {
            core.debug("Pipeline is not linked to any GitHub artifact");
            // If no GitHub artifacts found it means pipeline is not linked to any GitHub artifact
        } else {
            // If pipeline has any matching Github artifact
            core.debug("Pipeline is linked to GitHub artifact. Looking for now matching repository");
            gitHubArtifacts.forEach(gitHubArtifact => {
                if (gitHubArtifact.definitionReference != null && p.equals(gitHubArtifact.definitionReference.definition.name, this.repository)) {
                    // Add version information for matching GitHub artifact
                    let artifactMetadata = <ReleaseInterfaces.ArtifactMetadata>{
                        alias: gitHubArtifact.alias,
                        instanceReference: <ReleaseInterfaces.BuildVersion>{
                            id: this.commitId,
                            sourceBranch: this.branch,
                            sourceRepositoryType: this.githubRepo,
                            sourceRepositoryId: this.repository,
                            sourceVersion: this.commitId
                        }
                    }
                    core.debug("pipeline is linked to same Github repo");
                    artifacts.push(artifactMetadata);
                }
            });
        }

        let releaseStartMetadata: ReleaseInterfaces.ReleaseStartMetadata = <ReleaseInterfaces.ReleaseStartMetadata>{
            definitionId: releaseDefinition.id,
            reason: ReleaseInterfaces.ReleaseReason.ContinuousIntegration,
            artifacts: artifacts,
            variables: variables
        };

        log.LogPipelineTriggerInput(releaseStartMetadata);
        // create release
        let release = await releaseApi.createRelease(releaseStartMetadata, projectName);
        if (release != null) {
            log.LogPipelineTriggered(pipelineName, projectName);
            log.LogPipelineTriggerOutput(release);
            if (release != null && release._links != null) {
                log.LogOutputUrl(release._links.web.href);
            }
        }
    }
}