const Docker = require("dockerode");
const tar = require("tar-stream");
const languageMap = require("../utils/languageMap");

const docker = new Docker({
  socketPath: "//./pipe/dockerDesktopLinuxEngine",
});

async function executeCode(language, code, input = "") {
  try {
    console.log("Language:", language);

    const config = languageMap[language];
    console.log("Config:", config);

    if (!config) {
      throw new Error("Unsupported language");
    }

    console.log("Creating container...");

    const container = await docker.createContainer({
      Image: config.image,
      Cmd: [
        "bash",
        "-c",
        `
        mkdir -p /usr/src/app &&
        ${config.compile ? config.compile + " &&" : ""}
        echo "${input.replace(/"/g, '\\"')}" | ${config.run}
        `,
      ],
      WorkingDir: "/usr/src/app",
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        NetworkMode: "none",
        Memory: 256 * 1024 * 1024,
      },
    });

    console.log("Container Created:", container.id);

    const pack = tar.pack();

    pack.entry(
      {
        name: config.fileName,
      },
      code
    );

    pack.finalize();

    console.log("Copying file...");

    await container.putArchive(pack, {
      path: "/usr/src/app",
    });

    console.log("Starting container...");

    await container.start();

    console.log("Waiting...");

    await container.wait();

    console.log("Fetching logs...");

    const logs = await container.logs({
      stdout: true,
      stderr: true,
    });

    await container.remove({ force: true });

    return logs
      .toString("utf8")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .trim();

  } catch (err) {
    console.error("========== DOCKER ERROR ==========");
    console.error(err);
    console.error("==================================");
    throw err;
  }
}

module.exports = {
  executeCode,
};