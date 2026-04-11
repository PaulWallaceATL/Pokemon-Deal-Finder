import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface VisionGradeResponse {
  predictedGrade: number;
  centering: {
    frontLR: number;
    frontTB: number;
  };
  corners: string;
  edges: string;
  surface: string;
  confidence: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You are an expert PSA card grader specializing in Pokemon TCG cards, using the 2026 PSA grading standards.

Analyze the provided card image and estimate what PSA grade this raw card would likely receive if submitted for grading.

PSA 2026 Centering Standards (front / back):
- PSA 10 (GEM-MT): 55/45 front, 75/25 back. Virtually perfect. Four sharp corners, full gloss, no staining.
- PSA 9 (MINT): 60/40 front, 90/10 back. One minor flaw allowed.
- PSA 8 (NM-MT): 65/35 front, 90/10 back. Appears Mint at first glance, very slight flaws upon inspection.
- PSA 7 (NM): 70/30 front, 90/10 back. Slight surface wear, slight fraying at corners.
- PSA 6 (EX-MT): 80/20 front, 90/10 back. Visible surface wear, slight corner fraying.
- PSA 5 (EX): 85/15 front, 90/10 back. Minor rounding of corners, visible wear.

A 5% leeway is given on front centering for grades 7 and above based on eye appeal.

You MUST respond with ONLY valid JSON in this exact format:
{
  "predictedGrade": <number between 1 and 10, half-points allowed e.g. 8.5>,
  "centering": {
    "frontLR": <wider-side percentage, e.g. 55 for 55/45>,
    "frontTB": <wider-side percentage, e.g. 52 for 52/48>
  },
  "corners": "<sharp|slight_wear|moderate_wear|rounded>",
  "edges": "<clean|slight_fraying|moderate_wear|heavy_wear>",
  "surface": "<clean|minor_imperfections|scratches|heavy_wear>",
  "confidence": "<high|medium|low>"
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, condition } = body as {
      imageUrl: string;
      condition: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 503 }
      );
    }

    const userPrompt = condition
      ? `Analyze this Pokemon card image. The seller lists the condition as "${condition}". Estimate the PSA grade.`
      : `Analyze this Pokemon card image and estimate the PSA grade.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        { error: "AI analysis failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    // Parse JSON from the response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed: VisionGradeResponse = JSON.parse(jsonStr);

    // Validate the response shape
    if (
      typeof parsed.predictedGrade !== "number" ||
      parsed.predictedGrade < 1 ||
      parsed.predictedGrade > 10
    ) {
      return NextResponse.json(
        { error: "Invalid grade in AI response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      predictedGrade: parsed.predictedGrade,
      centering: {
        frontLR: parsed.centering?.frontLR ?? 50,
        frontTB: parsed.centering?.frontTB ?? 50,
      },
      corners: parsed.corners,
      edges: parsed.edges,
      surface: parsed.surface,
      confidence: parsed.confidence ?? "medium",
    });
  } catch (error) {
    console.error("Grade prediction error:", error);
    return NextResponse.json(
      { error: "Failed to predict grade" },
      { status: 500 }
    );
  }
}
