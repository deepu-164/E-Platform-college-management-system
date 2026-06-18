import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Sparkles, Mic, Volume2, PhoneCall, Square } from "lucide-react";
import { apiGet, apiPost, type ApiListResponse } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      start: () => void;
      stop: () => void;
    };
    SpeechRecognition?: typeof window.webkitSpeechRecognition;
    speechSynthesis: SpeechSynthesis;
  }
}

const quickActions = [
  "Which colleges offer MCA in Bangalore?",
  "What is the fee structure for PES University?",
  "How to prepare for KCET exam?",
  "Suggest career options after MCA"
];

export default function Chatbot() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [offlineInquiry, setOfflineInquiry] = useState({ topic: "", preferredMode: "call", message: "" });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await apiGet<ApiListResponse<{ id: string; role: "user" | "assistant"; content: string }>>("/interactions/chat-messages", { limit: 50 });
        const history = data.items.reverse();

        if (history.length > 0) {
          setMessages(history.map((item) => ({ id: item.id, role: item.role, content: item.content })));
        } else {
          setMessages([{ role: "assistant", content: "Hello. I can help with colleges, admissions, exams, and careers. What would you like to know?" }]);
        }
      } catch {
        setLoadingError("Unable to load chat history right now.");
        setMessages([{ role: "assistant", content: "Hello. I can still answer questions about the portal even if previous chat history is unavailable." }]);
      }
    };

    void loadMessages();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await apiPost<{ success: boolean; item: { id: string; role: "assistant"; content: string } }, { message: string }>("/interactions/chat", {
        message: text
      });
      setMessages((prev) => [...prev, { id: response.item.id, role: "assistant", content: response.item.content }]);
      setLoadingError(null);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I could not get a response from the server. Please try again." }]);
      setLoadingError("Chat request failed.");
    } finally {
      setIsTyping(false);
    }
  };

  const speakMessage = (text: string) => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const startVoiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast({ title: "Voice input not supported", description: "This browser does not support speech recognition." });
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    setIsListening(true);
    recognition.start();
  };

  const submitOfflineInquiry = async () => {
    await apiPost("/offline-inquiries", offlineInquiry);
    setOfflineInquiry({ topic: "", preferredMode: "call", message: "" });
    toast({ title: "Offline inquiry created", description: "A counselor follow-up request has been saved." });
  };

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary-foreground" /></div>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Ask anything about admissions, colleges, careers, or use voice assistance</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="bg-card rounded-xl border border-border flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingError && <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">{loadingError}</p>}
          {messages.map((msg, i) => (
            <div key={msg.id ?? i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "gradient-primary" : "bg-secondary"}`}>
                {msg.role === "assistant" ? <Bot className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4 text-foreground" />}
              </div>
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted/50 text-foreground"}`}>
                {msg.content.split("\n").map((line, j) => <p key={`${i}-${j}`} className={j > 0 ? "mt-1" : ""}>{line}</p>)}
                {msg.role === "assistant" && (
                  <button type="button" onClick={() => speakMessage(msg.content)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Volume2 className="h-3.5 w-3.5" />
                    Read aloud
                  </button>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-primary-foreground" /></div>
              <div className="bg-muted/50 rounded-xl px-4 py-3 flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-6 pb-3">
            <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((qa) => (
                <button key={qa} onClick={() => void send(qa)} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">{qa}</button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." className="flex-1" disabled={isTyping} />
            <Button type="button" onClick={startVoiceInput} variant="outline" disabled={isTyping} className={isListening ? "border-primary text-primary" : ""}><Mic className="h-4 w-4" /></Button>
            <Button type="submit" disabled={!input.trim() || isTyping} className="gradient-primary text-primary-foreground border-0 px-4"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Voice Assistance</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Use the microphone button to dictate a question. Replies are silent by default, and each assistant message has its own read-aloud button.</p>
          <Button type="button" variant="outline" onClick={() => window.speechSynthesis.cancel()} className="mt-4">
            <Square className="mr-2 h-4 w-4" />
            Stop Audio
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Offline Inquiry</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">If the chatbot does not solve your issue, request a counselor callback or follow-up.</p>
          <div className="mt-4 space-y-3">
            <Input value={offlineInquiry.topic} onChange={(e) => setOfflineInquiry((prev) => ({ ...prev, topic: e.target.value }))} placeholder="Topic" />
            <select value={offlineInquiry.preferredMode} onChange={(e) => setOfflineInquiry((prev) => ({ ...prev, preferredMode: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="chat">Chat</option>
            </select>
            <Textarea value={offlineInquiry.message} onChange={(e) => setOfflineInquiry((prev) => ({ ...prev, message: e.target.value }))} rows={5} placeholder="Explain what you need help with..." />
            <Button onClick={() => void submitOfflineInquiry()} className="w-full gradient-primary text-primary-foreground border-0">Create Offline Inquiry</Button>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
