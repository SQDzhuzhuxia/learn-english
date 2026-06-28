/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("learnEnglishShell", {
  platform: process.platform
});
