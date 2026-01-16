import { NextResponse } from "next/server";
import { z } from "zod";

import { OPENAI_MODEL, openaiClient } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RoundRequestSchema = z.object({
  topic: z.string().trim().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

type Difficulty = z.infer<typeof RoundRequestSchema>["difficulty"];

function difficultyInstruction(difficulty: Difficulty) {
  switch (difficulty) {
    case "easy":
      return "Make the false statement noticeably wrong (but still about the topic).";
    case "hard":
      return "Make the false statement subtle and plausible, but still clearly false with a short explanation.";
    case "medium":
    default:
      return "Make the false statement plausible, but unambiguously false with a short explanation.";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, difficulty = "medium" } = RoundRequestSchema.parse(body);

    const openai = openaiClient();

    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are creating a fast, fun educational game. Output must be STRICT JSON. No markdown. No extra keys.",
        },
        {
          role: "user",
          content: [
            `Topic: ${topic}`,
            `Difficulty: ${difficulty}`,
            "Create exactly 4 single-sentence statements about the topic.",
            "Exactly ONE statement must be intentionally false (a hallucination) but plausible.",
            "The other THREE statements must be true, common-knowledge, and not debatable.",
            "Avoid: opinions, sensitive/graphic content, highly specific dates, and obscure trivia.",
            "Do NOT use list numbering in the statement text.",
            "Provide a short explanation of what is false about the hallucination, and a corrected version of it.",
            "IDs must be A, B, C, D and answerId must be one of them.",
            "Shuffle the order so the hallucination is not always in the same position.",
            difficultyInstruction(difficulty),
          ].join("\n"),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "hallucination_round",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              topic: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string", enum: ["A", "B", "C", "D"] },
                    text: { type: "string" },
                  },
                  required: ["id", "text"],
                },
              },
              answerId: { type: "string", enum: ["A", "B", "C", "D"] },
              explanation: { type: "string" },
              correction: { type: "string" },
            },
            required: [
              "topic",
              "difficulty",
              "options",
              "answerId",
              "explanation",
              "correction",
            ],
          },
        },
      },
    });

    const data = JSON.parse(response.output_text);

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
