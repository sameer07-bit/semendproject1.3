from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import requests
import os

app = FastAPI()

# Enable CORS for Gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPRING_BOOT_URL = os.environ.get("SPRING_BOOT_URL", "http://localhost:8080")
NODE_SERVICE_URL = os.environ.get("NODE_SERVICE_URL", "http://localhost:5000")


@app.get("/api/health")
def health():
    return {
        "status": "FastAPI Gateway Running",
        "spring_boot_url": SPRING_BOOT_URL,
        "node_service_url": NODE_SERVICE_URL
    }


# Forward Auth & Posts to Spring Boot
@app.api_route("/api/auth", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_spring_auth_root(request: Request):
    return await proxy_request(f"{SPRING_BOOT_URL}/api/auth", request)


@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_spring_auth(path: str, request: Request):
    url = f"{SPRING_BOOT_URL}/api/auth/{path}"
    if url.endswith("/"):
        url = url[:-1]
    return await proxy_request(url, request)


@app.api_route("/api/posts", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_spring_posts_root(request: Request):
    return await proxy_request(f"{SPRING_BOOT_URL}/api/posts", request)


@app.api_route("/api/posts/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_spring_posts(path: str, request: Request):
    url = f"{SPRING_BOOT_URL}/api/posts/{path}"
    if url.endswith("/"):
        url = url[:-1]
    return await proxy_request(url, request)


# Forward Comments & Likes to Node.js
@app.api_route("/api/comments", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_node_comments_root(request: Request):
    return await proxy_request(f"{NODE_SERVICE_URL}/api/comments", request)


@app.api_route("/api/comments/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_node_comments(path: str, request: Request):
    url = f"{NODE_SERVICE_URL}/api/comments/{path}"
    if url.endswith("/"):
        url = url[:-1]
    return await proxy_request(url, request)


@app.api_route("/api/likes", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_node_likes_root(request: Request):
    return await proxy_request(f"{NODE_SERVICE_URL}/api/likes", request)


@app.api_route("/api/likes/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_node_likes(path: str, request: Request):
    url = f"{NODE_SERVICE_URL}/api/likes/{path}"
    if url.endswith("/"):
        url = url[:-1]
    return await proxy_request(url, request)


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
            timeout=15
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


# --- Serve React Frontend Static Files & Support SPA Routing Fallback ---
# Resolve frontend build output relative to this file's position
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/Semendproject/dist"))

# Mount assets folder if it exists
assets_path = os.path.join(FRONTEND_DIR, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


# SPA router fallback
@app.get("/{path:path}")
async def serve_frontend(path: str):
    if not path or path == "/":
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Gateway Running. Frontend not yet compiled."}
        
    # Check if a specific file exists in FRONTEND_DIR (like icons, favicon, etc.)
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Fallback to index.html for SPA routing (React Router client routes)
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Gateway Running. Frontend not yet compiled."}
