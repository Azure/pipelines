"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UrlParser {
    static GetProjectName(projectUrl) {
        if (this.IsNullOrEmpty(projectUrl)) {
            this.ThrowNullOrEmptyUrlException();
        }
        try {
            var parsedUrl = new URL(projectUrl);
            var splitPathName = parsedUrl.pathname.split("/");
            var projectName = splitPathName[1];
            if (projectName) {
                return projectName;
            }
            else {
                throw new Error("Project name is missing in url.");
            }
        }
        catch (error) {
            this.ThrowUrlParseException(projectUrl, error);
        }
    }
    static GetCollectionUrlBase(projectUrl) {
        if (this.IsNullOrEmpty(projectUrl)) {
            this.ThrowNullOrEmptyUrlException();
        }
        try {
            var parsedUrl = new URL(projectUrl);
            var collectionUrl = parsedUrl.origin;
            if (collectionUrl) {
                return collectionUrl;
            }
            else {
                throw new Error("Organization url is empty.");
            }
        }
        catch (error) {
            UrlParser.ThrowUrlParseException(projectUrl, error);
        }
    }
    static ThrowNullOrEmptyUrlException() {
        throw new Error("Project url is null or empty. Specify the valid project url and try again");
    }
    static ThrowUrlParseException(projectUrl, error) {
        let errorMessage = `Failed to parse project url: "${projectUrl}". Specify the valid project url and try again.`;
        if (error) {
            errorMessage = errorMessage + ` Error details: "${error.message}"`;
        }
        throw new Error(errorMessage);
    }
    static IsNullOrEmpty(value) {
        return (!value);
    }
}
exports.UrlParser = UrlParser;
