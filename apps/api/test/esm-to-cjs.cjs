const ts = require('typescript');

// Jest runs the API tests as CommonJS. better-auth 1.6 and its dependencies ship
// ESM only, so rewrite those files to require() before Jest evaluates them.
module.exports = {
  process(src, filename) {
    const result = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename.replace(/\.mjs$/, '.js'),
    });
    return { code: result.outputText };
  },
};
