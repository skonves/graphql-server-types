[![master](https://github.com/skonves/graphql-server-types/workflows/build/badge.svg?branch=master&event=push)](https://github.com/skonves/graphql-server-types/actions?query=workflow%3Abuild+branch%3Amaster+event%3Apush)

# graphql-server-types

Generate intergalactic-quality server-side Typescript types from GraphQL schemas.

## CLI Usage

The generator is available using the `generate-server-types` command.

You can pipe a schema the generator:

```
cat path/to/your/schema.graphql | generate-server-types
```

Or provide a `--schema` option:

```
generate-server-types --schema path/to/your/schema.graphql
```

Note that output will be formatted with [Prettier](https://prettier.io/). If a local Prettier config files exists local, those settings will be used; otherwise, the default formatting rules will be used.

## Programatic Usage

The generator is available by importing the `generateServerTypes` function.

```js
import { readFileSync } from 'fs';
import { generateServerTypes } from 'graphql-server-types';

const schema = readFileSync('path/to/your/schema.graphql').toString('utf8');

const serverTypes = generateServerTypes(schema);
```

The second `options` parameter allows for custom prettier config and other tweaks.

```js
const serverTypes = generateServerTypes(schema, {
  prettierOptions: { singleQuote: true },
});
```

## Imported types

### Context and Info

The generated output will import `Context` and `Info` types from a sibling `./context.ts` file. These allow you to specify the type of context and info objects that the GraphQL server will pass to your resolvers. This generator _does not_ generate the file for you; however, it is required. At minimum, create a file named `context.ts` next to your generated types file with the following content.

```ts
export type Context = any;
export type Info = any;
```

It is possible to override the location from which the context types are imported by using the `contextLocation` option.

```js
const serverTypes = generateServerTypes(schema, {
  contextLocation: '../types.ts',
});
```

### Custom Scalars

The generated output will import types for custom scalars from a sibling `./scalars.ts` file. This generator _does not_ generate the file for you; however, it is required. At minimum, create a file named `scalars.ts` next to your generated types file and export (or re-export) a type for each custom scalar.

```ts
export type MyCustomScalar = string;
```

It is possible to override the location from which the scalar types are imported by using the `scalarsLocation` option.

```js
const serverTypes = generateServerTypes(schema, {
  scalarsLocation: '../types.ts',
});
```

## For Contributors:

### Build this project

1.  Build the code: `npm run build`

### Create and run tests

1.  Add tests by creating files with the `.tests.ts` suffix
1.  Run the tests: `npm t`
1.  Test coverage can be viewed at `/coverage/lcov-report/index.html`

---

Generated with [generator-ts-console](https://www.npmjs.com/package/generator-ts-console)
