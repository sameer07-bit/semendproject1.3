from fastapi import FastAPI
import requests

app = FastAPI()

SPRING_BOOT_URL = "http://localhost:8080"


@app.get("/")
def home():
    return {
        "message": "FastAPI Gateway Running"
    }


@app.post("/login")
def login(user: dict):

    response = requests.post(
        f"{SPRING_BOOT_URL}/auth/login",
        json=user
    )

    return response.json()