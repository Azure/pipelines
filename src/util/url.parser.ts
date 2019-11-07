export class UrlParser {

    public static GetProjectName(projectUrl: string): string {

        if (this.IsNullOrEmpty(projectUrl)) {
            this.ThrowNullOrEmptyUrlException();
        }

        try {
            var parsedUrl = new URL(projectUrl);
            var splitPathName = parsedUrl.pathname.split("/");
            var projectName = splitPathName[0]
            if (projectName) {
                return projectName;
            } else {
                throw new Error("Project name is empty in url. Specify the valid project url and try again");
            }
        } catch (error) {
            this.ThrowUrlParseException(projectUrl);
        }
    }

    public static GetCollectionUrlBase(projectUrl: string): string {

        if (this.IsNullOrEmpty(projectUrl)) {
            this.ThrowNullOrEmptyUrlException();
        }

        try {
            var parsedUrl = new URL(projectUrl);
            var collectionUrl = parsedUrl.origin;
            if (collectionUrl) {
                return collectionUrl;
            } else {
                throw new Error("Organization url is empty. Specify the valid project url and try again");
            }
        } catch (error) {
            UrlParser.ThrowUrlParseException(projectUrl);
        }
    }

    private static ThrowNullOrEmptyUrlException() {
        throw new Error("Project url is null or empty. Specify the valid project url and try again");
    }

    private static ThrowUrlParseException(projectUrl: string) {
        let errorMessage = `Failed to parse project url: "${projectUrl}". Specify the valid project url and try again.`;
        throw new Error(errorMessage);
    }

    private static IsNullOrEmpty(value: string): boolean {
        return (!value);
    }
}