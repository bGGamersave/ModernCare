import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Loader2, User, Bot, Paperclip, Trash2, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "./LanguageContext";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";

interface Message {
  role: "user" | "bot";
  content: string;
  pdf?: {
    name: string;
    data: string; // base64
  };
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const extractStringsFromDoc = (base64Data: string): string => {
  let text = "";
  try {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const utf16decoder = new TextDecoder("utf-16le");
    const utf16Str = utf16decoder.decode(bytes);
    const utf16Cleaned = utf16Str.replace(/[^\x20-\x7E\s\u00A0-\u00FF\u0100-\u017F]/g, "");
    const words = utf16Cleaned.split(/\s+/).filter(w => w.trim().length > 1 && !/^[^\w\s]{3,}$/.test(w));
    if (words.length > 10) {
      text = words.join(" ");
    }
  } catch (e) {
    console.warn("Failed UTF-16 extraction for .doc", e);
  }

  if (text.length < 50) {
    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const utf8decoder = new TextDecoder("utf-8");
      const asciiStr = utf8decoder.decode(bytes);
      const asciiCleaned = asciiStr.replace(/[^\x20-\x7E\s]/g, "");
      const words = asciiCleaned.split(/\s+/).filter(w => w.trim().length > 1 && !/^[^\w\s]{2,}$/.test(w));
      text = words.join(" ");
    } catch (e) {
      console.warn("Failed UTF-8 extraction for .doc", e);
    }
  }

  text = text.replace(/\s+/g, " ").trim();
  if (text.length > 20000) {
    text = text.slice(0, 20000) + "... [Extracted text truncated due to length]";
  }
  return text || "[Unparseable binary .doc content]";
};

const sanitizeContentsForGemini = async (chatMessages: Message[]) => {
  const mapped = chatMessages.map(m => {
    const role = m.role === "user" ? "user" as const : "model" as const;
    return { role, text: m.content, pdf: m.pdf };
  });

  const firstUserIdx = mapped.findIndex(m => m.role === "user");
  if (firstUserIdx === -1) {
    return [];
  }

  const sliced = mapped.slice(firstUserIdx);
  const contents: any[] = [];

  for (const msg of sliced) {
    const parts: any[] = [];
    if (msg.pdf && msg.pdf.data) {
      const fileName = msg.pdf.name || "document";
      const fileExt = fileName.split('.').pop()?.toLowerCase();

      if (fileExt === "pdf") {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: msg.pdf.data
          }
        });
        parts.push({
          text: `[Attached PDF Document: ${fileName}]\n\n${msg.text}`
        });
      } else if (fileExt === "docx") {
        try {
          const arrayBuffer = base64ToArrayBuffer(msg.pdf.data);
          const result = await mammoth.extractRawText({ arrayBuffer });
          const extractedText = (result.value || "").trim();
          parts.push({
            text: `[Attached Word Document (.docx): ${fileName}]\n--- EXTRACTED CONTENT ---\n${extractedText || "[Empty Document]"}\n--- END EXTRACTED CONTENT ---\n\n${msg.text}`
          });
        } catch (err: any) {
          console.error("Failed to parse docx using mammoth:", err);
          parts.push({
            text: `[Attached Word Document (.docx): ${fileName} - Error Parsing Content]\n\n${msg.text}`
          });
        }
      } else if (fileExt === "doc") {
        try {
          const extractedText = extractStringsFromDoc(msg.pdf.data);
          parts.push({
            text: `[Attached Word Document (.doc): ${fileName}]\n--- EXTRACTED CONTENT ---\n${extractedText}\n--- END EXTRACTED CONTENT ---\n\n${msg.text}`
          });
        } catch (err: any) {
          console.error("Failed to parse doc:", err);
          parts.push({
            text: `[Attached Word Document (.doc): ${fileName} - Error Parsing Content]\n\n${msg.text}`
          });
        }
      } else {
        try {
          const binaryString = window.atob(msg.pdf.data);
          const textContent = new TextDecoder("utf-8").decode(
            new Uint8Array(binaryString.split("").map(c => c.charCodeAt(0)))
          );
          parts.push({
            text: `[Attached file: ${fileName}]\n--- EXTRACTED CONTENT ---\n${textContent}\n--- END EXTRACTED CONTENT ---\n\n${msg.text}`
          });
        } catch (err) {
          parts.push({
            text: `[Attached file: ${fileName}]\n\n${msg.text}`
          });
        }
      }
    } else {
      parts.push({ text: msg.text });
    }

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts
      });
    } else {
      const last = contents[contents.length - 1];
      if (last.role === msg.role) {
        last.parts.push(...parts);
      } else {
        contents.push({
          role: msg.role,
          parts
        });
      }
    }
  }

  return contents;
};

const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_API_KEY" || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined") {
    throw new Error("Missing Gemini API Key");
  }
  return new GoogleGenAI({ apiKey });
};

export const ChatBot = ({ viewMode }: { viewMode?: "mobile" | "desktop" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "¡Hola! I'm Michelle's virtual assistant. How can I help you on your academic journey today, cariño?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // PDF upload states
  const [attachedPdf, setAttachedPdf] = useState<{ name: string; data: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chatbot connectivity and operability status
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    const checkStatus = () => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_API_KEY" || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined") {
        setStatus("offline");
      } else {
        setStatus("online");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update initial message based on language if no interaction has happened yet
    if (messages.length === 1 && messages[0].role === "bot") {
      const greeting = language === "es" 
        ? "¡Hola! Soy la asistente virtual de Michelle. ¿Cómo puedo ayudarte en tu camino académico hoy, cariño?"
        : "¡Hola! I'm Michelle's virtual assistant. How can I help you on your academic journey today, cariño?";
      setMessages([{ role: "bot", content: greeting }]);
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const base64 = reader.result.split(",")[1];
          resolve(base64 || "");
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValid = ext === "pdf" || ext === "docx" || ext === "doc";
      if (!isValid) {
        alert(language === "es" ? "Por favor selecciona un archivo PDF o Word (.docx, .doc)." : "Please select a PDF or Word file (.docx, .doc).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(language === "es" ? "El archivo supera el límite de 10MB." : "The file exceeds the 10MB limit.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAttachedPdf({ name: file.name, data: base64 });
      } catch (err) {
        console.error("File reading failed:", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValid = ext === "pdf" || ext === "docx" || ext === "doc";
      if (!isValid) {
        alert(language === "es" ? "Por favor selecciona un archivo PDF o Word (.docx, .doc)." : "Please select a PDF or Word file (.docx, .doc).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(language === "es" ? "El archivo supera el límite de 10MB." : "The file exceeds the 10MB limit.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAttachedPdf({ name: file.name, data: base64 });
      } catch (err) {
        console.error("File drops reading failed:", err);
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedPdf) || isLoading) return;

    const userMessage = input.trim() || (language === "es" ? "Por favor analiza el archivo PDF adjunto." : "Please analyze the attached PDF document.");
    setInput("");
    
    // Save current attachment info then clear it for new inputs
    const currentPdf = attachedPdf;
    setAttachedPdf(null);

    const userMessageObj: Message = { 
      role: "user", 
      content: userMessage, 
      pdf: currentPdf ? { name: currentPdf.name, data: currentPdf.data } : undefined
    };

    setMessages((prev) => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      const history = [...messages, userMessageObj];
      const sanitized = await sanitizeContentsForGemini(history);
      
      const systemInstruction = `You are Michelle's Virtual Assistant. You are a Latina American woman who is straight to business. You are an expert on Michelle Mendivil, PhD, her academic journey, and her consulting business, Modern Care Consulting. 

Michelle Mendivil, PhD, is an expert academic consultant and teacher. She earned her PhD from Grand Canyon University (GCU). Her dissertation, titled 'Adults’ Perceptions of Wearable-Fitness-Devices on Psychological Well-Being and Motivation to Engage in Physical Activities', was successfully defended on November 4, 2025. 

Modern Care Consulting offers:
- Coaching: One-on-one sessions for dissertations and research.
- Editing: Structural refining and strict APA compliance.
- Strategy: Virtual sessions to clear academic bottlenecks.
- Academic Tutoring: Support for High School, Junior College, and University (Associates, Bachelor's, Master's).

Professional Affiliations:
- ACHE San Diego (Member)
- MANA of North County (Member)
- SHPE San Diego (Member & STEM Volunteer): Michelle is passionate about community outreach, mentoring, and STEM advocacy.

Membership Plans:
- Standard Membership: $1,350/year. Includes 12 one-on-one sessions, retreat priority, and more.
- VIP Year: $8,500/year. Unlimited everything, daily accountability, and prioritised access.

Michelle also offers her 297-page dissertation for just $1.

Contact: info@modernCareconsulting.com
Social: Instagram (@doctoramendivil), LinkedIn (michellemendivil8).

CURRENT LANGUAGE PREFERENCE: ${language === "es" ? "Spanish (Español)" : "English"}.

Your personality: Straight to business, highly knowledgeable, professional, and very helpful. You are focused, concise, and direct with zero unnecessary fluff. Always refer to Michelle as 'Dr. Mendivil' or 'Michelle' with respect.

CRITICAL INSTRUCTIONS:
1. Speak primarily in the user's selected language (${language}).
2. Keep all responses very concise, clear, and business-focused. No long-winded paragraphs.
3. When asking for further information or questions to understand their needs, you MUST put each question in bullet point format (e.g., using "-").
4. Provide direct links to membership plans and pricing when necessary using markdown: [Membership Plans](/pricing) or [Pricing & Services](/pricing).`;

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: sanitized,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const botResponse = response.text || (language === "es" ? "Lo siento, no pude procesar eso." : "I'm sorry, I couldn't process that.");
      setMessages((prev) => [...prev, { role: "bot", content: botResponse }]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg = language === "es" 
        ? "Lo siento, tengo un pequeño problema técnico. ¡Por favor intenta de nuevo!"
        : "Lo siento, I'm having a little technical trouble. Please try again in a moment!";
      setMessages((prev) => [...prev, { role: "bot", content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${viewMode === "mobile" ? "absolute" : "fixed"} bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] font-serif flex flex-col items-end`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`mb-4 ${viewMode === "mobile" ? "w-[calc(430px-32px)] max-w-[calc(100vw-32px)]" : "w-[calc(100vw-32px)] sm:w-[400px]"} h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-[32px] shadow-2xl border border-brand-pink/20 flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="bg-brand-pink/10 p-5 flex items-center justify-between border-b border-brand-pink/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-brand-pink">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-brand-text font-bold text-sm tracking-tight">{language === 'es' ? 'Asistente de Michelle' : "Michelle's Assistant"}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${status === "online" ? "bg-green-400 animate-pulse" : status === "checking" ? "bg-amber-400 animate-pulse" : "bg-red-500"}`}></div>
                      <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-brand-text/40">
                        {status === "online" 
                          ? (language === "es" ? "En línea" : "Online") 
                          : status === "checking" 
                            ? (language === "es" ? "Conectando" : "Connecting") 
                            : (language === "es" ? "Desconectado" : "Offline")}
                      </span>
                    </div>
                    
                    {/* Language Switcher */}
                    <div className="flex items-center gap-1 bg-white/50 rounded-full px-2 py-0.5 border border-brand-pink/10">
                      <button 
                        onClick={() => setLanguage('en')}
                        className={`text-[8px] font-bold font-sans uppercase tracking-widest transition-colors ${language === 'en' ? 'text-brand-earth' : 'text-brand-text/30'}`}
                      >
                        EN
                      </button>
                      <div className="w-[1px] h-2 bg-brand-text/10"></div>
                      <button 
                        onClick={() => setLanguage('es')}
                        className={`text-[8px] font-bold font-sans uppercase tracking-widest transition-colors ${language === 'es' ? 'text-brand-earth' : 'text-brand-text/30'}`}
                      >
                        ES
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-brand-text/40 hover:text-brand-text transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-brand-pink/10 backdrop-blur-sm z-[90] flex flex-col items-center justify-center p-6 border-4 border-dashed border-brand-earth/50 m-4 rounded-[24px]">
                  <FileText size={48} className="text-brand-earth animate-bounce mb-3" />
                  <p className="font-serif italic text-brand-text font-bold text-center">
                    {language === "es" ? "¡Suelta tu archivo PDF o Word aquí!" : "Drop your PDF or Word file here!"}
                  </p>
                  <p className="font-sans text-[10px] uppercase font-bold tracking-widest text-brand-text/50 mt-1">
                    {language === "es" ? "Soporta hasta 10MB" : "Supports up to 10MB"}
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${
                      m.role === "user" ? "bg-brand-earth text-white" : "bg-brand-lavender/30 text-brand-text"
                    }`}>
                      {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user" 
                        ? "bg-brand-earth text-white rounded-tr-none font-sans" 
                        : "bg-brand-offwhite text-brand-text rounded-tl-none italic"
                    }`}>
                       {/* Show PDF badge if m.pdf exists */}
                       {m.pdf && (
                         <div className={`mb-2.5 p-2 rounded-xl flex items-center gap-2 text-xs border ${
                           m.role === "user" 
                             ? "bg-white/10 border-white/20 text-white" 
                             : "bg-brand-pink/5 border-brand-pink/10 text-brand-text"
                         }`}>
                           <FileText size={16} className={m.role === "user" ? "text-white" : "text-brand-earth"} />
                           <div className="flex flex-col truncate max-w-[180px]">
                             <span className="font-sans font-bold text-[11px] truncate" title={m.pdf.name}>
                               {m.pdf.name}
                             </span>
                             <span className="text-[9px] opacity-75 uppercase font-bold tracking-widest font-sans">
                               {m.pdf.name.split('.').pop()?.toUpperCase() === "PDF" ? "PDF" : "Word"} Document Attached
                             </span>
                           </div>
                         </div>
                       )}

                      {m.role === "user" ? (
                        m.content
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children, ...props }) => {
                                const isInternal = href && href.startsWith("/");
                                if (isInternal) {
                                  return (
                                    <Link to={href} className="underline text-brand-pink hover:text-brand-earth font-bold focus:outline-none" {...props}>
                                      {children}
                                    </Link>
                                  );
                                }
                                return (
                                  <a href={href} className="underline text-brand-pink hover:text-brand-earth font-bold focus:outline-none" target="_blank" rel="noopener noreferrer" {...props}>
                                    {children}
                                  </a>
                                );
                              },
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed font-serif italic text-sm">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-5 my-3 not-italic font-sans text-xs flex flex-col gap-1.5 text-brand-text/90">{children}</ul>,
                              li: ({ children }) => <li className="not-italic font-sans text-xs tracking-wide leading-relaxed">{children}</li>,
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-lavender/30 text-brand-text flex items-center justify-center">
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                    <div className="p-4 bg-brand-offwhite rounded-2xl rounded-tl-none">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-brand-pink rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-brand-pink rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1 h-1 bg-brand-pink rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attached file pre-send badge */}
            {attachedPdf && (
              <div className="px-5 py-3 bg-brand-offwhite border-t border-brand-pink/10 flex items-center justify-between gap-3 text-xs font-sans">
                <div className="flex items-center gap-2 text-brand-text/80 font-medium truncate">
                  <FileText size={15} className="text-brand-earth animate-pulse flex-shrink-0" />
                  <span className="truncate max-w-[200px] font-bold text-[11px] text-brand-text" title={attachedPdf.name}>
                    {attachedPdf.name}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-brand-text/40 font-bold bg-white px-1.5 py-0.5 rounded-full border border-brand-pink/10 flex-shrink-0">
                    {attachedPdf.name.split('.').pop()?.toUpperCase() === "PDF" ? "PDF" : "WORD"}
                  </span>
                </div>
                <button 
                  onClick={() => setAttachedPdf(null)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1 flex-shrink-0"
                  title={language === "es" ? "Eliminar archivo" : "Remove file"}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* Input Form */}
            <div className="p-4 bg-white border-t border-brand-pink/10">
              {status === "offline" && (
                <div className="mb-3 p-3.5 bg-brand-pink/5 rounded-2xl border border-brand-pink/10 text-center flex flex-col items-center gap-2">
                  <p className="text-xs font-serif italic text-brand-text">
                    {language === "es"
                      ? "El asistente de IA está desconectado. Por favor, envía un correo personalizado directamente a:"
                      : "The AI chatbot is currently offline. Please send a quick custom email directly to:"}
                  </p>
                  <a
                    href="mailto:michelle@moderncareconsulting.com?subject=Inquiry regarding Academic Dissertation Coaching & Services"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-earth hover:bg-brand-pink text-white rounded-full text-[10px] font-sans font-bold uppercase tracking-widest transition-all shadow-md shadow-brand-earth/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Mail size={12} />
                    michelle@moderncareconsulting.com
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 bg-brand-lavender/10 text-brand-earth hover:text-brand-pink hover:bg-brand-lavender/30 transition-all rounded-full flex items-center justify-center flex-shrink-0"
                  title={language === "es" ? "Adjuntar archivo PDF o Word" : "Attach PDF or Word file"}
                >
                  <Paperclip size={16} />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  className="hidden"
                />

                <div className="relative flex-1">
                  <input
                    type="text"
                    disabled={status === "offline"}
                    placeholder={status === "offline"
                      ? (language === "es" ? "Asistente desconectado..." : "Assistant offline...")
                      : language === "es" ? "Pregúntame lo que quieras..." : "Ask me anything..."}
                    className={`w-full bg-brand-offwhite rounded-full py-3 px-6 pr-12 text-sm font-serif italic outline-none border border-transparent focus:border-brand-pink/30 transition-all shadow-inner ${status === "offline" ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && status !== "offline" && handleSend()}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && !attachedPdf) || isLoading || status === "offline"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-brand-earth text-white rounded-full flex items-center justify-center hover:bg-brand-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-brand-earth text-white rounded-full shadow-2xl flex items-center justify-center relative group"
      >
        <div className="absolute inset-0 bg-brand-pink rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity"></div>
        {isOpen ? <X size={24} className="relative z-10" /> : <MessageCircle size={24} className="relative z-10" />}
      </motion.button>
    </div>
  );
};
