import {
  DefinitionNode,
  DirectiveNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  parse,
  StringValueNode,
  TypeNode,
  UnionTypeDefinitionNode,
} from 'graphql';
import { format, Options as PrettierOptions } from 'prettier';

export interface Options {
  prettierOptions?: PrettierOptions;
  typeMap?: Record<string, string>;
  contextLocation?: string;
  scalarsLocation?: string;
}

export function generateServerTypes(schema: string, options?: Options): string {
  const prettierOptions = {
    ...(options?.prettierOptions || {}),
    parser: 'typescript',
  };
  const typeMap = {
    ...getDefaultTypeMap(),
    ...(options?.typeMap || {}),
  };
  const contextLocation = options?.contextLocation || './context';
  const scalarsLocation = options?.scalarsLocation || './scalars';

  const document = parse(schema);

  const output = [
    generateNoticeBlock(),
    generateImports(document, contextLocation, scalarsLocation),
    generateStandardTypes(),
    generateSchemaTypes(document, typeMap),
    generateSourceExport(schema),
  ].join('\n\n');

  return format(output, prettierOptions);
}

function getDefaultTypeMap(): Record<string, string> {
  return {
    ID: 'string',
    String: 'string',
    Int: 'number',
    Float: 'number',
    Boolean: 'boolean',
  };
}

function generateNoticeBlock(): string {
  return `/* *********************************************************************
  * This code was generated by a tool.
  * ${require('../package.json').name}@${require('../package.json').version}
  * 
  * Changes to this file may cause incorrect behavior and will be lost if
  * the code is regenerated.
  ***********************************************************************/`;
}

function generateImports(
  document: DocumentNode,
  contextLocation: string,
  scalarsLocation: string,
) {
  return [
    generateContextImports(contextLocation),
    generateScalarImports(document, scalarsLocation),
  ]
    .filter((x) => x)
    .join('\n');
}

function generateContextImports(contextLocation: string): string {
  return `import { Context, Info } from "${contextLocation}";`;
}

function generateScalarImports(
  document: DocumentNode,
  scalarsLocation: string,
): string {
  const scalars = document.definitions
    .filter(isScalarTypeDefinitionn)
    .map((s) => s.name.value)
    .filter((name) => name !== 'Date')
    .sort();

  return scalars.length
    ? `import { ${scalars.join(', ')} } from "${scalarsLocation}";`
    : '';
}

function generateStandardTypes(): string {
  const argsObject = 'export type ArgsObject = { [key: string]: any };';
  const emptyArgs = 'export type EmptyArgs = { [key: string]: never };';
  const resolver =
    'export type Resolver<ReturnType, Args extends ArgsObject = EmptyArgs> = (args: Args, context: Context, info: Info) => ReturnType | Promise<ReturnType>;';
  const field =
    'export type Field<ReturnType, Args extends ArgsObject = EmptyArgs> = Args extends EmptyArgs ? ReturnType | Resolver<ReturnType, Args> : Resolver<ReturnType, Args>;';

  return `${argsObject}\n${emptyArgs}\n\n${resolver}\n\n${field}`;
}

function generateSchemaTypes(
  document: DocumentNode,
  typeMap: Record<string, string>,
) {
  return document.definitions
    .map((node) => {
      if (isInterfaceTypeDefinitionNode(node)) {
        return buildInterfaceTypeDefinition(typeMap)(node);
      } else if (isUnionTypeDefinitionNode(node)) {
        return buildUnionTypeDefinition(node);
      } else if (isObjectTypeDefinitionNode(node)) {
        return buildObjectTypeDefinition(typeMap)(node);
      } else if (isEnumTypeDefinition(node)) {
        return buildEnumTypeDefinition(node);
      } else if (isInputObjectTypeDefinition(node)) {
        return buildInputObjectTypeDefinition(typeMap)(node);
      } else {
        return '';
      }
    })
    .join('\n\n');
}

function generateSourceExport(source: string) {
  return `export const source = \`${source
    .split('\\')
    .join('\\\\')
    .split('`')
    .join('\\`')}\``;
}

function isInterfaceTypeDefinitionNode(
  obj: DefinitionNode,
): obj is InterfaceTypeDefinitionNode {
  return obj.kind === 'InterfaceTypeDefinition';
}

function isUnionTypeDefinitionNode(
  obj: DefinitionNode,
): obj is UnionTypeDefinitionNode {
  return obj.kind === 'UnionTypeDefinition';
}

function isObjectTypeDefinitionNode(
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode {
  return obj.kind === 'ObjectTypeDefinition';
}

function isEnumTypeDefinition(
  obj: DefinitionNode,
): obj is EnumTypeDefinitionNode {
  return obj.kind === 'EnumTypeDefinition';
}

function isInputObjectTypeDefinition(
  obj: DefinitionNode,
): obj is InputObjectTypeDefinitionNode {
  return obj.kind === 'InputObjectTypeDefinition';
}

function isScalarTypeDefinitionn(
  obj: DefinitionNode,
): obj is InputObjectTypeDefinitionNode {
  return obj.kind === 'ScalarTypeDefinition';
}

function generateDescription(
  node: StringValueNode | undefined,
  directives: readonly DirectiveNode[] | undefined,
) {
  const directiveNode = directives?.find((d) => d.name.value === 'deprecated');
  const reasonNode = directiveNode?.arguments?.find(
    (a) => a.name.value === 'reason',
  );

  const description = node
    ? node.value.split('\r\n').join('\n').split('\n')
    : [];
  const isDeprecated = !!directiveNode;
  const reason =
    reasonNode?.value.kind === 'StringValue' ? reasonNode.value.value : '';

  if (isDeprecated)
    description.push(['@deprecated', reason].filter((x) => x).join(' '));

  if (description.length === 0) {
    return '';
  } else if (description.length === 1) {
    return `\n\n/** ${description[0]} */\n`;
  } else {
    return `\n\n/** \n${description
      .map((line) => ` * ${line}`)
      .join('\n')}\n */\n`;
  }
}

const buildInterfaceTypeDefinition = (typeMap: Record<string, string>) => (
  node: InterfaceTypeDefinitionNode,
): string => {
  return `${generateDescription(
    node.description,
    node.directives,
  )}export interface ${node.name.value} { ${node.fields?.map(
    buildFieldDefinition(typeMap),
  )} }`;
};

function buildUnionTypeDefinition(node: UnionTypeDefinitionNode): string {
  return `${generateDescription(
    node.description,
    node.directives,
  )}export type ${node.name.value} = ${node.types
    ?.map((t) => t.name.value)
    .join(' | ')}`;
}

const buildObjectTypeDefinition = (typeMap: Record<string, string>) => (
  node: ObjectTypeDefinitionNode,
): string => {
  const ext = node.interfaces?.length
    ? `extends ${node.interfaces.map((x) => x.name.value)} `
    : '';

  return `${generateDescription(
    node.description,
    node.directives,
  )}export interface ${node.name.value} ${ext} { ${node.fields?.map(
    buildFieldDefinition(typeMap),
  )} }`;
};

function buildEnumTypeDefinition(node: EnumTypeDefinitionNode): string {
  return `${generateDescription(
    node.description,
    node.directives,
  )}export enum ${node.name.value} { ${node.values
    ?.map(buildEnumValueDefinition)
    .join(',')} }`;
}

function buildEnumValueDefinition(node: EnumValueDefinitionNode): string {
  return `${generateDescription(node.description, node.directives)}${
    node.name.value
  } = '${node.name.value}'`;
}

const buildInputObjectTypeDefinition = (typeMap: Record<string, string>) => (
  node: InputObjectTypeDefinitionNode,
): string => {
  return `${generateDescription(
    node.description,
    node.directives,
  )}export interface ${node.name.value} { ${node.fields?.map(
    buildInputValueDefinition(typeMap),
  )} }`;
};

const buildFieldDefinition = (typeMap: Record<string, string>) => (
  node: FieldDefinitionNode,
): string => {
  const args = node.arguments?.length
    ? `, { ${node.arguments?.map(buildInputValueDefinition(typeMap))} }`
    : '';
  return `${generateDescription(node.description, node.directives)}${
    node.name.value
  }: Field<${buildType(node.type, typeMap)}${args}>`;
};

const buildInputValueDefinition = (typeMap: Record<string, string>) => (
  node: InputValueDefinitionNode,
): string => {
  return `${generateDescription(node.description, node.directives)}${
    node.name.value
  }: ${buildType(node.type, typeMap)}`;
};

function buildType(type: TypeNode, typeMap: Record<string, string>) {
  const x = normalizeFieldType(type);
  const t = typeMap[x.type] || x.type;

  if (x.isList) {
    if (x.isListElementNotNull) {
      return `${t}[]${x.isNotNull ? '' : ' | null'}`;
    } else {
      return `(${t} | null)[]${x.isNotNull ? '' : ' | null'}`;
    }
  } else {
    return `${t}${x.isNotNull ? '' : ' | null'}`;
  }
}

type NormalizedFieldType = {
  type: string;
  isNotNull: boolean;
  isList: boolean;
  isListElementNotNull: boolean | null;
};

function normalizeFieldType(node: TypeNode): NormalizedFieldType {
  let type: TypeNode = node;
  const isNotNull = type.kind === 'NonNullType';
  let isList = false;
  let isListElementNotNull: boolean | null = null;

  if (type.kind === 'NonNullType') {
    type = type.type;
  }

  if (type.kind === 'ListType') {
    isList = true;
    type = type.type;
    isListElementNotNull = type.kind === 'NonNullType';

    if (type.kind === 'NonNullType') {
      type = type.type;
    }
  }

  return {
    type: type['name'].value,
    isNotNull,
    isList,
    isListElementNotNull,
  };
}
