import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '../src/app');
const privateFeatureDirectories = new Set(['state', 'ui', 'presentation', 'pages']);

/** Recursively returns production TypeScript sources in stable path order. */
async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSourceFiles(entryPath);
      return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [entryPath] : [];
    }),
  );

  return files.flat().sort();
}

function classifySource(relativePath) {
  const segments = relativePath.split(path.sep);
  if (segments[0] === 'core' || segments[0] === 'shared') return { kind: segments[0] };
  if (segments[0] === 'features' && segments[1]) return { kind: 'feature', feature: segments[1] };
  return { kind: 'other' };
}

function importSpecifier(node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0];
  }

  return null;
}

function violation(source, specifier) {
  if (source.kind === 'core' && specifier.startsWith('@features/')) {
    return 'CORE_TO_FEATURE';
  }

  if (
    source.kind === 'shared' &&
    (specifier.startsWith('@core/') || specifier.startsWith('@features/'))
  ) {
    return 'SHARED_TO_CORE_OR_FEATURE';
  }

  if (source.kind !== 'feature' || !specifier.startsWith('@features/')) return null;

  const [, targetFeature, targetDirectory] = specifier.split('/');
  if (
    targetFeature &&
    targetFeature !== source.feature &&
    privateFeatureDirectories.has(targetDirectory)
  ) {
    return 'FEATURE_PRIVATE_IMPORT';
  }

  return null;
}

function collectDiagnostics(sourceFile, relativePath) {
  const source = classifySource(relativePath);
  const diagnostics = [];

  function visit(node) {
    const moduleSpecifier = importSpecifier(node);
    if (moduleSpecifier) {
      const rule = violation(source, moduleSpecifier.text);
      if (rule) {
        const position = sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.getStart(sourceFile));
        diagnostics.push({
          column: position.character + 1,
          line: position.line + 1,
          rule,
          specifier: moduleSpecifier.text,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return diagnostics.map(
    ({ column, line, rule, specifier }) =>
      `${relativePath}:${line}:${column} [${rule}] prohibited import "${specifier}"`,
  );
}

const diagnostics = [];
for (const filePath of await listSourceFiles(appRoot)) {
  const content = await readFile(filePath, 'utf8');
  const relativePath = path.relative(appRoot, filePath);
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  diagnostics.push(...collectDiagnostics(sourceFile, relativePath));
}

if (diagnostics.length > 0) {
  console.error('Frontend boundary violations:');
  console.error(diagnostics.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Frontend boundary check passed.');
}
