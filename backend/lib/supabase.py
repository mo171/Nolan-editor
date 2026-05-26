import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    # Prefer a server-side key when present. Fall back to the public anon/publishable key.
    key = service_role_key or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_KEY")

    if not url or not url.startswith("https://"):
        raise RuntimeError("SUPABASE_URL missing or invalid. Set it in Railway environment variables.")
    if not key:
        raise RuntimeError(
            "Supabase API key missing. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in Railway environment variables.\n"
            "Get them from: Supabase Dashboard → Project Settings → API"
        )

    return create_client(url, key)

supabase: Client = get_supabase_client()
