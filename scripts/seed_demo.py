import json
import urllib.request
import os
from pathlib import Path

def main():
    fixture = Path(__file__).resolve().parent.parent / "fixtures" / "golden_events.json"
    if not fixture.exists():
        print(f"Fixture {fixture} does not exist yet. Run demo and dump /api/events first.")
        return

    with open(fixture, "r", encoding="utf-8") as f:
        events = json.load(f)

    print(f"Seeding {len(events)} events to API...")
    req = urllib.request.Request(
        "http://localhost:8000/api/_seed",
        data=json.dumps(events).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        print("Seed response:", resp.read().decode())
    except Exception as e:
        print(f"Failed to seed: {e}")

if __name__ == "__main__":
    main()
