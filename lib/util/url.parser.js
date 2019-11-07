"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class UrlParser {
    static GetProjectName(projectUrl) {
        if (this.IsNullOrEmpty(projectUrl)) {
            throw new Error(this.NullOrEmptyProjectUrl);
        }
        try {
            projectUrl = projectUrl.trim();
            logger_1.Logger.LogInfo("project url is " + projectUrl);
            this.EnsureProjectName(projectUrl);
            logger_1.Logger.LogInfo("project url is " + projectUrl);
            var index = projectUrl.lastIndexOf("/");
            var projectNamePart = projectUrl.substr(index + 1);
            logger_1.Logger.LogInfo("projectNamePart is " + projectNamePart);
            var projectName = decodeURI(projectNamePart);
            logger_1.Logger.LogInfo("Decoded project name is " + projectName);
            if (projectName) {
                return projectName;
            }
            else {
                throw Error();
            }
        }
        catch (error) {
            logger_1.Logger.LogInfo("Exception occurred!!");
            var errorMessage = this.GetUrlParseExceptionMessage(projectUrl);
            logger_1.Logger.LogInfo("Throwing error");
            throw new Error(errorMessage);
        }
    }
    static GetCollectionUrlBase(projectUrl) {
        if (this.IsNullOrEmpty(projectUrl)) {
            throw new Error(this.NullOrEmptyProjectUrl);
        }
        try {
            projectUrl = projectUrl.trim();
            var collectionUrl = projectUrl.substr(0, projectUrl.lastIndexOf("/"));
            if (collectionUrl) {
                return collectionUrl;
            }
            else {
                throw Error();
            }
        }
        catch (error) {
            var errorMessage = this.GetUrlParseExceptionMessage(projectUrl);
            throw new Error(errorMessage);
        }
    }
    static EnsureProjectName(projectUrl) {
        logger_1.Logger.LogInfo("Ensuring project url");
        if (!projectUrl) {
            logger_1.Logger.LogInfo("Project url is null or empty");
        }
        var index = projectUrl.lastIndexOf("/");
        logger_1.Logger.LogInfo("Last index of project url is " + index);
        var length = projectUrl.length;
        logger_1.Logger.LogInfo("Length of project url is " + length);
        if (index == (projectUrl.length - 1)) {
            logger_1.Logger.LogInfo("Project name is missing. throwing Error");
            throw Error();
        }
        logger_1.Logger.LogInfo("Project name is present");
    }
    static GetUrlParseExceptionMessage(projectUrl) {
        let errorMessage = `Failed to parse project url: "${projectUrl}". Specify the valid project url (eg, https://dev.azure.com/organization/project-name or https://server.example.com:8080/tfs/DefaultCollection/project-name)) and try again.`;
        throw errorMessage;
    }
    static IsNullOrEmpty(value) {
        return (!value);
    }
}
exports.UrlParser = UrlParser;
UrlParser.NullOrEmptyProjectUrl = "Project url is null or empty. Specify the valid project url and try again";
