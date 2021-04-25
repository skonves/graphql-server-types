#!/usr/bin/env node

import { readFile } from 'fs/promises';

import * as chalk from 'chalk';
import { resolveConfigFile, Options as PrettierOptions } from 'prettier';
import yargs = require('yargs/yargs');
import { hideBin } from 'yargs/helpers';

import { generateServerTypes } from './index';

const { argv } = yargs(hideBin(process.argv));

(async () => {
  const schemaFile: string | undefined =
    argv.s?.toString() || argv.schema?.toString();

  let schema: string | undefined;

  if (schemaFile) schema = (await readFile(schemaFile)).toString('utf8');
  else if (!process.stdin.isTTY)
    schema = await readStreamToString(process.stdin);

  if (schema) {
    const prettierOptions = await getPrettierOptions();
    try {
      console.log(generateServerTypes(schema, { prettierOptions }));
    } catch (ex) {
      error('Cannot generate server types', ex.message);
      process.exit(1);
    }
  } else {
    error(
      'Cannot generate server types',
      'Input Error: No input schema provided',
      `For more info, see: https://www.npmjs.com/package/${
        require('../package.json').name
      }/v/${require('../package.json').version}`,
    );
    process.exit(1);
  }
})();

async function readStreamToString(stream: NodeJS.ReadStream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function getPrettierOptions(): Promise<PrettierOptions | undefined> {
  const prettierConfigFile = await resolveConfigFile();

  return prettierConfigFile
    ? JSON.parse((await readFile(prettierConfigFile)).toString())
    : undefined;
}

function error(...lines: string[]): void {
  console.error();
  for (const line of lines) {
    console.error(chalk.bold.red(line));
  }
  console.error();
}
