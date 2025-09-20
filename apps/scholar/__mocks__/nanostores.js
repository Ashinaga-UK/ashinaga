// Mock nanostores
module.exports = {
  atom: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    listen: jest.fn(() => jest.fn()),
  })),
  map: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setKey: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    listen: jest.fn(() => jest.fn()),
  })),
  computed: jest.fn(),
  action: jest.fn(),
  task: jest.fn(),
};
