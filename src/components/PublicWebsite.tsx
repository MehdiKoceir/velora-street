import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, Calendar, Phone, MapPin, Clock, Star, 
  Search, SlidersHorizontal, Info, Plus, Minus, ArrowRight,
  ChevronRight, Sparkles, Send, Award, Compass, Heart, Users,
  User, Lock, ShieldCheck, History, Gift, Edit3, Trash2, Award as BadgeCheck, UserCheck, UserX
} from "lucide-react";
import { MenuItem, CartItem, Order, CustomerReview, ServiceType, Customer } from "../types";
import { 
  createOrder, createReservation, submitReview, 
  customerLogin, customerRegister, customerUpdateProfile, fetchCustomerOrders 
} from "../api";

interface PublicWebsiteProps {
  menu: MenuItem[];
  reviews: CustomerReview[];
  onAddToast: (type: "success" | "warning" | "info" | "notify", title: string, message: string, channel?: "sms" | "whatsapp" | "email") => void;
  onRefreshData: () => void;
}

export default function PublicWebsite({ menu, reviews, onAddToast, onRefreshData }: PublicWebsiteProps) {
  const [activeTab, setActiveTab] = useState<"home" | "menu" | "order" | "reservation" | "catering" | "gallery" | "reviews" | "contact" | "profile">("home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Authentication & Customer Stats
  const [loggedInUser, setLoggedInUser] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem("velorastreet_customer");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return false;
    }
  });

  const [isShowingAuthModal, setIsShowingAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({
    name: "", phone: "", email: "", address: "", password: ""
  });
  const [authLoading, setAuthLoading] = useState(false);

  // Users order histories
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [historyTrigger, setHistoryTrigger] = useState(0);

  // Edit Profile Form
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "", phone: "", email: "", address: "", password: ""
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Selected Order for detail tracker
  const [selectedTrackOrder, setSelectedTrackOrder] = useState<Order | null>(null);

  // Reservation Form State
  const [resForm, setResForm] = useState({
    name: "", phone: "", email: "", date: "", time: "19:30", guests: 2, specialRequests: ""
  });
  const [isResmitting, setIsResmitting] = useState(false);
  const [resSuccessData, setResSuccessData] = useState<any>(null);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    name: "", phone: "", email: "", address: "", serviceType: "delivery" as ServiceType, notes: ""
  });
  const [isOrdering, setIsOrdering] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // New Review Form State
  const [reviewForm, setReviewForm] = useState({
    name: "", rating: 5, comment: ""
  });
  const [isReviewing, setIsReviewing] = useState(false);

  // Customization modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationNotes, setCustomizationNotes] = useState("");

  // Sync loyalty points & stats from backend database
  const refreshProfileStats = async (active: boolean) => {
    if (!loggedInUser) return;
    try {
      const res = await fetch("/api/customers");
      if (res.ok && active) {
        const list: Customer[] = await res.json();
        const savedUserSnapshot = localStorage.getItem("velorastreet_customer");
        if (!savedUserSnapshot) return; // User logged out in the meantime
        
        const updated = list.find(c => c.id === loggedInUser.id || c.email.toLowerCase() === loggedInUser.email.toLowerCase() || c.phone === loggedInUser.phone);
        if (updated && active) {
          const merged = { ...updated, password: loggedInUser.password };
          setLoggedInUser(merged);
          localStorage.setItem("velorastreet_customer", JSON.stringify(merged));
        }
      }
    } catch (err) {
      console.warn("Gracefully handled profile sync error (server may be restarting):", err);
    }
  };

  // Real-time synchronization interval for customer orders tracking
  useEffect(() => {
    let active = true;

    async function loadCustomerHistoryAndPoll() {
      const email = loggedInUser?.email || placedOrder?.email;
      const phone = loggedInUser?.phone || placedOrder?.phone;

      if (!email && !phone) {
        if (active) {
          setMyOrders([]);
        }
        return;
      }

      if (loggedInUser && myOrders.length === 0) {
        setMyOrdersLoading(true);
      }

      try {
        const history = await fetchCustomerOrders(email || "", phone || "");
        if (!active) return;
        
        // Sort history: descending timestamp
        history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (loggedInUser) {
          setMyOrders(history);
        }

        // Keep selection prioritized and synchronized with latest updates
        if (placedOrder) {
          const matched = history.find(o => o.id === placedOrder.id);
          if (matched && active) {
            setPlacedOrder(matched);
            setSimulatedStatus(matched.status);
            
            // Map actual database status to visual timeline percentage
            const progression: Record<string, number> = {
              "Pending": 15,
              "Confirmed": 35,
              "Preparing": 60,
              "Ready": 85,
              "Out for Delivery": 85,
              "Delivered": 100,
              "Cancelled": 100
            };
            setProgressPercent(progression[matched.status] || 15);
          }
        }

        if (history.length > 0) {
          if (!selectedTrackOrder) {
            setSelectedTrackOrder(history[0]);
          } else {
            const updatedSelected = history.find(o => o.id === selectedTrackOrder.id);
            if (updatedSelected && active) {
              setSelectedTrackOrder(updatedSelected);
            }
          }
        }
      } catch (err) {
        console.warn("Gracefully handled customer orders fetch in background (server may be restarting):", err);
      } finally {
        if (active) {
          setMyOrdersLoading(false);
        }
      }
    }

    // Load straight away on mount or state change
    loadCustomerHistoryAndPoll();
    refreshProfileStats(active);

    // Set up continuous 3-second background polling database connector
    const pollingInterval = setInterval(() => {
      loadCustomerHistoryAndPoll();
    }, 3000);

    return () => {
      active = false;
      clearInterval(pollingInterval);
    };
  }, [loggedInUser, placedOrder?.id, selectedTrackOrder?.id, historyTrigger]);

  // Handle forms pre-population when loggedInUser changes
  useEffect(() => {
    if (loggedInUser) {
      setCheckoutForm(prev => ({
        ...prev,
        name: loggedInUser.name,
        phone: loggedInUser.phone,
        email: loggedInUser.email,
        address: loggedInUser.address || ""
      }));
      setResForm(prev => ({
        ...prev,
        name: loggedInUser.name,
        phone: loggedInUser.phone,
        email: loggedInUser.email
      }));
      setReviewForm(prev => ({
        ...prev,
        name: loggedInUser.name
      }));
      setProfileForm({
        name: loggedInUser.name,
        phone: loggedInUser.phone,
        email: loggedInUser.email,
        address: loggedInUser.address || "",
        password: loggedInUser.password || "123"
      });
    } else {
      setCheckoutForm({
        name: "", phone: "", email: "", address: "", serviceType: "delivery", notes: ""
      });
      setResForm({
        name: "", phone: "", email: "", date: "", time: "19:30", guests: 2, specialRequests: ""
      });
      setReviewForm({
        name: "", rating: 5, comment: ""
      });
      setSelectedTrackOrder(null);
    }
  }, [loggedInUser]);

  // Sync menu items in cart
  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = ["All", "Hoodies", "T-Shirts", "Outerwear", "Sneakers", "Cargo Pants", "Caps"];

  // Filtered Menu Items
  const filteredMenu = menu.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations & Auth Actions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const user = await customerLogin({
          emailOrPhone: authForm.email,
          password: authForm.password
        });
        setLoggedInUser(user);
        localStorage.setItem("velorastreet_customer", JSON.stringify(user));
        onAddToast("success", "Welcome back!", `Ciao, ${user.name}! Your account session is active.`, "sms");
        setIsShowingAuthModal(false);
        setAuthForm({ name: "", phone: "", email: "", address: "", password: "" });
        setHistoryTrigger(p => p + 1);
        setActiveTab("profile");
      } else {
        // Register Mode
        const user = await customerRegister({
          name: authForm.name,
          phone: authForm.phone,
          email: authForm.email,
          address: authForm.address,
          password: authForm.password
        });
        setLoggedInUser(user);
        localStorage.setItem("velorastreet_customer", JSON.stringify(user));
        onAddToast("success", "Account Created!", `Marhaban, ${user.name}! Your account is ready. VIP loyalty rewards activated.`, "sms");
        setIsShowingAuthModal(false);
        setAuthForm({ name: "", phone: "", email: "", address: "", password: "" });
        setHistoryTrigger(p => p + 1);
        setActiveTab("profile");
      }
    } catch (err: any) {
      setAuthError(err.message || "Credential authentication failure.");
      onAddToast("warning", "Access Error", err.message || "Failed to authenticate.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("velorastreet_customer");
    setMyOrders([]);
    onAddToast("info", "Logged Out", "You have signed out. Active and historical orders hidden.");
    if (activeTab === "profile") {
      setActiveTab("home");
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser) return;
    setProfileSaving(true);
    try {
      const updated = await customerUpdateProfile({
        id: loggedInUser.id,
        name: profileForm.name,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
        password: profileForm.password
      });
      setLoggedInUser(updated);
      localStorage.setItem("velorastreet_customer", JSON.stringify(updated));
      setIsEditingProfile(false);
      onAddToast("success", "Profile Updated", "Your Velora Street security credentials & profile updated!");
      setHistoryTrigger(p => p + 1);
    } catch (err: any) {
      onAddToast("warning", "Update Failed", err.message || "Could not update credentials.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddToCart = (item: MenuItem, notes = "") => {
    const cartItemId = `${item.id}-${notes ? encodeURIComponent(notes) : "plain"}`;
    const existing = cart.find(i => i.id === cartItemId);
    if (existing) {
      setCart(cart.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { id: cartItemId, menuItem: item, quantity: 1, customizationNotes: notes || undefined }]);
    }
    onAddToast("success", "Item Added", `${item.name} has been added to your order basket.`);
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    const existing = cart.find(i => i.id === cartItemId);
    if (existing) {
      if (existing.quantity === 1) {
        setCart(cart.filter(i => i.id !== cartItemId));
      } else {
        setCart(cart.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity - 1 } : i));
      }
    }
  };

  // Handle reserve submission
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.name || !resForm.phone || !resForm.date) {
      onAddToast("warning", "Missing Fields", "Please provide a name, phone, and date for your reservation.");
      return;
    }
    setIsResmitting(true);
    try {
      const res = await createReservation({
        customerName: resForm.name,
        phone: resForm.phone,
        email: resForm.email,
        date: resForm.date,
        time: resForm.time,
        guests: resForm.guests,
        specialRequests: resForm.specialRequests
      });
      setResSuccessData(res);
      onAddToast("success", "Booking Received", `A reservation request has been registered under ${resForm.name}!`, "sms");
      onRefreshData();
    } catch (err) {
      onAddToast("warning", "Error", "Failed to compile your reservation. Please retry.");
    } finally {
      setIsResmitting(false);
    }
  };

  // Handle Order Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!checkoutForm.name || !checkoutForm.phone || (checkoutForm.serviceType === "delivery" && !checkoutForm.address)) {
      onAddToast("warning", "Missing Details", "Please fill in all mandatory billing and location fields.");
      return;
    }
    setIsOrdering(true);
    try {
      const formattedItems = cart.map(i => ({
        menuItem: i.menuItem,
        quantity: i.quantity,
        customizationNotes: i.customizationNotes
      }));
      const order = await createOrder({
        customerName: checkoutForm.name,
        phone: checkoutForm.phone,
        email: checkoutForm.email,
        deliveryAddress: checkoutForm.address,
        serviceType: checkoutForm.serviceType,
        items: formattedItems,
        notes: checkoutForm.notes
      });
      setPlacedOrder(order);
      setCart([]); // Clear cart
      onAddToast("success", "Order Dispatched", `Order #${order.orderNumber} placed successfully!`, "sms");
      setHistoryTrigger(prev => prev + 1);
      onRefreshData();
    } catch (err) {
      onAddToast("warning", "Checkout Failed", "Could not submit order. Please check connections.");
    } finally {
      setIsOrdering(false);
    }
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.comment) {
      onAddToast("warning", "Incomplete", "Please share both your name and feedback comment.");
      return;
    }
    setIsReviewing(true);
    try {
      await submitReview(reviewForm);
      onAddToast("success", "Review Published", "Arigato! Your review was successfully registered.");
      setReviewForm({ name: "", rating: 5, comment: "" });
      onRefreshData();
    } catch (err) {
      onAddToast("warning", "Error", "Could not publish review.");
    } finally {
      setIsReviewing(false);
    }
  };

  // Simulated Tracker State connected to the database
  const [simulatedStatus, setSimulatedStatus] = useState<string>("Pending");
  const [progressPercent, setProgressPercent] = useState(15);
  const lastAcknowledgedStatus = React.useRef<string | null>(null);

  // Toast notifications for real-time order status changes from the database
  useEffect(() => {
    if (!placedOrder) {
      lastAcknowledgedStatus.current = null;
      setSimulatedStatus("Pending");
      setProgressPercent(15);
      return;
    }

    const status = placedOrder.status;
    setSimulatedStatus(status);
    
    const progression: Record<string, number> = {
      "Pending": 15,
      "Confirmed": 35,
      "Preparing": 60,
      "Ready": 85,
      "Out for Delivery": 85,
      "Delivered": 100,
      "Cancelled": 100
    };
    setProgressPercent(progression[status] || 15);

    if (status === lastAcknowledgedStatus.current) return;

    // Toast triggers on change
    if (lastAcknowledgedStatus.current !== null) {
      if (status === "Confirmed") {
        onAddToast("notify", "Status Confirmed", "Velora Street has accepted your order!", "sms");
      } else if (status === "Preparing") {
        onAddToast("notify", "Preparing Thread", "Tailoring and packaging of your garment fits has started!", "sms");
      } else if (status === "Ready") {
        onAddToast("notify", "Order Ready", placedOrder.serviceType === "delivery" ? "Ready for courier dispatch!" : "Ready for store pick up!", "whatsapp");
      } else if (status === "Out for Delivery") {
        onAddToast("notify", "Out for Delivery", "Our courier logistics partner is en route with your fresh fits!", "whatsapp");
      } else if (status === "Delivered") {
        onAddToast("success", "Enjoy Your Fit", "Your Velora Street premium order was delivered successfully!", "sms");
      } else if (status === "Cancelled") {
        onAddToast("warning", "Order Cancelled", "Your order was marked as cancelled by our fulfillment team.", "sms");
      }
    }

    lastAcknowledgedStatus.current = status;
  }, [placedOrder?.status, placedOrder?.id]);

  return (
    <div className="flex flex-col min-h-screen bg-charcoal-deep text-white font-sans relative overflow-hidden">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-red-deep/5 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[40%] right-[-100px] w-96 h-96 rounded-full bg-gold-500/5 blur-[100px] pointer-events-none" />

      {/* SUSHI BRANDING TOP LOGO HEADER PANEL */}
      <header className="sticky top-0 z-40 bg-charcoal-deep/90 backdrop-blur-md border-b border-gold-500/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab("home")}>
            {/* High-End Minimalist Streetwear Logo */}
            <div className="w-12 h-12 rounded bg-white flex flex-col items-center justify-center font-bold text-neutral-950 rotate-[-4deg] relative overflow-hidden group hover:rotate-[0deg] transition-all shadow-md">
              <span className="text-[10px] font-mono tracking-widest text-neutral-400">VEL</span>
              <span className="text-xl font-sans font-black text-neutral-950 leading-3">S</span>
            </div>
            <div>
              <span className="text-xl font-bold font-sans tracking-[0.2em] text-white block uppercase">VELORA<span className="text-neutral-400">STREET</span></span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-neutral-400 block">Milano, Italy</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: "home", label: "Home" },
              { id: "menu", label: "Elite Menu" },
              ...(loggedInUser ? [
                { id: "order", label: "Order Online" },
                { id: "reservation", label: "Book Table" },
                { id: "catering", label: "Catering" },
                { id: "profile" as const, label: "My Account" }
              ] : []),
              { id: "reviews", label: "Reviews" },
              { id: "gallery", label: "Gallery" },
              { id: "contact", label: "Contact" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setPlacedOrder(null); setResSuccessData(null); }}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-full font-medium text-xs lg:text-sm transition-all relative ${
                  activeTab === tab.id 
                    ? "text-gold-300 bg-gold-500/10 border border-gold-500/25 font-bold" 
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Cart status & Auth Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (loggedInUser) {
                  setActiveTab("order");
                } else {
                  setAuthMode("login");
                  setIsShowingAuthModal(true);
                  onAddToast("info", "Sign In Required", "Please sign in or enroll your loyalty card to shop online.");
                }
              }}
              className="relative p-2.5 rounded-full bg-charcoal-light border border-gold-500/20 hover:border-gold-500/50 transition-all flex items-center justify-center"
            >
              <ShoppingBag className="w-5 h-5 text-gold-400" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-deep text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-gold-500">
                  {cartCount}
                </span>
              )}
            </button>

            {loggedInUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setActiveTab("profile"); setPlacedOrder(null); setResSuccessData(null); }}
                  className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all border flex items-center gap-1.5 ${
                    activeTab === "profile"
                      ? "bg-gold-500 text-charcoal-deep border-gold-500 font-bold"
                      : "bg-charcoal-light border-gold-500/20 text-gold-300 hover:border-gold-500/50"
                  }`}
                >
                  <User className="w-3 text-gold-400" />
                  <span className="max-w-[70px] uppercase font-mono tracking-wider truncate">{loggedInUser.name.split(" ")[0]}</span>
                  <span className="bg-gold-500/25 text-gold-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">{loggedInUser.loyaltyPoints}p</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-full font-mono text-[9px] uppercase border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-bold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode("login"); setIsShowingAuthModal(true); }}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-xs bg-gold-500 hover:bg-gold-400 text-charcoal-deep border border-gold-400 transition-all cursor-pointer shadow-md"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* VIEWPORT AREA */}
      <main className="flex-grow z-10">
        <AnimatePresence mode="wait">
          
          {/* ==================== 1. HOME VIEW ==================== */}
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-20 pb-20"
            >
              {/* LUXURY HERO BANNER */}
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 px-3 py-1 rounded-full text-gold-400 text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rating 4.9 / 5 | High-End Streetwear Milano / Brera</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-sans leading-tight font-black tracking-tighter uppercase">
                    The Art of <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-stone-300 to-neutral-400 text-glow-gold">
                      Supreme Streetwear
                    </span>
                  </h1>
                  <p className="text-neutral-300 text-lg leading-relaxed max-w-xl font-light">
                    Located in Galleria del Corso, Velora Street blends bold contemporary Milano streetwear with luxury-grade fabrics. Explore premium fits, heavyweight hoodies, graphic designs, and bespoke tailored styling.
                  </p>
                  
                  {/* Local Info Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-100/10 rounded-lg text-neutral-100">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-neutral-400 block font-mono">LOCATION</span>
                        <span className="text-sm font-bold text-white">Galleria del Corso</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-deep/10 rounded-lg text-red-bright">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block font-mono">HOURS</span>
                        <span className="text-sm font-semibold text-white">12:00 - 23:00</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                      <div className="p-2 bg-gold-400/10 rounded-lg text-gold-400">
                        <Star className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block font-mono">RATING</span>
                        <span className="text-sm font-semibold text-white">4.8 (800+ Votes)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <button
                      onClick={() => setActiveTab("menu")}
                      className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-charcoal-deep font-bold rounded-lg tracking-wider transition-all flex items-center gap-2 border border-gold-300/20 cursor-pointer shadow-lg hover:shadow-gold-500/20 shadow-black"
                    >
                      <span>DISCOVER ELITE MENU</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (loggedInUser) {
                          setActiveTab("reservation");
                        } else {
                          setAuthMode("login");
                          setIsShowingAuthModal(true);
                          onAddToast("info", "Reservation Required", "Please sign in or enroll your loyalty card to book seating.");
                        }
                      }}
                      className="px-8 py-4 bg-charcoal-dark hover:bg-charcoal-light text-white font-medium rounded-lg transition-all border border-gold-500/30 hover:border-gold-500 flex items-center gap-2 cursor-pointer"
                    >
                      <span>RESERVE SEATING</span>
                      <Calendar className="w-4 h-4 text-gold-400" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 relative flex justify-center">
                  {/* Decorative Frame */}
                  <div className="absolute top-4 left-4 right-4 bottom-4 border border-white/10 rounded-2xl pointer-events-none -translate-x-2 translate-y-2 z-0" />
                  <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 p-2 z-10 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=80" 
                      alt="Streetwear Outfit"
                      className="rounded-xl w-full max-h-[450px] object-cover hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute bottom-4 left-4 bg-neutral-950/90 backdrop-blur-md px-4 py-2 rounded border border-white/10">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono block">Featured Fit</span>
                      <span className="text-sm font-bold text-white">Classic Gothic Hoodie - 5500 EUR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STRENGTHS SEGMENTATION */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-charcoal-dark/50 border-y border-gold-500/10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 mx-auto md:mx-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-white font-serif">Aura of Quality</h3>
                    <p className="text-sm text-gray-400">Premium organic cotton, Italian leather, and curated fabrics sourced from trusted European mills.</p>
                  </div>
                  <div className="space-y-2 text-center md:text-left">
                    <div className="w-12 h-12 rounded-full bg-red-deep/10 flex items-center justify-center text-red-bright mx-auto md:mx-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-white font-serif">Artisanal Speed</h3>
                    <p className="text-sm text-gray-400">Preparation queue structured strictly for express order dispatch.</p>
                  </div>
                  <div className="space-y-2 text-center md:text-left">
                    <div className="w-12 h-12 rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400 mx-auto md:mx-0">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-white font-serif">Traditional Roots</h3>
                    <p className="text-sm text-gray-400">Milanese design heritage fused with contemporary global streetwear culture.</p>
                  </div>
                  <div className="space-y-2 text-center md:text-left">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 mx-auto md:mx-0">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-white font-serif">Full Services</h3>
                    <p className="text-sm text-gray-400">Seamless dine-in, express drive-through, takeaways, and contactless deliveries.</p>
                  </div>
                </div>
              </div>

              {/* POPULAR STREETWEAR COLLECTIONS CAROUSEL PREVIEW */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="text-center space-y-2">
                  <span className="text-xs font-mono tracking-[0.3em] text-gold-500 uppercase font-medium">Bestselling Collection Highlights</span>
                  <h2 className="text-3xl sm:text-4xl font-serif font-semibold">The Milano Selections</h2>
                  <div className="w-20 h-0.5 bg-red-deep mx-auto mt-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {menu.slice(0, 3).map((item) => (
                    <div 
                      key={item.id}
                      className="group bg-charcoal-dark border border-gold-500/10 hover:border-gold-500/30 rounded-xl overflow-hidden shadow-xl transition-all hover:translate-y-[-5px]"
                    >
                      <div className="h-56 relative overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute top-4 right-4 bg-charcoal-deep/90 px-3 py-1 rounded-full border border-gold-500/20 text-gold-400 text-xs font-mono font-bold">
                          {item.price} EUR
                        </div>
                      </div>
                      <div className="p-6 space-y-3">
                        <span className="text-[10px] uppercase tracking-widest font-mono text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <h3 className="font-serif font-bold text-lg text-white group-hover:text-gold-300 transition-colors">{item.name}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gold-500/10">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-red-deep" /> Prep: {item.preparationTime} min
                          </span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="bg-gold-500 hover:bg-gold-400 text-charcoal-deep text-xs font-bold px-4 py-2 rounded transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> ADD TO CART
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VIEW ALL CTA */}
                <div className="text-center pt-4">
                  <button 
                    onClick={() => setActiveTab("menu")}
                    className="inline-flex items-center gap-2 border border-gold-500/40 text-gold-300 hover:text-white hover:border-gold-400 px-6 py-3 rounded-lg font-medium tracking-wide text-sm transition-all cursor-pointer bg-charcoal-dark hover:bg-charcoal-light"
                  >
                    <span>EXPLORE THE HIGH-END CATALOG</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MAP & LOCATION SEGMENT */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-charcoal-dark/50 border border-gold-500/10 rounded-2xl p-8 items-center">
                  <div className="lg:col-span-6 space-y-5">
                    <span className="text-xs font-mono tracking-[0.3em] text-gold-400 uppercase block font-semibold">Flagship Store</span>
                    <h2 className="text-3xl font-sans text-white font-black uppercase tracking-tight">Visit our Concept Store</h2>
                    <p className="text-neutral-300 text-sm leading-relaxed font-light">
                      Our flagship concept store at Galleria del Corso features minimalist industrial architectural styles, lounge fitting rooms, and rare streetwear drops. Parking is readily available directly within the mall garage in Brera, Milano.
                    </p>
                    
                    <div className="space-y-3 font-sans text-sm pt-4 border-t border-white/10">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-neutral-100 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">Velora Street Flagship Store</strong>
                          <span className="text-neutral-400 text-xs">Via del Corso 12, Galleria del Corso, Brera, Milano, Italy</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-neutral-100 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">Hotline Styling Booking & Support</strong>
                          <span className="text-neutral-400 text-xs">+39 02 8765 4321</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => setActiveTab("contact")}
                        className="bg-gold-500/10 border border-gold-500 hover:bg-gold-500 hover:text-charcoal-deep text-gold-300 hover:text-charcoal-deep px-6 py-3 rounded text-xs font-bold tracking-wider transition-all duration-200 uppercase cursor-pointer"
                      >
                        VIEW FULL CONTACT INFO & MAPS
                      </button>
                    </div>
                  </div>

                  {/* Simulated Google Map */}
                  <div className="lg:col-span-6 h-72 rounded-xl relative overflow-hidden border border-gold-500/25 shadow-xl bg-charcoal-deep">
                    {/* Simulated Map Background Visuals */}
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#2d2d2d_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-bright animate-ping absolute" />
                      <div className="w-4 h-4 rounded-full bg-red-bright absolute flex items-center justify-center border-2 border-white">
                        <MapPin className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    {/* Maps HUD Details */}
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-charcoal-deep to-transparent z-10">
                      <div className="flex justify-between items-start">
                        <div className="bg-charcoal-deep/90 px-3 py-1.5 rounded-md border border-white/10 text-xs">
                          <strong className="block text-white">Galleria del Corso</strong>
                          <span className="text-[10px] text-gray-400 block">Milano, Italy</span>
                        </div>
                        <span className="text-[10px] font-bold text-green-400 bg-charcoal-deep/90 border border-green-500/30 px-2 py-1 rounded">
                          OPEN: 10:00 - 22:00
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-mono">*Simulated GPS Live Grounding</span>
                        <a 
                          href="https://google.com/maps" 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="bg-red-deep text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-bright transition-colors"
                        >
                          OPEN DIRECT MAPS
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ==================== 2. MENU VIEW ==================== */}
          {activeTab === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-mono tracking-[0.3em] text-neutral-400 uppercase font-bold">The Ultimate Streetwear Look</span>
                <h1 className="text-4xl font-sans font-black text-white uppercase tracking-tight">VELORA STREET PREMIUM CATALOG</h1>
                <div className="w-24 h-0.5 bg-gold-500 mx-auto" />
              </div>

              {/* SEARCH & FILTERS CONTROLS */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-charcoal-dark p-4 rounded-xl border border-gold-500/10 shadow-lg">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rolls, noodles, drinks..."
                    className="w-full pl-10 pr-4 py-2.5 bg-charcoal-deep border border-gold-500/20 focus:border-gold-500 focus:outline-none rounded-lg text-white text-sm"
                  />
                </div>
                
                {/* Responsive horizontal category selector */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-none justify-start">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider whitespace-nowrap border transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-gold-500 text-charcoal-deep border-gold-500"
                          : "bg-charcoal-deep text-gray-300 border-gold-500/20 hover:border-gold-500/40"
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* MENU CARDS GRID */}
              {filteredMenu.length === 0 ? (
                <div className="text-center py-20 bg-charcoal-dark/20 border border-dashed border-gold-500/20 rounded-xl space-y-4">
                  <Info className="w-12 h-12 text-gold-400 mx-auto" />
                  <p className="text-gray-400 font-sans">No culinary matches found in search. Alter filters & keywords.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {filteredMenu.map((item) => (
                    <div 
                      key={item.id}
                      className="group bg-charcoal-dark border border-gold-500/10 hover:border-gold-500/30 rounded-xl overflow-hidden shadow-xl transition-all hover:translate-y-[-4px]"
                    >
                      <div className="h-48 md:h-52 relative overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-4 right-4 bg-charcoal-deep/90 px-3 py-1 rounded-full border border-gold-500/20 text-gold-400 text-xs font-mono font-bold">
                          {item.price} EUR
                        </div>
                        {!item.availability && (
                          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-red-bright font-mono uppercase font-bold text-xs tracking-widest border border-red-bright px-3 py-1 rounded">
                              SOLD OUT TODAY
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] uppercase font-mono tracking-widest bg-gold-500/10 border border-gold-500/10 text-gold-500 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-red-deep" /> {item.preparationTime} Min
                          </span>
                        </div>
                        <h3 className="font-serif font-semibold text-lg text-white group-hover:text-gold-300 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed min-h-[36px]">
                          {item.description}
                        </p>
                        
                        <div className="pt-4 border-t border-gold-500/10 flex items-center justify-between">
                          <button
                            onClick={() => {
                              if (item.availability) {
                                setCustomizingItem(item);
                                setCustomizationNotes("");
                              }
                            }}
                            disabled={!item.availability}
                            className={`text-xs font-semibold tracking-wide border px-3- py-1.5 px-3 rounded text-gold-400 border-gold-500/30 hover:bg-gold-500/10 hover:border-gold-500 transition-all ${
                              !item.availability ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            CUSTOMIZE ROLL
                          </button>
                          
                          <button
                            onClick={() => {
                              if (item.availability) {
                                handleAddToCart(item);
                              }
                            }}
                            disabled={!item.availability}
                            className={`bg-gold-500 disabled:opacity-50 hover:bg-gold-400 text-charcoal-deep font-bold text-xs px-4 py-2 rounded flex items-center gap-1 transition-all ${
                              item.availability ? "cursor-pointer" : "cursor-not-allowed"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" /> ADD TO BAG
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== 3. ONLINE ORDER / BASKET VIEW ==================== */}
          {activeTab === "order" && (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
            >
              <div className="space-y-8">
                {/* Placed Order Tracker (Sync Interface) */}
                {placedOrder ? (
                  <div className="max-w-2xl mx-auto bg-charcoal-dark border border-gold-500/20 rounded-2xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-red-deep" />
                    
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mx-auto text-gold-400 animate-pulse">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase">Interactive Order Tracking</span>
                      <h2 className="text-2xl font-serif text-white uppercase font-bold">ORDER DISPATCHED (# {placedOrder.orderNumber})</h2>
                      <p className="text-xs text-gray-400">Placed under name: <strong>{placedOrder.customerName}</strong></p>
                    </div>

                    {/* Stage Trackers */}
                    <div className="space-y-4 pt-4">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gold-300">STAGE STATUS: <b className="text-white uppercase">{simulatedStatus}</b></span>
                        <span className="text-gray-400">Total: {placedOrder.totalAmount} EUR</span>
                      </div>
                      {/* Range progress line */}
                      <div className="h-2 w-full bg-charcoal-deep rounded-full relative overflow-hidden">
                        <div 
                          className="absolute h-full bg-gradient-to-r from-red-deep to-gold-500 transition-all duration-1000"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 text-[9px] font-mono text-center text-gray-500">
                        <span className={simulatedStatus === "Pending" ? "text-gold-400 font-bold" : "text-gray-400"}>PENDING</span>
                        <span className={simulatedStatus === "Confirmed" ? "text-gold-400 font-bold" : "text-gray-400"}>CONFIRMED</span>
                        <span className={simulatedStatus === "Preparing" ? "text-gold-400 font-bold" : "text-gray-400"}>COOKING</span>
                        <span className={(simulatedStatus === "Out for Delivery" || simulatedStatus === "Ready") ? "text-gold-400 font-bold" : "text-gray-400"}>DISPATCHED</span>
                      </div>
                    </div>

                    <div className="p-4 bg-charcoal-deep rounded-lg border border-gold-500/15 space-y-3">
                      <h3 className="font-semibold text-xs text-gold-400 uppercase tracking-wider font-mono">Items In Preparation Queue</h3>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {placedOrder.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-gray-300">
                              {it.quantity}x {it.menuItem.name}
                              {it.customizationNotes && <span className="block text-[10px] text-gold-400/80 italic font-sans">({it.customizationNotes})</span>}
                            </span>
                            <span className="text-white font-mono">{it.menuItem.price * it.quantity} EUR</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-center pt-4 space-y-3">
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        We have simulated an SMS update trigger to your mobile <b>{placedOrder.phone}</b>. Keep this tab open to monitor further status steps in real-time or switch to our admin board to mock direct chef cook processes!
                      </p>
                      <button 
                        onClick={() => setPlacedOrder(null)}
                        className="bg-gold-500 text-charcoal-deep font-bold text-xs px-6 py-3 rounded tracking-wider uppercase inline-block hover:bg-gold-400 cursor-pointer"
                      >
                        ORDER ANOTHER ROLL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* LEFT BASKET LIST */}
                    <div className="lg:col-span-7 space-y-6">
                      <h2 className="text-2xl font-serif font-bold text-white border-b border-gold-500/10 pb-4">YOUR ORDER BAG</h2>
                      
                      {cart.length === 0 ? (
                        <div className="text-center py-20 bg-charcoal-dark/30 rounded-xl space-y-4 border border-dashed border-gold-500/20">
                          <ShoppingBag className="w-16 h-16 text-gold-500/40 mx-auto" />
                          <p className="text-gray-300 text-sm">Your dining basket is currently empty.</p>
                          <button
                            onClick={() => setActiveTab("menu")}
                            className="bg-gold-500 hover:bg-gold-400 text-charcoal-deep text-xs font-bold px-5 py-2.5 rounded tracking-wide cursor-pointer"
                          >
                            EXPLORE THE CATALOG
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                          {cart.map((item) => (
                            <div 
                              key={item.id}
                              className="bg-charcoal-dark border border-gold-500/10 p-4 rounded-xl flex gap-4 items-center justify-between"
                            >
                              <img 
                                src={item.menuItem.image} 
                                alt={item.menuItem.name} 
                                className="w-16 h-16 object-cover rounded-lg border border-gold-500/15"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm text-white truncate">{item.menuItem.name}</h3>
                                {item.customizationNotes && (
                                  <span className="text-[10px] text-gold-400 block truncate italic">Custom: {item.customizationNotes}</span>
                                )}
                                <span className="text-xs text-gray-400 font-mono italic">{item.menuItem.price} EUR</span>
                              </div>

                              <div className="flex items-center gap-2.5 bg-charcoal-deep border border-gold-500/20 rounded-md px-2 py-1">
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="text-gray-400 hover:text-white transition-colors p-1"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-sm font-semibold font-mono w-4 text-center text-white">{item.quantity}</span>
                                <button
                                  onClick={() => handleAddToCart(item.menuItem, item.customizationNotes)}
                                  className="text-gray-400 hover:text-white transition-colors p-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="text-right pl-2">
                                <span className="font-mono text-sm font-semibold text-gold-400 block min-w-[55px]">
                                  {item.menuItem.price * item.quantity} EUR
                                </span>
                              </div>
                            </div>
                          ))}

                          <div className="p-4 bg-charcoal-dark/50 rounded-xl border border-gold-500/10 space-y-2 text-sm font-mono text-gray-400 text-right">
                            <div>Subtotal: <span className="text-white text-base font-bold">{cartTotal} EUR</span></div>
                            <div className="text-[10px]">Estimated Taxes & Preparation Included (VAT 19%)</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT CHECKOUT FORM */}
                    <div className="lg:col-span-12 xl:col-span-5 bg-charcoal-dark rounded-2xl border border-gold-500/20 p-6 shadow-2xl space-y-6">
                      <h3 className="font-serif font-bold text-xl text-white border-b border-gold-500/10 pb-4">EXPRESS CHECKOUT</h3>

                      {/* Loyalty pre-population highlights banner */}
                      {loggedInUser ? (
                        <div className="p-3.5 bg-gold-500/10 border border-gold-500/25 rounded-xl space-y-2 text-left text-xs">
                          <div className="flex justify-between items-center text-gold-400 font-bold font-mono">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                              <ShieldCheck className="w-4 h-4 text-gold-400 animate-pulse" />
                              Loyalty Portal Linked
                            </span>
                            <span className="text-[10px]">#SK-{loggedInUser.id}</span>
                          </div>
                          <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                            Prefilled from cardholder <strong className="text-white">{loggedInUser.name}</strong>. Placing this gourmet order accumulates <strong className="text-gold-400 font-mono">+{Math.floor(cartTotal * 0.1)} MITIDJA POINTS</strong>! Current Balance: <strong className="text-gold-400 font-mono">{loggedInUser.loyaltyPoints} Points</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-red-deep/10 border border-red-500/20 rounded-xl space-y-2 text-left text-xs">
                          <div className="flex justify-between items-center text-red-400 font-bold font-mono uppercase text-[10px] tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <UserX className="w-4 h-4" />
                              Anonymous Guest Chef
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                            Placing this dinner ticket will forfeit <strong className="text-white font-mono">+{Math.floor(cartTotal * 0.1)} loyal points</strong>! Authenticate your account to track orders & claim future vouchers.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setAuthMode("login"); setIsShowingAuthModal(true); }}
                            className="text-[10px] text-gold-400 hover:text-white font-bold underline font-mono tracking-wider cursor-pointer block uppercase"
                          >
                            Sign In / Enroll Loyalty Port
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleCheckout} className="space-y-4">
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-xs text-gold-400 font-mono tracking-wide uppercase">Dine Option Selection</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: "delivery", label: "DELIVERY" },
                              { id: "takeaway", label: "TAKEAWAY" },
                              { id: "dinein", label: "DINE-IN" },
                              { id: "drivethrough", label: "DRIVE-THRU" }
                            ].map((opt) => (
                              <button
                                type="button"
                                key={opt.id}
                                onClick={() => setCheckoutForm({ ...checkoutForm, serviceType: opt.id as any })}
                                className={`py-2 px-1 text-[10px] font-bold tracking-wider rounded border text-center transition-all ${
                                  checkoutForm.serviceType === opt.id
                                    ? "bg-gold-500 text-charcoal-deep border-gold-500"
                                    : "bg-charcoal-deep text-white border-gold-500/15 hover:border-gold-500/30"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-gold-400 font-mono uppercase">Full Customer Name *</label>
                          <input
                            type="text"
                            required
                            value={checkoutForm.name}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                            placeholder="e.g. Marco Bellini"
                            className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded font-sans text-sm text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-gold-400 font-mono uppercase">Italian Mobile Phone *</label>
                            <input
                              type="tel"
                              required
                              value={checkoutForm.phone}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                              placeholder="+39 333 ..."
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded font-mono text-sm text-white"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs text-gold-400 font-mono uppercase">Email Address (Optional)</label>
                            <input
                              type="email"
                              value={checkoutForm.email}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                              placeholder="marco.bellini@gmail.com"
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded font-sans text-sm text-white"
                            />
                          </div>
                        </div>

                        {checkoutForm.serviceType === "delivery" && (
                          <div className="space-y-1">
                            <label className="text-xs text-gold-400 font-mono uppercase">Physical Delivery Address *</label>
                            <textarea
                              required
                              value={checkoutForm.address}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                              placeholder="Rue, Sector, landmarks in Milano City"
                              rows={2}
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded font-sans text-sm text-white resize-none"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs text-gold-400 font-mono uppercase">Special Instructions / Driver Notes</label>
                          <textarea
                            value={checkoutForm.notes}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                            placeholder="e.g. No wasabi, gate passcode, car color for drive-thru..."
                            rows={1}
                            className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded font-sans text-sm text-white resize-none"
                          />
                        </div>

                        <div className="pt-4 border-t border-gold-500/10 text-center">
                          <button
                            type="submit"
                            disabled={isOrdering || cart.length === 0}
                            className="w-full bg-gradient-to-r from-red-deep to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-lg tracking-wider uppercase transition-all shadow-xl hover:shadow-red-950 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>
                              {isOrdering ? "DISPATCHING ORDER..." : `PLACE ORDER (${cartTotal} EUR)`}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================== 4. RESERVATION VIEW ==================== */}
          {activeTab === "reservation" && (
            <motion.div
              key="reservation"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
            >
              <div className="bg-charcoal-dark border border-gold-500/20 rounded-2xl overflow-hidden shadow-2xl relative">
                
                {/* Traditional red highlight strip */}
                <div className="h-2 bg-gradient-to-r from-red-deep via-gold-500 to-red-deep" />
                
                {resSuccessData ? (
                  <div className="p-8 space-y-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto text-green-400">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gold-400">Reservation Confirmed In Sandbox</span>
                    <h2 className="text-2xl font-serif text-white uppercase font-bold">RESERVATION REGISTERED</h2>
                    <p className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
                      Ciao, <strong>{resSuccessData.customerName}</strong>! We have logged your request for <strong>{resSuccessData.guests} guests</strong> on <strong>{resSuccessData.date}</strong> at <strong>{resSuccessData.time}</strong>.
                    </p>
                    <div className="p-4 bg-charcoal-deep rounded-lg border border-gold-500/10 inline-block font-mono text-xs text-gold-400">
                      Ticket Reference Code: {resSuccessData.id} | Pending Operations Verification
                    </div>
                    <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
                      A simulated SMS reservation tracker alert has been logged to your telephone <b>{resSuccessData.phone}</b>. Switch your console dashboard to internal admin to review and assign tables manually!
                    </p>
                    <button
                      onClick={() => setResSuccessData(null)}
                      className="bg-gold-500 text-charcoal-deep font-bold text-xs px-6 py-3 rounded tracking-wider uppercase inline-block hover:bg-gold-400 mt-2 cursor-pointer"
                    >
                      BOOK AN OTHER HOUR
                    </button>
                  </div>
                ) : (
                  <div className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                      <span className="text-xs font-mono tracking-[0.3em] text-gold-400 uppercase font-bold">Private Fitting & Styling</span>
                      <h2 className="text-3xl font-sans font-black text-white uppercase tracking-tight">BOOK A VIP STYLING SUITE</h2>
                      <div className="w-20 h-0.5 bg-red-deep mx-auto" />
                      <p className="text-xs text-gray-400 font-sans max-w-md mx-auto">
                        Table booking requests are checked instantly by our operational supervisor. Please declare any allergen requirements in requests.
                      </p>
                    </div>

                    <form onSubmit={handleReserve} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs text-gold-400 font-mono uppercase">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={resForm.name}
                          onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                          placeholder="Marco Bellini"
                          className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-3 rounded font-sans text-sm text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gold-400 font-mono uppercase">Mobile Telephone *</label>
                        <input
                          type="tel"
                          required
                          value={resForm.phone}
                          onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                          placeholder="+39 333 ..."
                          className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-3 rounded font-mono text-sm text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gold-400 font-mono uppercase">Email Address (Optional)</label>
                        <input
                          type="email"
                          value={resForm.email}
                          onChange={(e) => setResForm({ ...resForm, email: e.target.value })}
                          placeholder="marco.bellini@gmail.com"
                          className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-3 rounded font-sans text-sm text-white"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1 col-span-1">
                          <label className="text-xs text-gold-400 font-mono uppercase">Guests *</label>
                          <select
                            value={resForm.guests}
                            onChange={(e) => setResForm({ ...resForm, guests: Number(e.target.value) })}
                            className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-3 rounded text-sm text-white font-mono"
                          >
                            {[1,2,3,4,5,6,8,10,12].map((g) => (
                              <option key={g} value={g}>{g} Ppl</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 col-span-1">
                          <label className="text-xs text-gold-400 font-mono uppercase">Date *</label>
                          <input
                            type="date"
                            required
                            value={resForm.date}
                            onChange={(e) => setResForm({ ...resForm, date: e.target.value })}
                            className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded text-sm text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1 col-span-1">
                          <label className="text-xs text-gold-400 font-mono uppercase">Hour *</label>
                          <input
                            type="time"
                            required
                            value={resForm.time}
                            onChange={(e) => setResForm({ ...resForm, time: e.target.value })}
                            className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded text-sm text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs text-gold-400 font-mono uppercase">Allergies / Special Requests</label>
                        <textarea
                          value={resForm.specialRequests}
                          onChange={(e) => setResForm({ ...resForm, specialRequests: e.target.value })}
                          placeholder="e.g. Seafood seafood allergy, stroller spacing, corner booth, window seat..."
                          rows={2}
                          className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-3 rounded font-sans text-sm text-white resize-none"
                        />
                      </div>

                      <div className="md:col-span-2 pt-4 text-center">
                        <button
                          type="submit"
                          disabled={isResmitting}
                          className="px-10 py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-charcoal-deep font-bold rounded-lg tracking-wider uppercase transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg hover:shadow-gold-500/10 shadow-black"
                        >
                          <span>{isResmitting ? "SENDING REQUEST..." : "SUBMIT CO-ORDINATION"}</span>
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================== 5. CATERING SERVICES VIEW ==================== */}
          {activeTab === "catering" && (
            <motion.div
              key="catering"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-mono tracking-[0.3em] text-gold-400 uppercase font-black">Corporate & VIP Collaborations</span>
                <h1 className="text-4xl font-sans font-black text-white uppercase tracking-tight">Fashion Partnerships & Events</h1>
                <div className="w-20 h-0.5 bg-neutral-100 mx-auto" />
                <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
                  Elevate your launch events, corporate campaigns, and social gatherings with Velora Street's live customization pop-ups, VIP private showrooms, and custom branded streetwear.
                </p>
              </div>

              {/* THREE CORE SECTOR DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-6 space-y-4">
                  <div className="w-12 h-12 bg-neutral-100/10 text-neutral-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-sans font-bold text-white">Live Customization Station</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Our master artisans deploy live in your venue to embroider, screen-print, and distress custom streetwear fits for your guests on-demand.
                  </p>
                </div>

                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-6 space-y-4">
                  <div className="w-12 h-12 bg-neutral-100/10 text-neutral-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-sans font-bold text-white">Private Styling Pop-up</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    A mobile minimalist showcase with gold metal clothes rails, high-end mirrors, and VIP styling consultants, bringing Milano' best fits to your private venue.
                  </p>
                </div>

                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-6 space-y-4">
                  <div className="w-12 h-12 bg-neutral-100/10 text-neutral-100 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-sans font-bold text-white">Corporate Capsule Merch</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Premium heavy-cotton corporate hoodies, caps, and tees custom crafted with your agency's tags, combining professional presence with street edge.
                  </p>
                </div>
              </div>

              {/* CTA event box */}
              <div className="bg-charcoal-dark/50 border border-gold-500/15 rounded-2xl p-8 max-w-3xl mx-auto text-center space-y-5">
                <h3 className="text-xl font-sans font-bold text-white">COLLABORATE WITH VELORA STREET</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Discuss bulk capsule sizing, on-site customization, and exclusive styling bookings. Let us curate a memorable premium fashion experience.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 text-xs font-mono">
                  <span className="bg-charcoal-deep px-4 py-2.5 rounded border border-gold-500/10 text-gold-300">
                    CALL: +39 02 8765 4321
                  </span>
                  <span className="bg-charcoal-deep px-4 py-2.5 rounded border border-gold-500/10 text-gold-300">
                    EMAIL: collabs@velorastreet.it
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 6. GALLERY VIEW ==================== */}
          {activeTab === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-mono tracking-[0.3em] text-neutral-400 block font-bold">Visual Lookbooks</span>
                <h1 className="text-4xl font-sans font-black text-white uppercase tracking-tight">VELORA STREET GALLERY</h1>
                <div className="w-20 h-0.5 bg-neutral-100 mx-auto" />
              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Milano Concept Session", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80" },
                  { title: "Bespoke Streetwear Fits", url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80" },
                  { title: "Heavyweight Cotton Hoodies", url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80" },
                  { title: "Aesthetic Minimalist Wear", url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80" },
                  { title: "El Brera Showroom", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80" },
                  { title: "Limited Grails Drops", url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80" }
                ].map((item, idx) => (
                  <div key={idx} className="group relative rounded-xl overflow-hidden border border-neutral-100/10 bg-neutral-900 h-64 shadow-lg">
                    <img 
                      src={item.url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                      <div>
                        <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">Velora Street Collection</span>
                        <strong className="text-sm text-white font-sans">{item.title}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================== 7. CUSTOMER REVIEWS VIEW ==================== */}
          {activeTab === "reviews" && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-mono tracking-[0.3em] text-gold-500 uppercase font-black">Gastronomical Testimonials</span>
                <h1 className="text-4xl font-serif font-bold text-white uppercase">Client Reflections</h1>
                <div className="w-20 h-0.5 bg-gold-400 mx-auto font-bold" />
                <p className="text-xs text-gray-400">Current overall rating: 4.8 out of 5 stars based on compiled verified dine-ins.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* REVIEWS GRID LIST */}
                <div className="lg:col-span-7 space-y-4">
                  {reviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="p-5 bg-charcoal-dark border border-gold-500/10 rounded-xl space-y-3 relative"
                    >
                      <div className="flex gap-4 items-center">
                        <img 
                          src={rev.avatar || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80"} 
                          alt={rev.name} 
                          className="w-10 h-10 rounded-full object-cover border border-gold-500/25"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-white ">{rev.name}</h4>
                          <span className="text-[10px] text-gray-500 font-mono block">{rev.date}</span>
                        </div>
                        {rev.verified && (
                          <span className="ml-auto text-[9px] font-mono text-green-400 bg-green-950/40 border border-green-900 px-2 py-0.5 rounded">
                            VERIFIED DINER
                          </span>
                        )}
                      </div>

                      <div className="flex text-gold-500 items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < Math.floor(rev.rating) ? "fill-current" : "opacity-35"}`} 
                          />
                        ))}
                        <span className="text-xs font-semibold text-gold-400/85 font-mono ml-2">({rev.rating})</span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{rev.comment}</p>
                    </div>
                  ))}
                </div>

                {/* ADD TESTIMONIAL FORM */}
                <div className="lg:col-span-5 bg-charcoal-dark border border-gold-500/15 rounded-2xl p-6 shadow-xl height-fit space-y-6">
                  <h3 className="font-serif font-bold text-lg text-white border-b border-gold-500/10 pb-3">SHARE YOUR REFLECTION</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gold-400 font-mono uppercase">Your Elegant Name *</label>
                      <input
                        type="text"
                        required
                        value={reviewForm.name}
                        onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                        placeholder="Marco Bellini"
                        className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded text-sm text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gold-400 font-mono uppercase block">Dine Rating Scale (1-5 Stars) *</label>
                      <div className="flex gap-2.5 pt-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="text-gold-500 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star 
                              className={`w-7 h-7 ${star <= reviewForm.rating ? "fill-current" : "opacity-25"}`} 
                            />
                          </button>
                        ))}
                        <span className="font-mono text-xs font-black text-white bg-charcoal-deep px-2 py-1 rounded ml-2 flex items-center">
                          {reviewForm.rating} / 5
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gold-400 font-mono uppercase">Detailed Feedback Comment *</label>
                      <textarea
                        required
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Share your opinions on ingredients, tastes, service or atmosphere..."
                        rows={3}
                        className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded text-sm text-white resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isReviewing}
                      className="w-full py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-charcoal-deep font-bold text-xs uppercase rounded tracking-wider transition-all cursor-pointer"
                    >
                      {isReviewing ? "REGISTERING CRITIQUE..." : "PUBLISH TESTIMONIAL"}
                    </button>
                  </form>
                </div>

              </div>
            </motion.div>
          )}

          {/* ==================== 9. MY ACCOUNT / LOYALTY & TRACKER VIEW ==================== */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 text-left"
            >
              {!loggedInUser ? (
                <div className="bg-charcoal-dark border border-gold-500/10 p-12 rounded-2xl text-center space-y-4 max-w-md mx-auto">
                  <User className="w-16 h-16 text-gold-500 mx-auto opacity-40" />
                  <h3 className="text-xl font-sans font-bold text-white uppercase">Authentication Required</h3>
                  <p className="text-xs text-gray-400">
                    Sign in to your Velora Street Loyalty Account to track active dispatches, view past orders, and redeem discount vouchers.
                  </p>
                  <button
                    onClick={() => { setAuthMode("login"); setIsShowingAuthModal(true); }}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-charcoal-deep font-bold py-3 px-6 rounded text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    SIGN IN NOW
                  </button>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* Dashboard Header Banner */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-charcoal-dark/40 border border-gold-500/10 p-6 rounded-2xl">
                    <div className="space-y-1">
                      <span className="text-xs font-mono tracking-widest text-neutral-400 uppercase block font-semibold">
                        VELORA STREET VIP CLUB
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-sans font-black text-white uppercase tracking-tight">
                        Apparel Dashboard Center
                      </h1>
                      <p className="text-xs text-gray-400">
                        Welcome back, <strong className="text-white">{loggedInUser.name}</strong>. Registered under {loggedInUser.phone}.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setProfileForm({
                            name: loggedInUser.name,
                            phone: loggedInUser.phone,
                            email: loggedInUser.email,
                            address: loggedInUser.address || "",
                            password: loggedInUser.password || "123"
                          });
                          setIsEditingProfile(!isEditingProfile);
                        }}
                        className="px-4 py-2 rounded-lg bg-charcoal-deep border border-gold-500/20 hover:border-gold-500/50 text-gold-300 text-xs font-mono transition-all flex items-center gap-1.5"
                      >
                        <Edit3 className="w-4 h-4" />
                        {isEditingProfile ? "CLOSE EDITOR" : "EDIT PROFILE"}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-lg bg-red-deep/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-mono transition-all uppercase"
                      >
                        SIGN OUT
                      </button>
                    </div>
                  </div>

                  {/* Profile Editing Overlay Form */}
                  <AnimatePresence>
                    {isEditingProfile && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-charcoal-dark/95 border border-gold-500/25 p-6 rounded-2xl overflow-hidden shadow-2xl"
                      >
                        <h3 className="font-serif text-lg text-white font-black border-b border-gold-500/10 pb-2 mb-4 uppercase">
                          Modify Security & Contact Profile
                        </h3>
                        <form onSubmit={handleProfileUpdateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gold-400 block uppercase">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2.5 rounded text-sm text-white outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gold-400 block uppercase">Phone Number *</label>
                            <input
                              type="text"
                              required
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2.5 rounded text-sm text-white outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gold-400 block uppercase">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={profileForm.email}
                              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2.5 rounded text-sm text-white outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gold-400 block uppercase">Default Delivery Address</label>
                            <input
                              type="text"
                              value={profileForm.address}
                              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                              placeholder="El Brera or specific Milano coordinates"
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2.5 rounded text-sm text-white outline-none"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-mono text-gold-400 block uppercase">Account Password *</label>
                            <input
                              type="password"
                              required
                              value={profileForm.password}
                              onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2.5 rounded text-sm text-white outline-none"
                            />
                          </div>
                          
                          <div className="md:col-span-2 pt-2 flex gap-3">
                            <button
                              type="submit"
                              disabled={profileSaving}
                              className="flex-1 bg-gold-500 hover:bg-gold-400 text-charcoal-deep font-bold py-2.5 rounded font-mono text-xs uppercase transition-all"
                            >
                              {profileSaving ? "SAVING..." : "COMMIT CHANGES"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingProfile(false)}
                              className="px-6 py-2.5 bg-charcoal-light border border-gold-500/20 hover:border-gold-500/50 text-gold-300 rounded font-mono text-xs uppercase transition-all"
                            >
                              CANCEL
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dynamic Interactive Layout Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT SIDEBOARD: Loyalty cards & Reward Redemption */}
                    <div className="lg:col-span-5 space-y-8">
                      
                      {/* Premium Digital Loyalty Card */}
                      <div className="relative h-56 rounded-2xl bg-gradient-to-br from-charcoal-light via-charcoal-dark to-black p-6 border-2 border-gold-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                        
                        {/* Metallic gloss layer */}
                        <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                        {/* Traditional Seal Accent */}
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full border border-gold-500/10 flex items-center justify-center pointer-events-none">
                          <div className="w-24 h-24 rounded-full border border-gold-500/5 flex items-center justify-center font-serif text-[45px] text-gold-500/10 font-black">
                            家
                          </div>
                        </div>

                        {/* Top alignment */}
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <span className="text-[9px] font-mono tracking-[0.3em] text-gold-500 block uppercase font-bold">
                              Mitidja Club Card
                            </span>
                            <span className="text-sm font-serif font-black tracking-widest text-white mt-1 block uppercase">
                              VELORA<span className="text-gold-500">STREET</span> VIP
                            </span>
                          </div>
                          
                          {/* Segment Badge */}
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${
                            loggedInUser.segment === "VIP" 
                              ? "bg-red-deep text-white border-red-500 animate-pulse" 
                              : loggedInUser.segment === "Regular"
                              ? "bg-gold-500 text-charcoal-deep border-gold-500"
                              : "bg-charcoal-deep text-gray-400 border-gold-500/20"
                          }`}>
                            {loggedInUser.segment} Member
                          </span>
                        </div>

                        {/* Center Point counter */}
                        <div className="my-auto z-10">
                          <span className="text-gray-400 text-[10px] uppercase tracking-widest block font-mono">
                            Dine Accumulation Balance
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-4xl font-mono font-black text-gold-400 tracking-tight">
                              {loggedInUser.loyaltyPoints}
                            </span>
                            <span className="text-xs text-gold-500 font-mono">MITIDJA POINTS</span>
                          </div>
                        </div>

                        {/* Bottom alignment */}
                        <div className="flex justify-between items-end border-t border-gold-500/10 pt-4 z-10">
                          <div>
                            <span className="text-[9px] text-gray-500 font-mono uppercase block">CARDHOLDER NAME</span>
                            <span className="text-xs text-white font-serif tracking-widest block uppercase font-bold">
                              {loggedInUser.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 font-mono uppercase block">VEL REF</span>
                            <span className="text-xs text-stone-300 font-mono block">
                              #HW-{loggedInUser.id || "GUEST"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tier Progress Bar widget */}
                      <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-xl space-y-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Dine Volume:</span>
                          <strong className="text-white font-mono">{loggedInUser.totalOrders} Completed Orders</strong>
                        </div>
                        
                        {/* Process bar calculation */}
                        {loggedInUser.segment === "VIP" ? (
                          <div className="space-y-1.5">
                            <div className="w-full bg-charcoal-deep h-2 rounded-full overflow-hidden border border-gold-500/10">
                              <div className="bg-gradient-to-r from-red-600 to-gold-500 h-full w-full" />
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono block">
                              👑 VIP PRIVILEGE COMPLETED! You enjoy free express delivery & exclusive redemptions on all Velora Street orders.
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Calculation for next tier */}
                            {(() => {
                              const targetOrders = loggedInUser.segment === "Regular" ? 15 : 3;
                              const currentPercent = Math.min(100, Math.floor((loggedInUser.totalOrders / targetOrders) * 100));
                              const nextTierName = loggedInUser.segment === "Regular" ? "VIP STATUS" : "REGULAR STATUS";
                              return (
                                <>
                                  <div className="flex justify-between text-[11px] font-mono">
                                    <span className="text-gold-400">Current Tier Progress</span>
                                    <span>{currentPercent}% towards {nextTierName}</span>
                                  </div>
                                  <div className="w-full bg-charcoal-deep h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-gold-500 h-full transition-all duration-500" 
                                      style={{ width: `${currentPercent}%` }} 
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 leading-relaxed block font-sans">
                                    Need {targetOrders - loggedInUser.totalOrders} more orders to secure {nextTierName}. Keep ordering to claim bigger cash benefits!
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                        <div className="border-t border-gold-500/10 pt-3 flex justify-between text-[11px] text-gray-400 font-mono">
                          <span>Total Gastronomy Spending:</span>
                          <span className="text-gold-400 font-bold">{loggedInUser.totalSpending || 0} EUR</span>
                        </div>
                      </div>

                      {/* Reward Voucher store */}
                      <div className="bg-charcoal-dark border border-gold-500/15 p-5 rounded-2xl space-y-4">
                        <div className="border-b border-gold-500/10 pb-2">
                          <h4 className="text-sm font-sans font-bold text-white uppercase flex items-center gap-1.5">
                            <Gift className="w-4 h-4 text-neutral-200" />
                            REDEEM REWARD VOUCHERS
                          </h4>
                          <span className="text-[10px] text-gray-400 font-sans block">
                            Deduct points from your balance to claim exclusive apparel vouchers!
                          </span>
                        </div>

                        <div className="space-y-3">
                          {[
                            { id: "free_beanie", name: "Free Velora Winter Ribbed Beanie", pointsValue: 50, valueText: "Worth 1,500 EUR" },
                            { id: "free_socks", name: "Free Premium Tube Socks (3-pack)", pointsValue: 100, valueText: "Worth 2,200 EUR" },
                            { id: "free_tee", name: "Free Velora Signature Logo Tee", pointsValue: 180, valueText: "Worth 3,800 EUR" },
                            { id: "free_hoodie", name: "Free Premium Oversized Hoodie (Any)", pointsValue: 350, valueText: "Worth 6,500 EUR" }
                          ].map((coupon) => {
                            const canClaim = loggedInUser.loyaltyPoints >= coupon.pointsValue;
                            return (
                              <div
                                key={coupon.id}
                                className={`p-3 bg-charcoal-deep border rounded-xl flex items-center justify-between gap-3 ${
                                  canClaim ? "border-gold-500/20" : "border-white/5 opacity-55"
                                }`}
                              >
                                <div>
                                  <span className="text-xs text-white block font-bold font-sans">
                                    {coupon.name}
                                  </span>
                                  <div className="flex gap-2 text-[10px] font-mono mt-0.5">
                                    <span className="text-gold-500 font-bold">{coupon.pointsValue} Points</span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-400">{coupon.valueText}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={!canClaim}
                                  onClick={async () => {
                                    if (!canClaim) return;
                                    const nextPoints = loggedInUser.loyaltyPoints - coupon.pointsValue;
                                    try {
                                      const updated = await customerUpdateProfile({
                                        id: loggedInUser.id,
                                        loyaltyPoints: nextPoints
                                      });
                                      setLoggedInUser(updated);
                                      localStorage.setItem("velorastreet_customer", JSON.stringify(updated));
                                      onAddToast(
                                        "success",
                                        "Reward Redeemed!",
                                        `Claim code VEL-${coupon.pointsValue} at checkout to secure your ${coupon.name}! Voucher saved in your account.`,
                                        "sms"
                                      );
                                      setHistoryTrigger(p => p + 1);
                                    } catch (err) {
                                      onAddToast("warning", "Error", "Failed to register coupon deduction in backend.");
                                    }
                                  }}
                                  className={`px-3.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all whitespace-nowrap ${
                                    canClaim
                                      ? "bg-gold-500 text-charcoal-deep hover:bg-gold-400 cursor-pointer"
                                      : "bg-charcoal-light text-gray-500 border border-white/5"
                                  }`}
                                >
                                  REDEEM
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* RIGHT SIDEBOARD: Live Tracker & Chronological History */}
                    <div className="lg:col-span-7 space-y-8">
                      
                      {/* REAL-TIME TRACKER CARD */}
                      <div className="bg-charcoal-dark border border-gold-500/20 p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
                        
                        {/* Title block */}
                        <div className="flex justify-between items-center border-b border-gold-500/10 pb-3">
                          <div>
                            <span className="text-xs font-mono tracking-widest text-red-500 block uppercase font-bold">
                              REAL-TIME ORDER STATUS
                            </span>
                            <h3 className="font-serif text-lg font-bold text-white uppercase mt-0.5">
                              {selectedTrackOrder ? `ORDER #${selectedTrackOrder.orderNumber}` : "TRACK CUSTOMER ORDERS"}
                            </h3>
                          </div>
                          
                          <button
                            onClick={() => setHistoryTrigger(p => p + 1)}
                            className="p-1.5 rounded-full bg-charcoal-deep border border-gold-500/10 hover:border-gold-500/40 text-gold-400 hover:text-white transition-colors flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold px-3 py-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Synchronize Status
                          </button>
                        </div>

                        {selectedTrackOrder ? (
                          <div className="space-y-6 text-left">
                            
                            {/* Summary Metadata */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-charcoal-deep/80 p-3.5 rounded-xl border border-gold-500/5 font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-gray-500 block">SUBMITTED ON</span>
                                <strong className="text-gray-300 block mt-0.5">
                                  {new Date(selectedTrackOrder.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(selectedTrackOrder.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 block">SERVICE TYPE</span>
                                <strong className="text-gold-400 block mt-0.5 uppercase">
                                  {selectedTrackOrder.serviceType}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 block">TOTAL PAID</span>
                                <strong className="text-white block mt-0.5">
                                  {selectedTrackOrder.totalAmount} EUR
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 block">STATE LEVEL</span>
                                <span className="inline-block mt-0.5 bg-red-deep text-white px-2 py-0.5 rounded text-[10px] font-bold">
                                  {selectedTrackOrder.status}
                                </span>
                              </div>
                            </div>

                            {/* TIMELINE TRACKER DESIGN */}
                            <div className="py-4 space-y-4">
                              <span className="text-[10px] uppercase tracking-wider font-mono text-gray-400 block">
                                Kitchen Checklist Roadmaps
                              </span>
                              
                              {/* Conceptual Steps bar */}
                              <div className="relative">
                                {/* Backline bar */}
                                <div className="absolute top-[16px] left-4 right-4 h-1 bg-charcoal-deep z-0" />
                                
                                {/* Highlight active progress bar */}
                                {(() => {
                                  const steps = ["Pending", "Confirmed", "Preparing", "Dispatch", "Out for Delivery", "Delivered"];
                                  const idx = steps.indexOf(selectedTrackOrder.status);
                                  // Ready maps into dispatch
                                  const activeIdx = selectedTrackOrder.status === "Ready" ? 3 : idx !== -1 ? idx : 0;
                                  const percent = Math.min(100, (activeIdx / 5) * 100);
                                  return (
                                    <div 
                                      className="absolute top-[16px] left-4 h-1 bg-gold-500 z-0 transition-all duration-700" 
                                      style={{ width: `calc(${percent}% - 16px)` }}
                                    />
                                  );
                                })()}

                                {/* Timeline Checkpoints */}
                                <div className="relative z-10 flex justify-between">
                                  {[
                                    { label: "Pending", matches: ["Pending"] },
                                    { label: "Confirmed", matches: ["Confirmed"] },
                                    { label: "Preparing", matches: ["Preparing"] },
                                    { label: "Ready", matches: ["Ready", "Dispatch"] },
                                    { label: "On Road", matches: ["Out for Delivery"] },
                                    { label: "Delivered", matches: ["Delivered"] }
                                  ].map((step, sIdx) => {
                                    const activeSteps = ["Pending", "Confirmed", "Preparing", "Ready", "Dispatch", "Out for Delivery", "Delivered"];
                                    const curIdx = activeSteps.indexOf(selectedTrackOrder.status);
                                    const stepIndexInTrack = activeSteps.findIndex(x => step.matches.includes(x));
                                    
                                    const isCompleted = curIdx >= stepIndexInTrack;
                                    const isCurrent = step.matches.includes(selectedTrackOrder.status);

                                    return (
                                      <div key={sIdx} className="flex flex-col items-center text-center space-y-2">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                          isCompleted
                                            ? "bg-gold-500 border-gold-400 text-charcoal-deep font-bold"
                                            : "bg-charcoal-deep border-gold-500/20 text-gray-500"
                                        } ${isCurrent ? "ring-4 ring-gold-500/20 shadow-glow-gold text-white font-black" : ""}`}>
                                          <span className="text-xs font-mono">{sIdx + 1}</span>
                                        </div>
                                        <span className={`text-[10px] font-mono block ${
                                          isCurrent ? "text-gold-400 font-bold" : isCompleted ? "text-gray-300" : "text-gray-500"
                                        }`}>
                                          {step.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Additional Delivery / Map Address Info */}
                            <div className="p-4 bg-charcoal-deep/50 rounded-xl space-y-3 font-sans text-xs text-gray-300">
                              <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-gray-400 font-mono">Gourmet Delivery Location:</span>
                                <strong>{selectedTrackOrder.deliveryAddress || "Dine-in / Drive-through pickup at Boulevard des 20 Mètres"}</strong>
                              </div>
                              {selectedTrackOrder.notes && (
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                  <span className="text-gray-400 font-mono">Roll Customized Notes:</span>
                                  <span className="text-gold-300 italic">"{selectedTrackOrder.notes}"</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-mono">Items In Cargo:</span>
                                <strong>
                                  {selectedTrackOrder.items.map(it => `${it.quantity}x ${it.menuItem.name}`).join(", ")}
                                </strong>
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="py-12 text-center text-gray-400 space-y-2">
                            <Clock className="w-12 h-12 text-gold-500/20 mx-auto" />
                            <p className="text-xs">No active order selected for real-time tracking.</p>
                            <p className="text-[11px] text-gray-500">
                              Choose a transaction from your historical logs below to trace its visual cooking roadmap!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* CHRONOLOGICAL HISTORICAL LOGS */}
                      <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-2xl space-y-4">
                        <div className="border-b border-gold-500/10 pb-2">
                          <h4 className="text-sm font-serif font-bold text-white uppercase flex items-center gap-1.5">
                            <History className="w-4 h-4 text-gold-500" />
                            CHRONOLOGICAL PAST ORDERS ({myOrders.length})
                          </h4>
                          <span className="text-[10px] text-gray-400 font-sans block">
                            When you check out or sign in, your Velora Street order dispatches will appear here synchronized instantly with Milano.
                          </span>
                        </div>

                        {myOrdersLoading ? (
                          <div className="py-8 text-center text-xs text-gold-400 font-mono uppercase tracking-widest animate-pulse">
                            Synchronizing Past Roll Transactions...
                          </div>
                        ) : myOrders.length === 0 ? (
                          <div className="py-8 text-center text-gray-500 space-y-2">
                            <ShoppingBag className="w-10 h-10 mx-auto opacity-15" />
                            <p className="text-xs">No completed orders bound to this loyalty account.</p>
                            <button
                              onClick={() => { setActiveTab("order"); }}
                              className="px-4 py-1.5 rounded-lg border border-gold-500 text-gold-400 text-[10px] hover:bg-gold-500 hover:text-charcoal-deep transition-all mt-2 cursor-pointer font-bold"
                            >
                              START ORDERING
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                            {myOrders.map((ord) => {
                              const isSelected = selectedTrackOrder?.id === ord.id;
                              return (
                                <button
                                  key={ord.id}
                                  onClick={() => setSelectedTrackOrder(ord)}
                                  className={`w-full p-4 rounded-xl border transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer ${
                                    isSelected 
                                      ? "bg-gold-500/10 border-gold-500/50" 
                                      : "bg-charcoal-deep border-gold-500/10 hover:border-gold-500/35"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <strong className="text-sm text-white font-mono uppercase">
                                        #{ord.id} ({ord.orderNumber})
                                      </strong>
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        | {new Date(ord.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(ord.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-300 font-sans mt-1.5">
                                      {ord.items.map(it => `${it.quantity} x ${it.menuItem.name}`).join(", ")}
                                    </div>
                                  </div>

                                  <div className="flex md:flex-col items-start md:items-end justify-between md:justify-center gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-white/5">
                                    <span className="text-xs font-mono font-bold text-gold-400">
                                      {ord.totalAmount} EUR
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-bold uppercase ${
                                      ord.status === "Delivered" 
                                        ? "bg-green-950/45 text-green-400 border border-green-900" 
                                        : "bg-red-deep text-white border border-red-500/50"
                                    }`}>
                                      {ord.status}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== 8. CONTACT VIEW ==================== */}
          {activeTab === "contact" && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12"
            >
              <div className="text-center space-y-2">
                <span className="text-xs font-mono tracking-[0.3em] text-gold-500 uppercase font-black">Grounding Details</span>
                <h1 className="text-4xl font-sans font-black text-white uppercase tracking-tight">CONNECT WITH VELORA STREET</h1>
                <div className="w-20 h-0.5 bg-gold-400 mx-auto" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* DATA SHEET */}
                <div className="lg:col-span-5 bg-charcoal-dark border border-gold-500/10 p-6 rounded-2xl shadow-xl space-y-6 text-left">
                  <h3 className="font-sans font-bold text-xl text-white">Velora Street Brera</h3>
                  <p className="text-neutral-400 text-xs leading-relaxed font-light">
                    Premium contemporary streetwear brand located in Galleria del Corso. Shop high-grade apparel hoodies, tracksuits, streetwear caps, accessories, and book styling sessions.
                  </p>

                  <div className="space-y-4">
                    <div className="flex gap-3 hover:translate-x-1 transition-transform">
                      <div className="w-10 h-10 rounded-lg bg-red-deep/10 text-red-bright flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-sm text-white block">Street Address</strong>
                        <span className="text-xs text-neutral-400 block font-light">Via del Corso 12, Galleria del Corso, Brera, Milano, Italy</span>
                      </div>
                    </div>

                    <div className="flex gap-3 hover:translate-x-1 transition-transform">
                      <div className="w-10 h-10 rounded-lg bg-gold-500/10 text-gold-500 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-sm text-white block">Italian Hotline</strong>
                        <span className="text-xs text-gray-400 block font-mono font-light">+39 02 8765 4321</span>
                      </div>
                    </div>

                    <div className="flex gap-3 hover:translate-x-1 transition-transform">
                      <div className="w-10 h-10 rounded-lg bg-gold-400/10 text-gold-400 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="text-sm text-white block">Business Hours</strong>
                        <span className="text-xs text-gray-400 block font-light">Monday - Sunday: 12:00 - 23:00</span>
                        <span className="text-xs text-gold-400 block font-light font-mono">Styling Suite Closes: 20:00</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gold-500/10 text-[11px] text-gray-400 leading-relaxed font-mono">
                    * For dynamic GPS grounding or maps routing, press the mapping directions action in the next framework card.
                  </div>
                </div>

                {/* SIMULATED BIG GOOGLE MAP */}
                <div className="lg:col-span-7 bg-charcoal-dark border border-gold-500/15 p-6 rounded-2xl shadow-xl space-y-4 relative">
                  <div className="h-96 rounded-xl border border-gold-500/25 relative overflow-hidden bg-charcoal-deep">
                    
                    {/* Simulated Map Visuals */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
                    
                    {/* Simplified geometric representations representing Boulevard des 20 Mètres */}
                    <svg className="absolute inset-0 w-full h-full text-gray-800" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0" y1="200" x2="800" y2="200" stroke="#cca05a" strokeWidth="4" strokeOpacity="0.4" />
                      <line x1="150" y1="0" x2="150" y2="400" stroke="#cca05a" strokeWidth="2" strokeOpacity="0.2" />
                      <line x1="450" y1="0" x2="450" y2="400" stroke="#cca05a" strokeWidth="2" strokeOpacity="0.2" />
                      <text x="200" y="190" fill="#aaaaaa" fontSize="10" fontFamily="monospace" letterSpacing="2">GALLERIA DEL CORSO</text>
                      <text x="160" y="80" fill="#666666" fontSize="8" fontFamily="sans-serif">BRERA DISTRICT</text>
                    </svg>

                    {/* Red Pin Anchor */}
                    <div className="absolute left-[55%] top-[50%] -translate-x-1/2 -translate-y-1/2 text-center z-10">
                      <div className="relative">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-bright animate-ping absolute top-0 left-0" />
                        <div className="w-5 h-5 rounded-full bg-red-bright border-2 border-white relative z-10 flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <span className="bg-charcoal-deep border-glow-gold border border-neutral-700 text-neutral-100 text-[10px] font-bold py-1 px-2 rounded mt-1.5 block shadow-lg">
                        VELORA STREET
                      </span>
                    </div>

                    {/* HUD Controls */}
                    <div className="absolute bottom-5 right-5 bg-charcoal-deep/90 border border-gold-500/20 rounded p-3 text-xs z-10 space-y-2">
                      <strong className="block text-white">Live Route Grounding</strong>
                      <span className="text-[10px] text-gray-400 block">GPS: 45.4719° N, 9.1880° E</span>
                      <a 
                        href="https://google.com/maps" 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="bg-gold-500 text-charcoal-deep px-3 py-1 bg-gradient-to-r from-gold-600 to-gold-500 font-bold hover:from-gold-500 text-center rounded block"
                      >
                        GET DIRECTIONS
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 font-sans">Galleria del Corso, Via del Corso 12, Milano, Italia</span>
                    <span className="font-mono text-neutral-100 font-bold">4.9 ★ Premium Streetwear</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* LUXURY CUSTOMIZATION MODAL */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-charcoal-dark border border-gold-500/25 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2x shadow-black overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-[4px] bg-gold-500" />
              
              <div className="space-y-2 text-left">
                <span className="text-[10px] uppercase font-mono tracking-widest text-gold-400">{customizingItem.category} Options</span>
                <h3 className="font-serif font-bold text-xl text-white">{customizingItem.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{customizingItem.description}</p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs text-gold-400 font-mono uppercase block">Enter Custom Requests (Optional)</label>
                <textarea
                  value={customizationNotes}
                  onChange={(e) => setCustomizationNotes(e.target.value)}
                  placeholder="e.g. Extra ginger, no sesame seeds, light teriyaki spice glaze, replace salmon with avocado..."
                  rows={3}
                  className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2.5 rounded text-xs text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="flex-1 py-2.5 text-xs font-mono font-bold uppercase rounded border border-gold-500/20 hover:border-gold-500/50 hover:bg-white/5 tracking-wider transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    handleAddToCart(customizingItem, customizationNotes);
                    setCustomizingItem(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-mono font-bold uppercase rounded bg-gold-400 hover:bg-gold-500 text-charcoal-deep tracking-wider transition-all cursor-pointer"
                >
                  SAVE & ADD
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECURE CUSTOMER AUTHENTICATION MODAL */}
      <AnimatePresence>
        {isShowingAuthModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-charcoal-dark border border-gold-500/25 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-left"
            >
              {/* Premium Top Line Accent */}
              <div className="absolute top-0 left-0 w-full h-[4px] bg-red-deep" />
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 font-bold block">
                    Velora Street VIP Club
                  </span>
                  <h3 className="font-serif font-black text-xl text-white uppercase mt-0.5">
                    {authMode === "login" ? "Customer Portal" : "Enroll Loyalty Card"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsShowingAuthModal(false);
                    setAuthError("");
                    setAuthForm({ name: "", phone: "", email: "", address: "", password: "" });
                  }}
                  className="p-1 rounded bg-charcoal-deep border border-white/5 hover:border-gold-500/25 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-charcoal-deep rounded-lg border border-gold-500/10 text-xs text-center font-mono">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`py-2 rounded font-bold uppercase transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-gold-500 text-charcoal-deep"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`py-2 rounded font-bold uppercase transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-gold-500 text-charcoal-deep"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Callout Display */}
              {authError && (
                <div className="p-3 bg-red-950/40 border border-red-900 rounded text-[11px] text-red-400 font-mono leading-relaxed flex items-start gap-2">
                  <span className="text-red-500 font-black">⚠</span>
                  <div>{authError}</div>
                </div>
              )}

              {/* Dynamic Inputs Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gold-400 block uppercase">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="e.g. Marco Bellini"
                      className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2 text-sm text-white outline-none rounded"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gold-400 block uppercase">
                    {authMode === "login" ? "Email Address or Phone *" : "Email Address *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    placeholder={authMode === "login" ? "e.g. 0550123456 or mehdi@email.com" : "e.g. mehdi@email.com"}
                    className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2 text-sm text-white outline-none rounded"
                  />
                </div>

                {authMode === "register" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gold-400 block uppercase">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={authForm.phone}
                      onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                      placeholder="e.g. 0550123456"
                      className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2 text-sm text-white outline-none rounded"
                    />
                  </div>
                )}

                {authMode === "register" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gold-400 block uppercase">Default Delivery Address</label>
                    <input
                      type="text"
                      value={authForm.address}
                      onChange={(e) => setAuthForm({ ...authForm, address: e.target.value })}
                      placeholder="Galleria del Corso, Milano"
                      className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2 text-sm text-white outline-none rounded"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gold-400 block uppercase">Account Password *</label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 p-2 text-sm text-white outline-none rounded"
                  />
                  {authMode === "login" && (
                    <span className="text-[9px] text-gray-500 block pt-1">
                      💡 Note: Pre-seeded test accounts use password <strong>123</strong>.
                    </span>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-gold-400 hover:bg-gold-500 disabled:opacity-45 text-charcoal-deep font-bold font-mono tracking-wider text-xs uppercase rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    {authLoading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-charcoal-deep border-t-transparent animate-spin" />
                    ) : null}
                    <span>{authMode === "login" ? "SECURE SIGN IN" : "SUMMON GUEST LOYALTY CARD"}</span>
                  </button>
                </div>
              </form>

              <div className="text-center text-[10px] text-gray-500 font-mono pt-1">
                {authMode === "login" ? (
                  <span>New to Velora Street streetwear privilege? <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className="text-gold-400 underline hover:text-white font-bold">Register Account</button></span>
                ) : (
                  <span>Already enrolled? <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className="text-gold-400 underline hover:text-white font-bold">Secure Login</button></span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* TRADITIONAL CHINESE/JAPANESE MINIMALIST FOOTER */}
      <footer className="bg-charcoal-deep border-t border-gold-500/10 py-8 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="text-xs font-sans font-black tracking-widest text-white block uppercase">VELORA STREET PREMIUM</span>
            <p className="text-[11px] text-neutral-400 mt-1 font-mono">© 2026 Velora Street Premium E-Commerce Group. Brera, Milano.</p>
          </div>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <button onClick={() => { setActiveTab("contact"); }} className="hover:text-gold-400 transition-colors">Contact</button>
            <span>•</span>
            <button 
              onClick={() => { 
                if (loggedInUser) {
                  setActiveTab("reservation"); 
                } else {
                  setAuthMode("login");
                  setIsShowingAuthModal(true);
                  onAddToast("info", "Reservation Required", "Please sign in or enroll your loyalty card first.");
                }
              }} 
              className="hover:text-gold-400 transition-colors font-bold"
            >
              Book Bench
            </button>
            <span>•</span>
            <span className="text-gold-500/80">SAHHA FTORKOM</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
