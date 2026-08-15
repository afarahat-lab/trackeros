module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/tests/**/*.test.(ts|js)', '**/tests/**/*.spec.(ts|js)'],
  moduleDirectories: ['node_modules', 'src']
};
