const API_URL = "http://localhost:5000/api";

export const reviewCodeWithAI = async (language, code) => {
  const response = await fetch(`${API_URL}/ai/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language,
      code,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "AI review failed.");
  }

  return data;
};