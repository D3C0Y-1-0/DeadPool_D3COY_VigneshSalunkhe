import sys
import os
import uvicorn

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    print("[MIRAGE] Starting FastAPI backend on http://0.0.0.0:8000 ...", flush=True)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=[os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")])
