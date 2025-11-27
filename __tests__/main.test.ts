import { main } from '../src/main'
import { PipelineRunner } from '../src/pipeline.runner';
import { TaskParameters } from '../src/task.parameters';
import { PipelineHelper } from '../src/util/pipeline.helper';
import { UrlParser } from '../src/util/url.parser'
import * as core from '@actions/core';
import { PipelineNotFoundError } from '../src/pipeline.error';

var mockGetPersonalAccessTokenHandler: jest.Mock;
var mockListPipelines: jest.Mock;
var mockRunPipeline: jest.Mock;
var mockGetPipelinesApi: jest.Mock;
var mockGetReleaseDefinitions: jest.Mock;
var mockCreateRelease: jest.Mock;
var mockGetReleaseApi: jest.Mock;

jest.mock('azure-devops-node-api', () => {
    mockGetPersonalAccessTokenHandler = jest.fn();
    mockListPipelines = jest.fn();
    mockRunPipeline = jest.fn();
    mockGetPipelinesApi = jest.fn().mockImplementation(async () => ({
        listPipelines: (...args: any[]) => mockListPipelines(...args),
        runPipeline: (...args: any[]) => mockRunPipeline(...args)
    }));
    mockGetReleaseDefinitions = jest.fn();
    mockCreateRelease = jest.fn();
    mockGetReleaseApi = jest.fn().mockImplementation(async () => ({
        getReleaseDefinitions: (...args: any[]) => mockGetReleaseDefinitions(...args),
        createRelease: (...args: any[]) => mockCreateRelease(...args)
    }));

    return {
        getPersonalAccessTokenHandler: (...args: any[]) => mockGetPersonalAccessTokenHandler(...args),
        WebApi: jest.fn().mockImplementation(() => ({
            getPipelinesApi: (...args: any[]) => mockGetPipelinesApi(...args),
            getReleaseApi: (...args: any[]) => mockGetReleaseApi(...args),
        }))
    };
});

let mockPipelineList: any;
let mockRunPipelineResult: any;
let mockReleaseDefinitions: any;
let mockReleaseResponse: any;

describe('Testing all functions of class PipelineHelper', () => {
    test('EnsureValidPipeline() - throw error if definition not found', () => {
        expect(() => PipelineHelper.EnsureValidPipeline('someProject', 'somePipeline', [])).toThrow(new PipelineNotFoundError(`Pipeline named "${'somePipeline'}" not found in project "${'someProject'}"`));
    });

    test('EnsureValidPipeline() - throw error if more than one definition found', () => {
        expect(() => PipelineHelper.EnsureValidPipeline('someProject', 'somePipeline', [{}, {}])).toThrow(`More than 1 Pipeline named "${'somePipeline'}" found in project "${'someProject'}"`);
    });

    test('equals() - return if strings are equal', () => {
    expect(PipelineHelper.equals(null as any, null as any)).toBeTruthy();
    expect(PipelineHelper.equals('a', null as any)).toBeFalsy();
    expect(PipelineHelper.equals(null as any, 'a')).toBeFalsy();
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
    expect(PipelineHelper.isGitHubArtifact({ type: null as any })).toBeFalsy();
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
    expect(() => UrlParser.GetProjectName(null as any)).toThrow('Project url is null or empty. Specify the valid project url and try again');
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
    expect(() => UrlParser.GetCollectionUrlBase(null as any)).toThrow('Project url is null or empty. Specify the valid project url and try again');
        expect(() => UrlParser.GetCollectionUrlBase('')).toThrow('Project url is null or empty. Specify the valid project url and try again');
    });

    test('GetCollectionUrlBase() - throw error if invalid url', () => {
        expect(() =>  UrlParser.GetCollectionUrlBase('/')).toThrow(`Failed to parse project url: "${'/'}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`);
    });
});

describe('Testing all functions of class PipelineRunner', () => {
    const setupCoreInputs = () => {
        return jest.spyOn(core, 'getInput').mockImplementation(((input: string) => {
            process.env['GITHUB_REPOSITORY'] = 'repo_name';
            process.env['GITHUB_REF'] = 'releases';
            process.env['GITHUB_SHA'] = 'sampleSha';

            if (input === 'azure-devops-project-url') return 'https://dev.azure.com/organization/my-project';
            if (input === 'azure-pipeline-name') return 'my-pipeline';
            if (input === 'azure-devops-token') return 'my-token';
            if (input === 'azure-pipeline-variables') return undefined as any;
            return '' as any;
        }) as any);
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
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();

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
                },
                variables: undefined
            }),
            'my-project',
            5
        );
    });

    test('start() sets failed when runPipeline throws', async () => {
        setupCoreInputs();
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        const setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation();
        const runError = new Error('pipeline run failed');
        mockRunPipeline.mockImplementation(() => { throw runError; });

        await expect(new PipelineRunner(TaskParameters.getTaskParams()).start()).resolves.toBeUndefined();

        expect(mockGetPipelinesApi).toHaveBeenCalled();
        expect(mockRunPipeline).toHaveBeenCalled();
        expect(setFailedSpy).toHaveBeenCalledWith(runError.message);
    });

    test('start() sets failed when pipeline metadata is invalid', async () => {
        setupCoreInputs();
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        const setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation();
        const validationError = new Error('invalid metadata');
        const ensureSpy = jest.spyOn(PipelineHelper, 'EnsureValidPipeline').mockImplementation(() => { throw validationError; });

        await expect(new PipelineRunner(TaskParameters.getTaskParams()).start()).resolves.toBeUndefined();

        expect(mockGetPipelinesApi).toHaveBeenCalled();
        expect(setFailedSpy).toHaveBeenCalledWith(validationError.message);

        ensureSpy.mockRestore();
    });

    test('start() triggers release pipeline when YAML pipeline missing', async () => {
        setupCoreInputs();
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'info').mockImplementation();
        jest.spyOn(core, 'setFailed').mockImplementation();
        const ensureSpy = jest.spyOn(PipelineHelper, 'EnsureValidPipeline')
            .mockImplementationOnce(() => {
                throw new PipelineNotFoundError('not found');
            })
            .mockImplementation(() => undefined as any);

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

        ensureSpy.mockRestore();
    });
});