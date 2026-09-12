"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/* One segment of the coach's answer. `style` marks how it renders:
   bold for numbers the EA should notice, tile for letter sounds. */
type Segment = { text: string; style?: "bold" | "tile" };

const QUESTION = "How am I doing?";
const ANSWER: Segment[] = [
  { text: "You’re doing great, Sipho! " },
  { text: "Four of your groups", style: "bold" },
  { text: " made real progress last week - you should be proud. One thing: " },
  { text: "Group 5", style: "bold" },
  { text: " hasn’t had a session in " },
  { text: "8 days", style: "bold" },
  { text: ". Take them next, and focus on the letters " },
  { text: "i", style: "tile" },
  { text: " and " },
  { text: "u", style: "tile" },
  { text: ". Overall, you’re a star. These kids are lucky to have you!" },
];

/* Flatten the answer into streamable word tokens that keep their style. */
const TOKENS: Segment[] = ANSWER.flatMap((seg) =>
  seg.text.split(/(\s+)/).filter(Boolean).map((text) => ({ text, style: seg.style }))
);

type Phase = "typing" | "sent" | "thinking" | "answering" | "done";

function renderTokens(tokens: Segment[]): ReactNode[] {
  return tokens.map((t, i) => {
    if (t.style === "tile") return <span key={i} className="lt">{t.text}</span>;
    if (t.style === "bold") return <strong key={i}>{t.text}</strong>;
    return <span key={i}>{t.text}</span>;
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/* Server renders the animated version; the client corrects on first paint. */
function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);
}

export function CoachPhone() {
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0);
  const reduced = useReducedMotion();
  const alive = useRef(true);

  useEffect(() => {
    if (reduced) return;
    alive.current = true;
    (async () => {
      while (alive.current) {
        await sleep(900);
        if (!alive.current) return;
        setPhase("typing"); setTyped(""); setShown(0);
        for (let i = 0; i < QUESTION.length && alive.current; i++) {
          setTyped(QUESTION.slice(0, i + 1));
          await sleep(55 + Math.random() * 50);
        }
        await sleep(500);
        setPhase("sent"); setTyped("");
        await sleep(350);
        setPhase("thinking");
        await sleep(1400);
        setPhase("answering");
        for (let j = 1; j <= TOKENS.length && alive.current; j++) {
          setShown(j);
          if (/\S/.test(TOKENS[j - 1].text)) await sleep(38 + Math.random() * 40);
        }
        setPhase("done");
        await sleep(7000);
      }
    })();
    return () => { alive.current = false; };
  }, [reduced]);

  const questionVisible = reduced || phase !== "typing";
  const answerVisible = reduced || phase === "answering" || phase === "done";
  const visibleTokens = reduced ? TOKENS.length : shown;

  return (
    <div className="ph" aria-label="Phone mockup: an EA asks the app how they are doing and receives a personal answer">
      <div className="ph-top"><span>9:41</span><span className="ph-sig">●●● ▲ ▮</span></div>
      <div className="ph-hd"><span className="ph-dot" /><div><b>Today</b><small>Sipho · 5 groups</small></div></div>
      <div className="ph-chat">
        <div className="msg me" hidden={!questionVisible}>{QUESTION}</div>
        <div className="msg ai typing" hidden={phase !== "thinking"}><i /><i /><i /></div>
        <div className="msg ai" hidden={!answerVisible}>{renderTokens(TOKENS.slice(0, visibleTokens))}</div>
      </div>
      <div className="ph-in">
        <span>{typed}</span>
        {!reduced && <span className="caret" />}
        <em>Ask</em>
      </div>
    </div>
  );
}
