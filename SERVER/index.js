const { config, validate } = require("./src/config/env");

// Fail fast with ALL configuration problems at once
const { errors, warnings } = validate();
warnings.forEach((w) => console.warn(`[config] warning: ${w}`));
if (errors.length) {
  console.error("\nInvalid configuration:\n" + errors.map((e) => `  - ${e}`).join("\n") + "\n\nSee SERVER/.env.example\n");
  process.exit(1);
}

const http = require("http");
const app = require("./src/app");
const { connectDB, sequelize } = require("./src/config/database");
const { syncDB } = require("./src/models");
const { initSocket, flushAll } = require("./src/config/socket");

async function startServer() {
  await connectDB();
  await syncDB();

  if (config.exec.provider === "docker") {
    const docker = require("./src/services/execution/dockerProvider");
    docker.ping().then(
      () => { console.log("Docker sandbox: reachable"); docker.cleanupStaleContainers(); },
      (e) => console.warn(`[exec] Docker is not reachable (${e.message}). Code execution will return 503 until it is. ` +
        "On hosts without a Docker socket use EXECUTION_PROVIDER=judge0 (see docs/DEPLOYMENT.md).")
    );
  } else {
    console.log(`Code execution: Judge0 at ${config.exec.judge0Url}`);
  }

  const server = http.createServer(app);
  initSocket(server);

  // Bind to all interfaces (required in containers / PaaS)
  server.listen(config.port, "0.0.0.0", () =>
    console.log(`Server running on port ${config.port} (${config.nodeEnv}); CORS origins: ${config.clientUrls.join(", ") || "(none)"}`)
  );

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`${signal} received: shutting down`);
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();
    server.close();
    try { await flushAll(); await sequelize.close(); } catch (e) { console.error(e.message); }
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (r) => console.error("Unhandled rejection:", r));

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
