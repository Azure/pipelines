export declare class UrlParser {
    static readonly NullOrEmptyProjectUrl = "Project url is null or empty. Specify the valid project url and try again";
    static GetProjectName(projectUrl: string): string;
    static GetCollectionUrlBase(projectUrl: string): string;
    private static EnsureProjectName;
    private static GetUrlParseExceptionMessage;
    private static IsNullOrEmpty;
}
//# sourceMappingURL=url.parser.d.ts.map