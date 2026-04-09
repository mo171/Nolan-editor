import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    # Use the JWT anon key (starts with eyJ...) from:
    # Supabase Dashboard → Project Settings → API → anon / public key
    key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_KEY")

    if not url or not url.startswith("https://"):
        raise RuntimeError("SUPABASE_URL missing or invalid in .env")
    if not key:
        raise RuntimeError(
            "Supabase API key missing. Set SUPABASE_ANON_KEY in .env.\n"
            "Get it from: Supabase Dashboard → Project Settings → API → anon/public key"
        )

    return create_client(url, key)

supabase: Client = get_supabase_client()
