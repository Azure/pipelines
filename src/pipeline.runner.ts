import * as core from '@actions/core';
import * as azdev from "azure-devops-node-api";
import { TaskParameters } from './task.parameters';
import { PipelineNotFoundError } from './pipeline.error';

import * as ReleaseInterfaces from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { PipelineHelper as p } from './util/pipeline.helper';
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
            core.info("Creating connection with Azure DevOps service : " + collectionUrl)
            let webApi = new azdev.WebApi(collectionUrl, authHandler);
            core.info("Connection created");

            try {
                core.info("Triggering Yaml pipeline : " + this.taskParameters.azurePipelineName);
                await this.RunYamlPipeline(webApi);
            }
            catch (error) {
                if (error instanceof PipelineNotFoundError) {
                    core.info("Triggering Designer pipeline : " + this.taskParameters.azurePipelineName);
                    await this.RunDesignerPipeline(webApi);
                } else {
                    throw error;
                }
            }
        }
        catch (error) {
            let errorMessage: string = `${error.message}`;
            core.setFailed(errorMessage);
        }
    }

    public async RunYamlPipeline(webApi: azdev.WebApi): Promise<any> {
        let buildApi = await webApi.getBuildApi();
        let projectName = UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        let pipelineName = this.taskParameters.azurePipelineName;

        // Get matching build definitions for the given project and pipeline name
        const buildDefinitions = await buildApi.getDefinitions(projectName, pipelineName);

          // If definition not found then Throw Error
          if (buildDefinitions == null || buildDefinitions.length == 0) {
            let errorMessage = `YAML Pipeline named "${pipelineName}" in project ${projectName} not found`;
            throw new PipelineNotFoundError(errorMessage);
        }

        // If more than 1 definition is returned, Throw Error
        if (buildDefinitions.length > 1) {
            let errorMessage = `YAML Pipeline named "${pipelineName}" in project ${projectName} not found`;
            throw Error(errorMessage);
        }

        // Extract Id from build definition
        let buildDefinitionReference: BuildInterfaces.BuildDefinitionReference = buildDefinitions[0];
        let buildDefinitionId = buildDefinitionReference.id;

        // Get build definition for the matching definition Id
        let buildDefinition = await buildApi.getDefinition(projectName, buildDefinitionId);

        core.info("Pipeline object : " + p.getPrintObject(buildDefinition));

        // Fetch repository details from build definition
        let repositoryId = buildDefinition.repository.id.trim();
        let repositoryType = buildDefinition.repository.type.trim();
        let sourceBranch = null;
        let sourceVersion = null;

        // If definition is linked to existing github repo, pass github source branch and source version to build
        if (p.equals(repositoryId, this.repository) && p.equals(repositoryType, this.githubRepo)) {
            core.info("pipeline is linked to same Github repo");
            sourceBranch = this.branch,
                sourceVersion = this.commitId
        } else {
            core.info("pipeline is not linked to same Github repo");
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
            reason: BuildInterfaces.BuildReason.Triggered
        } as BuildInterfaces.Build;

        core.info("Input - \n" + p.getPrintObject(build));

        // Queue build
        let buildQueueResult = await buildApi.queueBuild(build, build.project.id, true);
        if (buildQueueResult != null) {
            core.info("Output - \n" + p.getPrintObject(buildQueueResult));
            // If build result contains validation errors set result to FAILED
            if (buildQueueResult.validationResults != null && buildQueueResult.validationResults.length > 0) {
                let errorAndWarningMessage = p.getErrorAndWarningMessageFromBuildResult(buildQueueResult.validationResults);
                core.setFailed("Errors: " + errorAndWarningMessage.errorMessage + " Warnings: " + errorAndWarningMessage.warningMessage);
            }
            else {
                core.info(`\Pipeline "${pipelineName}" started - Id: ${buildQueueResult.id}`);
                if (buildQueueResult._links != null && buildQueueResult._links.web != null) {
                    core.setOutput('pipeline-url', buildQueueResult._links.web.href);
                }
            }
        }
    }

    public async RunDesignerPipeline(webApi: azdev.WebApi): Promise<any> {
        let releaseApi = await webApi.getReleaseApi();
        let projectName = UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        let pipelineName = this.taskParameters.azurePipelineName;

        // Get release definitions for the given project name and pipeline name
        const releaseDefinitions: ReleaseInterfaces.ReleaseDefinition[] = await releaseApi.getReleaseDefinitions(projectName, pipelineName, ReleaseInterfaces.ReleaseDefinitionExpands.Artifacts);
       
          // If definition not found then Throw Error
          if (releaseDefinitions == null || releaseDefinitions.length == 0) {
            let errorMessage = `Designer Pipeline named "${pipelineName}" in project ${projectName} not found`;
            throw new PipelineNotFoundError(errorMessage);
        }
       
        if (releaseDefinitions.length > 1) {
            // If more than 1 definition found, throw ERROR
            let errorMessage = `More than 1 Designer Pipeline named "${pipelineName}" in project ${projectName} found`;
            throw Error(errorMessage);
        }

        let releaseDefinition = releaseDefinitions[0];

        core.info("Pipeline object : " + p.getPrintObject(releaseDefinition));

        // Filter Github artifacts from release definition
        let gitHubArtifacts = releaseDefinition.artifacts.filter(p.isGitHubArtifact);
        let artifacts: ReleaseInterfaces.ArtifactMetadata[] = new Array();

        if (gitHubArtifacts == null || gitHubArtifacts.length == 0) {
            core.info("Pipeline is not linked to any GitHub artifact");
            // If no GitHub artifacts found it means pipeline is not linked to any GitHub artifact
        } else {
            // If pipeline has any matching Github artifact
            core.info("Pipeline is linked to GitHub artifact. Looking for now matching repository");
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
                    core.info("pipeline is linked to same Github repo");
                    artifacts.push(artifactMetadata);
                }
            });
        }

        let releaseStartMetadata: ReleaseInterfaces.ReleaseStartMetadata = <ReleaseInterfaces.ReleaseStartMetadata>{
            definitionId: releaseDefinition.id,
            reason: ReleaseInterfaces.ReleaseReason.ContinuousIntegration,
            artifacts: artifacts
        };

        core.info("Input - \n" + p.getPrintObject(releaseStartMetadata));
        // create release
        let release = await releaseApi.createRelease(releaseStartMetadata, projectName);
        if (release != null) {
            core.info("Output - \n" + p.getPrintObject(release));
            if (release != null && release._links != null && release._links.web != null) {
                core.setOutput('pipeline-url', release._links.web.href);
            }
            core.info("Release is created");
        }
    }
}