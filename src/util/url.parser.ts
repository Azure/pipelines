import { Logger as log } from './logger';

export class UrlParser {

    static readonly NullOrEmptyProjectUrl = "Project url is null or empty. Specify the valid project url and try again";

    public static GetProjectName(projectUrl: string): string {
        if (this.IsNullOrEmpty(projectUrl)) {
            throw new Error(this.NullOrEmptyProjectUrl);
        }

        try {
            projectUrl = projectUrl.trim();
            log.LogInfo("project url is "+projectUrl);
            this.EnsureProjectName(projectUrl);
            log.LogInfo("project url is "+projectUrl);
            var index = projectUrl.lastIndexOf("/");
            var projectNamePart = projectUrl.substr(index + 1);
            log.LogInfo("projectNamePart is "+projectNamePart);
            var projectName = decodeURI(projectNamePart);
            log.LogInfo("Decoded project name is "+projectName);
            if (projectName) {
                return projectName;
            } else {
                throw Error();
            }
        } catch (error) {
            log.LogInfo("Exception occurred!!");
            var errorMessage = this.GetUrlParseExceptionMessage(projectUrl);
            log.LogInfo("Throwing error");
            throw new Error(errorMessage);
        }
    }

    public static GetCollectionUrlBase(projectUrl: string): string {

        if (this.IsNullOrEmpty(projectUrl)) {
            throw new Error(this.NullOrEmptyProjectUrl);
        }

        try {
            projectUrl = projectUrl.trim();
            var collectionUrl = projectUrl.substr(0, projectUrl.lastIndexOf("/"));
            if (collectionUrl) {
                return collectionUrl;
            } else {
                throw Error();
            }
        } catch (error) {
            var errorMessage = this.GetUrlParseExceptionMessage(projectUrl);
            throw new Error(errorMessage);
        }
    }

    private static EnsureProjectName(projectUrl: string) {
        log.LogInfo("Ensuring project url");
        if (!projectUrl) {
            log.LogInfo("Project url is null or empty");
        }

        var index = projectUrl.lastIndexOf("/");
        log.LogInfo("Last index of project url is "+index);

        var length = projectUrl.length;
        log.LogInfo("Length of project url is "+length);
        
        if (index == (projectUrl.length - 1)) {
            log.LogInfo("Project name is missing. throwing Error");
            throw Error();
        }

        log.LogInfo("Project name is present");
    }

    private static GetUrlParseExceptionMessage(projectUrl: string): string {
        let errorMessage = `Failed to parse project url: "${projectUrl}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`;
        return errorMessage;
    }

    private static IsNullOrEmpty(value: string): boolean {
        return (!value);
    }
}