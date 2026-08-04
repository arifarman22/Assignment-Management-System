import axios from "axios";
import { AuthUser } from "@/types";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000" });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("auth");
    if (raw) {
      const auth: AuthUser = JSON.parse(raw);
      config.headers.Authorization = `Bearer ${auth.access_token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("auth");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    if (status === 429) {
      error.message = "Too many requests. Please slow down.";
    }
    // Surface Pydantic validation errors as a readable string
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
      error.message = detail.map((d: any) => d.msg).join(", ");
    } else if (typeof detail === "string") {
      error.message = detail;
    }
    return Promise.reject(error);
  }
);

export default api;
