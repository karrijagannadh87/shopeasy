/**
 * 🤖 AI Chat Widget — the MCP-powered assistant, floating on every page.
 * Sends messages to /api/ai/chat (backend → Python MCP server → Claude
 * when ANTHROPIC_API_KEY is set, rule-based brain otherwise).
 */
import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, RotateCcw, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

const SUGGESTIONS = [
  'Recommend a gift under $80 🎁',
  'Show me wireless headphones',
  'Yoga mats under $60',
  'Track my order',
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [brain, setBrain] = useState(null);
  const scrollRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const syncCart = useCartStore((s) => s.sync);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  // Allow other pages to open the chat (e.g. home page CTA).
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('shopeasy:open-ai', openChat);
    return () => window.removeEventListener('shopeasy:open-ai', openChat);
  }, []);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || typing) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content }]);
    setTyping(true);
    try {
      const { data } = await api.post('/ai/chat', {
        message: content,
        history: messages.slice(-6),
      });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      setBrain(data.brain || (data.source === 'fallback' ? 'rule' : 'mcp'));
      // If the assistant touched the cart, refresh it.
      if (/cart/i.test(content)) syncCart();
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `⚠️ ${errorMessage(err, 'AI is unavailable right now')}` },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setBrain(null);
    toast('Conversation cleared', { icon: '🧹' });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:scale-105 hover:bg-brand-700"
        aria-label="AI assistant"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[540px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Bot size={19} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">ShopEasy Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-brand-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {brain === 'claude' ? 'Claude brain · MCP tools' : brain === 'rule' ? 'Rule brain · MCP tools' : 'MCP · AI online'}
              </p>
            </div>
            <button onClick={reset} className="rounded-lg p-1.5 hover:bg-white/15" title="Clear conversation">
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <Bot size={14} />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-700 shadow-sm">
                    Hi! I'm ShopEasy AI 🤖 — I can find products, recommend gifts,
                    track orders and more. Try one of these:
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5 text-sm text-white shadow-sm'
                    : 'flex items-start gap-2'
                }
              >
                {m.role === 'assistant' && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <Bot size={14} />
                  </span>
                )}
                {m.role === 'assistant' && (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-700 shadow-sm">
                    {m.content}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Bot size={14} />
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions when user is logged out but wants cart actions */}
          {!user && messages.length > 0 && (
            <p className="flex items-center gap-1.5 border-t border-slate-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-700">
              <ShoppingBag size={12} />
              Tip: sign in and I can add items to your cart for you.
            </p>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="input"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
