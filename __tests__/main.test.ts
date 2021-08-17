import { main } from '../src/main'
import { PipelineRunner } from '../src/pipeline.runner';
import { TaskParameters } from '../src/task.parameters';
import { PipelineHelper } from '../src/util/pipeline.helper';
import { UrlParser } from '../src/util/url.parser'
import * as core from '@actions/core';
import { PipelineNotFoundError } from '../src/pipeline.error';

var mockQueueBuildResult;
const mockQueueBuild = jest.fn().mockImplementation(() => {
    return mockQueueBuildResult;
});

var mockBuildDefinition;
const mockGetDefinition = jest.fn().mockImplementation(() => {
    return mockBuildDefinition;
});

var mockBuildDefinitions;
const mockGetDefinitions = jest.fn().mockImplementation(() => {
    return mockBuildDefinitions;
});

const mockGetBuildApi = jest.fn().mockImplementation(() => {
    return {
        getDefinitions: (projectName, pipelineName) => mockGetDefinitions(projectName, pipelineName),
        getDefinition: (projectId, buildId) => mockGetDefinition(projectId, buildId),
        queueBuild: (build, projectId, ignoreWarnings) => mockQueueBuild(build, projectId, ignoreWarnings)
    }
});

const mockGetPersonalAccessTokenHandler = jest.fn().mockImplementation();

var mockReleaseDefinitions;
const mockGetReleaseDefinitions = jest.fn().mockImplementation(() => {
    return mockReleaseDefinitions;
});

var mockReleaseResponse;
const mockCreateRelease = jest.fn().mockImplementation(() => {
    return mockReleaseResponse;
});

const mockGetReleaseApi = jest.fn().mockImplementation(() => {
    return {
        getReleaseDefinitions: (project, searchText, artifactType) => mockGetReleaseDefinitions(project, searchText, artifactType),
        createRelease: (releaseStartMetadata, project) => mockCreateRelease(releaseStartMetadata, project)
    }
});

jest.mock('azure-devops-node-api', () => {
    return {
        getPersonalAccessTokenHandler: (token) => mockGetPersonalAccessTokenHandler(token),
        WebApi: jest.fn().mockImplementation(() => {
            return {
                getBuildApi: async (url, handler) => await mockGetBuildApi(url, handler),
                getReleaseApi: async () => await mockGetReleaseApi(),
            }
        }) 
    }
});

describe('Testing all functions of class PipelineHelper', () => {
    test('EnsureValidPipeline() - throw error if definition not found', () => {
        expect(() => PipelineHelper.EnsureValidPipeline('someProject', 'somePipeline', [])).toThrow(new PipelineNotFoundError(`Pipeline named "${'somePipeline'}" not found in project "${'someProject'}"`));
    });

    test('EnsureValidPipeline() - throw error if more than one definition found', () => {
        expect(() => PipelineHelper.EnsureValidPipeline('someProject', 'somePipeline', [{}, {}])).toThrow(`More than 1 Pipeline named "${'somePipeline'}" found in project "${'someProject'}"`);
    });

    test('equals() - return if strings are equal', () => {
        expect(PipelineHelper.equals(null, null)).toBeTruthy();
        expect(PipelineHelper.equals('a', null)).toBeFalsy();
        expect(PipelineHelper.equals(null, 'a')).toBeFalsy();
        expect(PipelineHelper.equals('a', 'a ')).toBeTruthy();
        expect(PipelineHelper.equals('a', 'A')).toBeTruthy();
        expect(PipelineHelper.equals('a', 'b')).toBeFalsy();
    });

    test('processEnv() - return specified env variable', () => {
        process.env['envVar'] = 'value';
        expect(PipelineHelper.processEnv('envVar')).toBe('value');
    });

    test('processEnv() - throw error if specified envVar is not available', () => {
        process.env['envVar'] = '';
        expect(() => PipelineHelper.processEnv('envVar')).toThrow(`env.${'envVar'} is not set`);
    });

    test('isGitHubArtifact() - returns if artifact if of type github', () => {
        expect(PipelineHelper.isGitHubArtifact({})).toBeFalsy();
        expect(PipelineHelper.isGitHubArtifact({ type: 'githuB' })).toBeTruthy();
        expect(PipelineHelper.isGitHubArtifact({ type: null })).toBeFalsy();
    });

    test('getErrorAndWarningMessageFromBuildResult() - concatenate and return errors', () => {
        expect(PipelineHelper.getErrorAndWarningMessageFromBuildResult([
            { message: 'FirstMessage', result: 2},
            { message: 'FirstIgnoredMessage', result: 0},
            { message: 'SecondIgnoredMessage', result: 1},
            { message: 'SecondMessage', result: 2},
        ])).toMatchObject({
            errorMessage: 'FirstMessage,SecondMessage',
            warningMessage: '',
        });
    });

    test('getErrorAndWarningMessageFromBuildResult() - concatenate and return warnings if no errors', () => {
        expect(PipelineHelper.getErrorAndWarningMessageFromBuildResult([
            { message: 'FirstIgnoredMessage', result: 0},
            { message: 'SecondIgnoredMessage', result: 1},
        ])).toMatchObject({
            errorMessage: '',
            warningMessage: 'FirstIgnoredMessage,SecondIgnoredMessage',
        });
    });

    test('getErrorAndWarningMessageFromBuildResult() - message validation error which do not come in form of array', () => {
        expect(PipelineHelper.getErrorAndWarningMessageFromBuildResult(
            { message: 'ErrorMessage' } as any
        )).toMatchObject({
            errorMessage: 'ErrorMessage',
            warningMessage: '',
        });
    });

    test('getErrorAndWarningMessageFromBuildResult() - message from server error which do not come in form of array', () => {
        expect(PipelineHelper.getErrorAndWarningMessageFromBuildResult(
            { serverError: { message: 'ServerErrorMessage'  } } as any
        )).toMatchObject({
            errorMessage: 'ServerErrorMessage',
            warningMessage: '',
        });
    });
});

describe('Testing all functions of class UrlParser', () => {
    test('GetProjectName() - return project name from project URL', () => {
        expect(UrlParser.GetProjectName('https://dev.azure.com/organization/project-name ')).toBe('project-name');
    });

    test('GetProjectName() - throw error if null or empty', () => {
        expect(() => UrlParser.GetProjectName(null)).toThrow('Project url is null or empty. Specify the valid project url and try again');
        expect(() => UrlParser.GetProjectName('')).toThrow('Project url is null or empty. Specify the valid project url and try again');
    });

    test('GetProjectName() - throw error if invalid url', () => {
        expect(() => UrlParser.GetProjectName('https://dev.azure.com/organization/project-name/')).toThrow(`Failed to parse project url: "${'https://dev.azure.com/organization/project-name/'}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`);
        expect(() => UrlParser.GetProjectName('https://dev.azure.com/organization//')).toThrow(`Failed to parse project url: "${'https://dev.azure.com/organization//'}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`);
    });

    test('GetCollectionUrlBase() - return collections base URL', () => {
        expect(UrlParser.GetCollectionUrlBase('https://dev.azure.com/organization/project-name ')).toBe('https://dev.azure.com/organization');
    });

    test('GetCollectionUrlBase() - throw error if null or empty', () => {
        expect(() => UrlParser.GetCollectionUrlBase(null)).toThrow('Project url is null or empty. Specify the valid project url and try again');
        expect(() => UrlParser.GetCollectionUrlBase('')).toThrow('Project url is null or empty. Specify the valid project url and try again');
    });

    test('GetCollectionUrlBase() - throw error if invalid url', () => {
        expect(() =>  UrlParser.GetCollectionUrlBase('/')).toThrow(`Failed to parse project url: "${'/'}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`);
    });
});

describe('Testing all functions of class PipelineRunner', () => {
    test('start() - regular run using env variables and inputs to trigger a run', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input, options) => {
            process.env['GITHUB_REPOSITORY'] = 'repo_name';
            process.env['GITHUB_REF'] = 'releases';
            process.env['GITHUB_SHA'] = 'sampleSha';

            if (input == 'azure-devops-project-url') return 'https://dev.azure.com/organization/my-project';
            if (input == 'azure-pipeline-name') return 'my-pipeline';
            if (input == 'azure-devops-token') return 'my-token';
        });
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        mockBuildDefinitions = [{
            id: 5
        }];
        mockBuildDefinition = {
            id: 5,
            repository: {
                id: 'repo',
                type: 'Devops'
            },
            project: {
                id: 'my-project'
            },
        }
        mockQueueBuildResult = {
            _links: {
                web: {
                    href: 'linkToRun'
                }
            }
        };

        expect(await (new PipelineRunner(TaskParameters.getTaskParams())).start()).toBeUndefined();
        expect(mockGetPersonalAccessTokenHandler).toBeCalledWith('my-token');
        expect(mockGetBuildApi).toBeCalled();
        expect(mockGetDefinitions).toBeCalledWith('my-project', 'my-pipeline');
        expect(mockGetDefinition).toBeCalledWith('my-project', 5);
        const expectedBuild = {
            definition: {
                id: 5,
            },
            project: {
                id: 'my-project',
            },
            reason: 1967,
            sourceBranch: null,
            sourceVersion: null,
        }
        expect(mockQueueBuild).toBeCalledWith(expectedBuild, 'my-project', true);
    });

    test('start() - set core failed in RunYamlPipeline if result has errors', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input, options) => {
            process.env['GITHUB_REPOSITORY'] = 'repo_name';
            process.env['GITHUB_REF'] = 'releases';
            process.env['GITHUB_SHA'] = 'sampleSha';

            if (input == 'azure-devops-project-url') return 'https://dev.azure.com/organization/my-project';
            if (input == 'azure-pipeline-name') return 'my-pipeline';
            if (input == 'azure-devops-token') return 'my-token';
        });
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        jest.spyOn(core, 'setFailed').mockImplementation();
        mockBuildDefinitions = [{
            id: 5
        }];
        mockBuildDefinition = {
            id: 5,
            repository: {
                id: 'repo_name',
                type: 'Github'
            },
            project: {
                id: 'my-project'
            },
        }
        mockQueueBuildResult = {
            validationResults: [{}]
        };
        expect(await (new PipelineRunner(TaskParameters.getTaskParams())).start()).toBeUndefined();
        expect(mockGetPersonalAccessTokenHandler).toBeCalledWith('my-token');
        expect(mockGetBuildApi).toBeCalled();
        expect(mockGetDefinitions).toBeCalledWith('my-project', 'my-pipeline');
        expect(mockGetDefinition).toBeCalledWith('my-project', 5);
        const expectedBuild = {
            definition: {
                id: 5,
            },
            project: {
                id: 'my-project',
            },
            reason: 1967,
            sourceBranch: 'releases',
            sourceVersion: 'sampleSha',
        }
        expect(mockQueueBuild).toBeCalledWith(expectedBuild, 'my-project', true);
        expect(core.setFailed).toBeCalled();
    });

    test('start() - set core failed in case of invalid response', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input, options) => {
            process.env['GITHUB_REPOSITORY'] = 'repo_name';
            process.env['GITHUB_REF'] = 'releases';
            process.env['GITHUB_SHA'] = 'sampleSha';

            if (input == 'azure-devops-project-url') return 'https://dev.azure.com/organization/my-project';
            if (input == 'azure-pipeline-name') return 'my-pipeline';
            if (input == 'azure-devops-token') return 'my-token';
        });
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        jest.spyOn(core, 'setFailed').mockImplementation();
        mockBuildDefinitions = [{}, {}];

        expect(await (new PipelineRunner(TaskParameters.getTaskParams())).start()).toBeUndefined();
        expect(mockGetPersonalAccessTokenHandler).toBeCalledWith('my-token');
        expect(mockGetBuildApi).toBeCalled();
        expect(mockGetDefinitions).toBeCalledWith('my-project', 'my-pipeline');
        expect(core.setFailed).toBeCalled();
    });

    test('start() - trigger designer pipeline in case of PipelineNotFoundError', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((input, options) => {
            process.env['GITHUB_REPOSITORY'] = 'repo_name';
            process.env['GITHUB_REF'] = 'releases';
            process.env['GITHUB_SHA'] = 'sampleSha';

            if (input == 'azure-devops-project-url') return 'https://dev.azure.com/organization/my-project';
            if (input == 'azure-pipeline-name') return 'my-pipeline';
            if (input == 'azure-devops-token') return 'my-token';
        });
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        jest.spyOn(core, 'setFailed').mockImplementation();
        mockBuildDefinitions = null;
        mockReleaseDefinitions = [{
            id: 5,
            artifacts: []
        }];
        mockReleaseResponse = {
            _links: {
                web: {
                    href: 'linkToRun'
                }
            }
        }

        expect(await (new PipelineRunner(TaskParameters.getTaskParams())).start()).toBeUndefined();
        expect(mockGetPersonalAccessTokenHandler).toBeCalledWith('my-token');
        expect(mockGetBuildApi).toBeCalled();
        expect(mockGetDefinitions).toBeCalledWith('my-project', 'my-pipeline');
        expect(mockGetReleaseApi).toBeCalled();
        expect(mockGetReleaseDefinitions).toBeCalledWith('my-project', 'my-pipeline', 4);
        const expectedRelease = {
            artifacts: [], 
            definitionId: 5, 
            reason: 2
        };
        expect(mockCreateRelease).toBeCalledWith(expectedRelease, "my-project");
    });
}); 