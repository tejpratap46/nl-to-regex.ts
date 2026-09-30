import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../src/providers/grammar/language.generated.js');

if (!fs.existsSync(targetFile)) {
  console.error(`Target file does not exist: ${targetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Strip CommonJS and Node CLI runner boilerplate:
// if (typeof require !== 'undefined' && typeof exports !== 'undefined') { ... }
const cjsBlockRegex = /\n*if\s*\(\s*typeof require\s*!==\s*['"]undefined['"][\s\S]*$/;
if (!cjsBlockRegex.test(content)) {
  console.error(`Could not find CommonJS boilerplate in ${targetFile}`);
  process.exit(1);
}

const esmExports = `

export default language;
export const parser = language;
export const Parser = language.Parser;
export const parse = function (...args) { return language.parse.apply(language, args); };
`;

const processedContent = content.replace(cjsBlockRegex, '') + esmExports;

// Verify no CommonJS / Node.js runtime artifacts remain
const forbiddenChecks = [
  { name: 'require', regex: /\brequire\b/ },
  { name: 'exports', regex: /\bexports\b/ },
  { name: 'module', regex: /\bmodule\b/ },
  { name: 'process', regex: /\bprocess\b/ },
  { name: 'fs', regex: /\bfs\b/ },
  { name: 'path', regex: /\bpath\b/ },
];

for (const check of forbiddenChecks) {
  if (check.regex.test(processedContent)) {
    console.error(`Verification failed: found '${check.name}' in post-processed file.`);
    process.exit(1);
  }
}

fs.writeFileSync(targetFile, processedContent, 'utf8');
console.log(`Successfully post-processed ${path.relative(process.cwd(), targetFile)} to pure ESM.`);
