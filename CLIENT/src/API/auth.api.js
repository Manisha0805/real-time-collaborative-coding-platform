import axios from "axios";

const API = axios.create({
  baseURL:
    "https://real-time-collaborative-coding-platform-8rvo.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const signupUser = (userData) => {
  return API.post("/auth/signup", userData);
};

export const loginUser = (userData) => {
  return API.post("/auth/login", userData);
};

export const firebaseLogin = (firebaseToken) => {
  return API.post("/auth/firebase", {
    token: firebaseToken,
  });
};
