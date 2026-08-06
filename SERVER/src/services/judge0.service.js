const axios = require("axios");

const JUDGE0_URL = process.env.JUDGE0_URL;

async function submitCode(language_id, source_code, stdin = "") {
  const response = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    {
      language_id,
      source_code,
      stdin,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.token;
}

async function getResult(token) {
  while (true) {
    const response = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`
    );

    const result = response.data;

    if (result.status.id <= 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    return result;
  }
}

module.exports = {
  submitCode,
  getResult,
};