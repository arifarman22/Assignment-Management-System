import axios from "axios";
import { AuthUser } from "@/types";

const api = axios.create({ baseURL: "http://localhost:8000" });

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

export default api;
