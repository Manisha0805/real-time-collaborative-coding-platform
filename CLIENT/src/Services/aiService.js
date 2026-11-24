import api, { apiErrorMessage } from "../API/client";

export const reviewCodeWithAI = async (language, code) => {
  try {
    const response = await api.post("/ai/review", { language, code });
    return response.data;
  } catch (error) {
    throw new Error(apiErrorMessage(error, "AI review failed."));
  }
};
