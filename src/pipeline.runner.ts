import * as core from '@actions/core';
import * as azdev from "azure-devops-node-api";
import { TaskParameters } from './task.parameters';
import { PipelineNotFoundError } from './pipeline.error';

import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
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
        let buildApi = await webApi.getBuildApi();

        // Get matching build definitions for the given project and pipeline name
        const buildDefinitions = await buildApi.getDefinitions(projectName, pipelineName);

        p.EnsureValidPipeline(projectName, pipelineName, buildDefinitions);

        // Extract Id from build definition
        let buildDefinitionReference: BuildInterfaces.BuildDefinitionReference = buildDefinitions[0];
        let buildDefinitionId = buildDefinitionReference.id;

        // Get build definition for the matching definition Id
        let buildDefinition = await buildApi.getDefinition(projectName, buildDefinitionId);

        log.LogPipelineObject(buildDefinition);

        // Fetch repository details from build definition
        let repositoryId = buildDefinition.repository.id.trim();
        let repositoryType = buildDefinition.repository.type.trim();
        let sourceBranch = null;
        let sourceVersion = null;

        // If definition is linked to existing github repo, pass github source branch and source version to build
        if (p.equals(repositoryId, this.repository) && p.equals(repositoryType, this.githubRepo)) {
            core.debug("pipeline is linked to same Github repo");
            sourceBranch = this.branch,
                sourceVersion = this.commitId
        } else {
            core.debug("pipeline is not linked to same Github repo");
        }

        let build: BuildInterfaces.Build = {
            definition: {
                id: buildDefinition.id
            },
            project: {
                id: buildDefinition.project.id
            },
            sourceBranch: sourceBranch,
            sourceVersion: sourceVersion,
            reason: BuildInterfaces.BuildReason.Triggered,
            parameters: this.taskParameters.azurePipelineVariables
        } as BuildInterfaces.Build;

        log.LogPipelineTriggerInput(build);

        // Queue build
        let buildQueueResult = await buildApi.queueBuild(build, build.project.id, true);
        if (buildQueueResult != null) {
            log.LogPipelineTriggerOutput(buildQueueResult);
            // If build result contains validation errors set result to FAILED
            if (buildQueueResult.validationResults != null && buildQueueResult.validationResults.length > 0) {
                let errorAndWarningMessage = p.getErrorAndWarningMessageFromBuildResult(buildQueueResult.validationResults);
                core.setFailed("Errors: " + errorAndWarningMessage.errorMessage + " Warnings: " + errorAndWarningMessage.warningMessage);
            }
            else {
                log.LogPipelineTriggered(pipelineName, projectName);
                if (buildQueueResult._links != null) {
                    log.LogOutputUrl(buildQueueResult._links.web.href);
                }
            }
        }

        // Keep querying the pipeline status until it completes or cancels.
        let buildResult: BuildInterfaces.Build;
        do
        {
            await new Promise(resolve => setTimeout(resolve, buildResult ? 60000 : 0));

            buildResult = await buildApi.getBuild(projectName, buildQueueResult.id);
            core.debug(`Build Status = "${BuildInterfaces.BuildStatus[buildResult.status]}"`);
        } while (buildResult.status == BuildInterfaces.BuildStatus.InProgress);

        log.LogInfo(`Build Status = "${BuildInterfaces.BuildStatus[buildResult.status]}"`);
        log.LogInfo(`Build Result = "${BuildInterfaces.BuildResult[buildResult.result]}"`);

        if (buildResult.status != BuildInterfaces.BuildStatus.Completed
            || buildResult.result != BuildInterfaces.BuildResult.Succeeded)
        {
            core.setFailed("Build failed or canceled.");
        }

        log.LogInfo("Build succeed.");
        log.LogOutputUrl(buildResult._links.web.href);
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