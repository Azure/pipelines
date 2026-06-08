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

    public async start(): Promise<void> {
        try {
            const taskParams = TaskParameters.getTaskParams();
            const authHandler = azdev.getPersonalAccessTokenHandler(taskParams.azureDevopsToken);
            const collectionUrl = UrlParser.GetCollectionUrlBase(this.taskParameters.azureDevopsProjectUrl);
            core.info(`Creating connection with Azure DevOps service : "${collectionUrl}"`)
            const webApi = new azdev.WebApi(collectionUrl, authHandler);
            core.info("Connection created");

            const pipelineName = this.taskParameters.azurePipelineName;
            try {
                core.debug(`Triggering Yaml pipeline : "${pipelineName}"`);
                await this.RunYamlPipeline(webApi);
            }
            catch (error: unknown) {
                if (error instanceof PipelineNotFoundError) {
                    core.debug(`Triggering Designer pipeline : "${pipelineName}"`);
                    await this.RunDesignerPipeline(webApi);
                } else {
                    throw error;
                }
            }
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            core.setFailed(err.message);
        }
    }

    public async RunYamlPipeline(webApi: azdev.WebApi): Promise<void> {
        const projectName = UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        const pipelineName = this.taskParameters.azurePipelineName;
        const pipelinesApi = await webApi.getPipelinesApi();

        // Get all pipelines for the project and find by name
        const pipelines = await pipelinesApi.listPipelines(projectName);
        const pipeline = pipelines.find((x: PipelineInterfaces.PipelineReference) => x.name === pipelineName);

        if (!pipeline) {
            throw new PipelineNotFoundError(`Pipeline named "${pipelineName}" not found in project "${projectName}"`);
        }

        p.EnsureValidPipeline(projectName, pipelineName, [pipeline]);

        log.LogPipelineObject(pipeline);

        // Prepare run parameters
        const runParameters: PipelineInterfaces.RunPipelineParameters = {
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
                // Convert to Pipeline API format: {key: {value: string}}
                runParameters.variables = {};
                Object.keys(varsJson).forEach(key => {
                    runParameters.variables![key] = { value: varsJson[key] };
                });
            } catch (e: unknown) {
                const err = e instanceof Error ? e : new Error(String(e));
                core.warning("Failed to parse pipeline variables: " + err.message);
            }
        }

        // Set template parameters if provided
        if (this.taskParameters.azurePipelineParameters) {
            try {
                runParameters.templateParameters = JSON.parse(this.taskParameters.azurePipelineParameters);
            } catch (e: unknown) {
                const err = e instanceof Error ? e : new Error(String(e));
                core.warning("Failed to parse pipeline template parameters: " + err.message);
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

    public async RunDesignerPipeline(webApi: azdev.WebApi): Promise<void> {
        const projectName = UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        const pipelineName = this.taskParameters.azurePipelineName;
        const releaseApi = await webApi.getReleaseApi();
        // Get release definitions for the given project name and pipeline name
        const releaseDefinitions: ReleaseInterfaces.ReleaseDefinition[] = await releaseApi.getReleaseDefinitions(projectName, pipelineName, ReleaseInterfaces.ReleaseDefinitionExpands.Artifacts);

        p.EnsureValidPipeline(projectName, pipelineName, releaseDefinitions);

        const releaseDefinition = releaseDefinitions[0];

        log.LogPipelineObject(releaseDefinition);

        // Create ConfigurationVariableValue objects from the input variables
        let variables: Record<string, { value: string }> | undefined = undefined;
        if (this.taskParameters.azurePipelineVariables) {
            const parsed = JSON.parse(this.taskParameters.azurePipelineVariables);
            variables = {};
            Object.keys(parsed).forEach((key) => {
                variables![key] = { value: parsed[key] };
            });
        }

        // Filter Github artifacts from release definition
        const gitHubArtifacts = releaseDefinition.artifacts!.filter(p.isGitHubArtifact);
        const artifacts: ReleaseInterfaces.ArtifactMetadata[] = [];

        if (gitHubArtifacts == null || gitHubArtifacts.length == 0) {
            core.debug("Pipeline is not linked to any GitHub artifact");
            // If no GitHub artifacts found it means pipeline is not linked to any GitHub artifact
        } else {
            // If pipeline has any matching Github artifact
            core.debug("Pipeline is linked to GitHub artifact. Looking for now matching repository");
            gitHubArtifacts.forEach(gitHubArtifact => {
                if (gitHubArtifact.definitionReference != null && p.equals(gitHubArtifact.definitionReference.definition.name!, this.repository)) {
                    // Add version information for matching GitHub artifact
                    const artifactMetadata = <ReleaseInterfaces.ArtifactMetadata>{
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

        const releaseStartMetadata: ReleaseInterfaces.ReleaseStartMetadata = <ReleaseInterfaces.ReleaseStartMetadata>{
            definitionId: releaseDefinition.id,
            reason: ReleaseInterfaces.ReleaseReason.ContinuousIntegration,
            artifacts: artifacts,
            variables: variables
        };

        log.LogPipelineTriggerInput(releaseStartMetadata);
        // create release
        const release = await releaseApi.createRelease(releaseStartMetadata, projectName);
        if (release != null) {
            log.LogPipelineTriggered(pipelineName, projectName);
            log.LogPipelineTriggerOutput(release);
            if (release._links != null) {
                log.LogOutputUrl(release._links.web.href);
            }
        }
    }
}