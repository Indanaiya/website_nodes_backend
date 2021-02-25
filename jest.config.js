export default {
  "roots":[
    "./src"
  ],
  // Pattern matching for finding test files from https://basarat.gitbook.io/typescript/intro-1/jest
  "testMatch": [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  // Tells jest to use ts-jest for ts/tsx files
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}