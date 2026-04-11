import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeTrackedCard } from "@/lib/db/tracked-cards";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await removeTrackedCard(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove tracked card:", error);
    return NextResponse.json(
      { error: "Failed to remove tracked card" },
      { status: 500 }
    );
  }
}
