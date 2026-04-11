import { NextResponse } from "next/server";
import { searchCards } from "@/lib/apis/pokemon-tcg";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const cards = await searchCards(query.trim());
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Card search error:", error);
    return NextResponse.json(
      { error: "Failed to search cards" },
      { status: 500 }
    );
  }
}
