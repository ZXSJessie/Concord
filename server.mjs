import { createServer } from "node:http";
import next from "next";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();

await app.prepare();

const server = createServer((req, res) => {
  handle(req, res);
});

server.on("upgrade", (request, socket, head) => {
  handleUpgrade(request, socket, head);
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
