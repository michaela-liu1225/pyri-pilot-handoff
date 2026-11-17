"""Run a password-protected local process for the no-Docker deployment route."""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
config = root / ".env"
if not config.exists():
    raise SystemExit("Run python scripts/setup_demo.py first.")
for line in config.read_text(encoding="utf-8").splitlines():
    if line.startswith("DEMO_PASSWORD_SHA256="):
        os.environ["DEMO_PASSWORD_SHA256"] = line.split("=", 1)[1].strip()
if not os.environ.get("DEMO_PASSWORD_SHA256"):
    raise SystemExit("No password hash found in .env")
sys.path.insert(0, str(root))
os.chdir(root)
import uvicorn
uvicorn.run("app:app", host="127.0.0.1", port=8000)
