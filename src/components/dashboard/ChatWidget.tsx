"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Where did I spend the most?", "How can I save more?", "Am I on track with my plan?"];

export default function ChatWidget({ month }: { month?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Bumped on close so a reply that arrives afterwards is dropped.
  const session = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, open]);

  function close() {
    session.current += 1;
    setOpen(false);
    setMessages([]);
    setInput("");
    setError(null);
    setBusy(false);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setBusy(true);
    const id = session.current;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20), month: month === "all" ? undefined : month }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? response.statusText);
      if (id !== session.current) return;
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      if (id !== session.current) return;
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (id === session.current) setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-label="Finance assistant"
          className="flex h-[min(32rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-2xl sm:w-96"
        >
          <header className="flex items-center justify-between px-5 py-4 text-white" style={{ background: "var(--accent-grad)" }}>
            <div>
              <h2 className="text-sm font-semibold">Finance assistant</h2>
              <p className="text-xs text-white/75">Ask about your spending</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat"
              className="rounded-full p-1.5 transition-colors hover:bg-white/20"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[var(--text-secondary)]">Hi! Ask me anything about your statements. Try:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left transition-colors hover:border-[var(--accent)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 ${
                  m.role === "user"
                    ? "self-end bg-[var(--accent)] text-white"
                    : "self-start bg-[var(--surface-2)]"
                }`}
              >
                {m.content}
              </p>
            ))}
            {busy && <p className="self-start rounded-2xl bg-[var(--surface-2)] px-3.5 py-2 text-[var(--text-secondary)]">Thinking...</p>}
            {error && (
              <p role="alert" className="self-start rounded-2xl px-3.5 py-2 text-[var(--critical)]">
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-[var(--border)] p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Type a message..."
              aria-label="Message"
              className="h-10 min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm outline-none transition-colors placeholder:text-[var(--text-secondary)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send size={16} aria-hidden />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={open ? close : () => setOpen(true)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ background: "var(--accent-grad)" }}
      >
        {open ? <X size={24} aria-hidden /> : <MessageCircle size={24} aria-hidden />}
      </button>
    </div>
  );
}
