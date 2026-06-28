import { useState, FormEvent, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Menu, 
  X, 
  BookOpen, 
  Edit3, 
  Users, 
  CheckCircle2, 
  Instagram, 
  Linkedin,
  Youtube,
  ArrowRight,
  ShieldCheck,
  Video,
  GraduationCap,
  Gift,
  Lock,
  ShoppingCart,
} from "lucide-react";

import { ChatBot } from "./components/ChatBot";
import { Wizard } from "./components/Wizard";
import { CartProvider, useCart, CartItem } from "./components/CartContext";
import { CartPage, AgreementPage, CheckoutPage } from "./components/CartPages";
import { PricingPage } from "./components/PricingPage";
import { LanguageProvider, useLanguage } from "./components/LanguageContext";

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Small timeout to allow the element to be present in the DOM
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

const Navigation = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isRestOpen, setIsRestOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { items } = useCart();

  const navLinks = [
    { name: "Coaching", href: "/coaching" },
    { name: "Editing", href: "/editing" },
    { name: "Pricing", href: "/pricing" },
    { name: "Zooms", href: "/zooms" },
    { name: "Classes", href: "/classes" },
    { name: "Referrals", href: "/referral" },
    { name: "Dissertation", href: "/dissertation" },
    { name: "Members", href: "/members" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node)) {
        setIsRestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLinkClick = () => {
    setIsOpen(false);
    setIsRestOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-brand-pink/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center relative">
          <div className="flex-shrink-0">
            <Link to="/" className="text-base xs:text-lg sm:text-2xl font-black font-serif tracking-tight lowercase italic text-brand-text leading-tight flex flex-col sm:block">
              <span>modern care</span> <span className="text-brand-earth not-italic font-light sm:ml-1">consulting</span>
            </Link>
          </div>
          
          {/* Centered 'Get Started Now' Button */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center z-10">
            <Link 
              to="/wizard"
              style={{ marginLeft: "0px" }}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-text transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center whitespace-nowrap"
            >
              Get Started Now
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/dissertation"
              className={`transition-colors font-medium font-sans uppercase text-[10px] tracking-[0.2em] ${
                location.pathname === "/dissertation" ? "text-brand-pink underline" : "text-brand-text/70 hover:text-brand-pink"
              }`}
            >
              Dissertation
            </Link>
          
            <Link
              to="/pricing"
              className={`transition-colors font-medium font-sans uppercase text-[10px] tracking-[0.2em] ${
                location.pathname === "/pricing" ? "text-brand-pink underline" : "text-brand-text/70 hover:text-brand-pink"
              }`}
            >
              Pricing
            </Link>
          
            <Link 
              to="/cart" 
              className="relative flex items-center justify-center p-2 text-brand-text/70 hover:text-brand-pink transition-colors mr-2"
              title="Shopping Cart"
            >
              <ShoppingCart size={20} />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-pink text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
            
            {/* Simple toggle: Eng | Span with text style aligned to brand palettes */}
            <button
              id="desktop-language-switcher"
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="text-brand-text/80 hover:text-brand-earth font-bold font-sans text-[11px] tracking-widest uppercase transition-all flex items-center gap-1 focus:outline-none mr-2"
              title={language === "en" ? "Switch to Spanish" : "Switch to English"}
            >
              <span className={language === "en" ? "underline underline-offset-4 decoration-2 text-brand-earth font-black" : "opacity-60"}>Eng</span>
              <span className="opacity-30">|</span>
              <span className={language === "es" ? "underline underline-offset-4 decoration-2 text-brand-earth font-bold" : "opacity-60"}>Span</span>
            </button>

            {/* Desktop Hamburger Dropdown for the other links */}
            <div className="relative" ref={desktopMenuRef}>
              <button
                onClick={() => setIsRestOpen(!isRestOpen)}
                className="text-brand-text hover:text-brand-pink transition-all p-2 focus:outline-none flex items-center justify-center hover:scale-110 active:scale-95 duration-150"
                aria-label="Toggle extra navigation links"
                title="More menu links"
              >
                {isRestOpen ? <X size={20} className="text-brand-pink" /> : <Menu size={20} />}
              </button>

              <AnimatePresence>
                {isRestOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-brand-pink/20 rounded-2xl shadow-xl py-3 z-50 backdrop-blur-md"
                  >
                    <div className="flex flex-col gap-1 px-2">
                      {[
                        { name: "Coaching", href: "/coaching" },
                        { name: "Editing", href: "/editing" },
                        { name: "Zooms", href: "/zooms" },
                        { name: "Classes", href: "/classes" },
                        { name: "Referrals", href: "/referral" },
                        { name: "Members", href: "/members" },
                      ].map((link) => (
                        <Link
                          key={link.name}
                          to={link.href}
                          onClick={() => setIsRestOpen(false)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-sans uppercase tracking-widest transition-colors font-medium text-left ${
                            location.pathname === link.href 
                              ? "bg-brand-pink/10 text-brand-pink font-extrabold" 
                              : "text-brand-text/70 hover:bg-brand-offwhite hover:text-brand-pink"
                          }`}
                        >
                          {link.name}
                        </Link>
                      ))}
                      
                      <div className="h-[1px] bg-brand-pink/10 my-1 mx-2"></div>
                      
                      <Link 
                        to="/wizard" 
                        onClick={() => setIsRestOpen(false)}
                        className="mx-2 mt-1 bg-brand-earth text-white text-center py-2.5 rounded-xl font-bold font-sans uppercase text-[10px] tracking-widest hover:bg-brand-pink transition-all shadow-md shadow-brand-earth/10"
                      >
                        Get Started Now
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <Link 
              to="/cart" 
              className="relative flex items-center justify-center p-2 text-brand-text/70 hover:text-brand-pink transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart size={20} />
              {items.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-brand-pink text-white rounded-full text-[8px] font-bold flex items-center justify-center font-sans">
                  {items.length}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-text focus:outline-none p-1.5"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-brand-pink/20 absolute w-full left-0 overflow-hidden shadow-xl"
          >
            <div className="px-4 pt-4 pb-8 space-y-4">
              <Link 
                to="/cart" 
                onClick={handleLinkClick}
                className="flex items-center justify-between text-lg font-medium font-serif italic text-brand-text hover:text-brand-pink"
              >
                <span>Cart</span>
                <div className="flex items-center">
                  <ShoppingCart size={20} className="mr-2" />
                  {items.length > 0 && (
                    <span className="bg-brand-pink text-white px-2 py-0.5 rounded-full text-xs font-sans not-italic font-bold">
                      {items.length}
                    </span>
                  )}
                </div>
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={handleLinkClick}
                  className="block text-lg font-medium font-serif italic text-brand-text hover:text-brand-pink"
                >
                  {link.name}
                </Link>
              ))}

              {/* Simple toggle: Eng | Span with elegant brand styling */}
              <div className="flex items-center justify-between pt-4 border-t border-brand-pink/10">
                <span className="text-sm font-medium font-serif italic text-brand-text">Language / Idioma</span>
                <button
                  id="mobile-language-switcher"
                  onClick={() => {
                    setLanguage(language === "en" ? "es" : "en");
                    handleLinkClick();
                  }}
                  className="text-brand-text hover:text-brand-earth font-bold font-sans text-xs tracking-widest uppercase transition-all flex items-center gap-1.5 focus:outline-none"
                >
                  <span className={language === "en" ? "underline underline-offset-4 decoration-2 text-brand-earth font-bold" : "opacity-60"}>Eng</span>
                  <span className="opacity-30">|</span>
                  <span className={language === "es" ? "underline underline-offset-4 decoration-2 text-brand-earth font-bold" : "opacity-60"}>Span</span>
                </button>
              </div>

              <Link 
                to="/wizard"
                onClick={handleLinkClick}
                className="block w-full py-4 bg-brand-earth text-white text-center rounded-full font-bold font-sans uppercase tracking-widest text-[10px] shadow-lg shadow-brand-earth/20"
              >
                Get Started Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- START NEW PAGES ---

const AddToCartButton = ({ item }: { item: CartItem }) => {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button 
      onClick={handleAdd}
      className={`mt-4 px-6 py-2 rounded-full font-bold font-sans uppercase tracking-widest text-[10px] transition-all shadow-md ${added ? 'bg-brand-pink text-white' : 'bg-brand-text text-white hover:bg-brand-earth'}`}
    >
      {added ? "Added to Cart" : `Add to cart $${item.price}`}
    </button>
  );
};

const CoachingPage = () => (
  <div className="pt-32 pb-20">
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-5xl font-serif text-brand-text mb-8">Coaching <span className="italic text-brand-earth">Services</span></h1>
      <div className="w-20 h-1 bg-brand-pink mb-12 rounded-full"></div>
      <div className="prose prose-lg font-serif text-brand-text/80 space-y-8">
        <p className="italic text-xl leading-relaxed">
          Dr. Mendivil offers personalized PhD coaching services tailored to your specific academic needs. Whether you are at the beginning of your journey or stuck in the middle of data analysis, we provide the strategy and support to move you forward.
        </p>
        <section className="bg-brand-offwhite p-10 rounded-[40px] border border-brand-pink/10">
          <h2 className="text-3xl mb-6 font-medium">What is Coaching and How Does it Work?</h2>
          <p>Coaching is a partnership. We work together to identify blocks, refine research questions, and develop a sustainable writing habit. It's about empowering you to find your own voice and maintain academic integrity while reaching the finish line.</p>
        </section>
        <section className="bg-white p-10 rounded-[40px] border border-brand-pink/10 shadow-sm text-center">
          <h2 className="text-3xl mb-4 font-medium">Ready to get started?</h2>
          <p className="mb-6 font-serif italic text-brand-text/60">Choose our coaching package to begin your journey.</p>
          <AddToCartButton item={{ id: "coaching-package", name: "Comprehensive Coaching Package", price: 250 }} />
        </section>
      </div>
    </div>
  </div>
);

const EditingPage = () => (
  <div className="pt-32 pb-20">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif text-brand-text mb-6">Editing <span className="italic text-brand-earth">Services</span></h1>
        <div className="w-20 h-1 bg-brand-pink mx-auto mb-8 rounded-full"></div>
        <p className="max-w-2xl mx-auto text-xl text-brand-text/60 font-serif italic">
          Professional refining of your academic work. We ensure structural integrity and strict style compliance while preserving your original research perspective.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          {
            title: "Developmental Editing",
            desc: "Focuses on the overall structure, logic, and flow of your research narrative. Ideal for early drafts to ensure your argument is sound.",
            price: 350
          },
          {
            title: "Copy Editing",
            desc: "Refining clarity, style, and tone. We ensure your writing is consistent and academic while maintaining your unique voice.",
            price: 100
          },
          {
            title: "Proofreading",
            desc: "The final polish. Catching punctuation, typos, and minor grammatical slips before your final submission.",
            price: 150
          },
          {
            title: "APA Formatting",
            desc: "Ensuring every citation, reference, and heading is perfectly aligned with the latest APA Style Manual standards.",
            price: 120
          },
          {
            title: "Style Guide Compliance",
            desc: "Beyond APA, we can adapt your work to specific university or journal formatting requirements.",
            price: 100
          },
          {
            title: "Reference List Audit",
            desc: "Complete cross-check of every in-text citation with your reference list for total accuracy.",
            price: 80
          }
        ].map((service, i) => (
          <div key={i} className="bg-brand-offwhite p-10 rounded-[40px] border border-brand-pink/10 hover:shadow-xl transition-all shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-medium mb-6 font-serif">{service.title}</h3>
              <p className="font-serif italic text-brand-text/70 leading-relaxed">
                {service.desc}
              </p>
            </div>
            <AddToCartButton item={{ id: `editing-${i}`, name: service.title, price: service.price }} />
          </div>
        ))}
      </div>

      <div className="mt-20 bg-brand-earth/5 p-12 rounded-[50px] border border-brand-pink/10 text-center">
        <h2 className="text-3xl font-serif mb-6 italic">Ready to Refine Your Work?</h2>
        <p className="max-w-xl mx-auto text-lg text-brand-text/60 mb-10 font-serif">
          Every project is unique. Contact us today for a custom quote based on your word count and specific editing needs.
        </p>
        <Link 
          to="/#contact" 
          className="inline-flex items-center px-12 py-5 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-pink transition-all shadow-lg shadow-brand-earth/20"
        >
          Request Quote
        </Link>
      </div>
    </div>
  </div>
);

const ZoomsPage = () => (
  <div className="pt-32 pb-20">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h1 className="text-5xl font-serif text-brand-text mb-8">Zoom <span className="italic text-brand-earth">Sessions</span></h1>
      <div className="w-20 h-1 bg-brand-pink mx-auto mb-12 rounded-full"></div>
      <div className="bg-brand-offwhite p-12 rounded-[50px] inline-block border border-brand-pink/10 shadow-sm max-w-md w-full">
        <Video size={48} className="mx-auto mb-8 text-brand-earth" />
        <h2 className="text-3xl font-medium mb-4">1-Hour One-on-One</h2>
        <div className="text-6xl font-light text-brand-text mb-8">$125</div>
        <p className="font-serif italic text-brand-text/60 mb-10">Direct support whenever you need it. Clear a block in just one session.</p>
        <AddToCartButton item={{ id: "zoom-1hr", name: "1-Hour One-on-One Zoom", price: 125 }} />
      </div>
    </div>
  </div>
);

const ClassesPage = () => (
  <div className="pt-32 pb-20">
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-5xl font-serif text-brand-text mb-8"><span className="italic">Upcoming</span> Classes</h1>
      <div className="w-20 h-1 bg-brand-pink mb-12 rounded-full"></div>
      <div className="text-center py-20 bg-brand-offwhite rounded-[40px] border border-dashed border-brand-pink/30">
        <GraduationCap size={64} className="mx-auto mb-6 text-brand-text/20" />
        <p className="text-2xl font-serif italic text-brand-text/40">New course schedules arriving soon.</p>
        <p className="mt-4 font-serif text-brand-text/60">Join our newsletter to be the first to know about new cohorts.</p>
      </div>
    </div>
  </div>
);

const ReferralPage = () => (
  <div className="pt-32 pb-20">
    <div className="max-w-5xl mx-auto px-4">
      <div className="text-center mb-16">
        <Gift size={48} className="mx-auto mb-6 text-brand-pink" />
        <h1 className="text-5xl font-serif text-brand-text">Referral <span className="italic text-brand-earth">Program</span></h1>
        <p className="mt-6 text-xl text-brand-text/60 font-serif italic">Earn rewards while helping others succeed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {[
          { step: "01", title: "Sign Up", desc: "Join our community and start your journey." },
          { step: "02", title: "Earn Points", desc: "Unlock points by referring friends and using services." },
          { step: "03", title: "Redeem", desc: "Turn points into exclusive discounts and offers." }
        ].map((item, i) => (
          <div key={i} className="bg-brand-offwhite p-10 rounded-[40px] text-center border border-brand-pink/10">
            <div className="text-4xl font-serif text-brand-pink/30 mb-4">{item.step}</div>
            <h3 className="text-2xl font-medium mb-4">{item.title}</h3>
            <p className="font-serif italic text-brand-text/60">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-brand-pink/10 rounded-[50px] p-12 shadow-sm italic font-serif">
        <h2 className="text-3xl mb-8 not-italic">How to Earn Points</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex justify-between items-center bg-brand-offwhite/50 p-6 rounded-2xl">
            <span>Book a Service</span>
            <span className="font-bold text-brand-earth">75 pts</span>
          </div>
          <div className="flex justify-between items-center bg-brand-offwhite/50 p-6 rounded-2xl">
            <span>Positive Review</span>
            <span className="font-bold text-brand-earth">50 pts</span>
          </div>
          <div className="flex justify-between items-center bg-brand-offwhite/50 p-6 rounded-2xl">
            <span>Annual Membership</span>
            <span className="font-bold text-brand-earth">500 pts</span>
          </div>
          <div className="flex justify-between items-center bg-brand-offwhite/50 p-6 rounded-2xl">
            <span>Refer a Friend</span>
            <span className="font-bold text-brand-earth">150 pts</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MembersPage = () => (
  <div className="pt-32 pb-20">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <Lock size={64} className="mx-auto mb-8 text-brand-text/10" />
      <h1 className="text-5xl font-serif text-brand-text mb-8 italic">Member <span className="not-italic">Portal</span></h1>
      <p className="text-xl text-brand-text/60 font-serif italic mb-12">Exclusive resources for our scholars and researchers.</p>
      
      <div className="bg-brand-offwhite p-12 rounded-[50px] border border-brand-pink/10 max-w-md mx-auto shadow-sm">
        <form className="space-y-6">
          <input 
            type="email" 
            placeholder="Email address"
            className="w-full p-4 rounded-2xl border border-brand-pink/10 font-serif italic outline-none focus:border-brand-pink/50"
          />
          <input 
            type="password" 
            placeholder="Password"
            className="w-full p-4 rounded-2xl border border-brand-pink/10 font-serif italic outline-none focus:border-brand-pink/50"
          />
          <button className="w-full py-5 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-pink transition-all">
            Enter Portal
          </button>
        </form>
        <p className="mt-6 text-xs text-brand-text/40 font-bold font-sans uppercase tracking-widest">Forgot your password? Contact support.</p>
      </div>
    </div>
  </div>
);

const WizardPage = () => (
  <div className="pt-24 bg-white">
    <Wizard />
  </div>
);

const DissertationPage = () => (
  <div className="pt-20">
    <DissertationOffer />
  </div>
);

// --- END NEW PAGES ---

const Home = () => (
  <>
    <Hero />
    <Services />
    <DissertationOffer />
    <Contact />
    <Affiliations />
  </>
);

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <CartProvider>
          <ScrollToTop />
          <div className="min-h-screen bg-white font-serif text-brand-text selection:bg-brand-pink/30 selection:text-brand-text">
            <Navigation />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/coaching" element={<CoachingPage />} />
                <Route path="/editing" element={<EditingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/zooms" element={<ZoomsPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/referral" element={<ReferralPage />} />
                <Route path="/dissertation" element={<DissertationPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/wizard" element={<WizardPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/agreement" element={<AgreementPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
              </Routes>
            </main>
            <Footer />
            <ChatBot />
          </div>
        </CartProvider>
      </Router>
    </LanguageProvider>
  );
}


const Hero = () => {
  return (
    <section id="home" className="pt-28 pb-20 lg:pt-36 lg:pb-32 bg-white overflow-hidden relative">
      {/* Soft background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-pink/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-lavender/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="-mt-6 lg:-mt-10 flex flex-col items-center w-full"
        >
          <h1 className="text-5xl md:text-7xl font-medium font-serif tracking-tight text-brand-text mb-12 leading-[1.1] max-w-3xl">
            Your journey gets easier <span className="italic text-brand-earth underline decoration-brand-pink/40 underline-offset-[12px]">NOW</span>
          </h1>

          {/* Moved the image right under h1, separated by 1/2 inch (48px / my-12) */}
          <div className="relative w-full max-w-md my-12 mx-auto">
            <div className="relative aspect-[4/5] rounded-[48px] overflow-hidden shadow-2xl border-6 border-brand-offwhite z-10">
              <img 
                src="/Michelle Mendivil PhD photo.jpg" 
                alt="Michelle Mendivil, PhD" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-text/40 to-transparent"></div>
              <div className="absolute bottom-8 left-8 text-white text-left">
                <p className="font-serif italic text-2xl">Michelle Mendivil</p>
                <p className="font-sans uppercase tracking-widest text-[10px] font-bold mt-1 opacity-80">Doctor of Philosophy</p>
              </div>
            </div>
            {/* Elegant framing element */}
            <div className="absolute -bottom-4 -right-4 w-full h-full border border-brand-pink/30 rounded-[48px] z-0 translate-x-2 translate-y-2"></div>
          </div>

          <p className="text-xl md:text-2xl text-brand-text/60 leading-relaxed mb-12 font-serif italic max-w-2xl text-center">
            I’m Michelle Mendivil, PhD. I partner with dedicated students to navigate the complexities of research with authenticity, originality, and mindful direction.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              to="/wizard" 
              className="inline-flex items-center justify-center px-8 py-4 bg-brand-earth text-white rounded-full font-bold font-sans uppercase tracking-widest text-xs sm:text-sm hover:bg-brand-text transition-all shadow-xl shadow-brand-earth/20 hover:-translate-y-0.5 active:translate-y-0 text-center"
            >
              Get Started Now
            </Link>
            <Link 
              to="/dissertation" 
              className="inline-flex items-center justify-center px-8 py-4 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-widest text-xs sm:text-sm hover:bg-brand-earth transition-all shadow-xl shadow-brand-text/15 hover:-translate-y-0.5 active:translate-y-0 text-center"
            >
              Purchase My Final Research Study PDF $1
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Services = () => {
  const navigate = useNavigate();

  const services = [
    {
      title: "Coaching",
      description: "One-on-one sessions developed to help you through the complexities of your dissertation or research project. We partner to find your unique academic voice.",
      icon: <Users size={24} />,
      bg: "bg-brand-pink/10",
      link: "/pricing#coaching-partnership"
    },
    {
      title: "Editing",
      description: "Professional refining of your academic work. I ensure structural integrity and strict APA compliance while preserving your original research perspective.",
      icon: <Edit3 size={24} />,
      bg: "bg-brand-lavender/20",
      link: "/pricing#turnaround-editing"
    },
    {
      title: "Strategy",
      description: "Virtual discovery sessions to address immediate blocks. Whether it's data analysis or narrative flow, we move forward with purpose.",
      icon: <ArrowRight size={24} />,
      bg: "bg-brand-offwhite",
      link: "/pricing#alacarte-services"
    },
    {
      title: "Academic Coaching",
      description: "Personalized guidance for High School, Junior College, and University students (Associates, Bachelor's, & Master's). Empowering the next generation of scholars.",
      icon: <BookOpen size={24} />,
      bg: "bg-brand-lavender/10",
      link: "/pricing#coaching-partnership"
    }
  ];

  return (
    <section id="services" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-medium font-serif tracking-tight text-brand-text mb-6">
            Refined <span className="italic text-brand-earth">Support</span>
          </h2>
          <div className="w-20 h-1 bg-brand-pink mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center md:text-left justify-items-center md:justify-items-stretch">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`${service.bg} p-12 rounded-[40px] hover:shadow-2xl hover:shadow-brand-pink/10 transition-all group border border-white/50 w-full flex flex-col items-center md:items-start`}
            >
              <div 
                onClick={() => navigate(service.link)}
                role="button"
                aria-label={`View pricing details for ${service.title}`}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-10 text-brand-earth shadow-sm group-hover:scale-110 group-hover:bg-brand-earth group-hover:text-white cursor-pointer active:scale-95 hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-pink/50"
              >
                {service.icon}
              </div>
              <h3 className="text-2xl font-semibold font-serif text-brand-text mb-6">{service.title}</h3>
              <p className="text-lg text-brand-text/70 font-serif leading-relaxed italic">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Bundles section removed from homepage

const DissertationOffer = () => {
  const { addItem, items } = useCart();
  const navigate = useNavigate();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [email, setEmail] = useState("");

  const handlePurchase = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsPurchasing(true);
    
    // Save email for delivery and set flag for custom success page messaging
    localStorage.setItem("dissertation_purchase_email", email);
    localStorage.setItem("bought_dissertation", "true");
    
    // Check if the dissertation item is already in the cart
    const isAlreadyInCart = items.some(item => item.id === "dissertation-study");
    if (!isAlreadyInCart) {
      addItem({
        id: "dissertation-study",
        name: "Doctoral Dissertation Study PDF",
        price: 1
      });
    }

    // Short timeout for aesthetic progress feedback before navigating
    setTimeout(() => {
      setIsPurchasing(false);
      navigate("/cart");
    }, 800);
  };

  return (
    <section id="dissertation" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
        >
          <div className="w-20 h-20 bg-brand-pink/20 text-brand-pink rounded-full flex items-center justify-center mx-auto mb-12 shadow-inner">
            <BookOpen size={36} />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-medium font-serif tracking-tight text-brand-text mb-10 italic">
            Foundational <span className="text-brand-earth not-italic underline decoration-brand-lavender decoration-[6px] underline-offset-[10px]">Research</span>
          </h2>
          <p className="text-xl md:text-2xl font-serif mb-12 italic text-brand-text/50 leading-relaxed px-4">
            "Adults’ Perceptions of Wearable-Fitness-Devices on Psychological Well-Being and Motivation to Engage in Physical Activities"
          </p>
          
          <div className="max-w-xl mx-auto text-lg font-serif text-brand-text/70 mb-16 italic border-l border-brand-pink/50 pl-8 py-2 text-left">
            My 297-page doctoral study explored the intricate intersection of technology and the human psyche. For $1, the complete analysis is yours.
          </div>

          {/* Embedded YouTube Video of Dissertation Journey */}
          <div className="w-full max-w-2xl mx-auto mb-16">
            <div className="relative aspect-video rounded-[32px] overflow-hidden shadow-2xl border-6 border-brand-offwhite">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/5UxijgZpfHU"
                title="Michelle Mendivil, PhD - Academic Journey Support"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="bg-brand-offwhite p-12 rounded-[60px] flex flex-col items-center border border-brand-pink/10 shadow-sm">
            <div className="text-brand-text/30 line-through text-sm font-bold font-sans uppercase tracking-widest mb-4">Original value $49.00</div>
            <div className="text-8xl font-light font-serif text-brand-text leading-none mb-12">
              <span className="text-2xl align-top mr-1 font-medium font-sans">$</span>1
            </div>
            
            <form onSubmit={handlePurchase} className="w-full max-w-sm space-y-4">
              <input 
                type="email"
                required
                placeholder="Enter your email for digital delivery"
                className="w-full p-4 rounded-2xl border border-brand-pink/10 font-serif italic outline-none focus:border-brand-pink/50 shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button 
                type="submit"
                disabled={isPurchasing}
                className={`group w-full py-4 rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] relative overflow-hidden transition-all shadow-xl ${
                  isPurchasing ? 'bg-brand-text/20 cursor-not-allowed text-white' : 'bg-brand-text text-white hover:bg-brand-pink shadow-brand-text/20'
                }`}
              >
                {isPurchasing ? 'Processing...' : (
                  <span className="flex items-center justify-center">
                    Purchase Copy <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>
            
            <div className="mt-10 flex items-center text-[9px] font-bold font-sans uppercase tracking-[0.3em] text-brand-text/30 gap-6">
              <span>Secure Access</span>
              <div className="w-1 h-1 rounded-full bg-brand-pink/30"></div>
              <span>Instant Delivery</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSent, setIsSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    
    // Construct and trigger mailto link to support@moderncareconsulting.com
    const subject = `Academic Inquiry from ${formData.name}`;
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\n\nInquiry:\n${formData.message}`;
    window.location.href = `mailto:support@moderncareconsulting.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    setTimeout(() => setIsSuccess(false), 5000);
  };

  return (
    <section id="contact" className="py-32 bg-white relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-brand-lavender/5 rounded-full blur-[80px] -translate-x-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
          <div className="text-left">
            <h2 className="text-5xl md:text-7xl font-medium font-serif tracking-tight text-brand-text mb-10 italic">
              Mindful <span className="text-brand-pink not-italic">Connection.</span>
            </h2>
            <p className="text-xl text-brand-text/60 font-serif mb-12 leading-relaxed italic">
              Have questions about your academic path or our memberships? I’m here to listen and help you find clarity.
            </p>
            
            <div className="space-y-12">
              <div className="border-l-2 border-brand-earth/30 pl-8">
                <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.3em] text-brand-earth mb-4">Official Email</h4>
                <a href="mailto:support@moderncareconsulting.com" className="text-xl md:text-2xl font-serif italic text-brand-text hover:text-brand-pink transition-colors break-all">
                  support@moderncareconsulting.com
                </a>
              </div>
              
              <div className="border-l-2 border-brand-pink/30 pl-8">
                <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.3em] text-brand-pink mb-6">Digital Presence</h4>
                <div className="flex space-x-8">
                  <a 
                    href="https://www.instagram.com/doctoramendivil?igsh=MTc4MmM1YmI2Ng==" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brand-text/40 hover:text-brand-pink transition-all transform hover:scale-110"
                  >
                    <Instagram size={28} />
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/michellemendivil8" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brand-text/40 hover:text-brand-pink transition-all transform hover:scale-110"
                  >
                    <Linkedin size={28} />
                  </a>
                  <a 
                    href="https://www.youtube.com/@DoctoraMendivil" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brand-text/40 hover:text-brand-pink transition-all transform hover:scale-110"
                  >
                    <Youtube size={28} />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-offwhite p-10 sm:p-12 rounded-[50px] shadow-sm border border-brand-pink/20 relative">
            {isSent ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <div className="text-brand-pink text-4xl mb-6 flex flex-col items-center gap-6">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                     <CheckCircle2 size={32} />
                   </div>
                   <span className="font-serif italic font-medium">Message received.</span>
                </div>
                <p className="text-brand-text/60 font-serif italic text-lg">Thank you for reaching out. I’ll be in touch shortly.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Your Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white/50 border border-brand-pink/10 rounded-2xl p-4 text-lg font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner"
                    placeholder="E.g. Dr. Jane Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-white/50 border border-brand-pink/10 rounded-2xl p-4 text-lg font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner"
                    placeholder="Where can I reach you?"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold font-sans uppercase tracking-[0.2em] text-brand-text/40 ml-1">Your Inquiry</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full bg-white/50 border border-brand-pink/10 rounded-2xl p-4 text-lg font-serif italic text-brand-text focus:border-brand-pink/50 outline-none transition-all placeholder:text-brand-text/20 shadow-inner resize-none"
                    placeholder="Share your academic goals with me..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-brand-text text-white rounded-full font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-brand-pink transition-all shadow-xl shadow-brand-text/10"
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Affiliations = () => {
  const orgs = [
    { name: "ACHE San Diego", role: "Member" },
    { name: "MANA of North County", role: "Member" },
    { name: "SHPE San Diego", role: "Member & STEM Volunteer" }
  ];

  return (
    <section className="py-24 bg-brand-offwhite/50 border-t border-brand-pink/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-medium font-serif tracking-tight text-brand-text mb-6">Community & <span className="italic text-brand-earth">Advocacy</span></h2>
            <div className="w-12 h-1 bg-brand-pink mb-8 rounded-full"></div>
            <p className="text-lg text-brand-text/60 font-serif italic leading-relaxed">
              I’m passionate about community outreach and STEM advocacy. As an active member of SHPE, I volunteer at events that promote STEM access and innovation for students of all ages. I also mentor aspiring professionals, providing guidance and real-world insight into navigating careers in technology and healthcare.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {orgs.map((org, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-brand-pink/10 shadow-sm flex justify-between items-center group hover:border-brand-pink transition-colors"
              >
                <div>
                  <h4 className="text-xl font-medium font-serif text-brand-text">{org.name}</h4>
                  <p className="text-[10px] font-bold font-sans uppercase tracking-[0.2em] text-brand-earth mt-1">{org.role}</p>
                </div>
                <div className="w-10 h-10 bg-brand-offwhite rounded-full flex items-center justify-center text-brand-pink group-hover:bg-brand-pink group-hover:text-white transition-colors">
                  <ShieldCheck size={20} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-white border-t border-brand-pink/10 py-20 text-brand-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-black font-serif italic tracking-tight lowercase">
              modern care <span className="text-brand-earth not-italic font-light">consulting</span>
            </h3>
            <p className="text-brand-text/40 font-serif text-sm italic tracking-tight mt-2">Nurturing academic excellence since {new Date().getFullYear()}.</p>
          </div>
          <div className="md:text-right">
            <p className="text-brand-text/30 font-bold font-sans uppercase tracking-[0.2em] text-[9px] mb-2 font-black">Michelle Mendivil, PhD</p>
            <p className="text-brand-text/20 text-[9px] font-bold font-sans uppercase tracking-[0.2em]">© {new Date().getFullYear()} Modern Care Consulting</p>
          </div>
        </div>
      </div>
    </footer>
  );
};


