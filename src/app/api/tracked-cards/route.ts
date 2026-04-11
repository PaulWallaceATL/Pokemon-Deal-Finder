import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrackedCards, addTrackedCard } from "@/lib/db/tracked-cards";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cards = await getTrackedCards(supabase);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Failed to fetch tracked cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracked cards" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cardName, cardSet, pokemonTcgId, imageUrl } = body;

    if (!cardName) {
      return NextResponse.json(
        { error: "cardName is required" },
        { status: 400 }
      );
    }

    const card = await addTrackedCard(supabase, {
      user_id: user.id,
      card_name: cardName,
      card_set: cardSet ?? null,
      pokemon_tcg_id: pokemonTcgId ?? null,
      image_url: imageUrl ?? null,
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error("Failed to add tracked card:", error);
    return NextResponse.json(
      { error: "Failed to add tracked card" },
      { status: 500 }
    );
  }
}
