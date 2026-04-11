import os
import sys

# Add project root to path
sys.path.append(os.path.abspath('.'))

from lib.supabase import supabase
import sys

def test_delete(project_id):
    print(f"Attempting to delete project: {project_id}")
    try:
        # Check if project exists
        res = supabase.table("projects").select("*").eq("id", project_id).execute()
        if not res.data:
            print("Project not found.")
            return

        print(f"Project found: {res.data[0]['title']}")

        # Attempt delete
        delete_res = supabase.table("projects").delete().eq("id", project_id).execute()
        print("Delete response data:", delete_res.data)
        
    except Exception as e:
        print(f"Error during deletion: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Get first project ID
        res = supabase.table("projects").select("id").limit(1).execute()
        if res.data:
            test_delete(res.data[0]['id'])
        else:
            print("No projects found in DB.")
    else:
        test_delete(sys.argv[1])
