import { useState } from "react";
import { motion } from "motion/react";
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ShoppingBag, 
  Zap, 
  GraduationCap,
  Calendar,
  FileText,
  Bookmark,
  ChevronDown,
  Clock
} from "lucide-react";
import { useCart } from "./CartContext";
import { Link } from "react-router-dom";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  subtitle?: string;
  description: string;
  highlights?: string[];
  features: string[];
  paypalUrl?: string;
  isPopular?: boolean;
}

const COACHING_PLANS: PricingPlan[] = [
  {
    id: "coaching-zoom",
    name: "1-Hour Zoom Session",
    price: 125,
    description: "Start with a 1-hour Zoom Session to discuss your research goals, resolve immediate blocks, or map out your dissertation roadmap directly with Dr. Mendivil.",
    features: [
      "1-Hour Live video consultation",
      "Direct session with Dr. Mendivil, PhD",
      "Actionable research strategy",
      "Option to upgrade to weekly packages"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/WXMCK9JN2FR3G",
    highlights: ["Upgrade to 2 Weeks for just $275 more — get unlimited email access!"]
  },
  {
    id: "coaching-2weeks",
    name: "2 Weeks Unlimited Coaching",
    price: 400,
    subtitle: "~$29/day",
    description: "A focused, intensive sprint. Unlimited email-based coaching access to resolve roadblocks and speed up progress on a specific chapter.",
    features: [
      "Unlimited email coaching for 14 days",
      "Feedback on chapter drafts",
      "Direct guidance from Dr. Mendivil",
      "Mindful writing milestones"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/EHGFJTGY52E9N",
    highlights: [
      "Upgrade to 30 Days for just $200 more (saves $9/day)",
      "Add editing + save $95 on the 2Wks & 7-Day Edit bundle ($750)"
    ]
  },
  {
    id: "coaching-30days",
    name: "30 Days Unlimited Coaching",
    price: 600,
    subtitle: "~$20/day",
    description: "A full month of unlimited email-based academic partnership. Build serious writing momentum and daily accountability under high-frequency supervision.",
    features: [
      "30 Days of unlimited email coaching",
      "Ongoing strategic feedback",
      "Detailed review of chapter progression",
      "Consistent academic accountability"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/CKFHNUZPH39XC",
    isPopular: true,
    highlights: [
      "Add editing for $600 more (30 Days Coaching + Editing combo at $1,200)",
      "Rush bundle option: 30 Days Coaching + 2-Day Edit for $1,550 (saves $250)"
    ]
  },
  {
    id: "coaching-30days-edit",
    name: "30 Days Coaching + Editing",
    price: 1200,
    subtitle: "~$40/day",
    description: "A comprehensive dual-tier month. Unlimited email support combines with full, rigorous editing of your drafts. Your writing becomes defense-ready.",
    features: [
      "30 Days of unlimited email coaching",
      "Full professional editing of drafts",
      "APA Style manual compliance check",
      "Reciteworks formatting checks inside the cycle"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/MWPBZK7F9N6TQ",
    highlights: ["Upgrade to 3 Months for $2,000 more — stays supported all the way to defense"]
  },
  {
    id: "coaching-3months",
    name: "3 Months Coaching + Editing",
    price: 3200,
    subtitle: "~$36/day",
    description: "Our core full-quarter research partnership. Provides 90 days of continuous, unlimited coaching and professional substantive editing of your entire dissertation.",
    features: [
      "90 Days of unlimited email coaching",
      "Substantive editing of chapters & references",
      "Priority advisory cues",
      "Full alignment validation"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/9LDVSCHMEVZQ8",
    highlights: ["Upgrade to 6 Months for $1,900 more — cuts rate to $850/month"]
  },
  {
    id: "coaching-6months",
    name: "6 Months Coaching + Editing",
    price: 5100,
    subtitle: "$850/month",
    description: "Complete proposal-to-defense insurance. Six full months of strategic coaching and unlimited editing draft sweeps. The gold standard for busy doctoral scholars.",
    features: [
      "180 Days of strategic email coaching",
      "Unlimited developmental and style editing",
      "Milestone planning and defense prep support",
      "Direct academic mentorship priority"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/KG56QHLVYTCJ8",
    highlights: ["Upgrade to 1 Year for $3,400 more — drops cost to safest rate (~$23/day)"]
  },
  {
    id: "coaching-1year",
    name: "1 Year — Unlimited Everything",
    price: 8500,
    subtitle: "~$23/day",
    description: "The ultimate tier of scholarly protection. Unlimited coaching, editing, strategic reviews, and priority access to Dr. Mendivil for an entire calendar year.",
    features: [
      "365 Days of unlimited coaching and editing",
      "Absolute priority scheduling",
      "Unlimited draft reviews & formatting checks",
      "Proposal, ethics, data analysis, and oral defense cues"
    ],
    paypalUrl: "https://www.paypal.com/ncp/payment/E9DSN8UDVUDP2",
    highlights: ["The absolute lowest daily rate available for full executive consulting"]
  }
];

const ALACARTE_SERVICES: PricingPlan[] = [
  {
    id: "editing-developmental",
    name: "Developmental Editing",
    price: 350,
    description: "Focuses on the overall structure, logic, and flow of your research narrative. Ideal for early drafts to ensure your core arguments are robust and academically valid.",
    features: [
      "Macro-level structural analysis",
      "Draft flow & logical progression audit",
      "Deep examination of literature synthesis",
      "Suggestions for strengthening core arguments"
    ]
  },
  {
    id: "editing-copy",
    name: "Copy Editing",
    price: 100,
    description: "Refining clarity, syntax, spelling, and tone. We verify your writing matches a formal academic tone while fully preserving your unique scholar's perspective.",
    features: [
      "Line-by-line syntax enhancement",
      "Academic tone & structural flow adjustments",
      "Clarity and expression updates",
      "Consistent stylistic voice alignment"
    ]
  },
  {
    id: "editing-proofreading",
    name: "Proofreading",
    price: 150,
    description: "The final scholar's polish. Meticulously catching punctuation, minor typos, spelling errors, and layout glitches prior to committee or university submission.",
    features: [
      "Surgical punctuation checks",
      "Typo and spacing corrections",
      "Correction of minor spelling variations",
      "Graduate school submission checks"
    ]
  },
  {
    id: "editing-apa",
    name: "APA Formatting",
    price: 120,
    description: "Ensuring every single academic reference list item, citation syntax, heading hierarchy, and margin setting complies with latest APA style standards.",
    features: [
      "In-text citation style checks",
      "Heading hierarchy format layout",
      "Table or figure presentation audits",
      "Page margins, spacing & header formats"
    ]
  },
  {
    id: "editing-styleguide",
    name: "Style Guide Compliance",
    price: 100,
    description: "Adaptation of your research papers or dissertation to meet specific, localized university handbooks, journal styles, or customized guides.",
    features: [
      "University handbook custom adaptation",
      "Journal guidelines formatting analysis",
      "Specific footnote or endnote structure styling",
      "Custom layout compliance checklist"
    ]
  },
  {
    id: "editing-ref-audit",
    name: "Reference List Audit",
    price: 80,
    description: "An intensive cross-check auditing every single parenthetical citation in your draft with its exact corresponding bibliographical listing for complete accuracy.",
    features: [
      "Citation-to-bibliography matching audit",
      "Spot missing references or citation errors",
      "Flag stray citations with no reference match",
      "Rigorous reference style compliance review"
    ]
  }
];

export const PricingPage = () => {
  const { addItem, items } = useCart();
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Dynamic Coaching Selector States
  const [billingFreq, setBillingFreq] = useState<"day" | "week" | "month">("week");
  const [duration, setDuration] = useState<number>(1);

  // Sync duration limits when billing frequency changes
  const handleBillingFreqChange = (freq: "day" | "week" | "month") => {
    setBillingFreq(freq);
    setDuration(1); // Reset duration count to 1 for safety
  };

  const getDurationOptions = () => {
    if (billingFreq === "day") {
      return Array.from({ length: 6 }, (_, i) => i + 1);
    } else if (billingFreq === "week") {
      return Array.from({ length: 3 }, (_, i) => i + 1);
    } else {
      return Array.from({ length: 11 }, (_, i) => i + 1);
    }
  };

  const getUnitPrice = () => {
    if (billingFreq === "day") return 50;
    if (billingFreq === "week") return 320;
    return 1200;
  };

  const getUnitName = (count: number) => {
    if (billingFreq === "day") return count === 1 ? "Day" : "Days";
    if (billingFreq === "week") return count === 1 ? "Week" : "Weeks";
    return count === 1 ? "Month" : "Months";
  };

  const unitPrice = getUnitPrice();
  const totalPrice = unitPrice * duration;

  // Generate dynamic plan details
  const dynamicPlanId = `coaching-custom-${billingFreq}-${duration}`;
  const dynamicPlanName = `${duration} ${getUnitName(duration)} Academic Coaching`;

  const handleAddCustomToCart = () => {
    addItem({
      id: dynamicPlanId,
      name: `${dynamicPlanName} (Coaching)`,
      price: totalPrice
    });
    setAddedItemIds(prev => ({ ...prev, [dynamicPlanId]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [dynamicPlanId]: false }));
    }, 2000);
  };

  const isCustomInCart = items.some(item => item.id === dynamicPlanId);
  const isCustomAdded = addedItemIds[dynamicPlanId];

  // Urgent Editing Selector States
  const [editingDays, setEditingDays] = useState<number>(7);

  const getEditingPrice = (days: number): number => {
    const prices: Record<number, number> = {
      7: 300,
      6: 350,
      5: 400,
      4: 500,
      3: 750,
      2: 1000,
      1: 2000
    };
    return prices[days] || 300;
  };

  const getEditingName = (days: number): string => {
    if (days === 1) return "1 Day Emergency Rush Edit";
    return `${days}-Day Priority Edit`;
  };

  const editingPrice = getEditingPrice(editingDays);
  const editingPlanName = getEditingName(editingDays);
  const editingPlanId = `editing-custom-${editingDays}`;

  const handleAddEditingToCart = () => {
    addItem({
      id: editingPlanId,
      name: `${editingPlanName} (Editing)`,
      price: editingPrice
    });
    setAddedItemIds(prev => ({ ...prev, [editingPlanId]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [editingPlanId]: false }));
    }, 2000);
  };

  const isEditingInCart = items.some(item => item.id === editingPlanId);
  const isEditingAdded = addedItemIds[editingPlanId];

  const handleAddToCart = (plan: PricingPlan, categoryName: string) => {
    addItem({
      id: plan.id,
      name: `${plan.name} (${categoryName})`,
      price: plan.price
    });
    setAddedItemIds(prev => ({ ...prev, [plan.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [plan.id]: false }));
    }, 2000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header section */}
        <div className="text-center mb-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 opacity-5 text-brand-pink select-none pointer-events-none">
            <GraduationCap size={160} />
          </div>
          <span className="inline-block bg-brand-lavender/30 text-brand-text px-4 py-1.5 rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] mb-6 border border-brand-lavender/50">
            Investing in your Future
          </span>
          <h1 className="text-4xl sm:text-6xl font-serif text-brand-text mb-6">
            Invest in Your <span className="italic text-brand-earth">Success</span>
          </h1>
          <div className="w-20 h-1 bg-brand-pink mx-auto mb-8 rounded-full"></div>
          <p className="max-w-2xl mx-auto text-xl text-brand-text/60 font-serif italic mb-8">
            Pragmatic, transparent pricing plans by Modern Care Consulting. Select a professional package to experience mindful direction, elite-level editing, and uncompromised academic integrity.
          </p>

          {/* New Section Anchor Quick-Switch Jump Navigation */}
          <div className="flex flex-wrap justify-center gap-3 mt-10 max-w-3xl mx-auto">
            <button
              onClick={() => scrollToSection("coaching-partnership")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-brand-lavender/20 border border-brand-pink/20 rounded-full font-sans uppercase text-[10px] tracking-widest font-bold text-brand-text shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              <Calendar size={13} className="text-brand-earth" />
              Academic Coaching
            </button>
            <button
              onClick={() => scrollToSection("turnaround-editing")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-brand-lavender/20 border border-brand-pink/20 rounded-full font-sans uppercase text-[10px] tracking-widest font-bold text-brand-text shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              <Zap size={13} className="text-brand-earth" />
              Urgent Editing Services
            </button>
            <button
              onClick={() => scrollToSection("alacarte-services")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-brand-lavender/20 border border-brand-pink/20 rounded-full font-sans uppercase text-[10px] tracking-widest font-bold text-brand-text shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              <FileText size={13} className="text-brand-earth" />
              Individual Services
            </button>
          </div>
        </div>

        {/* Section 1: Academic Coaching & Partnerships */}
        <section id="coaching-partnership" className="mt-20 scroll-mt-28">
          <div className="border-b border-brand-pink/20 pb-4 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-text mt-1.5 font-medium">
                Academic Coaching
              </h2>
            </div>
            <p className="max-w-md text-sm font-serif italic text-brand-text/60 leading-relaxed">
              Meticulous ongoing mentorship, review sprints, and live accountability check-ins directly with Dr. Mendivil to navigate the dissertation sequence successfully.
            </p>
          </div>

          {/* Dynamic Interactive Consolidated Selector Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto bg-white rounded-[40px] border border-brand-pink/15 shadow-xl p-8 md:p-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              
              {/* Selector Inputs (Left Columns) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-brand-lavender/30 text-brand-text px-4 py-1 rounded-full font-bold font-sans uppercase tracking-[0.15em] text-[9px] mb-4 border border-brand-lavender/40">
                    <Sparkles size={11} className="text-brand-pink" /> 100% Flexible Scholarly Accountability
                  </div>
                  <h3 className="text-2xl font-serif text-brand-text font-medium leading-tight mb-2">
                    Build Your Support Cycle
                  </h3>
                  <p className="text-xs font-serif italic text-brand-text/50">
                    Select your preferred billing frequency and the exact duration of strategic supervision you need to clear your doctoral bottlenecks.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Select Billing frequency */}
                  <div className="space-y-2.5">
                    <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">
                      Billing Cycles Option
                    </label>
                    <div className="relative">
                      <select
                        value={billingFreq}
                        onChange={(e) => handleBillingFreqChange(e.target.value as any)}
                        className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl py-4.5 px-5 text-sm font-serif italic text-brand-text/80 focus:border-brand-pink/50 outline-none transition-all appearance-none cursor-pointer shadow-inner shadow-black/5"
                      >
                        <option value="day">Pay per Day ($50/day)</option>
                        <option value="week">Pay per Week ($320/week)</option>
                        <option value="month">Pay per Month ($1200/month)</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-pink pointer-events-none" />
                    </div>
                  </div>

                  {/* Select Duration */}
                  <div className="space-y-2.5">
                    <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">
                      Choose Duration
                    </label>
                    <div className="relative">
                      <select
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                        className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl py-4.5 px-5 text-sm font-serif italic text-brand-text/80 focus:border-brand-pink/50 outline-none transition-all appearance-none cursor-pointer shadow-inner shadow-black/5"
                      >
                        {getDurationOptions().map((opt) => (
                          <option key={opt} value={opt}>
                            {opt} {billingFreq === "day" ? (opt === 1 ? "Day" : "Days") : billingFreq === "week" ? (opt === 1 ? "Week" : "Weeks") : (opt === 1 ? "Month" : "Months")}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-pink pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Bullet Points of standard offerings */}
                <div className="pt-2">
                  <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-earth mb-4">What's Included in Your Session</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Regular strategic planning check-ins</span>
                    </li>
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Dedicated APA Style manual reviews</span>
                    </li>
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Unlimited academic mentorship priorities</span>
                    </li>
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Substantive editing updates on drafts</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* dynamic pricing Receipt Summary Column (Right Columns) */}
              <div className="lg:col-span-5 bg-brand-offwhite rounded-[30px] border border-brand-pink/10 p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[8px] font-bold font-sans uppercase tracking-[0.25em] text-brand-earth block mb-2">
                    Coaching Selection Summary
                  </span>
                  <div className="border-b border-brand-pink/10 pb-4 mb-4">
                    <h4 className="text-lg font-serif text-brand-text font-semibold leading-tight">
                      {dynamicPlanName}
                    </h4>
                    <p className="text-xs font-serif italic text-brand-text/50 mt-1">
                      Flexible academic support cycle
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Dynamic Pricing display */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-sans font-bold text-brand-text/40">$</span>
                      <span className="text-4xl sm:text-5xl font-serif font-light text-brand-text">
                        {totalPrice.toLocaleString()}
                      </span>
                      <span className="text-xs font-serif italic text-brand-text/40 ml-1.5">USD</span>
                    </div>

                    <p className="text-xs font-serif italic text-brand-text/60 leading-relaxed">
                      Custom coaching cycle designed to fit your unique writing schedule, thesis chapters, or committee milestone review periods.
                    </p>
                  </div>
                </div>

                {/* Important Side Note Indicator */}
                <div className="bg-brand-lavender/30 border border-brand-pink/10 rounded-2xl p-4 flex gap-2.5 items-start">
                  <Clock size={16} className="text-brand-earth shrink-0 mt-0.5" />
                  <p className="text-[11px] font-serif italic text-brand-text/80 leading-relaxed">
                    <strong className="font-sans font-bold uppercase tracking-wider text-[8px] mr-1 block text-brand-earth">Important Limitation:</strong> 
                    Maximum of 1 hour of active consultation or draft sweep review allowed per active day.
                  </p>
                </div>

                {/* Action CTA Buttons */}
                <div className="space-y-3 pt-4 border-t border-brand-pink/10">
                  <button
                    onClick={handleAddCustomToCart}
                    disabled={isCustomInCart}
                    className={`w-full p-3.5 rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[8px] transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      isCustomAdded 
                        ? "bg-brand-sage text-white border-brand-sage" 
                        : isCustomInCart
                          ? "bg-brand-lavender/25 text-brand-text/40 border-brand-pink/10 cursor-not-allowed"
                          : "bg-brand-text text-white hover:bg-brand-pink hover:text-brand-text border-brand-text hover:border-brand-pink"
                    }`}
                  >
                    <ShoppingBag size={11} />
                    {isCustomAdded 
                      ? "Added to Cart" 
                      : isCustomInCart 
                        ? "Already in Cart" 
                        : "Select & Add to Cart"
                    }
                  </button>
                </div>

              </div>

            </div>
          </motion.div>

          {/* Curated Predefined Coaching Packages */}
          <div className="mt-20">
            <h3 className="text-2xl font-serif text-brand-text mb-10 text-center italic">
              Or Select a <span className="not-italic text-brand-earth">Curated Academic Package</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {COACHING_PLANS.map((plan) => {
                const isInCart = items.some(item => item.id === plan.id);
                const isAdded = addedItemIds[plan.id];
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-white rounded-[32px] border border-brand-pink/15 p-7 shadow-md hover:shadow-lg flex flex-col justify-between relative overflow-hidden h-full"
                  >
                    {plan.isPopular && (
                      <div className="absolute top-0 right-0 bg-brand-pink text-[8px] font-bold font-sans uppercase tracking-[0.2em] px-4 py-1.5 rounded-bl-3xl text-white shadow-inner">
                        Popular
                      </div>
                    )}
                    <div className="space-y-5">
                      <div>
                        {plan.subtitle && (
                          <span className="text-[9px] font-bold font-sans uppercase tracking-[0.25em] text-brand-earth block mb-1">
                            {plan.subtitle}
                          </span>
                        )}
                        <h4 className="text-lg font-serif text-brand-text font-semibold leading-tight">
                          {plan.name}
                        </h4>
                      </div>
                      
                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-xs font-sans font-bold text-brand-text/30">$</span>
                        <span className="text-3xl font-serif text-brand-text font-medium">{plan.price.toLocaleString()}</span>
                        <span className="text-[10px] font-serif italic text-brand-text/40 ml-1.5">USD</span>
                      </div>

                      <p className="text-xs font-serif italic text-brand-text/60 leading-relaxed font-serif italic">
                        {plan.description}
                      </p>

                      {plan.highlights && plan.highlights.length > 0 && (
                        <div className="bg-brand-lavender/25 text-brand-text/85 rounded-2xl p-4 border border-brand-pink/5 text-[10px] font-serif italic leading-relaxed">
                          <strong>Note:</strong> {plan.highlights.join(" ")}
                        </div>
                      )}

                      <div className="space-y-2 pt-3 border-t border-brand-pink/5">
                        <span className="text-[8px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 block mb-1">Inclusions</span>
                        {plan.features.map((feat, fidx) => (
                          <div key={fidx} className="flex items-start text-[11px] font-serif italic text-brand-text/80">
                            <Check size={12} className="text-brand-sage mr-2 mt-0.5 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-brand-pink/5 mt-6">
                      <button
                        onClick={() => handleAddToCart(plan, "Coaching")}
                        disabled={isInCart}
                        className={`w-full py-3.5 rounded-full font-bold font-sans uppercase tracking-[0.18em] text-[9px] transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                          isAdded 
                            ? "bg-brand-sage text-white border-brand-sage" 
                            : isInCart
                              ? "bg-brand-lavender/25 text-brand-text/30 border-brand-pink/10 cursor-not-allowed"
                              : "bg-brand-text text-white hover:bg-brand-pink hover:text-brand-text border-brand-text hover:border-brand-pink"
                        }`}
                      >
                        <ShoppingBag size={11} />
                        {isAdded 
                          ? "Added to Cart" 
                          : isInCart 
                            ? "Already in Cart" 
                            : "Select & Add to Cart"
                        }
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: Priority Turnaround Editing Packages */}
        <section id="turnaround-editing" className="mt-32 scroll-mt-28">
          <div className="border-b border-brand-pink/20 pb-4 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-text mt-1.5 font-medium">
                Urgent Editing <span className="italic text-brand-earth">Services</span>
              </h2>
            </div>
            <p className="max-w-md text-sm font-serif italic text-brand-text/60 leading-relaxed">
              Meticulous, timing-guaranteed full editing cycle for your doctoral transcripts, chapters, references, or full dissertation documents. 
            </p>
          </div>

          {/* Dynamic Interactive Consolidated Selector Card for Urgent Editing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto bg-white rounded-[40px] border border-brand-pink/15 shadow-xl p-8 md:p-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              
              {/* Selector Inputs (Left Columns) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-brand-pink/10 text-brand-text px-4 py-1 rounded-full font-bold font-sans uppercase tracking-[0.15em] text-[9px] mb-4 border border-brand-pink/20">
                    <Zap size={11} className="text-brand-earth animate-pulse" /> Rapid Turnaround Proofing
                  </div>
                  <h3 className="text-2xl font-serif text-brand-text font-medium leading-tight mb-2">
                    Select Your Delivery Timeline
                  </h3>
                  <p className="text-xs font-serif italic text-brand-text/50">
                    Select your preferred rush delivery window. Shorter timeframes include premium slot allocation for overnight operations.
                  </p>
                </div>

                <div className="pt-2">
                  {/* Select Turnaround Speed */}
                  <div className="space-y-2.5 max-w-sm">
                    <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">
                      Turnaround Duration
                    </label>
                    <div className="relative">
                      <select
                        value={editingDays}
                        onChange={(e) => setEditingDays(parseInt(e.target.value, 10))}
                        className="w-full bg-brand-offwhite border border-brand-pink/10 rounded-2xl py-4.5 px-5 text-sm font-serif italic text-brand-text/80 focus:border-brand-pink/50 outline-none transition-all appearance-none cursor-pointer shadow-inner shadow-black/5"
                      >
                        <option value={7}>7 Days ($300)</option>
                        <option value={6}>6 Days ($350)</option>
                        <option value={5}>5 Days ($400)</option>
                        <option value={4}>4 Days ($500)</option>
                        <option value={3}>3 Days ($750)</option>
                        <option value={2}>2 Days ($1000)</option>
                        <option value={1}>1 Day Emergency ($2000)</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-pink pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Bullet Points of standard offerings */}
                <div className="pt-2">
                  <h4 className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-earth mb-4">What's Included in Your Rush Package</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Full grammatical & spelling correction</span>
                    </li>
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Strict compliance with manual styles (APA 7th, etc.)</span>
                    </li>
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Meticulous reference & in-text citation audits</span>
                    </li>
                    <li className="flex items-start text-xs font-serif italic text-brand-text/85">
                      <Check size={14} className="text-brand-sage mr-2.5 mt-0.5 shrink-0" />
                      <span>Formal Reciteworks report overview</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* dynamic pricing Receipt Summary Column (Right Columns) */}
              <div className="lg:col-span-5 bg-brand-offwhite rounded-[30px] border border-brand-pink/10 p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[8px] font-bold font-sans uppercase tracking-[0.25em] text-brand-earth block mb-2">
                    Editing Selection Summary
                  </span>
                  <div className="border-b border-brand-pink/10 pb-4 mb-4">
                    <h4 className="text-lg font-serif text-brand-text font-semibold leading-tight">
                      {editingPlanName}
                    </h4>
                    <p className="text-xs font-serif italic text-brand-text/50 mt-1">
                      Timing-guaranteed publishing preparation
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Dynamic Pricing display */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-sans font-bold text-brand-text/40 mr-1">$</span>
                      <span className="text-4xl sm:text-5xl font-serif font-light text-brand-text">
                        {editingPrice.toLocaleString()}
                      </span>
                      <span className="text-xs font-serif italic text-brand-text/40 ml-1.5">USD</span>
                    </div>

                    <p className="text-xs font-serif italic text-brand-text/60 leading-relaxed">
                      Express developmental validation and line-by-line scholarly styling designed specifically for scholars facing critical submission deadlines.
                    </p>
                  </div>
                </div>

                {/* Important Side Note Indicator */}
                <div className="bg-brand-lavender/30 border border-brand-pink/10 rounded-2xl p-4 flex gap-2.5 items-start">
                  <Clock size={16} className="text-brand-earth shrink-0 mt-0.5" />
                  <p className="text-[11px] font-serif italic text-brand-text/80 leading-relaxed">
                    <strong className="font-sans font-bold uppercase tracking-wider text-[8px] mr-1 block text-brand-earth">Important:</strong> 
                    Includes express high-priority drafting queues and APA verification checks.
                  </p>
                </div>

                {/* Action CTA Buttons */}
                <div className="space-y-3 pt-4 border-t border-brand-pink/10">
                  <button
                    onClick={handleAddEditingToCart}
                    disabled={isEditingInCart}
                    className={`w-full p-3.5 rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[8px] transition-all flex items-center justify-center gap-2 border ${
                      isEditingAdded 
                        ? "bg-brand-sage text-white border-brand-sage" 
                        : isEditingInCart
                          ? "bg-brand-lavender/25 text-brand-text/40 border-brand-pink/10 cursor-not-allowed"
                          : "bg-brand-text text-white hover:bg-brand-pink hover:text-brand-text border-brand-text hover:border-brand-pink"
                    }`}
                  >
                    <ShoppingBag size={11} />
                    {isEditingAdded 
                      ? "Added to Cart" 
                      : isEditingInCart 
                        ? "Already in Cart" 
                        : "Select & Add to Cart"
                    }
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        </section>

        {/* Section 3: Individual A-La-Carte Services */}
        <section id="alacarte-services" className="mt-32 scroll-mt-28">
          <div className="border-b border-brand-pink/20 pb-4 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-text mt-1.5 font-medium">
                Individual <span className="italic text-brand-earth">Services</span>
              </h2>
            </div>
            <p className="max-w-md text-sm font-serif italic text-brand-text/60 leading-relaxed">
              Targeted academic adjustments. Enhance structural logic, perfect APA formatting, or perform complete reference list audits as a separate singular service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ALACARTE_SERVICES.map((plan, index) => {
              const isAdded = addedItemIds[plan.id];
              const isInCart = items.some(item => item.id === plan.id);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
                  className="bg-white rounded-[30px] p-6 md:p-8 border border-brand-pink/10 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="text-lg font-serif text-brand-text font-semibold leading-snug">
                        {plan.name}
                      </h3>
                      {/* Price badge */}
                      <span className="text-[10px] font-bold font-sans bg-brand-lavender/25 text-brand-text px-2.5 py-1 rounded-full border border-brand-lavender/40 shrink-0">
                        ${plan.price} USD
                      </span>
                    </div>

                    <p className="text-brand-text/70 font-serif italic leading-relaxed text-xs mb-6 min-h-[60px]">
                      {plan.description}
                    </p>

                    <ul className="space-y-2 mb-6 border-t border-brand-pink/10 pt-4">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start text-xs font-serif italic text-brand-text/75 leading-snug">
                          <Check size={12} className="text-brand-sage mr-2 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleAddToCart(plan, "A-La-Carte")}
                    disabled={isInCart}
                    className={`w-full p-3 rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[8px] transition-all flex items-center justify-center gap-1.5 border mt-auto ${
                      isAdded 
                        ? "bg-brand-sage text-white border-brand-sage" 
                        : isInCart
                          ? "bg-brand-offwhite text-brand-text/40 border-brand-pink/10 cursor-not-allowed"
                          : "bg-white text-brand-text hover:bg-brand-offwhite border-brand-pink/20 hover:border-brand-pink"
                    }`}
                  >
                    <ShoppingBag size={10} />
                    {isAdded ? "Added to Cart" : isInCart ? "In Your Cart" : "Add to Cart"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Quick Agreement Callout banner */}
        <div className="mt-28 bg-brand-earth/5 p-12 rounded-[50px] border border-brand-pink/15 text-center relative overflow-hidden shadow-sm">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-pink/10 rounded-full blur-3xl select-none pointer-events-none"></div>
          <ShieldCheck size={40} className="mx-auto mb-6 text-brand-sage" />
          <h2 className="text-3xl font-serif mb-4 italic">Commitment to Academic Integrity</h2>
          <p className="max-w-2xl mx-auto text-base text-brand-text/75 mb-10 font-serif leading-relaxed italic">
            In compliance with strict institutional guidelines, Modern Care Consulting does not ghost-write, formulate primary arguments, or write content for users. We facilitate critical analysis, high-end developmental adjustments, and structural editing. Read and digitally sign your 10-clause contract upon checkout inside your cart.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/cart" 
              className="px-10 py-4.5 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-pink transition-all shadow-lg shadow-brand-earth/15"
            >
              Go to My Cart
            </Link>
            <Link 
              to="/wizard" 
              className="px-10 py-4.5 border border-brand-pink text-brand-text rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-pink/10 transition-all"
            >
              Get Custom Assessment
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
