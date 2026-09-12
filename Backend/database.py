from supabase import Client, create_client
from config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

_supabase_admin: Client | None = None


def get_admin_client() -> Client:
    global _supabase_admin
    if _supabase_admin is None:
        if not settings.supabase_service_role_key:
            return supabase
        _supabase_admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_admin
