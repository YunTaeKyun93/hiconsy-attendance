// oxlint JS 플러그인: 현재 시각은 Clock provider에서만 얻는다 (CLAUDE.md "시간").
const MESSAGE_NOW = '현재 시각은 Clock provider(CLOCK 토큰)에서만 얻습니다.';

const noDirectNow = {
  meta: { type: 'problem' },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Date' && node.arguments.length === 0) {
          context.report({ node, message: `인자 없는 new Date() 금지. ${MESSAGE_NOW}` });
        }
      },
      CallExpression(node) {
        const c = node.callee;
        if (
          c.type === 'MemberExpression' &&
          c.object.type === 'Identifier' &&
          c.object.name === 'Date' &&
          c.property.type === 'Identifier' &&
          c.property.name === 'now'
        ) {
          context.report({ node, message: `Date.now() 금지. ${MESSAGE_NOW}` });
        }
      },
      ImportSpecifier(node) {
        const name = node.imported.type === 'Identifier' ? node.imported.name : node.imported.value;
        if (name === 'CreateDateColumn' || name === 'UpdateDateColumn') {
          context.report({ node, message: `${name} 금지. 시각 칸은 서비스에서 Clock 값으로 채웁니다.` });
        }
      },
      Literal(node) {
        if (typeof node.value === 'string' && /\bnow\s*\(\s*\)/i.test(node.value)) {
          context.report({ node, message: `SQL now() 금지. ${MESSAGE_NOW}` });
        }
      },
      TemplateElement(node) {
        if (/\bnow\s*\(\s*\)/i.test(node.value.raw)) {
          context.report({ node, message: `SQL now() 금지. ${MESSAGE_NOW}` });
        }
      },
    };
  },
};

export default {
  meta: { name: 'clock' },
  rules: { 'no-direct-now': noDirectNow },
};
