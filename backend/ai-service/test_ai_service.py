# -*- coding: utf-8 -*-
"""
test_ai_service.py - Quick validation script to test AI service imports and LangGraph graph.
Run with: python test_ai_service.py
"""
import os
import sys

print("Testing AI Service Imports...")

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("OK - python-dotenv loaded")
except ImportError as e:
    print(f"FAIL - python-dotenv: {e}")
    sys.exit(1)

try:
    import fastapi
    print(f"OK - FastAPI {fastapi.__version__}")
except ImportError as e:
    print(f"FAIL - FastAPI: {e}")

try:
    import uvicorn
    print("OK - Uvicorn")
except ImportError as e:
    print(f"FAIL - Uvicorn: {e}")

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    print("OK - langchain-google-genai")
except ImportError as e:
    print(f"FAIL - langchain-google-genai: {e}")

try:
    from langgraph.graph import StateGraph, END
    print("OK - LangGraph StateGraph")
except ImportError as e:
    print(f"FAIL - LangGraph: {e}")

try:
    from langchain_core.messages import HumanMessage, SystemMessage
    print("OK - langchain-core messages")
except ImportError as e:
    print(f"FAIL - langchain-core: {e}")

try:
    from sse_starlette.sse import EventSourceResponse
    print("OK - sse-starlette EventSourceResponse")
except ImportError as e:
    print(f"FAIL - sse-starlette: {e}")

print("\nTesting Graph Construction...")
try:
    from graph import debate_graph
    print("OK - LangGraph debate_graph compiled")
    print(f"   Nodes: {list(debate_graph.nodes)}")
except Exception as e:
    print(f"FAIL - Graph construction: {e}")

print("\nChecking GEMINI_API_KEY...")
api_key = os.getenv("GEMINI_API_KEY")
if api_key and len(api_key) > 10:
    print(f"OK - GEMINI_API_KEY present: {api_key[:8]}...")
else:
    print("WARNING - GEMINI_API_KEY not set or too short")

print("\nAll AI Service validation checks complete!")
