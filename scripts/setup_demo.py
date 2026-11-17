"""Create a fresh local demo password; store only its hash in .env."""
import hashlib
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    raise SystemExit(".env already exists. Keep it, or remove that file deliberately to generate a new demo login.")
password = secrets.token_urlsafe(24)
target.write_text("DEMO_PASSWORD_SHA256=" + hashlib.sha256(password.encode()).hexdigest() + "\n", encoding="utf-8")
print("Demo username: reviewer")
print("Demo password (store privately; not in your repository): " + password)
print("Created .env with the password hash only. See DEPLOYMENT.md.")
