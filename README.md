[![master](https://github.com/skonves/graphql-server-types/workflows/build/badge.svg?branch=master&event=push)](https://github.com/skonves/graphql-server-types/actions?query=workflow%3Abuild+branch%3Amaster+event%3Apush)
[![master](https://img.shields.io/npm/v/graphql-server-types)](https://www.npmjs.com/package/graphql-server-types)

# graphql-server-types

Generate intergalactic-quality server-side Typescript types from GraphQL schemas.

## CLI Usage

The generator is available using the `generate-server-types` command.

### Input file

Use `-i`, `--input` to supply the input file path:

```
generate-server-types --input path/to/your/schema.graphql
```

Or pipe contents in via stdio:

```
cat path/to/your/schema.graphql | generate-server-types
```

### Output file

Use `-o`, `--output` to supply the output file path:

```
generate-server-types --output path/to/your/types.d.ts
```

If an output file path is not supplied, then the output is written to stdout:

```
generate-server-types > path/to/your/types.d.ts
```

### Formatting

The generated output will be formatted with [Prettier](https://prettier.io/). The path to a config file may be supplied; otherwise, the local config or default settings will be used.

Use `-p`, `--prettierConfig` specify the file path to your Prettier config:

```
generate-server-types --prettierConfig path/to/your/.prettierrc
```

### Context and Info

The generated output will import `Context` and `Info` types from a sibling `./context.ts` file. These allow you to specify the type of context and info objects that the GraphQL server will pass to your resolvers. This generator _does not_ generate the file for you; however, it is required. At minimum, create a file named `context.ts` next to your generated types file with the following content.

Use `-c`, `--contextLocation` override the import path to your context types file:

```
generate-server-types --contextLocation ./import/path/to/your/context.ts
```

### Custom Scalars

The generated output will import types for custom scalars from a sibling `./scalars.ts` file. This generator _does not_ generate the file for you; however, it is required. At minimum, create a file named `scalars.ts` next to your generated types file and export (or re-export) a type for each custom scalar.

```ts
export type MyCustomScalar = string;
```

Use `-s`, `--scalarsLocation` override the import path to your custom scalar types file:

```
generate-server-types --scalarsLocation ./import/path/to/your/scalars.ts
```

### Watch mode

Use `-w`, `--watch` to run in watch mode. In watch mode, both `--input` and `--output` must be specified (you can't leverage stdio/stdout). Running in watch mode will immediately generate output file and then update the output file on each subsequent change to the input file.

```
generate-server-types --input schema.graphql --output types.g.ts --watch
```

## Programatic Usage

The generator is available by importing the `generateServerTypes` function.

```js
import { readFileSync } from 'fs';
import { generateServerTypes } from 'graphql-server-types';

const schema = readFileSync('path/to/your/schema.graphql').toString('utf8');

const serverTypes = generateServerTypes(schema);
```

The second `options` parameter allows for custom formatting options and other tweaks.

```js
const serverTypes = generateServerTypes(schema, {
  prettierOptions: { singleQuote: true },
  contextLocation: './import/path/to/your/context.ts',
  scalarsLocation: './import/path/to/your/scalars.ts',
});
```

Watch mode is not available during programmatic usage.

## For Contributors:

### Build this project

1.  Build the code: `npm run build`

### Create and run tests

1.  Add tests by creating files with the `.tests.ts` suffix
1.  Run the tests: `npm t`
1.  Test coverage can be viewed at `/coverage/lcov-report/index.html`

---

Generated with [generator-ts-console](https://www.npmjs.com/package/generator-ts-console)
