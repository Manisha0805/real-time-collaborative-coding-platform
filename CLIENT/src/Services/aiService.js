const API_URL = import.meta.env.VITE_API_URL;

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