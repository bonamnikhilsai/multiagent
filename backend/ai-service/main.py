"""
main.py — FastAPI application entry point.
Exposes the POST /stream_debate SSE endpoint.
Streams agent output chunks tagged with [RESEARCHER], [CRITIC], or [SYNTHESIZER].
"""

import os
import json
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Debate Arena AI Service",
    description="Multi-Agent adversarial debate engine powered by LangGraph & Groq",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DebateRequest(BaseModel):
    query: str
    history: list[dict] = []
    session_id: str | None = None
    max_rounds: int = 3


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "service": "debate-arena-ai",
        "version": "2.0.0",
        "models": {
            "researcher": "llama-3.3-70b-versatile",
            "critic": "llama-3.3-70b-versatile",
            "synthesizer": "llama-3.3-70b-versatile",
        }
    }


@app.post("/stream_debate")
async def stream_debate(request: DebateRequest):
    """
    Execute the adversarial debate workflow and stream agent chunks via SSE.
    Each SSE event carries text prefixed with [RESEARCHER], [CRITIC], or [SYNTHESIZER].
    Supports configurable number of rounds (default: 3).
    """
    from graph import build_debate_graph

    # Build a fresh graph instance per request (avoids state leakage)
    debate_graph = build_debate_graph()

    async def event_generator() -> AsyncGenerator[str, None]:
        initial_state = {
            "history": request.history,
            "query": request.query,
            "researcher_output": "",
            "critic_output": "",
            "current_round": 1,
            "max_rounds": min(max(request.max_rounds, 1), 5),  # clamp between 1-5
            "debate_log": [],
            "final_synthesis": "",
        }

        try:
            async for event in debate_graph.astream_events(initial_state, version="v2"):
                if event["event"] == "on_chat_model_stream":
                    node = event["metadata"].get("langgraph_node")
                    chunk = event["data"]["chunk"].content
                    if chunk:
                        if node == "researcher":
                            yield f"data: [RESEARCHER]{chunk}\n\n"
                        elif node == "critic":
                            yield f"data: [CRITIC]{chunk}\n\n"
                        elif node == "synthesizer":
                            yield f"data: [SYNTHESIZER]{chunk}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"[STREAM ERROR] {tb}")
            yield f"data: [ERROR]{str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info"
    )
