import axios from "axios";
import { API_BASE_URL } from "./api";

const PostAPI = axios.create({
    baseURL: `${API_BASE_URL}/api/posts`
});

// Automatically inject JWT token from localStorage in requests
PostAPI.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default PostAPI;