import { NextResponse } from "next/server";

import { OPENAI_MODEL, openaiClient } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const countRaw = url.searchParams.get("count") ?? "5";
    const count = Math.min(Math.max(Number(countRaw) || 5, 3), 8);

    const openai = openaiClient();

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You generate short, fun, safe topic ideas for a game where players spot one intentionally false statement among true ones.",
        },
        {
          role: "user",
          content: `Give me ${count} random topics. Keep each topic 2–5 words. Avoid controversial, sensitive, or hyper-niche topics. Return JSON only in this format: {"topics": ["topic1", "topic2", ...]}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(content);

    // Basic normalization
    const topics = (data.topics as unknown[])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, count);

    return NextResponse.json({ topics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
