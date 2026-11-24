const { Sequelize } = require("sequelize");
const { config } = require("./env");

const { db } = config;

const sslOptions = () => {
  if (!db.ssl) return undefined;
  const ssl = { rejectUnauthorized: db.sslRejectUnauthorized };
  if (db.sslCa) {
    // Accept a raw PEM, or base64 of a PEM (easier for env-var UIs)
    ssl.ca = db.sslCa.includes("BEGIN CERTIFICATE")
      ? db.sslCa.replace(/\\n/g, "\n")
      : Buffer.from(db.sslCa, "base64").toString("utf8");
  }
  return ssl;
};

const common = {
  dialect: "mysql",
  logging: false,
  dialectOptions: {
    charset: "utf8mb4",
    ...(db.ssl ? { ssl: sslOptions() } : {}),
  },
  pool: { max: db.poolMax, min: 0, acquire: 30000, idle: 10000 },
  define: {
    timestamps: true,
    freezeTableName: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
};

const sequelize = db.url
  ? new Sequelize(db.url, common)
  : new Sequelize(db.name, db.user, db.password, {
      ...common,
      host: db.host,
      port: db.port,
    });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hosted databases can take a few seconds to wake up, so retry with backoff.
const connectDB = async () => {
  const attempts = Math.max(1, db.connectRetries);
  for (let i = 1; i <= attempts; i++) {
    try {
      await sequelize.authenticate();
      console.log("MySQL connected");
      return;
    } catch (error) {
      console.error(`Database connection failed (attempt ${i}/${attempts}): ${error.message}`);
      if (i === attempts) process.exit(1);
      await sleep(Math.min(1000 * 2 ** (i - 1), 10000));
    }
  }
};

module.exports = { sequelize, connectDB };
