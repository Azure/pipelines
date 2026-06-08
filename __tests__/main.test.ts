import { PipelineRunner } from '../src/pipeline.runner';
import { TaskParameters } from '../src/task.parameters';
import { PipelineHelper } from '../src/util/pipeline.helper';
import { UrlParser } from '../src/util/url.parser'
import * as core from '@actions/core';
import { PipelineNotFoundError } from '../src/pipeline.error';

jest.mock('@actions/core', () => ({
    getInput: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    setFailed: jest.fn(),
    setOutput: jest.fn(),
}));

// eslint-disable-next-line no-var
var mockGetPersonalAccessTokenHandler: jest.Mock<any>;
// eslint-disable-next-line no-var
var mockListPipelines: jest.Mock<any>;
// eslint-disable-next-line no-var
var mockRunPipeline: jest.Mock<any>;
// eslint-disable-next-line no-var
var mockGetPipelinesApi: jest.Mock<any>;
// eslint-disable-next-line no-var
var mockGetReleaseDefinitions: jest.Mock<any>;
// eslint-disable-next-line no-var
var mockCreateRelease: jest.Mock<any>;
// eslint-disable-next-line no-var
var mockGetReleaseApi: jest.Mock<any>;

jest.mock('azure-devops-node-api', () => {
    mockGetPersonalAccessTokenHandler = jest.fn();
    mockListPipelines = jest.fn();
    mockRunPipeline = jest.fn();
    mockGetPipelinesApi = jest.fn().mockImplementation(async () => ({
        listPipelines: (...args: unknown[]) => mockListPipelines(...args),
        runPipeline: (...args: unknown[]) => mockRunPipeline(...args)
    }));
    mockGetReleaseDefinitions = jest.fn();
    mockCreateRelease = jest.fn();
    mockGetReleaseApi = jest.fn().mockImplementation(async () => ({
        getReleaseDefinitions: (...args: unknown[]) => mockGetReleaseDefinitions(...args),
        createRelease: (...args: unknown[]) => mockCreateRelease(...args)
    }));

    return {
        getPersonalAccessTokenHandler: (...args: unknown[]) => mockGetPersonalAccessTokenHandler(...args),
        WebApi: jest.fn().mockImplementation(() => ({
            getPipelinesApi: (...args: unknown[]) => mockGetPipelinesApi(...args),
            getReleaseApi: (...args: unknown[]) => mockGetReleaseApi(...args),
        }))
    };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockPipelineList: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockRunPipelineResult: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockReleaseDefinitions: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockReleaseResponse: any;

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
        expect(PipelineHelper.isGitHubArtifact({ type: undefined })).toBeFalsy();
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
            { message: 'ErrorMessage' } as unknown as BuildInterfaces.BuildRequestValidationResult[]
        )).toMatchObject({
            errorMessage: 'ErrorMessage',
            warningMessage: '',
        });
    });

    test('getErrorAndWarningMessageFromBuildResult() - message from server error which do not come in form of array', () => {
        expect(PipelineHelper.getErrorAndWarningMessageFromBuildResult(
            { serverError: { message: 'ServerErrorMessage'  } } as unknown as BuildInterfaces.BuildRequestValidationResult[]
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
        expect(() => UrlParser.GetProjectName(null as unknown as string)).toThrow('Project url is null or empty. Specify the valid project url and try again');
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
        expect(() => UrlParser.GetCollectionUrlBase(null as unknown as string)).toThrow('Project url is null or empty. Specify the valid project url and try again');
        expect(() => UrlParser.GetCollectionUrlBase('')).toThrow('Project url is null or empty. Specify the valid project url and try again');
    });

    test('GetCollectionUrlBase() - throw error if invalid url', () => {
        expect(() =>  UrlParser.GetCollectionUrlBase('/')).toThrow(`Failed to parse project url: "${'/'}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`);
    });
});

import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';

describe('Testing all functions of class PipelineRunner', () => {
    const setupCoreInputs = () => {
        process.env['GITHUB_REPOSITORY'] = 'repo_name';
        process.env['GITHUB_REF'] = 'releases';
        process.env['GITHUB_SHA'] = 'sampleSha';

        (core.getInput as jest.Mock).mockImplementation((input: string) => {
            if (input === 'azure-devops-project-url') return 'https://dev.azure.com/organization/my-project';
            if (input === 'azure-pipeline-name') return 'my-pipeline';
            if (input === 'azure-devops-token') return 'my-token';
            if (input === 'azure-pipeline-variables') return '';
            if (input === 'azure-pipeline-parameters') return '';
            return '';
        });
    };

    beforeEach(() => {
        mockPipelineList = [{ id: 5, name: 'my-pipeline' }];
        mockRunPipelineResult = {
            id: 101,
            _links: { web: { href: 'linkToRun' } },
            result: 'succeeded'
        };

        mockListPipelines.mockReset();
        mockListPipelines.mockImplementation(() => mockPipelineList);

        mockRunPipeline.mockReset();
        mockRunPipeline.mockImplementation(() => mockRunPipelineResult);

        mockGetPipelinesApi.mockReset();
        mockGetPipelinesApi.mockImplementation(async () => ({
            listPipelines: mockListPipelines,
            runPipeline: mockRunPipeline
        }));

        mockGetPersonalAccessTokenHandler.mockReset();

        mockReleaseDefinitions = undefined;
        mockReleaseResponse = undefined;

        mockGetReleaseDefinitions.mockReset();
        mockGetReleaseDefinitions.mockImplementation(() => mockReleaseDefinitions);

        mockCreateRelease.mockReset();
        mockCreateRelease.mockImplementation(() => mockReleaseResponse);

        mockGetReleaseApi.mockReset();
        mockGetReleaseApi.mockImplementation(async () => ({
            getReleaseDefinitions: mockGetReleaseDefinitions,
            createRelease: mockCreateRelease
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('start() triggers a pipeline run with repo context', async () => {
        setupCoreInputs();

        await expect(new PipelineRunner(TaskParameters.getTaskParams()).start()).resolves.toBeUndefined();

        expect(mockGetPersonalAccessTokenHandler).toHaveBeenCalledWith('my-token');
        expect(mockGetPipelinesApi).toHaveBeenCalled();
        expect(mockListPipelines).toHaveBeenCalledWith('my-project');
        expect(mockRunPipeline).toHaveBeenCalledWith(
            expect.objectContaining({
                resources: {
                    repositories: {
                        self: {
                            refName: 'releases',
                            version: 'sampleSha'
                        }
                    }
                }
            }),
            'my-project',
            5
        );
    });

    test('start() sets core.setFailed on pipeline run error', async () => {
        setupCoreInputs();
        const runError = new Error('pipeline run failed');
        mockRunPipeline.mockImplementation(() => { throw runError; });

        await expect(new PipelineRunner(TaskParameters.getTaskParams()).start()).resolves.toBeUndefined();

        expect(mockGetPipelinesApi).toHaveBeenCalled();
        expect(mockRunPipeline).toHaveBeenCalled();
        expect(core.setFailed).toHaveBeenCalledWith(runError.message);
    });

    test('start() sets failed when pipeline not found by name', async () => {
        setupCoreInputs();
        mockListPipelines.mockImplementation(() => [{ id: 1, name: 'other-pipeline' }]);
        mockReleaseDefinitions = [];

        await expect(new PipelineRunner(TaskParameters.getTaskParams()).start()).resolves.toBeUndefined();

        expect(mockGetPipelinesApi).toHaveBeenCalled();
        expect(core.setFailed).toHaveBeenCalled();
    });

    test('start() triggers release pipeline when YAML pipeline not found', async () => {
        setupCoreInputs();
        mockListPipelines.mockImplementation(() => []);
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
        };

        await expect(new PipelineRunner(TaskParameters.getTaskParams()).start()).resolves.toBeUndefined();

        expect(mockGetPipelinesApi).toHaveBeenCalled();
        expect(mockListPipelines).toHaveBeenCalledWith('my-project');
        expect(mockGetReleaseApi).toHaveBeenCalled();
        expect(mockGetReleaseDefinitions).toHaveBeenCalledWith('my-project', 'my-pipeline', 4);
        expect(mockCreateRelease).toHaveBeenCalledWith(
            expect.objectContaining({
                definitionId: 5,
                artifacts: [],
                reason: 2
            }),
            'my-project'
        );
    });
});
