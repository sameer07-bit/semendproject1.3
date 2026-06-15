import axios from "axios";
import { API_BASE_URL } from "./api";

const PostAPI = axios.create({
    baseURL: `${API_BASE_URL}/api/posts`
});

export default PostAPI;