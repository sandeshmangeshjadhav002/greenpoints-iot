from database import get_admin_client
admin = get_admin_client()

print("=== Cleaners ===")
r = admin.table("user_roles").select("user_id, role").eq("role", "cleaner").execute()
print(r.data)

print("\n=== Alert notifications ===")
r2 = admin.table("notifications").select("id, title, category, created_at").eq("category", "Alert").limit(5).execute()
print(r2.data)

print("\n=== Smart bins fill levels ===")
r3 = admin.table("smart_bins").select("code, fill_level, health").execute()
print(r3.data)
