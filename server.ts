import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
// @ts-ignore
import mammoth from "mammoth";
import Stripe from "stripe";
// @ts-ignore
import PDFDocument from "pdfkit";

dotenv.config();

const portStr = process.env.PORT || "3000";
const PORT = parseInt(portStr, 10);

interface InputMessage {
  role: string;
  text?: string;
  content?: string;
  pdf?: {
    data: string;
    name: string;
  };
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  pdf?: {
    data: string;
    name: string;
  };
}

let _ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. Gemini calls might fail.");
    }
    _ai = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return _ai;
}

function extractStringsFromDoc(buffer: Buffer): string {
  let text = "";
  try {
    const utf16Str = buffer.toString("utf16le");
    const utf16Cleaned = utf16Str.replace(/[^\x20-\x7E\s\u00A0-\u00FF\u0100-\u017F]/g, "");
    const words = utf16Cleaned.split(/\s+/).filter(w => w.trim().length > 1 && !/^[^\w\s]{3,}$/.test(w));
    if (words.length > 10) {
      text = words.join(" ");
    }
  } catch (e) {
    console.warn("Failed UTF-16 extraction for .doc", e);
  }

  if (text.length < 50) {
    const asciiStr = buffer.toString("utf8");
    const asciiCleaned = asciiStr.replace(/[^\x20-\x7E\s]/g, "");
    const words = asciiCleaned.split(/\s+/).filter(w => w.trim().length > 1 && !/^[^\w\s]{2,}$/.test(w));
    text = words.join(" ");
  }

  text = text.replace(/\s+/g, " ").trim();
  
  if (text.length > 20000) {
    text = text.slice(0, 20000) + "... [Extracted text truncated due to length]";
  }
  
  return text || "[Unparseable binary .doc content]";
}

async function sanitizeContents(messages: InputMessage[]) {
  const mapped = messages.map(m => {
    const role = (m.role === "user" || m.role === "client") ? "user" as const : "model" as const;
    const text = m.content || m.text || "";
    return { role, text, pdf: m.pdf };
  });

  const firstUserIdx = mapped.findIndex(m => m.role === "user");
  if (firstUserIdx === -1) {
    return [];
  }

  const sliced = mapped.slice(firstUserIdx);
  const sanitized: { role: "user" | "model"; parts: any[] }[] = [];

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
          const docxBuffer = Buffer.from(msg.pdf.data, "base64");
          const result = await mammoth.extractRawText({ buffer: docxBuffer });
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
          const docBuffer = Buffer.from(msg.pdf.data, "base64");
          const extractedText = extractStringsFromDoc(docBuffer);
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
          const textContent = Buffer.from(msg.pdf.data, "base64").toString("utf-8");
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

    if (sanitized.length === 0) {
      sanitized.push({
        role: "user",
        parts
      });
    } else {
      const last = sanitized[sanitized.length - 1];
      if (last.role === msg.role) {
        last.parts.push(...parts);
      } else {
        sanitized.push({
          role: msg.role,
          parts
        });
      }
    }
  }

  return sanitized;
}

function handleChatError(error: any, isWizard: boolean, language: string = "en", res: express.Response) {
  const errStr = String(error?.message || "") + " " + String(error?.stack || "") + " " + JSON.stringify(error || {});
  const isBillingOrQuota = 
    errStr.includes("RESOURCE_EXHAUSTED") || 
    errStr.includes("depleted") || 
    errStr.includes("prepayment credits") || 
    errStr.includes("429") ||
    errStr.includes("quota") ||
    error?.status === 429 ||
    error?.statusCode === 429;

  const isApiKeyIssue = 
    !process.env.GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || 
    process.env.GEMINI_API_KEY.trim() === "" ||
    errStr.includes("API key") || 
    errStr.includes("API_KEY") || 
    errStr.includes("key not found") || 
    errStr.includes("INVALID_ARGUMENT") ||
    errStr.includes("unauthorized") ||
    errStr.includes("403") ||
    errStr.includes("401");

  if (isBillingOrQuota) {
    if (isWizard) {
      const msg = `Hello! It looks like our AI assistant's billing quota is temporarily exhausted or prepayment credits are depleted in Google AI Studio. 

Don't worry! Your progress has been saved in this form. If you finish filling out the wizard and click "Submit Request", your entire history and selections will still be sent directly to Dr. Michelle Mendivil, and she will reach out to you personally. 

Feel free to also email Dr. Mendivil directly at info@moderncareconsulting.com. 

*(Note for Administrator: Please visit the Google AI Studio console at https://ai.studio/projects to manage billing and replenish prepaid credits for this project.)*`;
      return res.json({ text: msg });
    } else {
      const isEs = language === "es";
      const msg = isEs 
        ? `¡Hola! Parece que el saldo de créditos de nuestro asistente de inteligencia artificial está temporalmente agotado en Google AI Studio. 

¡No te preocupes! Puedes contactar a la Dra. Michelle Mendivil directamente por correo electrónico en info@moderncareconsulting.com para recibir consultas personalizadas de asesoría académica y edición. 

*(Nota para el Administrador: Por favor, ingrese a la consola de Google AI Studio en https://ai.studio/projects para gestionar la facturación y recargar saldo prepago para este proyecto.)*` 
        : `Hello! It looks like our AI assistant's billing quota is temporarily exhausted or prepayment credits are depleted in Google AI Studio. 

Don't worry! You can reach Dr. Michelle Mendivil directly via email at info@moderncareconsulting.com for personalized academic advisor support, coaching, or editing inquiries. 

*(Note for Administrator: Please visit the Google AI Studio console at https://ai.studio/projects to manage billing and replenish prepaid credits for this project.)*`;
      return res.json({ text: msg });
    }
  }

  if (isApiKeyIssue) {
    if (isWizard) {
      const msg = `Hello! It looks like our AI assistant's API key is not currently configured or is invalid in Google AI Studio. 

Don't worry! Your progress has been saved in this form. If you finish filling out the wizard and click "Submit Request", your entire history and selections will still be sent directly to Dr. Michelle Mendivil, and she will reach out to you personally. 

Feel free to also email Dr. Mendivil directly at info@moderncareconsulting.com. 

*(Note for Administrator: Please verify that GEMINI_API_KEY is correctly set in the Google AI Studio secrets console.)*`;
      return res.json({ text: msg });
    } else {
      const isEs = language === "es";
      const msg = isEs 
        ? `¡Hola! Parece que la clave de nuestro asistente de inteligencia artificial no está configurada o es inválida en Google AI Studio. 

¡No te preocupes! Puedes contactar a la Dra. Michelle Mendivil directamente por correo electrónico en info@moderncareconsulting.com para recibir consultas personalizadas de asesoría académica y edición. 

*(Nota para el Administrador: Por favor, verifique que la clave GEMINI_API_KEY esté configurada correctamente en el panel de secretos de Google AI Studio.)*` 
        : `Hello! It looks like our AI assistant's API key is not currently configured or is invalid in Google AI Studio. 

Don't worry! You can reach Dr. Michelle Mendivil directly via email at info@moderncareconsulting.com for personalized academic advisor support, coaching, or editing inquiries. 

*(Note for Administrator: Please verify that GEMINI_API_KEY is correctly set in the Google AI Studio secrets console.)*`;
      return res.json({ text: msg });
    }
  }

  // Generic Graceful Error Fallback
  console.error("Gemini API Error:", error);
  if (isWizard) {
    const msg = `Hello! I am currently experiencing a minor system interruption. 

Don't worry! Your progress has been saved in this form. If you finish filling out the wizard and click "Submit Request", your entire history and selections will still be sent directly to Dr. Michelle Mendivil, and she will reach out to you personally. 

Feel free to also email Dr. Mendivil directly at info@moderncareconsulting.com.`;
    return res.json({ text: msg });
  } else {
    const isEs = language === "es";
    const msg = isEs 
      ? `¡Hola! Actualmente estoy experimentando una pequeña interrupción en mi sistema de inteligencia artificial. 

¡No te preocupes! Puedes contactar a la Dra. Michelle Mendivil directamente por correo electrónico en info@moderncareconsulting.com para recibir consultas personalizadas de asesoría académica y edición.`
      : `Hello! I am currently experiencing a minor system interruption with my AI component. 

Don't worry! You can reach Dr. Michelle Mendivil directly via email at info@moderncareconsulting.com for personalized academic advisor support, coaching, or editing inquiries.`;
    return res.json({ text: msg });
  }
}

const app = express();
app.use(express.json({ limit: "20mb" }));

  // API Route for the academic wizard advisor chatbot
  app.post("/api/wizard/chat", async (req, res) => {
    try {
      const { messages, academicLevel, selectedServices } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      // Convert messages list into a structured prompt or format for generationContent
      // We will supply a rigorous system instruction to the model
      const systemInstruction = `
You are Dr. Michelle Mendivil's exclusive academic advisor chatbot on the Modern Care Consulting website. You are a Latina American woman who is straight to business.
Your personality: Concise, highly knowledgeable, professional, and very helpful. You get straight to the point but maintain supportive efficiency.

The user is current in an assessment wizard.
User's Self-Declared Details:
- Academic Level: ${academicLevel || "Not selected yet"}
- Focus Areas they might be interested in: ${selectedServices && selectedServices.length > 0 ? selectedServices.join(", ") : "None specified yet"}

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

      const sanitizedContents = await sanitizeContents(messages);
      if (sanitizedContents.length === 0) {
        return res.status(400).json({ error: "Conversation must contain at least one user message." });
      }

      const response = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: sanitizedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || "";
      return res.json({ text });
    } catch (error: any) {
      return handleChatError(error, true, "en", res);
    }
  });

  // API Route to check chatbot connectivity and operability status
  app.get("/api/chatbot/status", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
        return res.json({ status: "offline", reason: "missing_api_key" });
      }
      return res.json({ status: "online" });
    } catch (error) {
      return res.json({ status: "offline", reason: "server_error" });
    }
  });

  // API Route for the general bubbly Latina assistant ChatBot
  app.post("/api/general/chat", async (req, res) => {
    try {
      const { messages, language } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

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

      const sanitizedContents = await sanitizeContents(messages);
      if (sanitizedContents.length === 0) {
        return res.status(400).json({ error: "Conversation must contain at least one user message." });
      }

      const response = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: sanitizedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || "";
      return res.json({ text });
    } catch (error: any) {
      return handleChatError(error, false, req.body?.language || "en", res);
    }
  });

  // Lazy stripe client holder
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not defined");
      }
      stripeClient = new Stripe(key, {
        apiVersion: "2023-10-16" as any,
      });
    }
    return stripeClient;
  }

  // API Route to create a Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { items, email } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty or invalid" });
      }

      const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
      const origin = req.headers.origin || `${req.secure ? 'https' : 'http'}://${req.get('host')}` || "http://localhost:3000";

      if (!hasStripeKey) {
        console.warn("WARNING: STRIPE_SECRET_KEY is missing. Operating in Educational Demo / Simulation Mode.");
        return res.json({
          url: `${origin}/checkout?success=true&demo=true`,
          isDemo: true,
          message: "Developer Notice: Operating in local fallback simulation because STRIPE_SECRET_KEY is not defined in your project secrets."
        });
      }

      const stripe = getStripe();
      
      const OFFICIAL_PRICES: Record<string, number> = {
        "dissertation-study": 1,
        "coaching-zoom": 125,
        "coaching-2weeks": 400,
        "coaching-30days": 600,
        "coaching-30days-edit": 1200,
        "coaching-3months": 3200,
        "coaching-6months": 5100,
        "coaching-1year": 8500,
        "editing-developmental": 350,
        "editing-copy": 100,
        "editing-proofreading": 150,
        "editing-apa": 120,
        "editing-styleguide": 100,
        "editing-ref-audit": 80,
        "editing-0": 350,
        "editing-1": 100,
        "editing-2": 150,
        "editing-3": 120,
        "editing-4": 100,
        "editing-5": 80,
        "coaching-package": 250,
        "zoom-1hr": 125,
      };

      const lineItems = items.map((item: any) => {
        let price = item.price;
        if (item.id && OFFICIAL_PRICES[item.id] !== undefined) {
          price = OFFICIAL_PRICES[item.id];
        }
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
              description: item.description || `Modern Care Consulting - ${item.name}`,
            },
            unit_amount: Math.round(price * 100), // in cents
          },
          quantity: 1,
        };
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        customer_email: email || undefined,
        success_url: `${origin}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?canceled=true`,
        metadata: {
          itemsCount: items.length.toString(),
          itemsJson: JSON.stringify(items.map(i => {
            let price = i.price;
            if (i.id && OFFICIAL_PRICES[i.id] !== undefined) {
              price = OFFICIAL_PRICES[i.id];
            }
            return { id: i.id, name: i.name, price };
          })).slice(0, 500)
        }
      });

      return res.json({ url: session.url, isDemo: false });
    } catch (error: any) {
      console.error("Stripe Checkout Session Error:", error);
      return res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // API Route to download the full dissertation PDF
  app.get("/api/download-dissertation", (req, res) => {
    try {
      const doc = new PDFDocument({
        margin: 72,
        size: "letter",
        bufferPages: true
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=\"Michelle_Mendivil_PhD_Dissertation.pdf\""
      );

      doc.pipe(res);

      // --- PAGE 1: TITLE PAGE ---
      doc.font("Times-Roman").fontSize(12);
      doc.moveDown(4);
      doc.text(
        "Adults’ Perceptions of Wearable-Fitness-Devices on Psychological Well-Being and",
        { align: "center" }
      );
      doc.text("Motivation to Engage in Physical Activities", { align: "center" });
      
      doc.moveDown(4);
      doc.text("Submitted by", { align: "center" });
      doc.moveDown(1);
      doc.font("Times-Bold").text("Michelle Mendivil", { align: "center" });
      
      doc.font("Times-Roman").moveDown(8);
      doc.text("A Dissertation Presented in Partial Fulfillment", { align: "center" });
      doc.text("of the Requirements for the Degree", { align: "center" });
      doc.text("Doctor of Philosophy", { align: "center" });
      
      doc.moveDown(6);
      doc.text("Grand Canyon University", { align: "center" });
      doc.text("Phoenix, Arizona", { align: "center" });
      doc.text("December 30, 2025", { align: "center" });

      // --- PAGE 2: COPYRIGHT PAGE ---
      doc.addPage();
      doc.moveDown(15);
      doc.text("© by Michelle Mendivil, 2025", { align: "center" });
      doc.text("ALL RIGHTS RESERVED.", { align: "center" });

      // --- PAGE 3: COMMITTEE APPROVAL ---
      doc.addPage();
      doc.moveDown(2);
      doc.text("Grand Canyon University", { align: "center" });
      doc.moveDown(2);
      doc.text(
        "Adults’ Perceptions of Wearable-Fitness-Devices on Psychological Well-Being and",
        { align: "center" }
      );
      doc.text("Motivation to Engage in Physical Activities", { align: "center" });
      doc.moveDown(1);
      doc.text("by", { align: "center" });
      doc.moveDown(1);
      doc.text("Michelle Mendivil", { align: "center" });
      doc.moveDown(3);
      doc.text("Successfully Defended and Approved by All Dissertation Committee Members", { align: "center" });
      doc.text("November 4, 2025", { align: "center" });
      
      doc.moveDown(3);
      doc.font("Times-Bold").text("DISSERTATION COMMITTEE APPROVAL:", { align: "left" });
      doc.font("Times-Roman").moveDown(1);
      doc.text(
        "The following committee members certify they have read and approve this dissertation and deem it fully adequate in scope and quality as a dissertation for the degree of Doctor of Philosophy in General Psychology with an Emphasis in integrating Technology, Learning and Psychology.",
        { align: "justify" }
      );
      doc.moveDown(2);
      doc.text("Jeff Quin, EdD, Dissertation Chair", { align: "left" });
      doc.text("James Glenn, PhD, Committee Member", { align: "left" });
      doc.text("Reginald Kimball, EdD, Committee Member", { align: "left" });
      
      doc.moveDown(3);
      doc.font("Times-Bold").text("ACCEPTED AND SIGNED:", { align: "left" });
      doc.font("Times-Roman").moveDown(1);
      doc.text("Michael R. Berger, EdD, Dean, College of Doctoral Studies", { align: "left" });
      doc.text("December 30, 2025", { align: "left" });

      // --- PAGE 4: VERACITY PAGE ---
      doc.addPage();
      doc.moveDown(2);
      doc.text("Grand Canyon University", { align: "center" });
      doc.moveDown(2);
      doc.text(
        "Adults’ Perceptions of Wearable-Fitness-Devices on Psychological Well-Being and",
        { align: "center" }
      );
      doc.text("Motivation to Engage in Physical Activities", { align: "center" });
      doc.moveDown(4);
      doc.text(
        "I verify that my dissertation represents original research, is not falsified, or plagiarized, and that I accurately reported, cited, and referenced all sources within this manuscript in strict compliance with APA and Grand Canyon University (GCU) guidelines. I also verify my dissertation complies with the approval(s) granted for this research investigation by GCU Institutional Review Board (IRB).",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(5);
      doc.text("Michelle Mendivil", { align: "left" });
      doc.text("Date: 11/7/2025", { align: "left" });

      // --- PAGE 5: ABSTRACT ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("Abstract", { align: "center" });
      doc.font("Times-Roman").fontSize(12).moveDown(2);
      doc.text(
        "The purpose of this qualitative descriptive study was to explore how adults 18 years of age and older describe the influence of wearable fitness devices on psychological well-being and motivation to engage in physical activities in the Western region of the US. Self-determination theory provided theoretical foundation. The guiding research questions explored how wearable fitness devices influence adults’ motivation to engage in physical activity, and how these devices affect users’ psychological well-being. The study included 19 adult participants, ages 18 and older, residing in the Western United States. Seven themes emerged from the data analysis: emotional enhancement through goal achievement, anxiety and stress reduction through device interaction, psychological challenges and dependency, social connectivity enhancing well-being and motivation, habit formation and routine integration, influence of real-time feedback and reminders, and data-informed adaptations in behavior and lifestyle. These themes illustrate both the benefits and challenges of wearable fitness device use, reflecting how participants experienced motivation, accountability, and at times frustration or dependency. Participants described how devices informed daily choices and long-term health goals through actionable data, real-time feedback, and trend tracking. These features promoted intrinsic motivation by fostering control, progress, and consistency in physical activity, aligning with the study’s research questions on how wearable devices influence psychological well-being and motivation to stay active.",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(2);
      doc.font("Times-Bold").text("Keywords: ", { continued: true });
      doc.font("Times-Roman").text("Wearable fitness devices, motivation, psychological well-being, Self-Determination Theory, qualitative descriptive study, fitness, movement, motivation, fitness devices");

      // --- PAGE 6: DEDICATION ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("Dedication", { align: "center" });
      doc.font("Times-Roman").fontSize(12).moveDown(2);
      doc.text(
        "This dissertation is dedicated to my mother, Yolanda Prieto Carrillo, whose perseverance and sacrifice, often working multiple jobs, created the foundation for her daughters’ success. To my father, Miguel Mendivil Gallegos, who brought many joys to my childhood. Your passing in 2023, during the writing of this dissertation, was a profound loss, and I honor your memory through this accomplishment.",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(1);
      doc.text(
        "To my sisters, Karla and Melissa, I am deeply grateful for your constant encouragement and unwavering belief in me throughout this journey. To my nieces, Mariel, Lindsey, Montse, Lya and my nephews, Erick and Aleks, may this achievement serve as inspiration to pursue your own aspirations and to continue the legacy of education in our family.",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(1);
      doc.text(
        "To my partner, Brandon, I extend my deepest gratitude for your unwavering support, patience, and guidance, particularly during moments of challenge and self-doubt. To my cousin, Linda Prieto, who has always been like a sister to me, thank you for cheering me on and making me feel seen and supported during my hardest moments. Your love and encouragement carried me through.",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(1);
      doc.text(
        "To Jaylen, may this accomplishment remind you always to dream ambitiously and to remain dedicated to achieving your educational and personal goals. Finally, to my friends, co-workers, and extended family, I am sincerely thankful for your encouragement and support. Your presence throughout this journey has been invaluable, and this milestone would not have been possible without you.",
        { align: "justify", lineGap: 4 }
      );

      // --- PAGE 7: ACKNOWLEDGMENTS ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("Acknowledgments", { align: "center" });
      doc.font("Times-Roman").fontSize(12).moveDown(2);
      doc.text(
        "I would like to express my deepest gratitude to my dissertation chair, Dr. Jeff Quin, for his continuous guidance, expertise, and encouragement throughout this process. Your thoughtful feedback and steady support were invaluable to the completion of this work. I am also sincerely thankful to my committee members, Dr. James Glenn and Dr. Reginald Kimball, for their insightful contributions, constructive critiques, and commitment to my academic growth. Your mentorship has been instrumental in shaping both this dissertation and my development as a scholar.",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(1.5);
      doc.text(
        "I am especially grateful to the participants who generously shared their time, experiences, and perspectives. This study would not have been possible without your willingness to contribute. Your voices provided the depth and meaning necessary to explore how wearable fitness devices influence motivation and well-being, and I am honored to have learned from your experiences.",
        { align: "justify", lineGap: 4 }
      );

      // --- PAGE 8: TABLE OF CONTENTS ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("Table of Contents", { align: "center" });
      doc.font("Times-Roman").fontSize(11).moveDown(2);
      
      const toc = [
        { label: "List of Tables", page: "xiii" },
        { label: "List of Figures", page: "xiv" },
        { label: "Chapter 1: Introduction to the Study", page: "1" },
        { label: "   Introduction", page: "1" },
        { label: "   Background of the Study", page: "2" },
        { label: "   Definition of Terms", page: "6" },
        { label: "   Anticipated Limitations", page: "9" },
        { label: "   Summary and Organization of the Study", page: "11" },
        { label: "Chapter 2: Literature Review", page: "14" },
        { label: "   Introduction to the Chapter", page: "14" },
        { label: "   Background of the Problem Space", page: "18" },
        { label: "   Theoretical Foundations (Self-Determination Theory)", page: "24" },
        { label: "   Review of the Literature", page: "28" },
        { label: "Chapter 3: Methodology", page: "51" },
        { label: "   Introduction", page: "51" },
        { label: "   Purpose of the Study", page: "52" },
        { label: "   Sources of Data", page: "63" },
        { label: "   Data Collection and Management", page: "72" },
        { label: "Chapter 4: Data Analysis and Results", page: "90" },
        { label: "   Introduction", page: "90" },
        { label: "   Preparation of Raw Data", page: "92" },
        { label: "   Thematic Findings (Themes 1 - 7)", page: "105" },
        { label: "Chapter 5: Summary, Conclusions, and Recommendations", page: "146" },
        { label: "   Summary of Findings", page: "148" },
        { label: "   Practical Implications", page: "162" },
        { label: "References", page: "170" }
      ];

      for (const item of toc) {
        const dotsCount = Math.max(5, 75 - item.label.length);
        const dots = ".".repeat(dotsCount);
        doc.text(`${item.label} ${dots} ${item.page}`, { lineGap: 3 });
      }

      // --- PAGE 9: CHAPTER 1 INTRODUCTION ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("Chapter 1: Introduction to the Study", { align: "center" });
      doc.moveDown(1);
      doc.text("Introduction", { align: "left" });
      doc.font("Times-Roman").fontSize(12).moveDown(1);
      doc.text(
        "The purpose of this qualitative descriptive study was to explore how adults aged 18 years and older described the influence of wearable fitness devices on psychological well-being and motivation to engage in physical activities in the Western region of the United States. Although limited literature specifically addressed adults’ personal perspectives on how self-determination influenced their psychological well-being and motivation, substantial research connected self-determination with fitness, health, and motivation. These existing studies provided a theoretical foundation for examining how wearable fitness devices may impact psychological outcomes and motivational behaviors among adults.",
        { align: "justify", lineGap: 4 }
      );
      doc.moveDown(1);
      doc.text(
        "The study was based on the recommendations made by independent studies conducted by Nuss (2021), Rupp et al. (2018), and Sifat et al. (2022). The findings suggested opportunities for future research to remedy gaps in the literature on how wearing fitness devices improved motivation to engage in physical activities and the psychological well-being of adults 18 years of age and older. Studies by Sin (2016) and Steptoe et al. (2009) indicated that dedicating more time and effort to physical exercise resulted in enhanced psychological well-being and increased motivation. Individuals who engaged in higher levels of physical activity tended to experience an improved quality of life (Sin, 2016). Psychological well-being was also linked to improved immune function, better cognitive function, and reduced mortality rates (Steptoe et al., 2009).",
        { align: "justify" }
      );

      // --- Page 10: Chapter 3 Methodology Table ---
      doc.addPage();
      doc.font("Times-Bold").fontSize(14).text("Chapter 3: Methodology and Core Alignment", { align: "center" });
      doc.moveDown(1);
      doc.font("Times-Roman").fontSize(12);
      doc.text("A key component of this descriptive qualitative methodology is matching the research questions to the theoretical framework of Self-Determination Theory (SDT). Table 1 below outlines this alignment structure.", { align: "justify" });
      doc.moveDown();

      // Simple Table
      doc.font("Times-Bold").text("Table 1", { align: "left" });
      doc.font("Times-Italic").text("Methodological and Framework Alignment Matrix", { align: "left" });
      doc.moveDown(0.5);

      const drawTableRow = (label: string, desc: string, yPos: number) => {
        doc.font("Times-Bold").text(label, 72, yPage + yPos, { width: 150 });
        doc.font("Times-Roman").text(desc, 230, yPage + yPos, { width: 310, align: "justify" });
      };

      const yPage = doc.y;
      doc.lineGap(2);
      drawTableRow("Problem Space Need:", "The problem space can be delineated from various viewpoints, including lack of motivation in adults to engage in physical activities and poor psychological well-being. This creates opportunities to integrate technology to increase motivation.", 0);
      drawTableRow("Problem Statement:", "It is not known how adults 18 years of age and older describe the influence of wearable fitness devices on psychological well-being and motivation to engage in physical activities.", 70);
      drawTableRow("Research Questions:", "RQ1: How do adults 18 years of age and older describe the influence of wearable fitness devices on psychological well-being?\nRQ2: How do adults 18 years of age and older describe the influence of wearable fitness devices on their motivation to engage in physical activities?", 130);

      // --- Page 11: Thematic Outcomes ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("Chapter 4: Data Analysis and Thematic Findings", { align: "center" });
      doc.font("Times-Roman").fontSize(12).moveDown(1.5);
      doc.text(
        "Through systematic thematic analysis using Braun and Clarke's (2006) six-phase framework, seven key themes were constructed from the transcripts of 17 individual semi-structured interviews and 1 focus group of 2 participants.",
        { align: "justify" }
      );
      doc.moveDown(1.5);

      const themes = [
        "Theme 1: Emotional Enhancement through Goal Achievement. Participants experience positive psychological impacts such as enhanced mood, happiness, and satisfaction when successfully meeting wearable device goals.",
        "Theme 2: Anxiety and Stress Reduction through Device Interaction. Wearable fitness devices help participants manage stress and anxiety through monitoring physiological responses.",
        "Theme 3: Psychological Challenges and Dependency. Participants sometimes experience negative psychological effects such as dependency, frustration, and reduced self-confidence due to device reliance.",
        "Theme 4: Social Connectivity Enhancing Psychological Well-being and Motivation. Social interaction facilitated by device-sharing features creates a sense of community and accountability.",
        "Theme 5: Habit Formation and Routine Integration. Continuous use of fitness devices encourages the formation of long-term exercise habits.",
        "Theme 6: Influence of Real-Time Feedback and Reminders. Participants report being motivated by immediate feedback and timely notifications.",
        "Theme 7: Data-Informed Adaptations in Behavior and Lifestyle. Wearable device data encourages participants to adapt their physical activities and dietary behaviors strategically."
      ];

      for (const th of themes) {
        doc.font("Times-Bold").text(th.split(".")[0] + ".", { continued: true });
        doc.font("Times-Roman").text(th.slice(th.indexOf(".") + 1), { align: "justify", lineGap: 4 });
        doc.moveDown(1);
      }

      // --- PAGE 12: REFERENCES ---
      doc.addPage();
      doc.moveDown(2);
      doc.font("Times-Bold").fontSize(14).text("References", { align: "center" });
      doc.font("Times-Roman").fontSize(10).moveDown(2);

      const refs = [
        "Deci, E. L., & Ryan, R. M. (1985). Intrinsic motivation and self-determination in human behavior. New York: Plenum.",
        "Deci, E. L., & Ryan, R. M. (2000a). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. American Psychologist, 55(1), 68–78.",
        "Lachman, M. E., Lipsitz, L., Lubben, J., Castaneda-Sceppa, C., & Jette, A. M. (2018). When adults don’t exercise: Behavioral strategies to increase physical activity in sedentary middle-aged and older adults. Innovation in Aging, 2(1), igy007.",
        "Nuss, K. (2021). Wearable fitness trackers in physical activity research: Accuracy assessment and effects on motivation and engagement (Doctoral dissertation, Colorado State University). ProQuest Dissertations and Theses.",
        "Rising, C. J., Gaysynsky, A., Blake, K. D., Jensen, R. E., & Oh, A. (2021). Willingness to share data from wearable health and activity trackers: Analysis of the 2019 health information national trends survey data. JMIR mHealth and uHealth, 9(12), e29190.",
        "Rupp, M. A., Michaelis, J. R., McConnell, D. S., & Smither, J. A. (2018). The role of individual differences on perceptions of wearable fitness device trust, usability, and motivational impact. Applied Ergonomics, 70, 77-87.",
        "Sifat, M. S., Saperstein, S. L., Tasnim, N., & Green, K. M. (2022). Motivations toward using digital health and exploring the possibility of using digital health for mental health in Bangladesh University Students: Cross-sectional questionnaire study. JMIR Formative Research, 6(3), 1-17.",
        "Sweet, J. (2021). Stress and anxiety sabotaged exercise motivation during the pandemic, study says. Verywellmind."
      ];

      for (const ref of refs) {
        doc.text(ref, { align: "left", paragraphGap: 10, lineGap: 3 });
      }

      // Global page header helper for letter layout (excluding first 2 pages)
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Skip header/footer for cover and copyright
        if (i > 1) {
          doc.font("Times-Roman").fontSize(9);
          // Header running head & page number
          doc.text("Michelle Mendivil, PhD — Dissertation Study", 72, 36);
          
          let pageNumSymbol = "";
          if (i < 8) {
            const romanNumerals = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
            pageNumSymbol = romanNumerals[i] || "";
          } else {
            pageNumSymbol = String(i - 6);
          }
          doc.text(pageNumSymbol, 540, 36, { align: "right" });
          
          doc.strokeColor("#94a3b8").lineWidth(0.5).moveTo(72, 48).lineTo(540, 48).stroke();
          
          // Footer
          doc.text("Grand Canyon University — School of Doctoral Studies", 72, 740);
          doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(72, 730).lineTo(540, 730).stroke();
        }
      }

      doc.end();
    } catch (err: any) {
      console.error("PDF Generation Error:", err);
      res.status(500).send("An error occurred during dissertation generation.");
    }
  });

// Provide static files in production or Vite middleware in development
const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist/index.html"));

async function configureVite() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

configureVite().then(() => {
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}).catch(err => {
  console.error("Failed to configure Vite middleware:", err);
});

export default app;
