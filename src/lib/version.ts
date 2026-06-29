// Single source of truth for app version — read from package.json at build time
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const APP_VERSION: string = require("../../package.json").version;
