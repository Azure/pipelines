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
exports.PipelineRunner = void 0;
const core = __importStar(require("@actions/core"));
const azdev = __importStar(require("azure-devops-node-api"));
const task_parameters_1 = require("./task.parameters");
const pipeline_error_1 = require("./pipeline.error");
const ReleaseInterfaces = __importStar(require("azure-devops-node-api/interfaces/ReleaseInterfaces"));
const pipeline_helper_1 = require("./util/pipeline.helper");
const logger_1 = require("./util/logger");
const url_parser_1 = require("./util/url.parser");
class PipelineRunner {
    taskParameters;
    repository = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_REPOSITORY");
    branch = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_REF");
    commitId = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_SHA");
    githubRepo = "GitHub";
    constructor(taskParameters) {
        this.taskParameters = taskParameters;
    }
    async start() {
        try {
            const taskParams = task_parameters_1.TaskParameters.getTaskParams();
            const authHandler = azdev.getPersonalAccessTokenHandler(taskParams.azureDevopsToken);
            const collectionUrl = url_parser_1.UrlParser.GetCollectionUrlBase(this.taskParameters.azureDevopsProjectUrl);
            core.info(`Creating connection with Azure DevOps service : "${collectionUrl}"`);
            const webApi = new azdev.WebApi(collectionUrl, authHandler);
            core.info("Connection created");
            const pipelineName = this.taskParameters.azurePipelineName;
            try {
                core.debug(`Triggering Yaml pipeline : "${pipelineName}"`);
                await this.RunYamlPipeline(webApi);
            }
            catch (error) {
                if (error instanceof pipeline_error_1.PipelineNotFoundError) {
                    core.debug(`Triggering Designer pipeline : "${pipelineName}"`);
                    await this.RunDesignerPipeline(webApi);
                }
                else {
                    throw error;
                }
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            core.setFailed(err.message);
        }
    }
    async RunYamlPipeline(webApi) {
        const projectName = url_parser_1.UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        const pipelineName = this.taskParameters.azurePipelineName;
        const pipelinesApi = await webApi.getPipelinesApi();
        // Get all pipelines for the project and find by name
        const pipelines = await pipelinesApi.listPipelines(projectName);
        const pipeline = pipelines.find((x) => x.name === pipelineName);
        if (!pipeline) {
            throw new pipeline_error_1.PipelineNotFoundError(`Pipeline named "${pipelineName}" not found in project "${projectName}"`);
        }
        pipeline_helper_1.PipelineHelper.EnsureValidPipeline(projectName, pipelineName, [pipeline]);
        logger_1.Logger.LogPipelineObject(pipeline);
        // Prepare run parameters
        const runParameters = {
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
                    runParameters.variables[key] = { value: varsJson[key] };
                });
            }
            catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                core.warning("Failed to parse pipeline variables: " + err.message);
            }
        }
        // Set template parameters if provided
        if (this.taskParameters.azurePipelineParameters) {
            try {
                runParameters.templateParameters = JSON.parse(this.taskParameters.azurePipelineParameters);
            }
            catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                core.warning("Failed to parse pipeline template parameters: " + err.message);
            }
        }
        logger_1.Logger.LogPipelineTriggerInput(runParameters);
        // Run pipeline
        const runResult = await pipelinesApi.runPipeline(runParameters, projectName, pipeline.id);
        logger_1.Logger.LogPipelineTriggered(pipelineName, projectName);
        logger_1.Logger.LogPipelineTriggerOutput(runResult);
        if (runResult._links && runResult._links.web) {
            logger_1.Logger.LogOutputUrl(runResult._links.web.href);
        }
    }
    async RunDesignerPipeline(webApi) {
        const projectName = url_parser_1.UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
        const pipelineName = this.taskParameters.azurePipelineName;
        const releaseApi = await webApi.getReleaseApi();
        // Get release definitions for the given project name and pipeline name
        const releaseDefinitions = await releaseApi.getReleaseDefinitions(projectName, pipelineName, ReleaseInterfaces.ReleaseDefinitionExpands.Artifacts);
        pipeline_helper_1.PipelineHelper.EnsureValidPipeline(projectName, pipelineName, releaseDefinitions);
        const releaseDefinition = releaseDefinitions[0];
        logger_1.Logger.LogPipelineObject(releaseDefinition);
        // Create ConfigurationVariableValue objects from the input variables
        let variables = undefined;
        if (this.taskParameters.azurePipelineVariables) {
            const parsed = JSON.parse(this.taskParameters.azurePipelineVariables);
            variables = {};
            Object.keys(parsed).forEach((key) => {
                variables[key] = { value: parsed[key] };
            });
        }
        // Filter Github artifacts from release definition
        const gitHubArtifacts = releaseDefinition.artifacts.filter(pipeline_helper_1.PipelineHelper.isGitHubArtifact);
        const artifacts = [];
        if (gitHubArtifacts == null || gitHubArtifacts.length == 0) {
            core.debug("Pipeline is not linked to any GitHub artifact");
            // If no GitHub artifacts found it means pipeline is not linked to any GitHub artifact
        }
        else {
            // If pipeline has any matching Github artifact
            core.debug("Pipeline is linked to GitHub artifact. Looking for now matching repository");
            gitHubArtifacts.forEach(gitHubArtifact => {
                if (gitHubArtifact.definitionReference != null && pipeline_helper_1.PipelineHelper.equals(gitHubArtifact.definitionReference.definition.name, this.repository)) {
                    // Add version information for matching GitHub artifact
                    const artifactMetadata = {
                        alias: gitHubArtifact.alias,
                        instanceReference: {
                            id: this.commitId,
                            sourceBranch: this.branch,
                            sourceRepositoryType: this.githubRepo,
                            sourceRepositoryId: this.repository,
                            sourceVersion: this.commitId
                        }
                    };
                    core.debug("pipeline is linked to same Github repo");
                    artifacts.push(artifactMetadata);
                }
            });
        }
        const releaseStartMetadata = {
            definitionId: releaseDefinition.id,
            reason: ReleaseInterfaces.ReleaseReason.ContinuousIntegration,
            artifacts: artifacts,
            variables: variables
        };
        logger_1.Logger.LogPipelineTriggerInput(releaseStartMetadata);
        // create release
        const release = await releaseApi.createRelease(releaseStartMetadata, projectName);
        if (release != null) {
            logger_1.Logger.LogPipelineTriggered(pipelineName, projectName);
            logger_1.Logger.LogPipelineTriggerOutput(release);
            if (release._links != null) {
                logger_1.Logger.LogOutputUrl(release._links.web.href);
            }
        }
    }
}
exports.PipelineRunner = PipelineRunner;
//# sourceMappingURL=pipeline.runner.js.map