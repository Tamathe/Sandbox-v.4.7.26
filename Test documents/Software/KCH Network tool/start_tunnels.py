"""Start ngrok tunnels for the KCH Network RAG system.

Usage:
    python start_tunnels.py

Prerequisites:
    1. ngrok installed and auth token configured:
       ngrok config add-authtoken YOUR_TOKEN
    2. Backend running on port 8000
    3. Frontend running on port 3000

This script:
    1. Starts an ngrok tunnel for the backend (port 8000)
    2. Gets the public backend URL
    3. Updates frontend/.env.local with the ngrok backend URL
    4. Starts an ngrok tunnel for the frontend (port 3000)
    5. Prints the shareable frontend URL
"""

import subprocess
import time
import json
import sys
import os
from pathlib import Path

NGROK_PATH = r"C:\tmp\ngrok-bin\ngrok.exe"
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_ENV = BASE_DIR / "frontend" / ".env.local"

# Check ngrok exists
if not os.path.exists(NGROK_PATH):
    # Try system PATH
    NGROK_PATH = "ngrok"


def get_ngrok_tunnels():
    """Get current ngrok tunnel URLs from the local API."""
    try:
        import urllib.request
        req = urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels")
        data = json.loads(req.read().decode())
        return data.get("tunnels", [])
    except Exception:
        return []


def start_tunnel(port, name="tunnel"):
    """Start an ngrok tunnel on the given port."""
    proc = subprocess.Popen(
        [NGROK_PATH, "http", str(port), "--log=stdout"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    # Wait for tunnel to establish
    for _ in range(20):
        time.sleep(1)
        tunnels = get_ngrok_tunnels()
        for t in tunnels:
            if str(port) in t.get("config", {}).get("addr", ""):
                url = t["public_url"]
                if url.startswith("https://"):
                    return url, proc
    return None, proc


def main():
    print("=" * 60)
    print("  KCH Network RAG - ngrok Tunnel Setup")
    print("=" * 60)

    # Check backend is running
    try:
        import urllib.request
        urllib.request.urlopen("http://localhost:8000/api/health")
        print("\n[OK] Backend running on port 8000")
    except Exception:
        print("\n[ERROR] Backend not running on port 8000!")
        print("  Start it first: cd backend && venv\\Scripts\\python -m uvicorn app.main:app --reload")
        sys.exit(1)

    # Check frontend is running
    try:
        import urllib.request
        urllib.request.urlopen("http://localhost:3000", timeout=5)
        print("[OK] Frontend running on port 3000")
    except Exception:
        print("[WARN] Frontend may not be running on port 3000")
        print("  Start it: cd frontend && npx next dev --turbo")

    # Start backend tunnel
    print("\nStarting backend tunnel (port 8000)...")
    backend_url, backend_proc = start_tunnel(8000, "backend")

    if not backend_url:
        print("[ERROR] Failed to start backend tunnel.")
        print("Make sure ngrok is configured: ngrok config add-authtoken YOUR_TOKEN")
        sys.exit(1)

    print(f"[OK] Backend tunnel: {backend_url}")

    # Update frontend env with ngrok backend URL
    env_content = f"NEXT_PUBLIC_API_URL={backend_url}/api\n"
    FRONTEND_ENV.write_text(env_content)
    print(f"\n[OK] Updated {FRONTEND_ENV.name} with backend URL")
    print("     >> RESTART the frontend dev server to pick up the new URL <<")
    print("     (Ctrl+C the frontend, then: npx next dev --turbo)")

    input("\nPress Enter after restarting the frontend...")

    # Start frontend tunnel
    print("\nStarting frontend tunnel (port 3000)...")
    frontend_url, frontend_proc = start_tunnel(3000, "frontend")

    if not frontend_url:
        print("[ERROR] Failed to start frontend tunnel.")
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print(f"  SHARE THIS URL:")
    print(f"  {frontend_url}")
    print(f"{'=' * 60}")
    print(f"\nBackend API:  {backend_url}")
    print(f"Frontend UI:  {frontend_url}")
    print(f"\nLogin: admin@kch.org / Admin123")
    print(f"\nNote: ngrok free tier shows a warning page on first visit.")
    print(f"      Users just click 'Visit Site' to proceed.")
    print(f"\nPress Ctrl+C to stop tunnels.")

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down tunnels...")
        backend_proc.terminate()
        frontend_proc.terminate()

        # Restore local env
        FRONTEND_ENV.write_text("NEXT_PUBLIC_API_URL=http://localhost:8000/api\n")
        print("Restored frontend .env.local to localhost")


if __name__ == "__main__":
    main()
