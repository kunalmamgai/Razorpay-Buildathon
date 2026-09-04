"""Test Vercel Serverless Function entrypoint import and request routing.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.index import app
from fastapi.testclient import TestClient


def test_vercel_serverless_handler():
    print("=== Testing Vercel Serverless Function Entrypoint ===")

    client = TestClient(app)

    # 1. Test root endpoint '/'
    response = client.get("/")
    print(f" - Root Endpoint HTTP Status: {response.status_code}")
    print(f" - Root Endpoint Data: {response.json()}")

    assert response.status_code == 200, "Failed: Root endpoint must return HTTP 200"
    assert response.json()["name"] == "RazorCage AI (Multi-Tenant)", "Failed: Title mismatch"

    # 2. Test API Merchants endpoint '/api/merchants'
    merchants_res = client.get("/api/merchants")
    print(f" - Merchants Endpoint HTTP Status: {merchants_res.status_code}")
    print(f" - Merchants Count: {len(merchants_res.json().get('merchants', []))}")

    assert merchants_res.status_code == 200, "Failed: Merchants endpoint must return HTTP 200"

    print("\n[SUCCESS] VERCEL SERVERLESS HANDLER VERIFIED 100% CLEAN!")


if __name__ == "__main__":
    test_vercel_serverless_handler()
