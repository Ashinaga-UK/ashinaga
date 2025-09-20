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

// Export commonly used icons
module.exports = {
  AlertCircle: createMockIcon('AlertCircle'),
  ArrowRight: createMockIcon('ArrowRight'),
  Bell: createMockIcon('Bell'),
  Calendar: createMockIcon('Calendar'),
  CheckCircle: createMockIcon('CheckCircle'),
  CheckSquare: createMockIcon('CheckSquare'),
  ChevronLeft: createMockIcon('ChevronLeft'),
  ChevronRight: createMockIcon('ChevronRight'),
  Download: createMockIcon('Download'),
  Eye: createMockIcon('Eye'),
  EyeOff: createMockIcon('EyeOff'),
  FileText: createMockIcon('FileText'),
  Home: createMockIcon('Home'),
  Loader2: createMockIcon('Loader2'),
  LogOut: createMockIcon('LogOut'),
  MapPin: createMockIcon('MapPin'),
  Menu: createMockIcon('Menu'),
  Paperclip: createMockIcon('Paperclip'),
  Plus: createMockIcon('Plus'),
  School: createMockIcon('School'),
  Search: createMockIcon('Search'),
  Target: createMockIcon('Target'),
  Trash2: createMockIcon('Trash2'),
  Upload: createMockIcon('Upload'),
  User: createMockIcon('User'),
  Users: createMockIcon('Users'),
  X: createMockIcon('X'),
};
