"""
Privacy / HIPAA right-to-erasure endpoint.

DELETE /api/privacy/data — delete all data associated with the authenticated business.
"""

from fastapi import APIRouter, Depends
from app.db.client import get_supabase
from app.routers.auth import get_current_business

router = APIRouter(tags=["privacy"])


@router.delete("/api/privacy/data")
def delete_all_business_data(business: dict = Depends(get_current_business)):
    """
    HIPAA right-to-erasure: permanently delete all stored data for this business.

    Deletes in foreign-key order:
      1. audit_logs
      2. messages (linked to conversations)
      3. conversations
      4. appointments
      5. knowledge_base
    """
    db = get_supabase()
    business_id = str(business["id"])

    # 1. Audit logs
    db.table("audit_logs").delete().eq("business_id", business_id).execute()

    # 2. Messages — delete via conversations belonging to this business
    conv_result = (
        db.table("conversations")
        .select("id")
        .eq("business_id", business_id)
        .execute()
    )
    conversation_ids = [row["id"] for row in (conv_result.data or [])]
    if conversation_ids:
        db.table("messages").delete().in_("conversation_id", conversation_ids).execute()

    # 3. Conversations
    db.table("conversations").delete().eq("business_id", business_id).execute()

    # 4. Appointments
    db.table("appointments").delete().eq("business_id", business_id).execute()

    # 5. Knowledge base
    db.table("knowledge_base").delete().eq("business_id", business_id).execute()

    return {"message": "All data deleted successfully"}
