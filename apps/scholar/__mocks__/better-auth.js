// Mock better-auth
module.exports = {
  createAuthClient: () => ({
    signIn: {
      email: jest.fn(),
      social: jest.fn(),
    },
    signUp: {
      email: jest.fn(),
    },
    signOut: jest.fn(),
    useSession: jest.fn(() => ({
      data: null,
      isPending: false,
      error: null,
    })),
    $fetch: jest.fn(),
  }),
  sessionClient: {
    useSession: jest.fn(() => ({
      data: null,
      isPending: false,
      error: null,
    })),
  },
};
