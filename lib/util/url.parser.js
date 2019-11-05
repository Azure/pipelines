"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UrlParser {
    static GetProjectName(projectUrl) {
        var projectNamePart = projectUrl.substr(projectUrl.lastIndexOf("/") + 1);
        return decodeURI(projectNamePart);
    }
    static GetCollectionUrlBase(projectUrl) {
        return projectUrl.substr(0, projectUrl.lastIndexOf("/"));
    }
}
exports.UrlParser = UrlParser;
