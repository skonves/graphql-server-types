import { readFileSync } from 'fs';
import { join } from 'path';
import { generateServerTypes } from './index';

describe('generateServerTypes', () => {
  it('recreates a valid snapshot', async () => {
    // ARRANGE
    const paths = [
      join(process.cwd(), 'src', 'snapshot', 'schema.graphql'),
      join(process.cwd(), '.prettierrc'),
      join(process.cwd(), 'src', 'snapshot', 'types.ts'),
    ];

    const [schema, prettierConfig, snapshot] = paths.map((path) =>
      readFileSync(path).toString('utf8'),
    );

    const prettierOptions = JSON.parse(prettierConfig);

    // ACT
    const result = generateServerTypes(schema, { prettierOptions });

    // ASSERT
    expect(result).toEqual(snapshot);
  });
});
