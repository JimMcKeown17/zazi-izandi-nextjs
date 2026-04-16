"use client";

import { useCallback, useRef, useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { DailyBrief } from "@/lib/ea/types";
import { BriefErrorState } from "./brief-error-state";

const MARKDOWN_CLASSES =
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0" +
  " [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal" +
  " [&_li]:my-1 [&_strong]:font-semibold [&_em]:italic" +
  " [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold" +
  " [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold" +
  " [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold" +
  " [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs";

type Props = {
  initialBrief: DailyBrief | null;
  briefCap: number;
  briefsToday: number;
};

type State =
  | { status: "idle" }
  | { status: "streaming"; text: string }
  | { status: "done"; text: string; at: string }
  | { status: "error"; message: string }
  | { status: "capped"; cap: number };

/**
 * Streams a daily brief from /api/ea/brief. If a cached brief from earlier
 * today is provided via `initialBrief`, renders that immediately; otherwise
 * shows a CTA the EA can tap to generate.
 *
 * UI message stream format (from useChat transport). We read the stream as
 * plain text for markdown rendering — the brief has no tool calls surfaced
 * to the user, so the richer UI message shape is not needed here.
 */
export function DailyBriefPanel({
  initialBrief,
  briefCap,
  briefsToday,
}: Props) {
  const initial: State = initialBrief
    ? { status: "done", text: initialBrief.content, at: initialBrief.created_at }
    : { status: "idle" };
  const [state, setState] = useState<State>(initial);
  const [usedToday, setUsedToday] = useState<number>(briefsToday);
  const abortRef = useRef<AbortController | null>(null);

  const canGenerate = usedToday < briefCap && state.status !== "streaming";

  const generate = useCallback(async () => {
    if (!canGenerate) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "streaming", text: "" });

    try {
      const res = await fetch("/api/ea/brief", {
        method: "POST",
        signal: controller.signal,
      });

      if (res.status === 429) {
        const payload = (await res.json().catch(() => ({}))) as {
          cap?: number;
        };
        setState({ status: "capped", cap: payload.cap ?? briefCap });
        return;
      }
      if (!res.ok || !res.body) {
        setState({ status: "error", message: `HTTP ${res.status}` });
        return;
      }

      // Consume the UI message stream as text. The stream format carries
      // structured events; for rendering a free-form brief we accept the
      // accumulated text portion.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += parseTextFromStreamChunk(decoder.decode(value, { stream: true }));
        setState({ status: "streaming", text: accumulated });
      }
      setState({
        status: "done",
        text: accumulated,
        at: new Date().toISOString(),
      });
      setUsedToday((n) => n + 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [canGenerate, briefCap]);

  if (state.status === "error") {
    return <BriefErrorState onRetry={generate} />;
  }

  if (state.status === "capped") {
    return (
      <Panel>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              Today&apos;s plan
            </p>
            <p className="mt-1 text-sm text-slate-600">
              You&apos;ve used all {state.cap} brief generations for today.
              Chat below with any follow-up questions.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  if (state.status === "idle") {
    return (
      <Panel>
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="flex w-full items-center justify-between gap-3 text-left transition-colors"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Plan today&apos;s sessions
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                I&apos;ll look at your groups and suggest a plan for today.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium text-primary">▸</span>
        </button>
      </Panel>
    );
  }

  const textContent =
    state.status === "streaming" || state.status === "done" ? state.text : "";
  const streaming = state.status === "streaming";
  const generatedAt = state.status === "done" ? formatTimeShort(state.at) : null;

  return (
    <Panel>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-900">
          Today&apos;s plan
        </h2>
        {streaming ? (
          <span className="ml-auto text-xs text-slate-400">Drafting…</span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-3 text-sm leading-relaxed text-slate-800",
          MARKDOWN_CLASSES,
          streaming && "animate-pulse",
        )}
      >
        {textContent ? (
          <Markdown remarkPlugins={[remarkGfm]}>{textContent}</Markdown>
        ) : streaming ? (
          "…"
        ) : null}
      </div>
      {state.status === "done" ? (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>
            Generated {generatedAt ?? "just now"} ·{" "}
            {briefCap - usedToday} of {briefCap} left today
          </span>
          {usedToday < briefCap ? (
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Regenerate
            </button>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </section>
  );
}

/**
 * The UI Message stream protocol emits JSON-line events. For MVP we pluck
 * out the `text-delta` payloads and concatenate them. This is a simple
 * reader that works against the Vercel AI SDK v6 `toUIMessageStreamResponse`
 * output. A more structured consumer (useChat) is used for the chat widget
 * where tool-call rendering matters; here we just want the text body.
 */
function parseTextFromStreamChunk(chunk: string): string {
  let out = "";
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // SDK v6 emits SSE-style events prefixed with "data: ". Payloads can be
    // JSON objects with a `type` discriminator or raw text.
    const payloadStr = trimmed.startsWith("data: ")
      ? trimmed.slice(6)
      : trimmed;
    if (payloadStr === "[DONE]") continue;
    try {
      const payload = JSON.parse(payloadStr) as { type?: string; delta?: string; text?: string };
      if (payload.type === "text-delta" && typeof payload.delta === "string") {
        out += payload.delta;
      } else if (payload.type === "text" && typeof payload.text === "string") {
        out += payload.text;
      }
    } catch {
      // Non-JSON line — append as-is; this handles providers that emit
      // plain text deltas. We don't expect that for our route but stay defensive.
      out += payloadStr;
    }
  }
  return out;
}

function formatTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Johannesburg",
    }).format(d);
  } catch {
    return iso;
  }
}
