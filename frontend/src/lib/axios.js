import axios from "axios";
import backendUrl from "./backendUrl";

const axiosInstance = axios.create({
  baseURL: `${backendUrl}/api`,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;