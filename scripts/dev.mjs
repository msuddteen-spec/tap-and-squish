import { createServer } from "vite";

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";

const server = await createServer({
  appType: "spa",
  configFile: false,
  root: process.cwd(),
  server: {
    host,
    port
  }
});

await server.listen();
server.printUrls();
