import { NextResponse } from "next/server";
import { z } from "zod";

import { OPENAI_MODEL, openaiClient } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SuggestionsRequestSchema = z.object({
  topic: z.string().trim().min(1).max(80),
  correct: z.boolean(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  hallucination: z.string().trim().min(1).max(240).optional(),
  correction: z.string().trim().min(1).max(240).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      topic,
      correct,
      difficulty = "medium",
      hallucination,
      correction,
    } = SuggestionsRequestSchema.parse(body);

    const openai = openaiClient();

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You propose next-step topic suggestions for an educational game. Output must be STRICT JSON. No markdown.",
        },
        {
          role: "user",
          content: [
            `Previous topic: ${topic}`,
            `Difficulty: ${difficulty}`,
            `Player was correct: ${correct}`,
            hallucination ? `Hallucination statement: ${hallucination}` : null,
            correction ? `Corrected statement: ${correction}` : null,
            "Return topic suggestions in three buckets:",
            "- continue: closely-related topics at similar difficulty",
            "- deeper: more specific / more advanced related topics",
            "- switch: fresh, random safe topics",
            "Rules: topics 2–6 words, avoid controversial/sensitive topics, avoid very niche proper nouns.",
            "If the player was wrong, bias continue/deeper toward fundamentals and clarity.",
            "If the player was right, bias deeper toward more challenging/precise subtopics.",
            'Return JSON in this format: {"continue": ["topic1", "topic2"], "deeper": ["topic1", "topic2", "topic3"], "switch": ["topic1", "topic2", "topic3"]}',
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(content);

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.flatten() },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
