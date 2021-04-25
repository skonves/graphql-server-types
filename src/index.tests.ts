import { readFileSync } from 'fs';
import { join } from 'path';
import { generateServerTypes } from './index';

const schema = read('src', 'snapshot', 'schema.graphql');
const prettierConfig = read('.prettierrc');
const snapshot = read('src', 'snapshot', 'types.ts');

const templateString = '<%= PACKAGE_VERSION %>';

describe('generateServerTypes', () => {
  it('starts with a snapshot with a version template string', () => {
    // ASSERT
    expect(snapshot).toContain(templateString);
  });

  it('recreates a valid snapshot', () => {
    // ARRANGE
    const prettierOptions = JSON.parse(prettierConfig);
    const snapshotWithCurrentVersion = snapshot.replace(
      templateString,
      require('../package.json').version,
    );

    // ACT
    const result = generateServerTypes(schema, { prettierOptions });

    // ASSERT
    expect(result).toEqual(snapshotWithCurrentVersion);
  });
});

function read(...relativePath: string[]): string {
  return readFileSync(join(process.cwd(), ...relativePath)).toString('utf8');
}
