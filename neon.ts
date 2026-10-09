import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  functions: {
    kprentsapi: {
      name: "KP-Rents API",
      source: "./functions/api.ts",
    },
  },
});
