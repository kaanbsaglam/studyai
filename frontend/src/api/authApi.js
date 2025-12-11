import api from "./axiosClient";

export function registerUser(email, password) {
  return api.post("/auth/register", { email, password });
}

export function loginUser(email, password) {
  return api.post("/auth/login", { email, password });
}
