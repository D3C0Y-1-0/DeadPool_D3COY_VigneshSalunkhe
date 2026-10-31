import csv
import random
from pathlib import Path

first = ["Aarav", "Diya", "Rohan", "Sneha", "Karan", "Meera", "Ishaan", "Anaya", "Vikram", "Neha"]
last = ["Sharma", "Patel", "Iyer", "Reddy", "Singh", "Nair", "Gupta", "Das", "Mehta", "Joshi"]

out_dir = Path(__file__).resolve().parent.parent / "honeypots" / "cowrie" / "honeyfs" / "srv" / "backups"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "customer_data_2026.csv"

random.seed(42)

with open(out_file, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "name", "email", "card_last4", "balance"])
    for i in range(1, 201):
        n = f"{random.choice(first)} {random.choice(last)}"
        w.writerow([i, n, f"user{i}@acme-corp.example", random.randint(1000, 9999), round(random.uniform(10, 9000), 2)])
    w.writerow([201, "Canary Test", "ht001.canary@acme-corp.example", "0000", "0.00"])

print(f"Generated 201 customer records with canary honeytoken at {out_file}")
