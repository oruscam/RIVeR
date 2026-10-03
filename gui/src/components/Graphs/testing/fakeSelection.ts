/**
 * A tiny stand-in for a d3 selection, so drawing code can be exercised in
 * Jest's node environment (this repo has no jsdom). It records every
 * appended element and attribute; `select('.cls')` finds a descendant by class.
 */
export interface FakeNode {
  tag: string;
  attrs: Record<string, unknown>;
  text?: string;
  children: FakeNode[];
}

const find = (node: FakeNode, cls: string): FakeNode | null => {
  for (const child of node.children) {
    if (String(child.attrs.class ?? '').split(' ').includes(cls)) return child;
    const deeper = find(child, cls);
    if (deeper) return deeper;
  }
  return null;
};

export const fakeSelection = (node: FakeNode = { tag: 'g', attrs: {}, children: [] }) => {
  const sel = {
    node: () => node,
    append: (tag: string) => {
      const child: FakeNode = { tag, attrs: {}, children: [] };
      node.children.push(child);
      return fakeSelection(child);
    },
    attr: (key: string, value?: unknown) => {
      if (value === undefined) return node.attrs[key];
      node.attrs[key] = value;
      return sel;
    },
    style: () => sel,
    text: (value: string) => {
      node.text = value;
      return sel;
    },
    select: (selector: string) => {
      const found = find(node, selector.replace(/^\./, ''));
      return fakeSelection(found ?? { tag: 'none', attrs: {}, children: [] });
    },
    datum: () => sel,
    call: () => sel,
    raise: () => sel,
  };
  return sel;
};

/** All descendants (depth-first) with the given tag. */
export const allTags = (node: FakeNode, tag: string): FakeNode[] =>
  node.children.flatMap((c) => [...(c.tag === tag ? [c] : []), ...allTags(c, tag)]);
