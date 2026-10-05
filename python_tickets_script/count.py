import firebase_admin
from firebase_admin import credentials, firestore
import os

def load_env():
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
        if os.path.exists(env_path):
            load_dotenv(dotenv_path=env_path)
            return
    except ImportError:
        pass

    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local"),
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local"),
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    if key not in os.environ:
                        os.environ[key] = val
            break

load_env()

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

firebase_key_path = os.getenv(
    "FIREBASE_KEY_PATH",
    os.path.join(PROJECT_ROOT, "mirchi-ticket-website.json")
    if os.path.exists(os.path.join(PROJECT_ROOT, "mirchi-ticket-website.json"))
    else "/Users/srikar/mirchi-ticket-website/mirchi-ticket-website.json"
)

# Initialize Firebase Admin SDK
cred = credentials.Certificate(firebase_key_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

COLLECTION_NAME = os.getenv("EVENT_NAME", "Gabes 9-12")

def count_tickets():
    tickets_ref = db.collection(COLLECTION_NAME)
    tickets = tickets_ref.stream()
    count = sum(1 for _ in tickets)
    print(f"Total tickets in '{COLLECTION_NAME}': {count}")

if __name__ == "__main__":
    count_tickets()