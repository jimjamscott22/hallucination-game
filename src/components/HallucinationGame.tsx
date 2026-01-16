"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Difficulty = "easy" | "medium" | "hard";
type OptionId = "A" | "B" | "C" | "D";

type TopicListResponse = {
  topics: string[];
};

type RoundResponse = {
  topic: string;
  difficulty: Difficulty;
  options: { id: OptionId; text: string }[];
  answerId: OptionId;
  explanation: string;
  correction: string;
};

type SuggestionsResponse = {
  continue: string[];
  deeper: string[];
  switch: string[];
};

const TIPS = [
  "Hallucinations often sound confident but skip easy-to-check details.",
  "Watch for absolute words: always, never, everyone, no one.",
  "If a claim feels oddly specific (exact numbers/dates), be skeptical.",
  "Look for category mistakes (mixing up what a thing is vs. what it does).",
  "True statements usually fit together; hallucinations often feel slightly off.",
];

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }

  return data as T;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function prettyDifficulty(d: Difficulty) {
  if (d === "easy") return "Easy";
  if (d === "hard") return "Hard";
  return "Medium";
}

export default function HallucinationGame() {
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [topic, setTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [round, setRound] = useState<RoundResponse | null>(null);
  const [selectedId, setSelectedId] = useState<OptionId | null>(null);
  const [revealed, setRevealed] = useState(false);

  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);

  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingRound, setLoadingRound] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const tip = useMemo(() => {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }, [rounds]);

  const correct = revealed && round && selectedId === round.answerId;

  async function loadTopics() {
    setError(null);
    setLoadingTopics(true);
    try {
      const data = await fetchJson<TopicListResponse>("/api/topics?count=5", {
        method: "GET",
      });
      setTopics(data.topics);
    } catch (e) {
      setTopics([]);
      setError(e instanceof Error ? e.message : "Failed to load topics");
    } finally {
      setLoadingTopics(false);
    }
  }

  async function startRound(nextTopic?: string) {
    const chosen = (nextTopic ?? topic ?? topicInput).trim();
    if (!chosen) return;

    setError(null);
    setSuggestions(null);
    setSelectedId(null);
    setRevealed(false);

    setLoadingRound(true);
    try {
      const data = await fetchJson<RoundResponse>("/api/round", {
        method: "POST",
        body: JSON.stringify({ topic: chosen, difficulty }),
      });

      setTopic(data.topic);
      setTopicInput(data.topic);
      setRound(data);
    } catch (e) {
      setRound(null);
      setError(e instanceof Error ? e.message : "Failed to start round");
    } finally {
      setLoadingRound(false);
    }
  }

  async function loadSuggestionsForRound(r: RoundResponse, wasCorrect: boolean) {
    setLoadingSuggestions(true);
    try {
      const hallucinationText =
        r.options.find((o) => o.id === r.answerId)?.text ?? "";

      const data = await fetchJson<SuggestionsResponse>("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({
          topic: r.topic,
          difficulty: r.difficulty,
          correct: wasCorrect,
          hallucination: hallucinationText,
          correction: r.correction,
        }),
      });
      setSuggestions(data);
    } catch (e) {
      // Suggestions are optional; don't hard-fail the game.
      setSuggestions(null);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function guess(id: OptionId) {
    if (!round || revealed) return;

    setSelectedId(id);
    setRevealed(true);

    const wasCorrect = id === round.answerId;

    setRounds((n) => n + 1);
    setScore((s) => s + (wasCorrect ? 1 : 0));

    setStreak((prev) => {
      const next = wasCorrect ? prev + 1 : 0;
      setBestStreak((best) => Math.max(best, next));
      return next;
    });

    void loadSuggestionsForRound(round, wasCorrect);
  }

  useEffect(() => {
    void loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-36 -left-28 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-44 left-1/3 h-[30rem] w-[30rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Hallucination Game
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Three statements are true. One is a confident lie. Can you spot it?
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Score <span className="font-semibold">{score}</span>/{rounds}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Streak <span className="font-semibold">{streak}</span>
                </span>
                <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 sm:inline">
                  Best <span className="font-semibold">{bestStreak}</span>
                </span>
              </div>
              <p className="max-w-[18rem] text-right text-xs text-white/50">
                Tip: {tip}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/60">Difficulty</span>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={cx(
                  "rounded-full px-3 py-1 text-xs transition",
                  d === difficulty
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                )}
              >
                {prettyDifficulty(d)}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadTopics()}
                className={cx(
                  "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10",
                  loadingTopics && "opacity-60"
                )}
                disabled={loadingTopics}
                title="Get fresh random topics"
              >
                {loadingTopics ? "Refreshing…" : "New topics"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScore(0);
                  setRounds(0);
                  setStreak(0);
                  setBestStreak(0);
                  setSelectedId(null);
                  setRevealed(false);
                  setRound(null);
                  setSuggestions(null);
                  setError(null);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
                title="Reset score"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-medium text-white/90">Pick a topic</h2>
                <p className="text-xs text-white/60">
                  Choose one below or type your own.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void startRound();
                  }}
                  placeholder="e.g., Black holes"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 sm:w-72"
                />
                <button
                  type="button"
                  onClick={() => void startRound()}
                  className={cx(
                    "rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90",
                    loadingRound && "opacity-60"
                  )}
                  disabled={loadingRound}
                >
                  {loadingRound ? "Starting…" : "Play"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {topics.length === 0 && (
                <span className="text-xs text-white/50">
                  {loadingTopics
                    ? "Loading topics…"
                    : "No topics yet. Try “New topics” or type your own."}
                </span>
              )}
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => void startRound(t)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium">Something went wrong</p>
                <p className="text-xs text-red-100/80">{error}</p>
                <p className="mt-2 text-xs text-red-100/60">
                  If this is your first run, make sure you created a `.env.local`
                  with `OPENAI_API_KEY`.
                </p>
              </div>
            </motion.div>
          )}

          {loadingRound && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {round && !loadingRound && (
            <motion.section
              key="round"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <div className="flex flex-col gap-1">
                <p className="text-xs text-white/60">Topic</p>
                <h2 className="text-lg font-semibold tracking-tight">
                  {round.topic}
                </h2>
                <p className="text-sm text-white/70">
                  Which one is the hallucination?
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {round.options.map((o) => {
                  const isSelected = selectedId === o.id;
                  const isAnswer = o.id === round.answerId;
                  const showCorrect = revealed && isAnswer;
                  const showWrong = revealed && isSelected && !isAnswer;

                  return (
                    <motion.button
                      key={o.id}
                      type="button"
                      onClick={() => guess(o.id)}
                      disabled={revealed}
                      whileHover={!revealed ? { y: -2, scale: 1.01 } : undefined}
                      whileTap={!revealed ? { scale: 0.99 } : undefined}
                      className={cx(
                        "group relative overflow-hidden rounded-xl border p-4 text-left transition",
                        "bg-black/30 border-white/10 hover:border-white/20",
                        revealed && "cursor-default",
                        isSelected && !revealed && "border-white/30",
                        showCorrect && "border-emerald-400/60 bg-emerald-500/10",
                        showWrong && "border-rose-400/60 bg-rose-500/10"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white/80">
                          {o.id}
                        </span>
                        <span className="text-[11px] text-white/50">
                          {revealed
                            ? isAnswer
                              ? "Hallucination"
                              : "True"
                            : "Pick"}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-white/90">
                        {o.text}
                      </p>
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.10),transparent_60%)]" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {revealed && (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cx(
                      "mt-5 rounded-xl border p-4",
                      correct
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-rose-500/30 bg-rose-500/10"
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          {correct ? "Correct!" : "Not quite."}
                        </p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                          Answer: {round.answerId}
                        </span>
                      </div>

                      <div className="text-sm text-white/80">
                        <p className="font-medium text-white/90">What’s false:</p>
                        <p className="mt-1">{round.explanation}</p>
                      </div>

                      <div className="text-sm text-white/80">
                        <p className="font-medium text-white/90">Correction:</p>
                        <p className="mt-1">{round.correction}</p>
                      </div>

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void startRound(round.topic)}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
                          >
                            Next (same topic)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRound(null);
                              setSelectedId(null);
                              setRevealed(false);
                              setSuggestions(null);
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                          >
                            Change topic
                          </button>
                        </div>

                        <div className="text-xs text-white/50">
                          {loadingSuggestions
                            ? "Thinking of what to do next…"
                            : suggestions
                              ? "Try one of the suggestions below."
                              : ""}
                        </div>
                      </div>

                      {suggestions && (
                        <div className="mt-2 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-xs font-semibold text-white/70">
                              Continue
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {suggestions.continue.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => void startRound(t)}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-xs font-semibold text-white/70">
                              Go deeper
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {suggestions.deeper.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => void startRound(t)}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-xs font-semibold text-white/70">
                              Switch
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {suggestions.switch.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => void startRound(t)}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        <footer className="mt-auto border-t border-white/10 pt-6 text-xs text-white/50">
          <p>
            This demo calls OpenAI via Next.js route handlers (your API key stays on
            the server).
          </p>
        </footer>
      </div>
    </div>
  );
}
