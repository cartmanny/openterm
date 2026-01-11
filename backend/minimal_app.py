"""Minimal test app to verify Railway deployment works."""
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello from OpenTerm minimal test"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
