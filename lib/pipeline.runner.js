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
const ReleaseInterfaces = __importStar(require("azure-devops-node-api/interfaces/ReleaseInterfaces"));
const BuildInterfaces = __importStar(require("azure-devops-node-api/interfaces/BuildInterfaces"));
const pipeline_helper_1 = require("./util/pipeline.helper");
class PipelineRunner {
    constructor(taskParameters) {
        this.repository = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_REPOSITORY");
        this.branch = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_REF");
        this.commitId = pipeline_helper_1.PipelineHelper.processEnv("GITHUB_SHA");
        this.githubRepo = "GitHub";
        this.yaml = "YAML";
        this.designer = "DESIGNER";
        this.taskParameters = taskParameters;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var taskParams = task_parameters_1.TaskParameters.getTaskParams();
                let authHandler = azdev.getPersonalAccessTokenHandler(taskParams.azureDevopsToken);
                let url = taskParams.azureDevopsUrl;
                core.info("Creating connection with Azure DevOps service : " + url);
                let webApi = new azdev.WebApi(taskParams.azureDevopsUrl, authHandler);
                core.info("Connection created");
                if (pipeline_helper_1.PipelineHelper.equals(taskParams.azurePipelineType, this.yaml)) {
                    core.info("Triggering Yaml pipeline : " + this.taskParameters.azurePipelineName);
                    yield this.RunYamlPipeline(webApi);
                }
                else if (pipeline_helper_1.PipelineHelper.equals(taskParams.azurePipelineType, this.designer)) {
                    core.info("Triggering Designer pipeline : " + this.taskParameters.azurePipelineName);
                    yield this.RunDesignerPipeline(webApi);
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
            try {
                let buildApi = yield webApi.getBuildApi();
                let projectName = this.taskParameters.azureDevopsproject;
                let pipelineName = this.taskParameters.azurePipelineName;
                // Get matching build definitions for the given project and pipeline name
                const buildDefinitions = yield buildApi.getDefinitions(projectName, pipelineName);
                // If more than 1 definition is returned, Throw Error
                if (buildDefinitions == null || buildDefinitions.length != 1) {
                    let errorMessage = `YAML Pipeline named "${pipelineName}" in project ${projectName} not found`;
                    throw Error(errorMessage);
                }
                // Extract Id from build definition
                let buildDefinitionReference = buildDefinitions[0];
                let buildDefinitionId = buildDefinitionReference.id;
                // Get build definition for the matching definition Id
                let buildDefinition = yield buildApi.getDefinition(projectName, buildDefinitionId);
                core.info("Pipeline object : " + pipeline_helper_1.PipelineHelper.getPrintObject(buildDefinition));
                // Fetch repository details from build definition
                let repositoryId = buildDefinition.repository.id.trim();
                let repositoryType = buildDefinition.repository.type.trim();
                let sourceBranch = null;
                let sourceVersion = null;
                // If definition is linked to existing github repo, pass github source branch and source version to build
                if (pipeline_helper_1.PipelineHelper.equals(repositoryId, this.repository) && pipeline_helper_1.PipelineHelper.equals(repositoryType, this.githubRepo)) {
                    core.info("pipeline is linked to same Github repo");
                    sourceBranch = this.branch,
                        sourceVersion = this.commitId;
                }
                else {
                    core.info("pipeline is not linked to same Github repo");
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
                core.info("Input - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(build));
                // Queue build
                let buildQueueResult = yield buildApi.queueBuild(build, build.project.id, true);
                if (buildQueueResult != null) {
                    core.info("Output - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(buildQueueResult));
                    // If build result contains validation errors set result to FAILED
                    if (buildQueueResult.validationResults != null && buildQueueResult.validationResults.length > 0) {
                        let errorAndWarningMessage = pipeline_helper_1.PipelineHelper.getErrorAndWarningMessageFromBuildResult(buildQueueResult.validationResults);
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
            catch (error) {
                core.error(error);
                core.setFailed("Pipeline failed");
            }
        });
    }
    RunDesignerPipeline(webApi) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let releaseApi = yield webApi.getReleaseApi();
                // Get release definitions for the given project name and pipeline name
                const releaseDefinitions = yield releaseApi.getReleaseDefinitions(this.taskParameters.azureDevopsproject, this.taskParameters.azurePipelineName, ReleaseInterfaces.ReleaseDefinitionExpands.Artifacts);
                if (releaseDefinitions == null || releaseDefinitions.length != 1) {
                    // If more than 1 definition found, throw ERROR
                    let errorMessage = `Designer Pipeline named "${this.taskParameters.azurePipelineName}" in project ${this.taskParameters.azureDevopsproject} not found`;
                    throw Error(errorMessage);
                }
                let releaseDefinition = releaseDefinitions[0];
                core.info("Pipeline object : " + pipeline_helper_1.PipelineHelper.getPrintObject(releaseDefinition));
                // Filter Github artifacts from release definition
                let gitHubArtifacts = releaseDefinition.artifacts.filter(pipeline_helper_1.PipelineHelper.isGitHubArtifact);
                let artifacts = new Array();
                if (gitHubArtifacts == null || gitHubArtifacts.length == 0) {
                    core.info("Pipeline is not linked to any GitHub artifact");
                    // If no GitHub artifacts found it means pipeline is not linked to any GitHub artifact
                }
                else {
                    // If pipeline has any matching Github artifact
                    core.info("Pipeline is linked to GitHub artifact. Looking for now matching repository");
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
                            core.info("pipeline is linked to same Github repo");
                            artifacts.push(artifactMetadata);
                        }
                    });
                }
                let releaseStartMetadata = {
                    definitionId: releaseDefinition.id,
                    reason: ReleaseInterfaces.ReleaseReason.ContinuousIntegration,
                    artifacts: artifacts
                };
                core.info("Input - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(releaseStartMetadata));
                // create release
                let release = yield releaseApi.createRelease(releaseStartMetadata, this.taskParameters.azureDevopsproject);
                if (release != null) {
                    core.info("Output - \n" + pipeline_helper_1.PipelineHelper.getPrintObject(release));
                    if (release != null && release._links != null && release._links.web != null) {
                        core.setOutput('pipeline-url', release._links.web.href);
                    }
                    core.info("Release is created");
                }
            }
            catch (error) {
                core.error(error);
                core.setFailed("Pipeline failed");
            }
        });
    }
}
exports.PipelineRunner = PipelineRunner;
