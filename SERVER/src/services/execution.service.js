const Docker = require("dockerode");
const tar = require("tar-stream");
const languageMap = require("../utils/languageMap");

const docker = new Docker({
  socketPath: "//./pipe/dockerDesktopLinuxEngine",
});

// =========================
// Execute Code
// =========================

async function executeCode(language, code, input = "") {
  let container = null;

  try {
    console.log("=================================");
    console.log("🚀 CODE EXECUTION STARTED");
    console.log("Language:", language);

    const config = languageMap[language];

    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    console.log("Config:", config);

    // =========================
    // Create Container
    // =========================

    container = await docker.createContainer({
      Image: config.image,

      Cmd: [
        "bash",
        "-c",
        `
        set -e

        mkdir -p /usr/src/app

        ${
          config.compile
            ? `${config.compile} 2> /tmp/compile_error`
            : "true"
        }

        ${
          config.compile
            ? `
            if [ -s /tmp/compile_error ]; then
              cat /tmp/compile_error
              exit 1
            fi
            `
            : ""
        }

        printf '%s' "$INPUT" | ${config.run}
        `,
      ],

      WorkingDir: "/usr/src/app",

      Env: [
        `INPUT=${input}`,
      ],

      Tty: false,

      AttachStdout: true,
      AttachStderr: true,

      HostConfig: {
        NetworkMode: "none",

        Memory: 256 * 1024 * 1024,

        AutoRemove: false,
      },
    });

    console.log("✅ Container Created:", container.id);

    // =========================
    // Prepare Source File
    // =========================

    const pack = tar.pack();

    pack.entry(
      {
        name: config.fileName,
      },
      code
    );

    pack.finalize();

    console.log("📁 Copying source file...");

    await container.putArchive(pack, {
      path: "/usr/src/app",
    });

    // =========================
    // Start Container
    // =========================

    console.log("▶️ Starting container...");

    await container.start();

    // =========================
    // Wait For Execution
    // =========================

    console.log("⏳ Waiting for execution...");

    const waitPromise = container.wait();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Execution timed out."));
      }, 10000);
    });

    await Promise.race([
      waitPromise,
      timeoutPromise,
    ]);

    // =========================
    // Fetch Logs
    // =========================

    console.log("📤 Fetching output...");

    const logs = await container.logs({
      stdout: true,
      stderr: true,
    });

    let output = logs
      .toString("utf8")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .trim();

    console.log("Output:", output);

    console.log("✅ CODE EXECUTION FINISHED");

    return output;
  } catch (err) {
    console.error("========== DOCKER ERROR ==========");
    console.error(err.message);
    console.error("==================================");

    throw err;
  } finally {
    // =========================
    // Cleanup Container
    // =========================

    if (container) {
      try {
        console.log("🧹 Removing container...");

        await container.remove({
          force: true,
        });

        console.log("✅ Container Removed");
      } catch (cleanupError) {
        console.error(
          "Container cleanup failed:",
          cleanupError.message
        );
      }
    }
  }
}

module.exports = {
  executeCode,
};