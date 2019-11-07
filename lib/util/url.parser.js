"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UrlParser {
    static GetProjectName(projectUrl) {
        if (this.IsNullOrEmpty(projectUrl)) {
            this.ThrowNullOrEmptyUrlException();
        }
        try {
            var projectNamePart = projectUrl.substr(projectUrl.lastIndexOf("/") + 1);
            var projectName = decodeURI(projectNamePart);
            if (projectName) {
                return projectName;
            }
            else {
                throw Error();
            }
        }
        catch (error) {
            this.ThrowUrlParseException(projectUrl);
        }
    }
    static GetCollectionUrlBase(projectUrl) {
        if (this.IsNullOrEmpty(projectUrl)) {
            this.ThrowNullOrEmptyUrlException();
        }
        try {
            var collectionUrl = projectUrl.substr(0, projectUrl.lastIndexOf("/"));
            if (collectionUrl) {
                return collectionUrl;
            }
            else {
                throw Error();
            }
        }
        catch (error) {
            this.ThrowUrlParseException(projectUrl);
        }
    }
    static ThrowNullOrEmptyUrlException() {
        throw new Error("Project url is null or empty. Specify the valid project url and try again");
    }
    static ThrowUrlParseException(projectUrl) {
        let errorMessage = `Failed to parse project url: "${projectUrl}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`;
        throw new Error(errorMessage);
    }
    static IsNullOrEmpty(value) {
        return (!value);
    }
}
exports.UrlParser = UrlParser;
