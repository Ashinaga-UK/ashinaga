const React = require('react');

const createMockIcon = (name) => {
  const MockIcon = React.forwardRef((props, ref) => {
    return React.createElement('div', {
      ...props,
      ref,
      'data-testid': `${name}-icon`,
    });
  });
  MockIcon.displayName = name;
  return MockIcon;
};

const icons = {};

module.exports = new Proxy(icons, {
  get(target, prop) {
    if (prop === '__esModule') return true;
    if (typeof prop !== 'string') return undefined;
    if (!target[prop]) {
      target[prop] = createMockIcon(prop);
    }
    return target[prop];
  },
});
