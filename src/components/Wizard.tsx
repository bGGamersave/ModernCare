import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Send,
  GraduationCap,
  BookOpen,
  User,
  Mail,
  FileText,
  Clock,
  Sparkles,
  Bot,
  Loader2,
  Paperclip,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";

type Level = "Doctorate" | "Masters" | "Bachelors" | "Associates" | "High School";

interface Service {
  id: string;
  name: string;
  description: string;
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

const sanitizeContentsForGemini = async (chatMessages: Array<{ role: "user" | "model"; text: string; pdf?: { name: string; data: string } }>) => {
  const mapped = chatMessages.map(m => {
    return { role: m.role, text: m.text, pdf: m.pdf };
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
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_API_KEY" || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined") {
    throw new Error("Missing Gemini API Key");
  }
  return new GoogleGenAI({ apiKey });
};

const SERVICES: Service[] = [
  { id: "coaching", name: "One-on-One Coaching", description: "Deep partnership for research success." },
  { id: "editing", name: "Structural Editing", description: "Academic refining and APA compliance." },
  { id: "strategy", name: "Strategic Discovery", description: "Clear immediate blocks and set direction." },
  { id: "tutoring", name: "Academic Coaching", description: "Foundational support and mentoring for coursework." },
  { id: "reference", name: "Reference Audit", description: "Complete cross-check of citations." },
];

export const Wizard = () => {
  // Check localStorage for account
  const [account, setAccount] = useState<{ name: string; email: string; level: Level } | null>(() => {
    try {
      const saved = localStorage.getItem("modern_scholar_account");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.email && parsed.level) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<Level | null>(account?.level || null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [formData, setFormData] = useState({ 
    name: account?.name || "", 
    email: account?.email || "", 
    details: "" 
  });
  const [isSuccess, setIsSuccess] = useState(false);

  // Profile creation states
  const [regName, setRegName] = useState(account?.name || "");
  const [regEmail, setRegEmail] = useState(account?.email || "");
  const [regLevel, setRegLevel] = useState<Level | null>(account?.level || null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  // AI Chatbot states
  const [chatHistory, setChatHistory] = useState<Array<{ 
    role: "user" | "model"; 
    text: string; 
    pdf?: { name: string; data: string } 
  }>>([
    {
      role: "model",
      text: "Hello! I am your AI academic advisor. I'm an expert on everything on this website. Please describe exactly what you are looking to receive help with (e.g. dissertation coaching, editing turnarounds, draft sweeps, or general research mentoring), and I will lead you to the absolute best service offered that can help you!"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    const checkStatus = () => {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
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

  // PDF upload states for Wizard Chatbot
  const [wizardPdf, setWizardPdf] = useState<{ name: string; data: string } | null>(null);
  const [isWizardDragging, setIsWizardDragging] = useState(false);
  const wizardFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleWizardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValid = ext === "pdf" || ext === "docx" || ext === "doc";
      if (!isValid) {
        alert("Please select a PDF or Word file (.docx, .doc).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("The file exceeds the 10MB limit.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setWizardPdf({ name: file.name, data: base64 });
      } catch (err) {
        console.error("File reading failed:", err);
      }
    }
  };

  const handleWizardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWizardDragging(true);
  };

  const handleWizardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWizardDragging(false);
  };

  const handleWizardDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsWizardDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValid = ext === "pdf" || ext === "docx" || ext === "doc";
      if (!isValid) {
        alert("Please drop a valid PDF or Word file (.docx, .doc).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("The file exceeds the 10MB limit.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setWizardPdf({ name: file.name, data: base64 });
      } catch (err) {
        console.error("File drops reading failed:", err);
      }
    }
  };

  const handleSaveAccount = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regLevel) {
      alert("Please fill out all fields: Name, Email, and Academic Level.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      alert("Please enter a valid email address.");
      return;
    }
    const newAcc = { name: regName.trim(), email: regEmail.trim(), level: regLevel };
    localStorage.setItem("modern_scholar_account", JSON.stringify(newAcc));
    setAccount(newAcc);
    setLevel(regLevel);
    setFormData(prev => ({ ...prev, name: regName.trim(), email: regEmail.trim() }));
    setIsEditingAccount(false);
    nextStep();
  };

  const handleSignOut = () => {
    localStorage.removeItem("modern_scholar_account");
    setAccount(null);
    setRegName("");
    setRegEmail("");
    setRegLevel(null);
    setLevel(null);
    setFormData(prev => ({ ...prev, name: "", email: "" }));
    setIsEditingAccount(false);
  };

  const sendChatMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && !wizardPdf) || isTyping) return;

    const userMessage = chatInput.trim() || "Please analyze my uploaded PDF document for strategic academic advice.";
    setChatInput("");

    const currentPdf = wizardPdf;
    setWizardPdf(null);

    const newUserMessage = {
      role: "user" as const,
      text: userMessage,
      pdf: currentPdf ? { name: currentPdf.name, data: currentPdf.data } : undefined
    };

    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setIsTyping(true);

    try {
      const systemInstruction = `
You are Dr. Michelle Mendivil's exclusive academic advisor chatbot on the Modern Care Consulting website. You are a Latina American woman who is straight to business.
Your personality: Concise, highly knowledgeable, professional, and very helpful. You get straight to the point but maintain supportive efficiency.

The user is current in an assessment wizard.
User's Self-Declared Details:
- Academic Level: ${level || "Not selected yet"}
- Focus Areas they might be interested in: ${selectedServices && selectedServices.length > 0 ? selectedServices.map(sid => SERVICES.find(s => s.id === sid)?.name || sid).join(", ") : "None specified yet"}

Our primary offerings that you MUST guide them towards:
1. Coaching & Partnerships (Ongoing support, accountability, structure, drafts review):
   - 1-Hour Zoom Session ($125) - Starter roadmap to resolve immediate roadblocks.
   - 2 Weeks Unlimited Coaching ($400) - Intensive email-based sprint.
   - 30 Days Unlimited Coaching ($600) - Build serious writing momentum and daily accountability.
   - 30 Days Coaching + Editing ($1,200) - Unlimited coaching combined with APA check and rigorous edits of drafts.
   - 3 Months Coaching + Editing ($3,200) - Complete quarter-length proposal-to-defense research support and substantive editing.
   - 6 Months Coaching + Editing ($5,100 / $850/month) - Complete thesis/proposal to final defense validation. Highly recommended for candidates who need end-to-end guidance.
   - 1 Year Unlimited Everything ($8,500) - The ultimate executive consulting tier. Complete priority support.

2. Priority Turnaround Editing:
   - 7-Day Edit ($445) - Absolute grammatical correctness and strict style manual alignment.
   - 4-Day Edit ($650) - Fast turnaround for impending graduate school deadlines.
   - 2-Day Edit ($1,200) - Ultra-fast professional 48-hour dissertation polish.
   - 24-Hour Rush Edit ($2,500) - Emergency tier queue slot returned within exactly 24 hours.

3. Individual A-La-Carte Services:
   - Developmental Editing ($350) - Structure, logical flow, literature synthesis.
   - Copy Editing ($200) - Academic tone refinement and syntax.
   - Proofreading ($150) - Final minor spelling and layout corrections before submission.
   - APA Formatting ($120) - Meticulous styles, referencing tables, header hierarchies.
   - Style Guide Compliance ($100) - Custom adaptation to local university handbooks.
   - Reference List Audit ($80) - Crosscheck matching parenthetical text citations to bibliographic entries.

CRITICAL INSTRUCTIONS:
1. Speak in either English or Spanish depending on which language the user addresses you in or requests.
2. Keep all responses very concise, accurate, knowledgeable, and straight to the point. No fluff or flowery pleasantries.
3. When asking for further information or seeking clarification about their draft, timeline, or needs, you MUST put each question in bullet point format (e.g., using "-").
4. Provide direct links to our pricing page and membership plans using markdown when appropriate: always link to [Membership & Pricing Plans](/pricing).
5. Advise them that when they finish their session and click "Submit Request", this custom conversation transcript will be securely forwarded directly to Michelle Mendivil, PhD, who will review it and follow up to start their action plan.
`.trim();

      const sanitized = await sanitizeContentsForGemini(updatedHistory);
      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: sanitized,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const botReply = response.text || "I was unable to analyze that. Please try rephrasing your goal.";
      const finalHistory = [...updatedHistory, { role: "model" as const, text: botReply, pdf: undefined }];
      
      setChatHistory(finalHistory);
      
      // Keep formData.details in sync with full transcript
      const transcript = finalHistory
        .map(m => {
          const fileAttached = m.pdf ? ` [Attached PDF: ${m.pdf.name}]` : "";
          return `${m.role === "user" ? "Scholar" : "Advisor (AI)"}:${fileAttached} ${m.text}`;
        })
        .join("\n\n");
      setFormData(prev => ({ ...prev, details: transcript }));
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory(prev => [...prev, { role: "model" as const, text: "Sorry, I am facing a connection issue. I've noted down your comments though, and Michelle will respond directly!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSend = () => {
    const serviceList = SERVICES.filter(s => selectedServices.includes(s.id)).map(s => s.name).join(", ");
    
    // Ensure we have a valid transcript even if user did not chat
    const transcriptText = formData.details || chatHistory
      .map(m => {
        const fileAttached = m.pdf ? ` [Attached PDF: ${m.pdf.name}]` : "";
        return `${m.role === "user" ? "Scholar" : "Advisor (AI)"}:${fileAttached} ${m.text}`;
      })
      .join("\n\n");

    const body = `
Academic Level: ${level}
Requested Services: ${serviceList}
Name: ${formData.name}
Email: ${formData.email}

--- CONVERSATION TRANSCRIPT WITH AI ADVISOR ---
${transcriptText}
    `.trim();
    
    // Create true email mailto link
    window.location.href = `mailto:support@moderncareconsulting.com?subject=Strategic Consultation Request from ${formData.name}&body=${encodeURIComponent(body)}`;
    
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[60px] shadow-2xl shadow-brand-pink/10 border border-brand-pink/20 max-w-xl"
        >
          <div className="w-20 h-20 bg-brand-pink text-white rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-4xl font-serif text-brand-text mb-4 italic">Plan Sent Successfully</h2>
          <p className="text-brand-text/60 font-serif italic text-lg mb-10 text-balance leading-relaxed">
            Thank you, {formData.name}. Dr. Mendivil has received your tailored academic plan and will reach out to your email ({formData.email}) shortly to discuss the next steps.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center px-10 py-4 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-widest text-[10px] hover:bg-brand-earth transition-all"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="mb-12">
        <div className="flex justify-between items-center mb-8 relative">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step >= i ? 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20' : 'bg-brand-pink/10 text-brand-pink/40'
              }`}>
                {step > i ? <CheckCircle2 size={20} /> : <span className="font-sans font-bold text-xs">{i}</span>}
              </div>
              <span className={`text-[9px] font-bold font-sans uppercase tracking-widest mt-3 transition-colors ${
                step >= i ? 'text-brand-text' : 'text-brand-text/20'
              }`}>
                {i === 1 ? "Account" : i === 2 ? "Services" : i === 3 ? "Details" : "Summary"}
              </span>
            </div>
          ))}
          {/* Progress lines */}
          <div className="absolute left-0 top-5 h-px bg-brand-pink/10 -z-10 w-full hidden md:block"></div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            {account && !isEditingAccount ? (
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                  <h2 className="text-4xl font-serif text-brand-text mb-4 italic">Welcome back, <span className="not-italic text-brand-earth">{account.name}</span></h2>
                  <p className="text-brand-text/50 font-serif italic text-sm">We detected your active research candidate account.</p>
                </div>

                <div className="bg-white border-2 border-brand-pink/20 rounded-[40px] p-8 md:p-10 shadow-xl shadow-brand-pink/5 space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-brand-pink pointer-events-none">
                     <GraduationCap size={110} />
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-brand-pink/10 pb-4">
                      <span className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-pink block mb-1">Scholar Profile</span>
                      <h3 className="text-2xl font-serif text-brand-text italic mb-1">{account.name}</h3>
                      <p className="text-sm font-sans text-brand-text/50">{account.email}</p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-pink block mb-2">Education / Level</span>
                      <div className="flex items-center gap-3 bg-brand-offwhite border border-brand-pink/10 px-5 py-3 rounded-2xl w-fit">
                        <GraduationCap className="text-brand-earth" size={18} />
                        <span className="font-serif italic text-brand-text text-sm font-semibold">{account.level} Candidate</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={nextStep}
                      className="flex-1 py-4 bg-brand-text text-white hover:bg-brand-earth rounded-full font-bold font-sans uppercase tracking-widest text-[10px] transition-all shadow-md text-center flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Continue with this Account <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setRegName(account.name);
                        setRegEmail(account.email);
                        setRegLevel(account.level);
                        setIsEditingAccount(true);
                      }}
                      className="px-6 py-4 border-2 border-brand-pink/25 text-brand-text hover:bg-brand-offwhite rounded-full font-bold font-sans uppercase tracking-widest text-[10px] transition-all text-center cursor-pointer"
                    >
                      Edit Account Info
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={handleSignOut}
                    className="text-[9px] font-bold font-sans uppercase tracking-widest text-red-500 hover:text-red-700 transition-all underline cursor-pointer"
                  >
                    Use Another Account / Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-10">
                <div className="text-center">
                  <h2 className="text-4xl font-serif text-brand-text mb-4 italic">
                    {isEditingAccount ? "Update your " : "Create your "}
                    <span className="not-italic text-brand-earth">Scholar Account</span>
                  </h2>
                  <p className="text-brand-text/40 font-serif italic max-w-lg mx-auto leading-relaxed">
                    Set up your basic profile so we can align our advice and tailored plans to your precise research standards.
                  </p>
                </div>

                <form onSubmit={handleSaveAccount} className="space-y-8 bg-white border border-brand-pink/15 rounded-[40px] p-8 md:p-12 shadow-lg">
                  {/* Name and Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink/30 w-4 h-4" />
                        <input
                          type="text"
                          required
                          className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 pl-12 text-sm font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner"
                          placeholder="e.g. Brandon Glenn"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink/30 w-4 h-4" />
                        <input
                          type="email"
                          required
                          className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 pl-12 text-sm font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner"
                          placeholder="your@email.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Level selection in the form */}
                  <div className="space-y-4 pt-2">
                    <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1 block">Academic Education Level</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(["Doctorate", "Masters", "Bachelors", "Associates", "High School"] as Level[]).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setRegLevel(l)}
                          className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-3.5 group relative cursor-pointer ${
                            regLevel === l 
                              ? 'border-brand-pink bg-brand-pink/5 shadow-md shadow-brand-pink/5' 
                              : 'border-brand-pink/10 hover:border-brand-pink/25 hover:bg-brand-offwhite'
                          }`}
                        >
                          <GraduationCap className={`shrink-0 transition-colors mt-0.5 ${regLevel === l ? 'text-brand-pink' : 'text-brand-text/20 group-hover:text-brand-pink/50'}`} size={18} />
                          <span className="text-xs font-serif font-semibold text-brand-text leading-tight">{l} Candidate</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit / Save Button */}
                  <div className="pt-4 flex items-center justify-between border-t border-brand-pink/10">
                    {isEditingAccount ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingAccount(false)}
                        className="text-[9px] font-bold font-sans uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-all cursor-pointer"
                      >
                        Cancel Edits
                      </button>
                    ) : (
                      <div />
                    )}
                    <button
                      type="submit"
                      disabled={!regName.trim() || !regEmail.trim() || !regLevel}
                      className={`px-10 py-4 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-widest text-[10px] flex items-center transition-all cursor-pointer ${
                        !regName.trim() || !regEmail.trim() || !regLevel 
                          ? 'opacity-20 cursor-not-allowed' 
                          : 'hover:bg-brand-earth shadow-xl'
                      }`}
                    >
                      {isEditingAccount ? "Save Profile Details" : "Create Account & Proceed"} <ChevronRight size={14} className="ml-2" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="text-center">
              <h2 className="text-4xl font-serif text-brand-text mb-4 italic">Tailor your <span className="not-italic text-brand-earth">Services</span></h2>
              <p className="text-brand-text/40 font-serif italic">Choose as many as you need for your success.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleService(s.id)}
                  className={`p-8 rounded-[40px] border-2 transition-all text-left flex items-start gap-6 group relative overflow-hidden ${
                    selectedServices.includes(s.id) ? 'border-brand-pink bg-brand-pink/5' : 'border-brand-pink/10 hover:border-brand-pink/30 hover:bg-brand-offwhite'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    selectedServices.includes(s.id) ? 'bg-brand-pink border-brand-pink text-white shadow-lg shadow-brand-pink/30 scale-110' : 'border-brand-pink/20 text-brand-pink/40'
                  }`}>
                    {selectedServices.includes(s.id) ? <CheckCircle2 size={16} /> : <div className="w-1 h-1 rounded-full bg-current" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium font-serif text-brand-text mb-1">{s.name}</h3>
                    <p className="text-xs text-brand-text/50 font-serif italic leading-relaxed">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-10">
              <button onClick={prevStep} className="flex items-center text-brand-text/40 hover:text-brand-text font-bold font-sans uppercase tracking-widest text-[9px] transition-colors">
                <ChevronLeft size={16} className="mr-2" /> Previous
              </button>
              <button 
                onClick={nextStep}
                disabled={selectedServices.length === 0}
                className={`px-10 py-4 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-widest text-[10px] flex items-center transition-all ${
                  selectedServices.length === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-brand-earth shadow-xl'
                }`}
              >
                Continue <ChevronRight size={14} className="ml-2" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="text-center">
              <h2 className="text-4xl font-serif text-brand-text mb-4 italic">Personalized <span className="not-italic text-brand-earth">Journey</span></h2>
              <p className="text-brand-text/40 font-serif italic">Share a bit about yourself and find your optimal path through our interactive advisor chat.</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Profile Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink/30 w-4 h-4" />
                    <input
                      type="text"
                      required
                      className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 pl-12 text-sm font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner"
                      placeholder="E.g. Michelle Mendivil"
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, name: val }));
                        setRegName(val);
                        if (account) {
                          const updated = { ...account, name: val };
                          setAccount(updated);
                          localStorage.setItem("modern_scholar_account", JSON.stringify(updated));
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink/30 w-4 h-4" />
                    <input
                      type="email"
                      required
                      className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 pl-12 text-sm font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, email: val }));
                        setRegEmail(val);
                        if (account) {
                          const updated = { ...account, email: val };
                          setAccount(updated);
                          localStorage.setItem("modern_scholar_account", JSON.stringify(updated));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Chatbot Interface Section */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-pink flex items-center gap-1.5">
                    <Sparkles size={11} className="animate-pulse" /> Custom Advisor Chatbot (Expert Assistant)
                  </label>
                  <p className="text-xs text-brand-text/50 font-serif italic">
                    Share exactly what you are looking to receive help with below. Our advisor bot will suggest and walk you through the absolute best consulting or edit packages.
                  </p>
                </div>

                <div 
                  className="bg-brand-offwhite border border-brand-pink/15 rounded-[30px] p-6 shadow-md flex flex-col gap-4 overflow-hidden relative"
                  onDragOver={handleWizardDragOver}
                  onDragLeave={handleWizardDragLeave}
                  onDrop={handleWizardDrop}
                >
                  {isWizardDragging && (
                    <div className="absolute inset-0 bg-brand-pink/15 backdrop-blur-sm z-[90] flex flex-col items-center justify-center p-6 border-4 border-dashed border-brand-earth/50 m-4 rounded-[24px]">
                      <FileText size={40} className="text-brand-earth animate-bounce mb-2" />
                      <p className="font-serif italic text-brand-text font-bold text-center text-xs">Drop your draft PDF or Word file here to share context</p>
                      <span className="text-[9px] uppercase tracking-wider text-brand-text/40 font-bold font-sans">Supports up to 10MB</span>
                    </div>
                  )}

                  {/* Messages container */}
                  <div className="h-[280px] overflow-y-auto pr-2 space-y-4 flex flex-col scrollbar-thin scrollbar-thumb-brand-pink/10">
                    {chatHistory.map((m, idx) => (
                      <div 
                        key={idx}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${
                            m.role === "user" ? "bg-brand-earth text-white" : "bg-brand-lavender/40 text-brand-text border border-brand-pink/10"
                          }`}>
                            {m.role === "user" ? <User size={13} /> : <Bot size={13} />}
                          </div>
                          <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            m.role === "user"
                              ? "bg-brand-earth text-white rounded-tr-none shadow-sm font-sans"
                              : "bg-white text-brand-text border border-brand-pink/10 rounded-tl-none font-serif italic shadow-sm"
                          }`}>
                            {/* Show PDF badge if m.pdf exists */}
                            {m.pdf && (
                              <div className={`mb-2 p-2 rounded-xl flex items-center gap-2 text-[10px] border ${
                                m.role === "user" 
                                  ? "bg-white/10 border-white/20 text-white" 
                                  : "bg-brand-pink/5 border-brand-pink/10 text-brand-text"
                              }`}>
                                <FileText size={14} className={m.role === "user" ? "text-white" : "text-brand-earth"} />
                                <div className="flex flex-col truncate max-w-[180px]">
                                  <span className="font-sans font-bold truncate text-[10px]" title={m.pdf.name}>
                                    {m.pdf.name}
                                  </span>
                                  <span className="text-[8px] opacity-75 uppercase font-bold tracking-widest font-sans">
                                    {m.pdf.name.split('.').pop()?.toUpperCase() === "PDF" ? "PDF" : "Word"} Document Attached
                                  </span>
                                </div>
                              </div>
                            )}

                            {m.role === "user" ? (
                              m.text
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
                                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed font-serif italic text-xs">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 my-3 not-italic font-sans text-[11px] flex flex-col gap-1.5 text-brand-text/90">{children}</ul>,
                                    li: ({ children }) => <li className="not-italic font-sans text-[11px] tracking-wide leading-relaxed">{children}</li>,
                                  }}
                                >
                                  {m.text}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-lavender/40 text-brand-text flex items-center justify-center">
                            <Loader2 size={13} className="animate-spin" />
                          </div>
                          <div className="p-4 bg-white border border-brand-pink/10 rounded-2xl rounded-tl-none text-xs text-brand-text/50 font-serif italic flex items-center gap-2">
                            <span>PhD Advisor is crafting optimal plan recommendations...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attached file pre-send badge */}
                  {wizardPdf && (
                    <div className="px-5 py-2.5 bg-white border border-brand-pink/10 rounded-2xl flex items-center justify-between gap-3 text-xs font-sans shadow-sm">
                      <div className="flex items-center gap-2 text-brand-text/80 font-medium truncate">
                        <FileText size={14} className="text-brand-earth animate-pulse flex-shrink-0" />
                        <span className="truncate max-w-[200px] font-bold text-[10px] text-brand-text" title={wizardPdf.name}>
                          {wizardPdf.name}
                        </span>
                        <span className="text-[7px] uppercase tracking-wider text-brand-text/40 font-bold bg-brand-offwhite px-1.5 py-0.5 rounded-full border border-brand-pink/10 flex-shrink-0">
                          {wizardPdf.name.split('.').pop()?.toUpperCase() === "PDF" ? "PDF" : "WORD"}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setWizardPdf(null)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 flex-shrink-0"
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {status === "offline" && (
                    <div className="mb-2 p-4 bg-brand-pink/5 rounded-[20px] border border-brand-pink/15 text-center flex flex-col items-center gap-2">
                      <p className="text-xs font-serif italic text-brand-text">
                        The AI chatbot is currently offline. Please complete this wizard as normal, and send an email directly to:
                      </p>
                      <a
                        href="mailto:michelle@moderncareconsulting.com?subject=Strategic Consultation Request&body=Hi Dr. Mendivil, I would like to schedule a strategic consultation."
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-earth hover:bg-brand-pink text-white rounded-full text-[10px] font-sans font-bold uppercase tracking-widest transition-all shadow-md shadow-brand-earth/10 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Mail size={12} />
                        michelle@moderncareconsulting.com
                      </a>
                    </div>
                  )}

                  {/* Message Input bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-brand-pink/10">
                    <button
                      type="button"
                      onClick={() => wizardFileInputRef.current?.click()}
                      disabled={status === "offline"}
                      className="w-10 h-10 bg-white border border-brand-pink/10 text-brand-earth hover:text-brand-pink hover:bg-brand-lavender/10 transition-all rounded-full flex items-center justify-center flex-shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Attach PDF or Word file"
                    >
                      <Paperclip size={15} />
                    </button>
                    <input 
                      type="file"
                      ref={wizardFileInputRef}
                      onChange={handleWizardFileChange}
                      accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                      className="hidden"
                    />

                    <div className="relative flex-1">
                      <input 
                        type="text"
                        className="w-full bg-white border border-brand-pink/10 rounded-full py-3.5 px-6 pr-14 text-xs font-serif italic text-brand-text focus:border-brand-pink/40 outline-none transition-all shadow-sm disabled:bg-gray-100/50 disabled:text-brand-text/30"
                        placeholder={status === "offline" ? "Advisor is offline - please use the email above" : "Share what you are looking for support with..."}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                        disabled={isTyping || status === "offline"}
                      />
                      <button
                        type="button"
                        onClick={() => sendChatMessage()}
                        disabled={(!chatInput.trim() && !wizardPdf) || isTyping || status === "offline"}
                        className="absolute right-2 top-1.5 w-9 h-9 bg-brand-earth text-white rounded-full flex items-center justify-center hover:bg-brand-pink transition-all disabled:opacity-30 disabled:hover:bg-brand-earth"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forwarding Notification Checkbox */}
              <div className="flex items-start gap-4 bg-brand-pink/5 border border-brand-pink/10 p-5 rounded-2xl">
                <input
                  id="consent-checkbox"
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 text-brand-pink focus:ring-brand-pink rounded border-brand-pink/25 cursor-pointer accent-brand-pink"
                />
                <label htmlFor="consent-checkbox" className="text-xs font-serif italic text-brand-text/70 leading-relaxed cursor-pointer select-none">
                  I understand and agree that my consultation chat conversation transcript will be forwarded directly to Michelle Mendivil, PhD when I submit this form, enabling comprehensive personalized onboarding and draft review.
                </label>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-10 border-t border-brand-pink/10 max-w-2xl mx-auto">
              <button onClick={prevStep} className="flex items-center text-brand-text/40 hover:text-brand-text font-bold font-sans uppercase tracking-widest text-[9px] transition-colors">
                <ChevronLeft size={16} className="mr-2" /> Previous
              </button>
              <button 
                onClick={nextStep}
                disabled={!formData.name || !formData.email || !consentChecked}
                className={`px-10 py-4 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-widest text-[10px] flex items-center transition-all ${
                  !formData.name || !formData.email || !consentChecked ? 'opacity-20 cursor-not-allowed' : 'hover:bg-brand-earth shadow-xl'
                }`}
              >
                Review Plan <ChevronRight size={14} className="ml-2" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-4xl font-serif text-brand-text mb-4 italic">Your Academic <span className="not-italic text-brand-earth">Vision</span></h2>
              <p className="text-brand-text/40 font-serif italic">Review your custom plan before sending it to Dr. Mendivil.</p>
            </div>
            
            <div className="bg-white rounded-[60px] border border-brand-pink/20 shadow-2xl p-10 md:p-16 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 h-32 opacity-[0.03] text-brand-pink pointer-events-none">
                  <Sparkles size={120} />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.3em] text-brand-pink mb-4">Academic Status</h4>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-offwhite rounded-2xl flex items-center justify-center text-brand-earth shadow-sm">
                          <GraduationCap size={24} />
                        </div>
                        <span className="text-2xl font-serif text-brand-text italic">{level} Candidate</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.3em] text-brand-pink mb-4">Focus Areas</h4>
                      <div className="flex flex-wrap gap-3">
                        {SERVICES.filter(s => selectedServices.includes(s.id)).map(s => (
                          <span key={s.id} className="px-5 py-2 bg-brand-offwhite border border-brand-pink/10 rounded-full text-[10px] font-bold font-sans text-brand-text uppercase tracking-widest flex items-center">
                            <CheckCircle2 size={12} className="mr-2 text-brand-earth" /> {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div>
                      <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.3em] text-brand-pink mb-4">Collaborator</h4>
                      <div className="space-y-1">
                        <p className="text-2xl font-serif text-brand-text italic">{formData.name}</p>
                        <p className="text-sm font-serif text-brand-text/40">{formData.email}</p>
                      </div>
                    </div>

                    {chatHistory.length > 1 ? (
                      <div>
                        <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.3em] text-brand-pink mb-4">Advisor Consultation Logs</h4>
                        <div className="border border-brand-pink/10 rounded-2xl bg-brand-offwhite p-4 max-h-[160px] overflow-y-auto space-y-3 scrollbar-thin">
                          {chatHistory.slice(1).map((m, idx) => (
                            <div key={idx} className="text-xs font-serif leading-relaxed">
                              <span className={`font-sans font-bold uppercase tracking-wider text-[8px] mr-1.5 ${m.role === 'user' ? 'text-brand-earth' : 'text-brand-pink'}`}>
                                {m.role === 'user' ? 'You' : 'Advisor'}
                              </span>
                              <span className="text-brand-text/70">{m.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      formData.details && (
                        <div>
                          <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.3em] text-brand-pink mb-4">Vision Details</h4>
                          <p className="text-sm font-serif text-brand-text/60 italic leading-relaxed line-clamp-4">
                            "{formData.details}"
                          </p>
                        </div>
                      )
                    )}
                  </div>
               </div>

               <div className="mt-20 pt-10 border-t border-brand-pink/10 flex flex-col items-center">
                 <button 
                  onClick={handleSend}
                  className="group relative flex items-center px-16 py-6 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[11px] hover:bg-brand-pink transition-all shadow-2xl shadow-brand-earth/20 transform hover:scale-105 active:scale-95"
                 >
                   Send Plan to Dr. Mendivil now
                   <Send className="ml-4 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 </button>
                 <div className="mt-8 flex items-center text-[8px] font-bold font-sans uppercase tracking-widest text-brand-text/20">
                   <Clock size={10} className="mr-2" /> Responds within 24-48 hours
                 </div>
               </div>
            </div>

            <div className="flex justify-center pt-8">
              <button onClick={prevStep} className="flex items-center text-brand-text/40 hover:text-brand-text font-bold font-sans uppercase tracking-widest text-[9px] transition-colors">
                <ChevronLeft size={16} className="mr-2" /> I need to change something
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
