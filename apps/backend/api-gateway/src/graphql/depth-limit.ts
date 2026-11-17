import {
  GraphQLError,
  Kind,
  getOperationAST,
  type DocumentNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationRule,
} from 'graphql';

function measure(set: SelectionSetNode, fragments: Map<string, FragmentDefinitionNode>, seen: Set<string>): number {
  let max = 0;
  for (const sel of set.selections) {
    let depth = 0;
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value.startsWith('__')) continue; // introspection fields do not count toward the limit
      depth = 1 + (sel.selectionSet ? measure(sel.selectionSet, fragments, seen) : 0);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      depth = measure(sel.selectionSet, fragments, seen);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const name = sel.name.value;
      const fragment = fragments.get(name);
      if (fragment && !seen.has(name)) depth = measure(fragment.selectionSet, fragments, new Set(seen).add(name));
    }
    if (depth > max) max = depth;
  }
  return max;
}

/** Validation rule: rejects operations nested deeper than `maxDepth` (fragments are expanded). */
export function depthLimitRule(maxDepth: number): ValidationRule {
  return (context) => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) fragments.set(def.name.value, def);
    }
    return {
      OperationDefinition(node) {
        const depth = measure(node.selectionSet, fragments, new Set());
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`The query is nested too deeply (depth ${depth}, maximum ${maxDepth}).`, {
              nodes: [node],
              extensions: { code: 'QUERY_TOO_DEEP', http: { status: 400 } },
            }),
          );
        }
      },
    };
  };
}

/** Maximum nesting depth of the selected operation (fragments expanded, introspection ignored). */
export function maxDepthOf(document: DocumentNode, operationName?: string | null): number {
  const op = getOperationAST(document, operationName);
  if (!op) return 0;
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of document.definitions) if (def.kind === Kind.FRAGMENT_DEFINITION) fragments.set(def.name.value, def);
  return measure(op.selectionSet, fragments, new Set());
}
