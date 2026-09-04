"""Vercel Serverless Function Entrypoint for FastAPI backend.

Vercel's @vercel/python builder looks for the `app` symbol in `api/index.py`.
"""
import sys
import os

# Add root directory to python path for Vercel serverless execution
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

# Vercel serverless function export
__all__ = ["app"]
