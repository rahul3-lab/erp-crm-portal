import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any;
  if (anyErr?.response?.data?.errors?.length) {
    return anyErr.response.data.errors.map((e: any) => `${e.path}: ${e.message}`).join(", ");
  }
  return anyErr?.response?.data?.message || anyErr?.message || "Something went wrong";
}
