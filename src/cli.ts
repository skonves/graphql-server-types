#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { watchFile } from 'fs';

import * as chalk from 'chalk';
import { resolveConfigFile, Options as PrettierOptions, util } from 'prettier';
import yargs = require('yargs/yargs');
import { hideBin } from 'yargs/helpers';

import { generateServerTypes, Options } from './index';

const { argv } = yargs(hideBin(process.argv))
  .option('input', {
    alias: 'i',
    string: true,
    description:
      'Path to a file that contains a GraphQL schema. Reads from stdin if omitted',
    requiresArg: true,
  })
  .option('output', {
    alias: 'o',
    string: true,
    description: 'Path of the output file. Writes to stdout if omitted.',
    requiresArg: true,
  })
  .option('scalarsLocation', {
    alias: 's',
    string: true,
    description: 'Path for custom scalars import. Defaults to "./scalars".',
    requiresArg: true,
  })
  .option('contextLocation', {
    alias: 'c',
    string: true,
    description: 'Path for context import. Defaults to "./context".',
    requiresArg: true,
  })
  .option('prettierConfig', {
    alias: 'p',
    string: true,
    description:
      'Path to a Prettier config file. If omitted, uses the local config file if one exists.',
    requiresArg: true,
  })
  .option('watch', {
    alias: 'w',
    boolean: true,
    description: 'Recreates the output file each time the input file changes.',
    nargs: 0,
    implies: ['input', 'output'],
  });

(async () => {
  try {
    const {
      input,
      output,
      scalarsLocation,
      contextLocation,
      prettierConfig,
      watch,
    } = argv;

    if (watch && !input && !output) {
      throw new Error(
        'Must specify input and output files to run in watch mode.',
      );
    }

    let schema: string | undefined;

    if (input) {
      schema = (await readFile(input)).toString('utf8');
    } else if (!process.stdin.isTTY) {
      schema = await readStreamToString(process.stdin);
    } else {
      throw new Error('No input file provided and nothing to read from stdin');
    }

    const prettierOptions = await getPrettierOptions(prettierConfig);

    const options: Options = {
      prettierOptions,
      contextLocation,
      scalarsLocation,
    };

    const serverTypes = tryFn(
      () => generateServerTypes(schema, options),
      (ex) => `Error generating server types\n${ex.message}`,
    );

    if (output) {
      await tryPromise(
        writeFile(output, serverTypes),
        (ex) => `Cannot write output file\n${ex.message}`,
      );

      if (watch) {
        console.log(
          chalk.greenBright(
            `Generated initial types in ${output}. Waiting for changes...`,
          ),
        );
        watchFile(input, async () => {
          console.log(chalk.greenBright(`Detected change of ${input}`));
          schema = (await readFile(input)).toString('utf8');
          let result: string = undefined;

          try {
            result = generateServerTypes(schema, options);
          } catch (ex) {
            console.error(
              chalk.yellow(`Error generating server types (${ex.message})`),
            );
          }

          if (result) {
            try {
              await writeFile(output, result);
              console.log(
                chalk.greenBright(`Updated ${output}. Waiting for changes...`),
              );
            } catch (ex) {
              console.error(
                chalk.yellow(`Error writing output file (${ex.message})`),
              );
            }
          } else {
            console.error(
              chalk.yellow(
                `Output file ${output} has not been modified. Waiting for changes...`,
              ),
            );
          }
        });
      }
    } else {
      process.stdout.write(serverTypes);
    }
  } catch (ex) {
    error('Did not generate server types', '', ex.message);
    process.exit(1);
  }
})();

async function readStreamToString(stream: NodeJS.ReadStream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function getPrettierOptions(
  override: string | undefined,
): Promise<PrettierOptions | undefined> {
  const prettierConfigFile = override || (await resolveConfigFile());

  if (!prettierConfigFile) return undefined;

  const configBuffer = await tryPromise(
    readFile(prettierConfigFile),
    (ex) => `Cannot read Prettier config\n${ex.message}`,
  );

  return tryFn(
    () => JSON.parse(configBuffer.toString('utf8')),
    (ex) => `Cannot parse Prettier config\n${ex.message}`,
  );
}

function error(...lines: string[]): void {
  console.error();
  for (const line of lines) {
    console.error(chalk.bold.red(line));
  }
  console.error();
}

function tryFn<T>(fn: () => T, message: string | ((ex: Error) => string)): T {
  try {
    return fn();
  } catch (ex) {
    if (typeof message === 'function') {
      throw new Error(`Error: ${message(ex)}`);
    } else {
      throw new Error(`Error: ${message}`);
    }
  }
}

async function tryPromise<T>(
  promise: Promise<T>,
  message: string | ((ex: Error) => string),
): Promise<T> {
  try {
    return await promise;
  } catch (ex) {
    if (typeof message === 'function') {
      throw new Error(`Error: ${message(ex)}`);
    } else {
      throw new Error(`Error: ${message}`);
    }
  }
}
