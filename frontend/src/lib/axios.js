import axios from 'axios';
import backendURL from "./backendUrl";

const axiosInstance = axios.create({
    baseURL: `${backendURL}/api`,
    withCredentials: true,
  });
  
export default axiosInstance
