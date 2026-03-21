"""
Publisher Service — FastAPI application.
Review, edit, approve, and publish pipeline articles to Notion.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import articles, backup, images, pipeline, publish

app = FastAPI(
    title="Publisher Service",
    description="Review and publish pipeline articles to Notion",
    version="0.1.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(articles.router)
app.include_router(publish.router)
app.include_router(images.router)
app.include_router(pipeline.router)
app.include_router(backup.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "publisher"}
