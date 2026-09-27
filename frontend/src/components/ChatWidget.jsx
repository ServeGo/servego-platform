import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Loader2, RefreshCw, AlertTriangle, Sparkles, RotateCcw } from 'lucide-react';
import { askKnowledgeAssistant, SUGGESTED_QUESTIONS } from '../utils/chatbotApi';
import { getErrorMessage } from '../utils/errorMessages';
import { useRealtime } from '../context/AppContext';
import Logo from './Logo';
import ChatMessageBody from './ChatMessageBody';
import { DESKTOP_QUERY, isDesktopViewport, panelClassName, panelStyle } from './chatPanelLayout';

/**
 * Tracks the desktop breakpoint so the panel can switch between the full-screen
 * mobile sheet and the floating desktop bubble. See `chatPanelLayout.js` for why
 * this needs a pointer check as well as a width check.
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && isDesktopViewport(window.matchMedia)
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

/** Mirrors `window.visualViewport` (height + offsetTop).
 *
 *  `position: fixed` is measured against the LAYOUT viewport, which does NOT
 *  shrink when the on-screen keyboard opens — so a `100dvh` panel keeps its old
 *  height and the composer ends up underneath the keyboard. Tracking the visual
 *  viewport lets us size and offset the sheet to exactly the area the user can
 *  actually see, so the composer sits right on top of the keyboard. */
function useVisualViewport(enabled) {
  const [viewport, setViewport] = useState(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) return undefined;
    const sync = () => setViewport({ height: vv.height, offsetTop: vv.offsetTop });
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [enabled]);
  return viewport;
}

// The greeting is generated locally and never "sent", so it carries no timestamp.
// It used to hold `at: Date.now()`, which was evaluated once at module load — on a
// tab left open a while the bubble showed the time the JS bundle loaded, not the
// time the user opened the chat.
const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text:
    "Hi! I'm the ServeGo24 assistant. Ask me about bookings, providers, payments or cancellations — " +
    "I answer from the ServeGo24 help centre, and I'll tell you if something isn't covered there."
};

let seq = 0;
const nextId = (role) => `${role}-${Date.now()}-${++seq}`;

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Small logo avatar shown next to every assistant turn — the wordmark's
 *  replacement, so the transcript is branded without a "ServeGo24" text label. */
function AssistantAvatar() {
  return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-700 ring-1 ring-teal-900/10 shrink-0">
      <Logo className="w-[72%] h-[72%] rounded-full" alt="" />
    </span>
  );
}

/** Three-dot typing pulse — the standard chat affordance for "still working". */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 self-start">
      <AssistantAvatar />
      <div className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-md bg-slate-100 border border-slate-200">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="sg-typing-dot w-1.5 h-1.5 rounded-full bg-slate-400"
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">Assistant is typing</span>
      </div>
    </div>
  );
}

/**
 * ServeGo24 Assistant — floating launcher + chat panel.
 *
 * Mounted once in App so it is available on every page. Rendered with a Suspense fallback
 * of `null`, so the chunk never flashes a blank box while loading (rule 15).
 *
 * The launcher is an icon-only circle carrying the ServeGo logo (no text label), and the
 * panel uses the conventional brand-header / transcript / composer layout every chat
 * widget on the web uses.
 *
 * Responsive behaviour: on desktop it is a floating panel above the launcher; on mobile it
 * is a FULL-SCREEN sheet. A floating panel cannot win against the on-screen keyboard —
 * the keyboard eats the lower half of the screen and the composer either slides off or
 * gets covered. Full screen + `visualViewport` tracking (see `useVisualViewport`) keeps the
 * header, transcript and composer all visible at once, and lets the page behind stay put
 * while the keyboard is up.
 */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Guards a double submit (Enter held down, or a retry clicked while in flight).
  const inFlightRef = useRef(false);
  const lastQuestionRef = useRef(null);

  const { connectionStatus } = useRealtime();
  const isOffline = connectionStatus === 'offline' || connectionStatus === 'reconnecting';

  const isDesktop = useIsDesktop();
  const viewport = useVisualViewport(isOpen && !isDesktop);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom();
  }, [isOpen, messages, isSending, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return undefined;
    // Desktop can focus straight away. On mobile we must NOT auto-focus: the keyboard
    // would cover the welcome message before the user has read it. They tap the composer
    // when they are ready, and the sheet already tracks the keyboard as it opens.
    if (isDesktop) inputRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isDesktop]);

  // The mobile sheet covers the whole screen, so the page behind must not scroll or
  // rubber-band while the user reads the transcript. `overscroll-contain` on the
  // transcript itself keeps its own scrolling working.
  useEffect(() => {
    if (!isOpen || isDesktop) return undefined;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [isOpen, isDesktop]);

  const send = useCallback(
    async (question, { isRetry = false } = {}) => {
      const clean = String(question || '').trim();
      if (!clean || inFlightRef.current) return;

      // Only restore focus if the composer already had it — re-focusing on mobile
      // would pop the keyboard back open after the user dismissed it.
      const hadFocus = document.activeElement === inputRef.current;

      inFlightRef.current = true;
      setIsSending(true);
      setError(null);
      lastQuestionRef.current = clean;

      if (!isRetry) {
        setMessages((prev) => [
          ...prev,
          { id: nextId('user'), role: 'user', text: clean, at: Date.now() }
        ]);
        setInput('');
      }

      try {
        const res = await askKnowledgeAssistant(clean);
        if (res.ok) {
          setMessages((prev) => [
            ...prev,
            { id: nextId('assistant'), role: 'assistant', text: res.answer, at: Date.now() }
          ]);
        } else {
          // A failure is NOT a knowledge gap — show the error with a retry instead of
          // putting "I don't have that information" in the transcript.
          setError({ code: res.code, message: getErrorMessage(res) });
        }
      } catch (err) {
        setError({ code: err?.code, message: getErrorMessage(err) });
      } finally {
        inFlightRef.current = false;
        setIsSending(false);
        if (hadFocus) inputRef.current?.focus();
      }
    },
    []
  );

  const handleRetry = useCallback(() => {
    if (lastQuestionRef.current) send(lastQuestionRef.current, { isRetry: true });
  }, [send]);

  const handleClear = useCallback(() => {
    setMessages([WELCOME]);
    setError(null);
    lastQuestionRef.current = null;
    if (isDesktop) inputRef.current?.focus();
  }, [isDesktop]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const hasUserMessage = messages.some((m) => m.role === 'user');

  return (
    <>
      {/* Launcher — logo only, no text and no status dot. Hidden while the panel is open. */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Chat with the ServeGo24 assistant"
          title="Chat with us"
          className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-xl shadow-slate-900/20 ring-1 ring-slate-200 hover:shadow-2xl hover:ring-teal-300 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Logo className="w-10 h-10 rounded-full" alt="" />
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal={!isDesktop}
          aria-label="ServeGo24 assistant"
          style={panelStyle(isDesktop, viewport)}
          className={panelClassName(isDesktop)}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-br from-teal-600 to-teal-800 text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/30 shrink-0">
                <Logo className="w-7 h-7 rounded-full" alt="" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold truncate">ServeGo24 assistant</h3>
                <p className="text-[10px] font-semibold text-teal-50/90 truncate">
                  {isSending ? 'Typing…' : 'Answers from our help centre'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasUserMessage || isSending}
                aria-label="Start a new conversation"
                title="New conversation"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close the assistant"
                title="Close"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Connection banner — realtime is down, but Q&A still works (rule 23) */}
          {isOffline && (
            <p className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-[10px] font-semibold text-amber-800 shrink-0">
              <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
              Live updates are reconnecting. Questions still work.
            </p>
          )}

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain hide-scrollbar px-4 py-4 space-y-3"
          >
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* The avatar is aligned to the BUBBLE. It used to sit in an
                      `items-end` row that also contained the timestamp, so the
                      avatar's bottom lined up with the timestamp instead and it hung
                      below the bubble — most visible on the tall welcome message.
                      The timestamp is now a sibling below, so `pl-9` re-creates the
                      bubble's left edge (avatar w-7 + gap-2 = 36px) for assistant turns. */}
                  <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && <AssistantAvatar />}
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                        isUser
                          ? 'rounded-2xl rounded-br-md bg-indigo-600 text-white'
                          : 'rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {isUser ? (
                        m.text
                      ) : (
                        <ChatMessageBody text={m.text} />
                      )}
                    </div>
                  </div>
                  {/* Only real replies carry a send time; the local greeting has
                      no `at`, so it shows no clock. */}
                  {m.at != null && (
                    <span className={`px-1 text-[9px] font-semibold text-slate-400 ${isUser ? '' : 'pl-9'}`}>
                      {formatTime(m.at)}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Thinking state — never leave a blank gap (rule 15) */}
            {isSending && <TypingIndicator />}

            {/* Error + recovery action (rule 19) */}
            {error && !isSending && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3"
              >
                <p className="flex items-start gap-2 text-[11px] font-semibold text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
                  <span>{error.message}</span>
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 inline-flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  Try again
                </button>
              </div>
            )}

            {/* Starter prompts on an empty conversation */}
            {!hasUserMessage && !isSending && !error && (
              <div className="pt-1 space-y-1.5">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="text-left text-[11px] font-semibold text-slate-700 bg-white hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 rounded-full px-3 py-1.5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 px-3 py-3 border-t border-slate-200 bg-white shrink-0"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={500}
              disabled={isSending}
              aria-label="Type your question"
              enterKeyHint="send"
              placeholder="Type your message…"
              // 16px on mobile: iOS Safari auto-zooms the page when it focuses any input
              // under 16px, which would break the fixed full-screen sheet. Desktop keeps
              // the compact 12px look.
              className="flex-1 min-w-0 resize-none max-h-24 px-4 py-3 rounded-full border border-slate-300 bg-slate-50 text-[16px] md:text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-colors placeholder:text-slate-400 placeholder:font-medium disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-teal-700 hover:bg-teal-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </form>
          <p className="px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] -mt-1.5 text-[9px] font-medium text-slate-400 text-center shrink-0">
            Answers come only from the ServeGo24 help centre.
          </p>
        </div>
      )}
    </>
  );
}
