import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, Bot, Send, LoaderCircle } from "lucide-react";
import { askLocalAiStream, defaultModel } from "../utils/ai";
import { quickQuestions } from "../data/faq";


function MdText({ text }) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;
    const parts = trimmed.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const inline = parts.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={j}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*")) return <em key={j}>{p.slice(1, -1)}</em>;
      return p;
    });
    if (/^#+\s/.test(trimmed)) return <strong key={i} style={{ display: "block", marginTop: 4 }}>{trimmed.replace(/^#+\s/, "")}</strong>;
    if (/^\d+\.\s/.test(trimmed) || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      return <span key={i} style={{ display: "block", paddingLeft: 8 }}>{inline}</span>;
    }
    return <span key={i} style={{ display: "block" }}>{inline}</span>;
  });
}

export default function ChatWidget({ faqItems, bankData, model, setModel, open, setOpen }) {
  const [_open, _setOpen] = useState(false);
  const isOpen = open !== undefined ? open : _open;
  const setIsOpen = setOpen !== undefined ? setOpen : _setOpen;
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [aiError, setAiError] = useState("");
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, streamingText]);

  async function askQuestion(question = query) {
    const clean = question.trim();
    if (!clean || isThinking) return;
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setQuery("");
    setAiError("");
    setStreamingText("");
    setIsThinking(true);
    try {
      const finalText = await askLocalAiStream(
        clean,
        model.trim() || defaultModel,
        faqItems,
        bankData,
        (chunk) => setStreamingText(chunk)
      );
      setStreamingText("");
      setMessages((prev) => [...prev, { role: "ai", text: finalText || "AI javob qaytarmadi." }]);
    } catch (error) {
      setStreamingText("");
      setAiError(error.message || "OpenRouter AIga ulanib bo'lmadi.");
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <>
      <button
        className={`chat-fab ${isOpen ? "chat-fab--open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="AI chat"
      >
        {isOpen ? <ArrowRight size={24} style={{ transform: "rotate(90deg)" }} /> : <Sparkles size={24} />}
      </button>

      {isOpen && (
        <div className="chat-panel" role="dialog" aria-label="AI yordamchi">
          <div className="chat-panel__header">
            <div className="chat-panel__title">
              <Sparkles size={18} />
              AI Yordamchi
            </div>
            <label className="chat-model-label">
              <Bot size={15} />
              <input value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model" />
            </label>
          </div>

          <div className="chat-panel__body" ref={bodyRef}>
            {messages.length === 0 && !isThinking && !streamingText ? (
              <div className="chat-welcome">
                <Sparkles size={32} />
                <p>Mahalla, kredit, omonat yoki karta haqida so'rang. / Спросите о кредитах, вкладах или картах. / Ask about credits, deposits or cards.</p>
                <div className="chat-quick-grid">
                  {quickQuestions.map((q) => (
                    <button key={q} onClick={() => askQuestion(q)}>{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
                    {msg.role === "ai" ? <MdText text={msg.text} /> : msg.text}
                  </div>
                ))}
                {streamingText && (
                  <div className="chat-bubble chat-bubble--ai"><MdText text={streamingText} /><span className="chat-cursor" /></div>
                )}
                {isThinking && !streamingText && (
                  <div className="chat-bubble chat-bubble--ai thinking">
                    <LoaderCircle size={16} className="spin" />
                    <span>AI o'ylayapti...</span>
                  </div>
                )}
                {aiError && (
                  <div className="chat-bubble chat-bubble--error"><p>{aiError}</p></div>
                )}
              </>
            )}
          </div>

          <div className="chat-panel__footer">
            <div className="chat-input-row">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") askQuestion(); }}
                placeholder="So'rang / Спросите / Ask..."
                aria-label="Savol"
              />
              <button onClick={() => askQuestion()} disabled={isThinking || !query.trim()} aria-label="Yuborish">
                {isThinking ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
