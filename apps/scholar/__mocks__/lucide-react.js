const React = require('react');

// Mock all lucide-react icons as simple divs
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

const icons = {
  __esModule: true,
};

module.exports = new Proxy(icons, {
  get: (target, prop) => {
    if (prop in target) {
      return target[prop];
    }
    if (typeof prop === 'string') {
      const icon = createMockIcon(prop);
      target[prop] = icon;
      return icon;
    }
    return undefined;
  },
});
