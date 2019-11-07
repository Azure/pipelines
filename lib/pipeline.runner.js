"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const azdev = __importStar(require("azure-devops-node-api"));
const task_parameters_1 = require("./task.parameters");
const pipeline_error_1 = require("./pipeline.error");
const ReleaseInterfaces = __importStar(require("azure-devops-node-api/interfaces/ReleaseInterfaces"));
const BuildInterfaces = __importStar(require("azure-devops-node-api/interfaces/BuildInterfaces"));
const pipeline_helper_1 = require("./util/pipeline.helper");
const url_parser_1 = require("./util/url.parser");
class PipelineRunner {
    constructor(taskParameters) {
        this.repository = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_REPOSITORY");
        this.branch = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_REF");
        this.commitId = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_SHA");
        this.githubRepo = "GitHub";
        this.taskParameters = taskParameters;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var taskParams = task_parameters_1.TaskParameters.getTaskParams();
                let authHandler = azdev.getPersonalAccessTokenHandler(taskParams.azureDevopsToken);
                let collectionUrl = url_parser_1.UrlParser.GetCollectionUrlBase(this.taskParameters.azureDevopsProjectUrl);
                core.debug("Creating connection with Azure DevOps service : " + collectionUrl);
                let webApi = new azdev.WebApi(collectionUrl, authHandler);
                core.debug("Connection created");
                try {
                    core.info("Triggering Yaml pipeline : " + this.taskParameters.azurePipelineName);
                    yield this.RunYamlPipeline(webApi);
                }
                catch (error) {
                    if (error instanceof pipeline_error_1.PipelineNotFoundError) {
                        core.info("Triggering Designer pipeline : " + this.taskParameters.azurePipelineName);
                        yield this.RunDesignerPipeline(webApi);
                    }
                    else {
                        throw error;
                    }
                }
            }
            catch (error) {
                let errorMessage = `${error.message}`;
                core.setFailed(errorMessage);
            }
        });
    }
    RunYamlPipeline(webApi) {
        return __awaiter(this, void 0, void 0, function* () {
            let buildApi = yield webApi.getBuildApi();
            let projectName = url_parser_1.UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
            let pipelineName = this.taskParameters.azurePipelineName;
            // Get matching build definitions for the given project and pipeline name
            const buildDefinitions = yield buildApi.getDefinitions(projectName, pipelineName);
            // If definition not found then Throw Error
            if (buildDefinitions == null || buildDefinitions.length == 0) {
                let errorMessage = `YAML Pipeline named "${pipelineName}" in project ${projectName} not found`;
                throw new pipeline_error_1.PipelineNotFoundError(errorMessage);
            }
            // If more than 1 definition is returned, Throw Error
            if (buildDefinitions.length > 1) {
                let errorMessage = `More than 1 YAML Pipeline named "${pipelineName}" found in project ${projectName}`;
                throw Error(errorMessage);
            }
            // Extract Id from build definition
            let buildDefinitionReference = buildDefinitions[0];
            let buildDefinitionId = buildDefinitionReference.id;
            // Get build definition for the matching definition Id
            let buildDefinition = yield buildApi.getDefinition(projectName, buildDefinitionId);
            core.debug("Pipeline object : " + pipeline_helper_1.PipelineHelper.getPrintObject(buildDefinition));
            // Fetch repository details from build definition
            let repositoryId = buildDefinition.repository.id.trim();
            let repositoryType = buildDefinition.repository.type.trim();
            let sourceBranch = null;
            let sourceVersion = null;
            // If definition is linked to existing github repo, pass github source branch and source version to build
            if (pipeline_helper_1.PipelineHelper.equals(repositoryId, this.repository) && pipeline_helper_1.PipelineHelper.equals(repositoryType, this.githubRepo)) {
                core.debug("pipeline is linked to same Github repo");
                sourceBranch = this.branch,
                    sourceVersion = this.commitId;
            }
            else {
                core.debug("pipeline is not linked to same Github repo");
            }
            let build = {
                definition: {
                    id: buildDefinition.id
                },
                project: {
                    id: buildDefinition.project.id
                },
                sourceBranch: sourceBranch,
                sourceVersion: sourceVersion,
                reason: BuildInterfaces.BuildReason.Triggered
            };
            core.debug("Input - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(build));
            // Queue build
            let buildQueueResult = yield buildApi.queueBuild(build, build.project.id, true);
            if (buildQueueResult != null) {
                core.debug("Output - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(buildQueueResult));
                // If build result contains validation errors set result to FAILED
                if (buildQueueResult.validationResults != null && buildQueueResult.validationResults.length > 0) {
                    let errorAndWarningMessage = pipeline_helper_1.PipelineHelper.getErrorAndWarningMessageFromBuildResult(buildQueueResult.validationResults);
                    core.setFailed("Errors: " + errorAndWarningMessage.errorMessage + " Warnings: " + errorAndWarningMessage.warningMessage);
                }
                else {
                    core.info(`\Pipeline "${pipelineName}" is triggered`);
                    if (buildQueueResult._links != null && buildQueueResult._links.web != null) {
                        core.setOutput('pipeline-url', buildQueueResult._links.web.href);
                    }
                }
            }
        });
    }
    RunDesignerPipeline(webApi) {
        return __awaiter(this, void 0, void 0, function* () {
            let releaseApi = yield webApi.getReleaseApi();
            let projectName = url_parser_1.UrlParser.GetProjectName(this.taskParameters.azureDevopsProjectUrl);
            let pipelineName = this.taskParameters.azurePipelineName;
            // Get release definitions for the given project name and pipeline name
            const releaseDefinitions = yield releaseApi.getReleaseDefinitions(projectName, pipelineName, ReleaseInterfaces.ReleaseDefinitionExpands.Artifacts);
            // If definition not found then Throw Error
            if (releaseDefinitions == null || releaseDefinitions.length == 0) {
                let errorMessage = `Designer Pipeline named "${pipelineName}" in project ${projectName} not found`;
                throw new pipeline_error_1.PipelineNotFoundError(errorMessage);
            }
            if (releaseDefinitions.length > 1) {
                // If more than 1 definition found, throw ERROR
                let errorMessage = `More than 1 Designer Pipeline named "${pipelineName}" found in project ${projectName}`;
                throw Error(errorMessage);
            }
            let releaseDefinition = releaseDefinitions[0];
            core.debug("Pipeline object : " + pipeline_helper_1.PipelineHelper.getPrintObject(releaseDefinition));
            // Filter Github artifacts from release definition
            let gitHubArtifacts = releaseDefinition.artifacts.filter(pipeline_helper_1.PipelineHelper.isGitHubArtifact);
            let artifacts = new Array();
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
                        let artifactMetadata = {
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
            let releaseStartMetadata = {
                definitionId: releaseDefinition.id,
                reason: ReleaseInterfaces.ReleaseReason.ContinuousIntegration,
                artifacts: artifacts
            };
            core.debug("Input - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(releaseStartMetadata));
            // create release
            let release = yield releaseApi.createRelease(releaseStartMetadata, projectName);
            if (release != null) {
                core.debug("Output - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(release));
                if (release != null && release._links != null && release._links.web != null) {
                    core.setOutput('pipeline-url', release._links.web.href);
                }
                core.debug("Release is created");
            }
        });
    }
}
exports.PipelineRunner = PipelineRunner;
