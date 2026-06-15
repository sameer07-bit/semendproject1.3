from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# Enable CORS for Gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPRING_BOOT_URL = "http://localhost:8080"
NODE_SERVICE_URL = "http://localhost:5000"


@app.get("/")
def home():
    return {
        "message": "FastAPI Gateway Running"
    }


# Forward Auth & Posts to Spring Boot
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_spring_auth(path: str, request: Request):
    return await proxy_request(f"{SPRING_BOOT_URL}/api/auth/{path}", request)


@app.api_route("/api/posts/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_spring_posts(path: str, request: Request):
    return await proxy_request(f"{SPRING_BOOT_URL}/api/posts/{path}", request)


# Forward Comments & Likes to Node.js
@app.api_route("/api/comments/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_node_comments(path: str, request: Request):
    return await proxy_request(f"{NODE_SERVICE_URL}/api/comments/{path}", request)


@app.api_route("/api/likes/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_node_likes(path: str, request: Request):
    return await proxy_request(f"{NODE_SERVICE_URL}/api/likes/{path}", request)


async def proxy_request(url: str, request: Request):
    method = request.method
    headers = {key: value for key, value in request.headers.items() if key.lower() != "host"}
    params = request.query_params
    body = await request.body()

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            data=body,
            timeout=10
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )
    except requests.exceptions.RequestException as e:
        return Response(
            content=f"Gateway Error: Service unavailable. {str(e)}",
            status_code=503
        )