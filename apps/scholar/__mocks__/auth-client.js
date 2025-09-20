// Mock auth-client
module.exports = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    isPending: false,
    error: null,
  })),
};
