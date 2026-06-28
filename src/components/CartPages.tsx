import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { useCart, CartItem } from "./CartContext";

const AGREEMENT_TERMS = [
  {
    id: "1.0",
    title: "1.0 The project",
    content: "The service will start on the date the service is paid for and the document is uploaded. If prepaid, the start date will start the day the document is received. Includes conditions for Editing Services (proofreading, APA format, recite-works, appendices, TOC, tables, figures, addressing short/long paragraphs) and Coaching services."
  },
  {
    id: "1.1",
    title: "1.1 Consulting does not write for any client",
    content: "Services do not include writing or rewriting content for students because that is considered ghost writing and plagiarism. Suggestions will be provided for unclear sentences but no direct adding/deleting of content to fulfill committee requests."
  },
  {
    id: "1.2",
    title: "1.2 Schedule",
    content: "Dr. Mendivil will confirm the return date based on the type of services purchased. Clients cannot change the document once submitted without incurring a $75 charge and a new return date."
  },
  {
    id: "1.3",
    title: "1.3 Writing Content",
    content: "We do not write content. We offer suggestions on how to address committee comments but will not write the content for the client. Clients must add citations or sources themselves; we do not add citations to the document."
  },
  {
    id: "1.4",
    title: "1.4 Payment",
    content: "Client will pay a non-refundable payment before the start of service. No refunds will be issued. Changing turnaround times will require paying the difference."
  },
  {
    id: "1.5",
    title: "1.5 Client's Ownership of Work",
    content: "All work belongs to the client. Modern Care Consulting DOES NOT write work for the client, only completes purchased services."
  },
  {
    id: "1.6",
    title: "1.6 Services Provided",
    content: "Once submitted, no additional documents can be sent as part of this agreement. We reserve the right to refuse services at any time for unprofessional behavior, resulting in forfeiture of payment and services."
  },
  {
    id: "1.7",
    title: "1.7 Additional edits and coaching",
    content: "Any edits or coaching beyond the original agreement timeframe or scope will require an additional cost and a new agreement."
  },
  {
    id: "1.8",
    title: "1.8 Communication and Response Times",
    content: "We will respond within 24 hours via email. It is the client's responsibility to check their email regularly."
  },
  {
    id: "1.9",
    title: "1.9 Client Questions and Clarifications",
    content: "Once the document is returned, the client can ask questions for clarification within 72 hours of receiving the document back."
  }
];

export const CartPage = () => {
  const { items, removeItem } = useCart();
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 min-h-[60vh]">
      <h1 className="text-5xl font-serif text-brand-text mb-8">Your <span className="italic text-brand-earth">Cart</span></h1>
      <div className="w-20 h-1 bg-brand-pink mb-12 rounded-full"></div>
      
      {items.length === 0 ? (
        <p className="text-xl font-serif italic text-brand-text/60">Your cart is currently empty. <Link to="/#services" className="underline hover:text-brand-pink ml-2">Browse services</Link></p>
      ) : (
        <div className="bg-brand-offwhite rounded-[40px] p-10 border border-brand-pink/10">
          <ul className="space-y-6 mb-10">
            {items.map((item, index) => (
              <li key={`${item.id}-${index}`} className="flex justify-between items-center border-b border-brand-pink/10 pb-4">
                <span className="text-xl font-serif text-brand-text">{item.name}</span>
                <div className="flex items-center gap-6">
                  <span className="font-bold text-brand-earth font-sans">${item.price}</span>
                  <button onClick={() => removeItem(item.id)} className="text-xs font-bold uppercase tracking-widest text-brand-pink hover:text-red-500 transition-colors">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-center pt-6 border-t-2 border-brand-earth/20 mt-6">
            <span className="text-2xl font-serif italic">Total</span>
            <span className="text-3xl font-bold text-brand-text font-sans">${total}</span>
          </div>
          <div className="mt-10 flex justify-end">
            <Link to="/agreement" className="px-10 py-4 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-pink transition-all shadow-xl shadow-brand-earth/20">
              Proceed to Agreement
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export const AgreementPage = () => {
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState("");
  const [email, setEmail] = useState(() => {
    if (location.state?.email) return location.state.email;
    const stored = localStorage.getItem("dissertation_purchase_email");
    if (stored) return stored;
    try {
      const acc = localStorage.getItem("modern_scholar_account");
      if (acc) {
        const parsed = JSON.parse(acc);
        return parsed.email || "";
      }
    } catch (e) {}
    return "";
  });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const allTermsChecked = AGREEMENT_TERMS.every(t => checkedTerms[t.id]);
  const isFormValid = allTermsChecked && signature.trim() !== "" && email.trim() !== "" && date !== "";

  const handleToggle = (id: string) => {
    setCheckedTerms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      navigate("/checkout", { state: { email, signature, date } });
    }
  };

  if (items.length === 0) {
    return <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 min-h-[60vh]"><p>Your cart is empty. <Link className="text-brand-pink" to="/#services">Go back</Link></p></div>;
  }

  return (
    <div className="pt-32 pb-20 max-w-4xl mx-auto px-4">
      <h1 className="text-5xl font-serif text-brand-text mb-4">Service <span className="italic text-brand-earth">Agreement</span></h1>
      <p className="text-brand-text/60 font-serif italic text-lg mb-8">*Required before payment</p>
      <div className="w-20 h-1 bg-brand-pink mb-12 rounded-full"></div>

      <div className="bg-brand-offwhite p-6 md:p-10 rounded-[40px] border border-brand-pink/10 mb-12">
        <p className="mb-8 font-serif italic text-brand-text/80">
          This contract is between the client (you) and Modern Care Consulting (the "Editor").
          The acknowledgment is dated and signed to ensure that all items below are understood and agreed upon. The payment will be made through the Modern Care Consulting website and can be paid with a debit or credit card.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {AGREEMENT_TERMS.map((term) => (
            <div key={term.id} className="bg-white p-6 rounded-3xl border border-brand-pink/10 shadow-sm flex items-start gap-4 transition-colors hover:border-brand-pink/30">
              <input 
                type="checkbox" 
                id={`term-${term.id}`} 
                checked={checkedTerms[term.id] || false}
                onChange={() => handleToggle(term.id)}
                className="mt-1.5 w-5 h-5 accent-brand-pink text-brand-pink cursor-pointer shrink-0"
              />
              <label htmlFor={`term-${term.id}`} className="cursor-pointer select-none">
                <h3 className="font-bold text-lg mb-2 text-brand-text font-serif">{term.title}</h3>
                <p className="font-serif text-brand-text/70 leading-relaxed text-sm">{term.content}</p>
              </label>
            </div>
          ))}

          <div className="bg-white p-8 md:p-10 rounded-3xl border border-brand-pink/10 shadow-sm mt-12 space-y-6">
            <h3 className="text-2xl font-serif text-brand-text mb-6">Electronic Signature</h3>
            <p className="text-sm font-serif italic text-brand-text/60 mb-6">By signing, I agree I have read and agree to the terms & conditions of the acknowledgment.</p>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/50">Your Email (for sending signed copy)</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 text-base font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all shadow-inner"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/50">Your Signature (Type Name)</label>
                <input 
                  type="text" 
                  required 
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 text-base font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all shadow-inner"
                  placeholder="Sign your name..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/50">Date</label>
                <input 
                  type="date" 
                  required 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl p-4 text-base font-serif text-brand-text focus:border-brand-pink/50 outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-8">
            <button 
              type="submit"
              disabled={!isFormValid}
              className={`px-10 py-5 rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] flex items-center transition-all ${
                !isFormValid ? 'bg-brand-text/20 text-white cursor-not-allowed' : 'bg-brand-earth text-white hover:bg-brand-pink shadow-xl shadow-brand-earth/20'
              }`}
            >
              Sign & Proceed to Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CheckoutPage = () => {
  const { items, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  // Retrieve agreement detail from route state if available
  const agreementState = location.state || {};
  const email = agreementState.email || "";

  const successParam = searchParams.get("success");
  const demoParam = searchParams.get("demo");
  const processedRef = React.useRef(false);

  useEffect(() => {
    // Check if redirecting back from Stripe successful checkout and only run once
    if (successParam === "true" && !processedRef.current) {
      processedRef.current = true;
      setSuccess(true);
      clearCart();
      if (demoParam === "true") {
        setIsDemo(true);
      }
    }
  }, [successParam, demoParam, clearCart]);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map(item => ({ id: item.id, name: item.name, price: item.price })),
          email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe payment session.");
      }

      if (data.url) {
        // Redirect client to secure, hosted Stripe site
        window.location.href = data.url;
      } else {
        throw new Error("Invalid response format received from Stripe session gateway.");
      }
    } catch (err: any) {
      console.error("Stripe Checkout Session Initiation Error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const isDissertationPurchase = localStorage.getItem("bought_dissertation") === "true";
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-32">
        <div className="w-20 h-20 bg-brand-sage text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-brand-sage/20">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-4xl font-serif text-brand-text mb-4 italic">Payment Successful</h2>
        <p className="text-brand-text/60 font-serif italic text-lg mb-4 max-w-2xl mx-auto">
          Your payment and agreement terms have been securely processed by Stripe.
        </p>
        
        {isDissertationPurchase ? (
          <div className="space-y-6 mb-10 max-w-xl mx-auto bg-brand-offwhite p-8 rounded-3xl border border-brand-pink/10 shadow-sm">
            <p className="text-brand-text/70 font-serif italic text-base leading-relaxed">
              Your 297-page doctoral study has been successfully purchased and sent to <span className="font-sans font-bold text-brand-earth">{localStorage.getItem("dissertation_purchase_email") || "your email"}</span>.
            </p>
            <a 
              href="/api/download-dissertation" 
              onClick={() => {
                localStorage.removeItem("bought_dissertation");
              }}
              className="inline-flex items-center justify-center px-8 py-3 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-text transition-all shadow-md cursor-pointer"
            >
              Download Dissertation PDF
            </a>
          </div>
        ) : isDemo ? (
          <div className="bg-brand-sage/15 border border-brand-sage/30 text-brand-text max-w-lg mx-auto rounded-3xl p-6 text-sm font-serif italic mb-10 shadow-sm leading-relaxed">
            <span className="font-bold text-brand-sage uppercase tracking-wider text-[10px] block mb-2 font-sans">Developer Sandbox Notice</span>
            This transaction was successfully simulated. Configure <span className="font-mono bg-white px-1.5 py-0.5 rounded text-xs text-brand-text">STRIPE_SECRET_KEY</span> of your Stripe account in Secrets to receive real payments.
          </div>
        ) : (
          <p className="text-brand-text/50 font-serif italic text-sm mb-10 max-w-lg mx-auto">
            A copy of your signed agreement alongside payment receipt has been sent to your email. We look forward to working with you on your academic research journey!
          </p>
        )}

        <Link to="/" className="px-10 py-4 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-earth transition-all shadow-md">
          Return Home
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !success) {
    return (
      <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 min-h-[60vh] text-center">
        <p className="text-xl font-serif italic text-brand-text/60 mb-6">Your cart is empty.</p>
        <Link className="px-8 py-3 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[9px]" to="/pricing">
          Browse Packages & Pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 min-h-[60vh]">
      <h1 className="text-5xl font-serif text-brand-text mb-8">Secure <span className="italic text-brand-earth">Checkout</span></h1>
      <div className="w-20 h-1 bg-brand-pink mb-12 rounded-full"></div>

      {searchParams.get("canceled") === "true" && (
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-800 rounded-3xl p-5 text-sm font-serif italic mb-8 flex gap-3 items-start">
          <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={18} />
          <span>Checkout was canceled. If you ran into any issues, you can choose another payment option or try again.</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-800 rounded-3xl p-5 text-sm font-serif italic mb-8 flex gap-3 items-start">
          <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={18} />
          <div>
            <strong className="block font-sans uppercase text-[9px] tracking-wider mb-1">Configuration Error</strong>
            {error}
          </div>
        </div>
      )}

      <div className="bg-brand-offwhite p-10 rounded-[40px] border border-brand-pink/10 space-y-8 shadow-sm">
        <div className="flex justify-between items-center text-xl font-serif border-b border-brand-pink/10 pb-6">
          <span>Amount Due:</span>
          <span className="text-3xl font-bold font-sans text-brand-earth">${total.toLocaleString()}</span>
        </div>

        <div>
          <h3 className="text-[10px] font-bold font-sans uppercase tracking-[0.2em] mb-4 text-brand-text/50">Payment Gateway</h3>
          <div className="bg-white p-6 rounded-3xl border border-brand-pink/20 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 flex items-center justify-center text-brand-pink animate-pulse">
                <CreditCard size={22} />
              </div>
              <div className="text-left">
                <h4 className="font-serif font-bold text-brand-text">Stripe Dynamic Payments</h4>
                <p className="text-[10px] font-sans text-brand-text/40 tracking-wider">SECURE 256-BIT SSL ENCRYPTION</p>
              </div>
            </div>
            
            <div className="bg-indigo-600 text-white font-sans text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full select-none">
              Stripe Verified
            </div>
          </div>
          
          <p className="text-[11px] font-serif italic text-brand-text/50 mt-4 leading-relaxed px-1">
            Paying via Stripe allows you to use your Credit Card, Debit Card, Apple Pay, Google Pay, or other options depending on your eligibility and billing region.
          </p>
        </div>

        <button 
          onClick={handlePayment}
          disabled={loading}
          className={`w-full py-5 text-white rounded-full font-bold font-sans uppercase tracking-[0.18em] text-[11px] flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-brand-earth/15 cursor-pointer ${
            loading 
              ? "bg-brand-text/50 cursor-wait" 
              : "bg-brand-earth hover:bg-brand-pink hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Contacting Stripe...</span>
            </>
          ) : (
            <>
              <CreditCard size={15} />
              <span>Pay ${total.toLocaleString()} via Stripe</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
