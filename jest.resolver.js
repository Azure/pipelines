/**
 * Custom Jest resolver to handle ESM-only packages that only expose
 * an "import" condition in their package.json "exports" field.
 */
module.exports = (request, options) => {
  // Only use 'import' condition for @actions packages which are ESM-only
  if (request.startsWith('@actions/') || request.startsWith('@actions\\')) {
    return options.defaultResolver(request, {
      ...options,
      conditions: ['import', 'types', 'default'],
    });
  }
  return options.defaultResolver(request, options);
};
