export class UrlParser {

    public static GetProjectName(projectUrl: string): string {
        var projectNamePart = projectUrl.substr(projectUrl.lastIndexOf("/") + 1);
        return decodeURI(projectNamePart);
    }

    public static GetCollectionUrlBase(projectUrl: string): string {
        return projectUrl.substr(0, projectUrl.lastIndexOf("/"));
    }
}