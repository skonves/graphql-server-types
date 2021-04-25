import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateServerTypes } from '../index';

const schema = readFileSync(
  join(process.cwd(), 'src', 'snapshot', 'schema.graphql'),
).toString('utf8');

const prettierOptions = JSON.parse(
  readFileSync(join(process.cwd(), '.prettierrc')).toString('utf8'),
);

const templateString = '<%= PACKAGE_VERSION %>';
const { name, version } = require('../../package.json');

const snapshot = generateServerTypes(schema, { prettierOptions }).replace(
  `* ${name}@${version}`,
  `* ${name}@${templateString}`,
);

writeFileSync(join(process.cwd(), 'src', 'snapshot', 'types.ts'), snapshot);
