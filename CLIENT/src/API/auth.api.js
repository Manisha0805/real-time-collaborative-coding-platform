import api from "./client";

export const signupUser = (userData) => {
  return api.post("/auth/signup", userData);
};

export const loginUser = (userData) => {
  return api.post("/auth/login", userData);
};

export const firebaseLogin = (firebaseToken) => {
  return api.post("/auth/firebase", {
    token: firebaseToken,
  });
};
