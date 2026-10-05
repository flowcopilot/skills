/**
 * Compare the Paper `--flow-*` tokens with `apps/openui/src/design/flow-tokens.ts`.
 * Read-only: prints the tokens that drift and changes nothing.
 *
 * Usage, from the flowcopilot-app root:
 *   bun <skill-dir>/scripts/token-drift.ts <paper-tokens.css> [--all]
 * The CSS file is the output of the Paper MCP `get_tokens` with format "css".
 * By default only drifting tokens are printed; `--all` prints every token.
 * Exit code: 0 when every token matches, 1 when there is drift, 2 on bad input.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Loaded from the working directory, so the script works wherever the skill is installed.
const TOKENS_PATH = 'apps/openui/src/design/flow-tokens.ts';
const tokensFile = resolve(process.cwd(), TOKENS_PATH);
if (!existsSync(tokensFile)) {
  console.error(`${TOKENS_PATH} not found. Run this from the flowcopilot-app root.`);
  process.exit(2);
}
const { flowColors, flowColorsDark, flowFonts, flowRadii, flowSpace, flowType } = await import(
  tokensFile
);

type CodeToken = { source: string; value: string };

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function codeTokens(): Map<string, CodeToken> {
  const tokens = new Map<string, CodeToken>();
  const add = (name: string, source: string, value: string | number) =>
    tokens.set(name, { source, value: String(value) });

  for (const [key, value] of Object.entries(flowColors)) {
    add(`--flow-${kebab(key)}`, `flowColors.${key}`, value);
  }
  for (const [key, value] of Object.entries(flowColorsDark)) {
    add(`--flow-dark-${kebab(key)}`, `flowColorsDark.${key}`, value);
  }
  for (const [key, value] of Object.entries(flowSpace)) {
    add(`--flow-space-${key.slice(1)}`, `flowSpace.${key}`, value);
  }
  for (const [key, value] of Object.entries(flowRadii)) {
    add(`--flow-radius-${key}`, `flowRadii.${key}`, value);
  }

  // Paper stores the family; code stores the PostScript face of one weight.
  add('--flow-font-display', 'flowFonts.display', flowFonts.display.split('-')[0] ?? '');
  // Body and UI text set no fontFamily in code, so they use the system font.
  add('--flow-font-text', 'system font (no fontFamily)', 'System Sans-Serif');

  // Paper has five text sizes; code has named roles, mapped here by name. A
  // DIFFERENT row can also mean that this mapping is out of date.
  const textRoles = {
    caption: 'caption',
    footnote: 'footnote',
    body: 'body',
    large: 'largeTitle',
    numeral: 'numeral',
  } as const;
  for (const [paper, role] of Object.entries(textRoles)) {
    add(`--flow-text-${paper}`, `flowType.${role}.fontSize`, flowType[role].fontSize);
  }
  return tokens;
}

function paperTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/(--flow-[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1]!, match[2]!.trim());
  }
  return tokens;
}

const normalize = (value: string) => value.trim().replace(/px$/, '').toUpperCase();

const showAll = process.argv.includes('--all');
const file = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
if (!file) {
  console.error('Usage: token-drift.ts <paper-tokens.css>');
  process.exit(2);
}
const paper = paperTokens(readFileSync(file, 'utf8'));
if (paper.size === 0) {
  console.error(`No --flow-* tokens found in ${file}.`);
  process.exit(2);
}
const code = codeTokens();

const rows: string[][] = [];
let drift = 0;
for (const name of [...new Set([...paper.keys(), ...code.keys()])].sort()) {
  const paperValue = paper.get(name);
  const codeToken = code.get(name);
  let status = 'same';
  if (paperValue === undefined) status = 'only in code';
  else if (codeToken === undefined) status = 'only in Paper';
  else if (normalize(paperValue) !== normalize(codeToken.value)) status = 'DIFFERENT';
  if (status !== 'same') drift += 1;
  rows.push([status, name, paperValue ?? '-', codeToken?.value ?? '-', codeToken?.source ?? '-']);
}

const shown = showAll ? rows : rows.filter((row) => row[0] !== 'same');
shown.sort((a, b) => Number(a[0] === 'same') - Number(b[0] === 'same'));
if (shown.length > 0) {
  console.log('| Status | Token | Paper | Code | Code source |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const row of shown) console.log(`| ${row.join(' | ')} |`);
}
console.log(
  `\n${drift} of ${rows.length} tokens drift. Code: apps/openui/src/design/flow-tokens.ts`,
);
process.exit(drift > 0 ? 1 : 0);
