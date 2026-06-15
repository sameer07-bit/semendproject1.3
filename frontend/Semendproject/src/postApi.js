import axios from "axios";

const PostAPI = axios.create({
    baseURL: "http://localhost:8080/api/posts"
});

export default PostAPI;