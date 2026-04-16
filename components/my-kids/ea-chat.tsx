"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Search } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ChatMessage as StoredChatMessage } from "@/lib/ea/types";

const ASSISTANT_MARKDOWN_CLASSES =
  "[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0" +
  " [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal" +
  " [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic" +
  " [&_code]:rounded [&_code]:bg-slate-200/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs";

type Props = {
  initialMessages: StoredChatMessage[];
  chatCap: number;
  chatMessagesToday: number;
};

/**
 * EA chat widget. Uses AI SDK v6 `useChat` with `DefaultChatTransport`.
 * Tracks input state manually (v6 removed managed input state). Renders
 * message parts with typed-switch on `part.type`, surfacing a small chip
 * when the model uses `getGroupDetail`.
 *
 * Mobile: the composer uses `sticky bottom-[theme]` and the message list
 * uses `dvh` to play well with the iOS keyboard push-up.
 */
export function EaChat({ initialMessages, chatCap, chatMessagesToday }: Props) {
  const [input, setInput] = useState("");
  const [usedToday, setUsedToday] = useState(chatMessagesToday);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ea/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages.map((m) => ({
      id: String(m.id),
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    })),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const capped = usedToday >= chatCap;
  const busy = status === "submitted" || status === "streaming";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy || capped) return;
    setInput("");
    setUsedToday((n) => n + 1);
    await sendMessage({ text });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Ask a follow-up</h2>
        <span className="text-xs text-slate-400">
          {Math.max(chatCap - usedToday, 0)} of {chatCap} left today
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[50dvh] overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Ask about a specific group, or what to do if a group hasn&apos;t met.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800",
                  )}
                >
                  {renderParts(m.parts ?? [], m.role)}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error.message || "Something went wrong. Try again."}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            capped
              ? "You've reached today's chat limit"
              : "Type a question…"
          }
          disabled={capped}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="min-h-[44px] max-h-32 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-snug outline-none placeholder:text-slate-400 focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || capped || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}

type UIPart =
  | { type: "text"; text?: string }
  | {
      type: `tool-${string}`;
      state?: string;
      input?: { class_id?: number };
      output?: unknown;
    }
  | { type: string };

function renderParts(parts: readonly UIPart[], role: "user" | "assistant" | string) {
  return parts.map((part, i) => {
    if (part.type === "text") {
      const text = (part as { text?: string }).text ?? "";
      if (role === "assistant") {
        return (
          <div key={i} className={ASSISTANT_MARKDOWN_CLASSES}>
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
          </div>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {text}
        </span>
      );
    }
    if (part.type === "tool-getGroupDetail") {
      const p = part as {
        state?: string;
        input?: { class_id?: number };
      };
      const classLabel =
        p.input?.class_id != null ? `class ${p.input.class_id}` : "a group";
      const doneState = p.state === "output-available";
      return (
        <span
          key={i}
          className="my-1 inline-flex items-center gap-1 rounded-md bg-slate-200/60 px-2 py-0.5 text-xs text-slate-600"
        >
          <Search className="h-3 w-3" aria-hidden />
          {doneState ? `Looked up ${classLabel}` : `Looking up ${classLabel}…`}
        </span>
      );
    }
    return null;
  });
}
