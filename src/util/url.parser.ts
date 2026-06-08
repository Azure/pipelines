export class UrlParser {

    static readonly NullOrEmptyProjectUrl = "Project url is null or empty. Specify the valid project url and try again";

    public static GetProjectName(projectUrl: string): string {
        if (this.IsNullOrEmpty(projectUrl)) {
            throw new Error(this.NullOrEmptyProjectUrl);
        }

        try {
            projectUrl = projectUrl.trim();
            this.EnsureProjectName(projectUrl);
            const index = projectUrl.lastIndexOf("/");
            const projectNamePart = projectUrl.substring(index + 1);
            const projectName = decodeURI(projectNamePart);
            if (projectName) {
                return projectName;
            } else {
                throw Error();
            }
        } catch {
            const errorMessage = this.GetUrlParseExceptionMessage(projectUrl);
            throw new Error(errorMessage);
        }
    }

    public static GetCollectionUrlBase(projectUrl: string): string {

        if (this.IsNullOrEmpty(projectUrl)) {
            throw new Error(this.NullOrEmptyProjectUrl);
        }

        try {
            projectUrl = projectUrl.trim();
            const collectionUrl = projectUrl.substring(0, projectUrl.lastIndexOf("/"));
            if (collectionUrl) {
                return collectionUrl;
            } else {
                throw Error();
            }
        } catch {
            const errorMessage = this.GetUrlParseExceptionMessage(projectUrl);
            throw new Error(errorMessage);
        }
    }

    private static EnsureProjectName(projectUrl: string): void {
        const index = projectUrl.lastIndexOf("/");
        if (index == (projectUrl.length - 1)) {
            throw Error();
        }
    }

    private static GetUrlParseExceptionMessage(projectUrl: string): string {
        const errorMessage = `Failed to parse project url: "${projectUrl}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`;
        return errorMessage;
    }

    private static IsNullOrEmpty(value: string): boolean {
        return (!value);
    }
}