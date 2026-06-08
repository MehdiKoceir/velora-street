import React, { useState, useEffect } from "react";
import { 
  BarChart3, CookingPot, Calendar, Users2, Library, 
  Warehouse, Truck, Settings, RefreshCw, AlertCircle, 
  CheckCircle2, XCircle, Clock, MapPin, Search, PlusCircle,
  TrendingUp, HelpCircle, Send, Star, UserPlus, Check, MessageSquare, ShoppingBag
} from "lucide-react";
import { 
  MenuItem, Order, Reservation, Customer, 
  Ingredient, Driver, SystemNotification, OrderStatus, ReservationStatus
} from "../types";
import { 
  fetchOrders, updateOrder, fetchReservations, updateReservation,
  fetchCustomers, fetchInventory, updateInventoryItem, fetchDrivers,
  fetchNotifications, triggerCampaign, fetchAnalytics, createMenuItem, updateMenuItem, deleteMenuItem
} from "../api";

interface AdminPortalProps {
  onAddToast: (type: "success" | "warning" | "info" | "notify", title: string, message: string, channel?: "sms" | "whatsapp" | "email") => void;
  onRefreshData: () => void;
}

export default function AdminPortal({ onAddToast, onRefreshData }: AdminPortalProps) {
  const [adminTab, setAdminTab] = useState<"dashboard" | "orders" | "reservations" | "crm" | "menu" | "inventory" | "kitchen" | "delivery" | "analytics" | "settings">("dashboard");
  
  // Data States loaded from API
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  
  // UI helpers
  const [loading, setLoading] = useState(true);
  const [refresher, setRefresher] = useState(0);
  const isFirstLoad = React.useRef(true);

  // Active real-time synchronization interval for the Staff Dashboard
  useEffect(() => {
    const trackingPolling = setInterval(() => {
      setRefresher(prev => prev + 1);
    }, 4000); // refresh staff board every 4 seconds to catch new customer orders instantly!
    return () => clearInterval(trackingPolling);
  }, []);

  // Form states for adding news
  const [newIngredient, setNewIngredient] = useState({ id: "", stockLevel: 0 });
  
  // Menu form state
  const [newDish, setNewDish] = useState({
    name: "", description: "", price: 1200, category: "Hoodies" as any, preparationTime: 12, image: ""
  });
  const [isCreatingDish, setIsCreatingDish] = useState(false);

  // Marketing campaign state inside settings
  const [campaignData, setCampaignData] = useState({
    channel: "sms", message: "Ciao {name}, we missed you at Velora Street Galleria del Corso! Redeem 15% discount tonight on any of our graphic hoodies. You currently have {points} loyalty points! Code: VEL15.", segment: "All"
  });
  const [campaignSuccessCount, setCampaignSuccessCount] = useState<number | null>(null);

  // Load all operational feeds synchronously
  useEffect(() => {
    async function loadAllData() {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      try {
        const [ord, res, cust, inv, driv, notif, anal, menuData] = await Promise.all([
          fetchOrders(),
          fetchReservations(),
          fetchCustomers(),
          fetchInventory(),
          fetchDrivers(),
          fetchNotifications(),
          fetchAnalytics(),
          fetch(`${window.location.origin}/api/menu`).then(r => r.json()).catch(() => [])
        ]);

        setOrders(ord);
        setReservations(res);
        setCustomers(cust);
        setInventory(inv);
        setDrivers(driv);
        setNotifications(notif);
        setAnalytics(anal);
        setMenuList(menuData);
      } catch (err) {
        onAddToast("warning", "Synchronicity Fail", "Could not synchronize some real-time enterprise feeds.");
      } finally {
        if (isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    }

    loadAllData();
  }, [refresher]);

  // Handle Order Status Mutation
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, customDriverId?: string) => {
    try {
      const payload: Partial<Order> = { status };
      if (customDriverId) {
        payload.driverId = customDriverId;
      }
      await updateOrder(orderId, payload);
      onAddToast("success", "Operation Success", `Order Status updated securely to ${status}`);
      setRefresher(prev => prev + 1);
      onRefreshData();
    } catch (err) {
      onAddToast("warning", "Action Aborted", "Failed to update order status state.");
    }
  };

  // Handle Reservation status updates
  const handleUpdateResStatus = async (resId: string, status: ReservationStatus, tableNumber?: string) => {
    try {
      const payload: Partial<Reservation> = { status };
      if (tableNumber) payload.tableNumber = tableNumber;
      await updateReservation(resId, payload);
      onAddToast("success", "Reservation Mutated", `Reservation state shifted to ${status}`);
      setRefresher(prev => prev + 1);
      onRefreshData();
    } catch (err) {
      onAddToast("warning", "Failed Action", "Failed to confirm table booking.");
    }
  };

  // Replenish Inventory
  const handleRestockInventory = async (id: string, currentAmount: number) => {
    try {
      const replenishmentCount = currentAmount + 25; // Replenish safely in bulk
      const formattedDate = new Date().toISOString().split('T')[0];
      await updateInventoryItem(id, replenishmentCount, formattedDate);
      onAddToast("success", "Restocked Ingredient", `Successfully replenished ingredient stock quantity!`);
      setRefresher(prev => prev + 1);
    } catch (err) {
      onAddToast("warning", "Action Cancelled", "Could not restock ingredients.");
    }
  };

  // Create new menu dish
  const handleCreateDishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDish.name || !newDish.description) return;
    setIsCreatingDish(true);
    try {
      const imgPlaceholder = newDish.image || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80";
      await createMenuItem({
        ...newDish,
        image: imgPlaceholder,
        availability: true
      });
      onAddToast("success", "Recipe Added", `New menu item "${newDish.name}" has been registered!`);
      setNewDish({ name: "", description: "", price: 1250, category: "Hoodies", preparationTime: 12, image: "" });
      setRefresher(prev => prev + 1);
    } catch (err) {
      onAddToast("warning", "Error", "Failed to register recipe.");
    } finally {
      setIsCreatingDish(false);
    }
  };

  // Toggle dish availability
  const handleToggleDishAvailability = async (id: string, current: boolean) => {
    try {
      await updateMenuItem(id, { availability: !current });
      onAddToast("success", "Status Toggled", "Recipe availability shifted instantly!");
      setRefresher(prev => prev + 1);
    } catch (err) {
      onAddToast("warning", "Error", "Failed to toggle recipe state.");
    }
  };

  // Delete Menu Item
  const handleDeleteDish = async (id: string) => {
    try {
      await deleteMenuItem(id);
      onAddToast("success", "Recipe Deleted", "Recipe has been wiped from the list.");
      setRefresher(prev => prev + 1);
    } catch (err) {
      onAddToast("warning", "Error", "Could not execute wipe command.");
    }
  };

  // Run Campaign trigger
  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await triggerCampaign(campaignData);
      setCampaignSuccessCount(res.count);
      onAddToast("success", "Marketing Sent", `Marketing campaign has dispatched Simulated ${campaignData.channel.toUpperCase()} alerts to ${res.count} CRM clients!`, campaignData.channel as any);
      setRefresher(prev => prev + 1);
    } catch (err) {
      onAddToast("warning", "Error", "Failed to run campaign.");
    }
  };

  // Compute metrics in backup if analytics api is still cold
  const revenueTotalOverall = orders.filter(o => o.status !== "Cancelled").reduce((acc, o) => acc + o.totalAmount, 0);
  const pendingReservationsCount = reservations.filter(r => r.status === "Pending").length;
  const criticalStockCount = inventory.filter(i => i.status === "critical" || i.status === "low").length;

  return (
    <div className="flex flex-col min-h-screen bg-charcoal-deep text-white font-sans">
      
      {/* TOP META CONTROLS HUB */}
      <div className="bg-charcoal-dark/90 border-b border-gold-500/10 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-bright animate-ping" />
            <h1 className="text-sm font-semibold tracking-widest font-mono uppercase text-neutral-100">
              VELORA STREET OPERATIONS DASHBOARD <span className="text-neutral-500">| CONTROL CENTER</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>LIVE SYSTEM CONNECTED</span>
            </div>
            <button
              onClick={() => setRefresher(prev => prev + 1)}
              className="px-3 py-1.5 rounded bg-charcoal-deep border border-gold-500/20 hover:border-gold-500/50 hover:bg-gold-500/10 text-xs font-mono font-medium flex items-center gap-1.5 transition-all text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SYNC NOW</span>
            </button>
            <span className="text-xs text-gray-400 font-mono hidden md:inline">MITIDJA CLOUD VM: <span className="text-green-400 font-bold font-sans">99.8% LIVE</span></span>
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT NAV BAR RAIL */}
        <aside className="lg:col-span-3 xl:col-span-2 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-4 lg:pb-0 z-10 scrollbar-none">
          {[
            { id: "dashboard", label: "Stats Hub", Icon: BarChart3 },
            { id: "orders", label: "Live Orders", Icon: ShoppingBag },
            { id: "kitchen", label: "Kitchen Board", Icon: CookingPot },
            { id: "reservations", label: "Seating", Icon: Calendar },
            { id: "crm", label: "CRM Clients", Icon: Users2 },
            { id: "menu", label: "Recipes", Icon: Library },
            { id: "inventory", label: "Inventory", Icon: Warehouse },
            { id: "delivery", label: "Delivery", Icon: Truck },
            { id: "analytics", label: "Analytics", Icon: TrendingUp },
            { id: "settings", label: "Simulators", Icon: Settings }
          ].map((item) => {
            const IconComponent = item.Icon;
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap lg:w-full tracking-wider cursor-pointer ${
                  adminTab === item.id
                    ? "bg-gold-500 text-charcoal-deep shadow-lg font-black border border-gold-400"
                    : "text-gray-300 bg-charcoal-dark border border-gold-500/5 hover:bg-charcoal-light hover:text-white"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* MAIN BOARDPORT */}
        <section className="lg:col-span-9 xl:col-span-10 min-h-[500px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-3">
              <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-xs text-gold-400 animate-pulse">SYNCHRONIZING SECURE CLOUD ENDPOINTS...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ==================== A. DASHBOARD INSIGHTS ==================== */}
              {adminTab === "dashboard" && (
                <div className="space-y-6">
                  {/* KPI CARDS BAR */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-charcoal-dark border border-gold-500/10 p-4 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-gold-500 w-full" />
                      <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">DINE-IN REVENUES tonight</span>
                      <strong className="text-xl md:text-2xl font-black text-gold-400 block font-mono mt-1">
                        {analytics?.metrics?.revenueToday || 16200} EUR
                      </strong>
                      <span className="text-[9px] text-green-400 font-mono block mt-2">▲ 14.2% VS YESTERDAY</span>
                    </div>

                    <div className="bg-charcoal-dark border border-gold-500/10 p-4 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-red-deep w-full" />
                      <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">ORDER COUNT today</span>
                      <strong className="text-xl md:text-2xl font-black text-white block font-mono mt-1">
                        {orders.length}
                      </strong>
                      <span className="text-[9px] text-gold-400 font-mono block mt-2">{orders.filter(o => o.status === "Pending").length} WAITING CONFIRMATION</span>
                    </div>

                    <div className="bg-charcoal-dark border border-gold-500/10 p-4 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-gold-400 w-full" />
                      <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">BOOKED TABLES today</span>
                      <strong className="text-xl md:text-2xl font-black text-white block font-mono mt-1">
                        {reservations.filter(r => r.status === "Confirmed").length}
                      </strong>
                      <span className="text-[9px] text-red-bright font-mono block mt-2">{pendingReservationsCount} REQUESTS REMAINING</span>
                    </div>

                    <div className="bg-charcoal-dark border border-gold-500/10 p-4 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-rose-950 w-full" />
                      <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">LOW INVENTORY ITEMS</span>
                      <strong className={`text-xl md:text-2xl font-black block font-mono mt-1 ${criticalStockCount > 0 ? "text-red-bright animate-pulse" : "text-green-400"}`}>
                        {criticalStockCount}
                      </strong>
                      <span className="text-[9px] text-gray-400 font-mono block mt-2">DEDUCTED AUTOMATICALLY</span>
                    </div>
                  </div>

                  {/* ANNOUNCEMENT BOX FOR STOCK WARNINGS */}
                  {criticalStockCount > 0 && (
                    <div className="bg-red-deep/10 border-l-4 border-red-bright p-4 rounded-r-xl flex items-center justify-between">
                      <div className="flex gap-3 items-center">
                        <AlertCircle className="w-5 h-5 text-red-bright flex-shrink-0" />
                        <div>
                          <strong className="text-xs text-white uppercase tracking-wider block font-mono">Critical Low Stocks Alert</strong>
                          <span className="text-xs text-gray-300">Salmon or Sashimi Grade Bluefin Tuna resides below safe margins. Order replenishments!</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAdminTab("inventory")}
                        className="bg-red-bright text-white px-3 py-1.5 rounded text-[10px] font-bold tracking-wider hover:bg-red-600 transition-colors cursor-pointer uppercase"
                      >
                        REPLENISH RAW STOCKS
                      </button>
                    </div>
                  )}

                  {/* TWO GRAPH COLUMNS BRIEF */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* CRITICAL SEAT RESERVATION BOOKINGS PANEL */}
                    <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-xl shadow-lg space-y-4 text-left">
                      <h3 className="font-serif font-bold text-sm text-white uppercase tracking-wider border-b border-gold-500/10 pb-2">
                        SEATING SCHEDULER ACTIONS ({pendingReservationsCount})
                      </h3>
                      
                      {reservations.filter(r => r.status === "Pending").length === 0 ? (
                        <div className="py-12 text-center text-xs text-gray-500 font-sans">
                          No pending table reservation requests today. Good job!
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-72 overflow-y-auto">
                          {reservations.filter(r => r.status === "Pending").map((res) => (
                            <div key={res.id} className="p-3 bg-charcoal-deep rounded-lg border border-gold-500/10 flex hover:border-gold-500/20 justify-between items-center gap-4 text-xs font-sans">
                              <div>
                                <strong className="text-white block text-sm">{res.customerName}</strong>
                                <span className="text-gray-400 block">{res.guests} Guests | Date: {res.date} at {res.time}</span>
                                {res.specialRequests && <span className="text-[11px] text-gold-400 block max-w-sm truncate">Notes: "{res.specialRequests}"</span>}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateResStatus(res.id, "Confirmed", "T-" + Math.floor(1 + Math.random() * 12))}
                                  className="bg-green-600 hover:bg-green-500 text-white p-1 px-2.5 rounded text-[10px] font-bold tracking-wide uppercase cursor-pointer"
                                >
                                  CONFIRM
                                </button>
                                <button
                                  onClick={() => handleUpdateResStatus(res.id, "Cancelled")}
                                  className="bg-red-deep/30 hover:bg-red-deep text-red-bright hover:text-white p-1 px-2.5 rounded text-[10px] font-bold tracking-wide uppercase cursor-pointer"
                                >
                                  REJECT
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* LIVE ALERTS AND NOTIFICATION STREAM LOGGER */}
                    <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-xl shadow-lg space-y-4 text-left">
                      <h3 className="font-serif font-bold text-sm text-gold-400 uppercase tracking-wider border-b border-gold-500/10 pb-2">
                        SIMULATED MARKETING / TRANSACTION NOTIFICATIONS LOG
                      </h3>
                      
                      <div className="space-y-2.5 max-h-72 overflow-y-auto">
                        {notifications.slice(0, 5).map((notif) => (
                          <div key={notif.id} className="p-3 bg-charcoal-deep rounded-lg border border-white/5 space-y-1 text-[11px] font-mono leading-relaxed">
                            <div className="flex justify-between text-gray-500 text-[10px]">
                              <span>CH: <b className="text-gold-300 uppercase">{notif.type}</b></span>
                              <span>{notif.recipient}</span>
                            </div>
                            <strong className="block text-white text-[12px] font-sans">{notif.title}</strong>
                            <p className="text-gray-300 font-sans text-xs">{notif.message}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setAdminTab("settings")}
                          className="text-xs text-gold-400 hover:text-white underline font-mono cursor-pointer"
                        >
                          LAUNCH CAMPAIGN OR TRACE MORE LOGS
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}


              {/* ==================== B. LIVE ORDERS MANAGEMENT ==================== */}
              {adminTab === "orders" && (
                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 space-y-4 text-left shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold-500/10 pb-4">
                    <h2 className="text-xl font-serif font-bold text-white uppercase tracking-wider">LIVE TRANSACTIONS LIST ({orders.length})</h2>
                    <span className="text-xs text-gray-400 font-mono">ORDERS TRACKED SECURELY</span>
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-20 text-center text-gray-500 space-y-4">
                      <Clock className="w-12 h-12 text-gold-400 mx-auto" />
                      <p>No transactions registered yet. Back to customers view and place order.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-gold-500/10 text-gold-400 font-mono text-[10px] tracking-widest uppercase">
                            <th className="py-3 px-2">ID</th>
                            <th className="py-3 px-2">Customer</th>
                            <th className="py-3 px-2">Type</th>
                            <th className="py-3 px-2">Total Amount</th>
                            <th className="py-3 px-4">Current Order Status</th>
                            <th className="py-3 px-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 px-2 font-mono text-gold-400">#{ord.orderNumber}</td>
                              <td className="py-4 px-2 space-y-1">
                                <strong className="text-white block">{ord.customerName}</strong>
                                <span className="text-gray-400 block text-[10px]">{ord.phone}</span>
                              </td>
                              <td className="py-4 px-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                                  ord.serviceType === "delivery" ? "bg-red-deep/20 text-red-bright border border-red-deep/30" : "bg-gold-500/10 text-gold-400 border border-gold-500/25"
                                }`}>
                                  {ord.serviceType}
                                </span>
                              </td>
                              <td className="py-4 px-2 font-mono font-bold text-white">
                                {ord.totalAmount} EUR
                              </td>
                              <td className="py-4 px-4 font-mono">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                  ord.status === "Delivered" ? "bg-green-950 text-green-400 border border-green-900" :
                                  ord.status === "Preparing" ? "bg-yellow-950 text-yellow-400 border border-yellow-900" :
                                  ord.status === "Pending" ? "bg-blue-950 text-blue-400 border border-blue-900" : "bg-charcoal-deep text-gray-400"
                                }`}>
                                  {ord.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-4 px-2 text-right">
                                <select
                                  value={ord.status}
                                  onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                                  className="bg-charcoal-deep border border-gold-500/20 text-[10px] p-1.5 focus:outline-none focus:border-gold-500 text-white font-mono rounded"
                                >
                                  {["Pending", "Confirmed", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"].map((st) => (
                                    <option key={st} value={st}>{st.toUpperCase()}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}


              {/* ==================== C. KITCHEN DISPLAY SYSTEM (KDS) ==================== */}
              {adminTab === "kitchen" && (
                <div className="space-y-6 text-left">
                  <div className="flex justify-between items-center bg-charcoal-dark border border-gold-500/10 p-4 rounded-xl">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-white uppercase tracking-wider">KITCHEN PREPARATION QUEUE (KDS)</h2>
                      <p className="text-xs text-gray-400">Chef board with incoming ticket orders, preparation timers, and completion swipes.</p>
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-red-bright bg-red-deep/10 border border-red-bright px-3 py-1.5 rounded uppercase font-bold">
                      ACTIVE CHEF DISPLAY
                    </span>
                  </div>

                  {/* QUEUE GRID */}
                  {orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length === 0 ? (
                    <div className="py-24 text-center bg-charcoal-dark/20 border border-dashed border-gold-500/20 rounded-xl space-y-3">
                      <CookingPot className="w-16 h-16 text-gold-500/30 mx-auto" />
                      <p className="text-gray-400 text-sm font-sans">No dishes in the cooking queue. Kitchen is clear!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").map((ord) => {
                        const totalPrep = ord.items.reduce((max, it) => Math.max(max, it.menuItem.preparationTime), 0);
                        
                        return (
                          <div key={ord.id} className="bg-charcoal-dark border border-gold-500/25 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between" style={{ minHeight: "310px" }}>
                            {/* Inner Highlight Header */}
                            <div className="bg-[#181818] p-4 border-b border-gold-500/15 flex justify-between items-center">
                              <div>
                                <span className="text-[10px] font-mono text-gold-400 tracking-wider">TICKET #{ord.orderNumber}</span>
                                <h4 className="font-bold text-sm text-white block mt-0.5">{ord.customerName}</h4>
                              </div>
                              <span className="bg-charcoal-deep px-2 py-1 border border-white/5 rounded text-[10px] font-mono text-gray-400 uppercase">
                                {ord.serviceType}
                              </span>
                            </div>

                            {/* Ticket Items List */}
                            <div className="p-4 flex-grow space-y-3">
                              <h5 className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Items to Roll</h5>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {ord.items.map((it, idx) => (
                                  <div key={idx} className="text-xs">
                                    <strong className="text-white block font-serif text-sm">
                                      {it.quantity}x {it.menuItem.name}
                                    </strong>
                                    {it.customizationNotes && (
                                      <span className="text-[10px] text-yellow-500 block italic leading-tight pl-2">
                                        Custom: "{it.customizationNotes}"
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Timer Footer and stage switcher */}
                            <div className="p-4 bg-charcoal-deep/90 border-t border-gold-500/10 space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-mono uppercase">EST COOK: <b>{totalPrep} MIN</b></span>
                                {ord.status === "Pending" && (
                                  <span className="text-blue-400 font-mono font-bold animate-pulse">PENDING STATE</span>
                                )}
                                {ord.status === "Confirmed" && (
                                  <span className="text-green-400 font-mono font-bold">CONFIRMED</span>
                                )}
                                {ord.status === "Preparing" && (
                                  <span className="text-yellow-400 font-mono font-bold animate-pulse">COOKING IN TRANSIT</span>
                                )}
                              </div>

                              {/* Operations Mutators row */}
                              <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold tracking-wider">
                                {ord.status === "Pending" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord.id, "Confirmed")}
                                    className="col-span-2 bg-blue-600 hover:bg-blue-500 py-2 rounded text-white font-mono uppercase cursor-pointer"
                                  >
                                    CONFIRM TICKET
                                  </button>
                                )}
                                {ord.status === "Confirmed" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord.id, "Preparing")}
                                    className="col-span-2 bg-yellow-500 text-charcoal-deep py-2 rounded font-mono uppercase hover:bg-yellow-450 cursor-pointer"
                                  >
                                    START COOKING (ROUNDS)
                                  </button>
                                )}
                                {ord.status === "Preparing" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord.id, "Ready")}
                                    className="col-span-2 bg-green-600 hover:bg-green-500 py-2 rounded text-white font-mono uppercase cursor-pointer"
                                  >
                                    MARK DISH FRESHLY ROLLED
                                  </button>
                                )}
                                {ord.status === "Ready" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord.id, ord.serviceType === "delivery" ? "Out for Delivery" : "Delivered")}
                                    className="col-span-2 bg-red-bright hover:bg-red-deep py-2 rounded text-white font-mono uppercase cursor-pointer"
                                  >
                                    DISPATCH FROM KITCHEN
                                  </button>
                                )}
                                {(ord.status === "Out for Delivery") && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord.id, "Delivered")}
                                    className="col-span-2 bg-green-600 hover:bg-green-500 py-2 rounded text-white font-mono uppercase cursor-pointer"
                                  >
                                    MARK DELIVERED
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}


              {/* ==================== D. SEATING PLANNER / RESERVATIONS ==================== */}
              {adminTab === "reservations" && (
                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 space-y-4 text-left shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold-500/10 pb-4">
                    <div>
                      <h2 className="text-xl font-sans font-bold text-white uppercase tracking-widest">VIP FITTING & STYLING SCHEDULE</h2>
                      <p className="text-xs text-neutral-400">Assign styling consultants and manage confirmations for bookings at the Galleria del Corso store.</p>
                    </div>
                  </div>

                  {reservations.length === 0 ? (
                    <div className="py-20 text-center text-gray-500 font-sans">
                      No tables booked yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-gold-500/10 text-gold-400 font-mono text-[10px] tracking-widest uppercase">
                            <th className="py-3 px-2">Customer & Details</th>
                            <th className="py-3 px-2">Date / Time</th>
                            <th className="py-3 px-2">Guests count</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2">Assigned Table</th>
                            <th className="py-3 px-2 text-right">Confirmation Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {reservations.map((res) => (
                            <tr key={res.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 px-2 space-y-1">
                                <strong className="text-white text-sm block">{res.customerName}</strong>
                                <span className="text-gray-400 block text-[10px]">{res.phone}</span>
                                {res.specialRequests && <span className="text-[10px] text-gold-400 block italic max-w-xs truncate">"{res.specialRequests}"</span>}
                              </td>
                              <td className="py-4 px-2 font-mono">
                                <span className="block text-white font-bold">{res.date}</span>
                                <span className="block text-gray-400 text-[10px]">{res.time}</span>
                              </td>
                              <td className="py-4 px-2 font-mono font-bold text-white">{res.guests} Ppl</td>
                              <td className="py-4 px-2 font-mono">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  res.status === "Confirmed" ? "bg-green-950 text-green-400 border border-green-900" :
                                  res.status === "Pending" ? "bg-blue-950 text-blue-400 border border-blue-900" : "bg-charcoal-deep text-gray-500"
                                }`}>
                                  {res.status}
                                </span>
                              </td>
                              <td className="py-4 px-2 font-mono text-gold-400">
                                {res.tableNumber || "No Table Code"}
                              </td>
                              <td className="py-4 px-2 text-right space-y-2">
                                {res.status === "Pending" && (
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={() => handleUpdateResStatus(res.id, "Confirmed", "T-" + Math.floor(1 + Math.random() * 12))}
                                      className="bg-green-600 hover:bg-green-500 text-white p-1 px-2 text-[10px] font-bold rounded cursor-pointer"
                                    >
                                      CONFIRM Table
                                    </button>
                                    <button
                                      onClick={() => handleUpdateResStatus(res.id, "Cancelled")}
                                      className="bg-red-deep/30 hover:bg-red-deep text-red-bright hover:text-white p-1 px-2 text-[10px] font-bold rounded cursor-pointer"
                                    >
                                      REJECT
                                    </button>
                                  </div>
                                )}
                                {res.status === "Confirmed" && (
                                  <button
                                    onClick={() => handleUpdateResStatus(res.id, "Completed")}
                                    className="bg-gold-500 hover:bg-gold-400 text-charcoal-deep p-1 px-2.5 text-[10px] font-bold rounded cursor-pointer font-sans"
                                  >
                                    MARK SEATING DONE
                                  </button>
                                )}
                                {res.status === "Completed" && (
                                  <span className="text-[10px] text-gray-400 font-mono italic">COMPLETED</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}


              {/* ==================== E. CUSTOMER CRM INTELLIGENCE ==================== */}
              {adminTab === "crm" && (
                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 space-y-4 text-left shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold-500/10 pb-4">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-white uppercase tracking-wider">CLIENTS DATABASE CRM</h2>
                      <p className="text-xs text-gray-400">Trace loyal points, spending thresholds, favorite sushi formulas, and segment scores.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-gold-500/10 text-gold-400 font-mono text-[10px] tracking-widest uppercase">
                          <th className="py-3 px-2">Client Details</th>
                          <th className="py-3 px-2">CRM Segment</th>
                          <th className="py-3 px-2 text-center">Total Orders Count</th>
                          <th className="py-3 px-2 font-mono">Aggregate Spent</th>
                          <th className="py-3 px-2">Loyalty Points Balance</th>
                          <th className="py-3 px-2">Favorite Sushi formulas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {customers.map((cust) => (
                          <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2 space-y-1">
                              <strong className="text-white text-sm block">{cust.name}</strong>
                              <span className="text-gray-400 block text-[10px]">{cust.email} | {cust.phone}</span>
                            </td>
                            <td className="py-4 px-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cust.segment === "VIP" ? "bg-red-deep text-white border border-red-500/20" :
                                cust.segment === "Regular" ? "bg-gold-500/20 text-gold-400 border border-gold-500/25" : "bg-charcoal-deep text-gray-400"
                              }`}>
                                {cust.segment}
                              </span>
                            </td>
                            <td className="py-4 px-2 font-mono text-center text-white">{cust.totalOrders} Bills</td>
                            <td className="py-4 px-2 font-mono font-bold text-white">{cust.totalSpending} EUR</td>
                            <td className="py-4 px-2 font-mono text-gold-400 font-bold">{cust.loyaltyPoints} PTS</td>
                            <td className="py-4 px-2 text-xs">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {cust.favoriteItems.map((f, i) => (
                                  <span key={i} className="bg-charcoal-deep border border-gold-500/10 text-[9px] px-1.5 py-0.5 rounded text-gray-300">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* ==================== F. MENU / RECIPE CONFIGURATIONS ==================== */}
              {adminTab === "menu" && (
                <div className="space-y-6 text-left">
                  {/* TWO MODULES: CREATE RECIPE & LIST */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* DISH CREATOR SYSTEM */}
                    <div className="lg:col-span-4 bg-charcoal-dark border border-gold-500/12 rounded-xl p-5 shadow-lg space-y-4">
                      <h3 className="font-serif font-bold text-sm text-white uppercase border-b border-gold-500/10 pb-2">ADD NEW CULINARY WORK</h3>
                      
                      <form onSubmit={handleCreateDishSubmit} className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-gold-400 tracking-wider font-mono block">RECIPE DESIGNATION *</label>
                          <input
                            type="text" required
                            value={newDish.name}
                            onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                            placeholder="e.g. Kyoto Salmon Fusion"
                            className="w-full bg-charcoal-deep border border-gold-500/15 focus:border-gold-500 outline-none p-2 rounded text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-gold-400 tracking-wider font-mono block">EUR PRICE *</label>
                            <input
                              type="number" required
                              value={newDish.price}
                              onChange={(e) => setNewDish({ ...newDish, price: Number(e.target.value) })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-gold-400 tracking-wider font-mono block">PREP MIN *</label>
                            <input
                              type="number" required
                              value={newDish.preparationTime}
                              onChange={(e) => setNewDish({ ...newDish, preparationTime: Number(e.target.value) })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-gold-400 tracking-wider font-mono block">CATEGORY *</label>
                          <select
                            value={newDish.category}
                            onChange={(e) => setNewDish({ ...newDish, category: e.target.value as any })}
                            className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white"
                          >
                            {["Hoodies", "T-Shirts", "Outerwear", "Sneakers", "Cargo Pants", "Caps"].map((cat) => (
                              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-gold-400 tracking-wider font-mono block font-thin">Unsplash Image URL (Optional)</label>
                          <input
                            type="text"
                            value={newDish.image}
                            onChange={(e) => setNewDish({ ...newDish, image: e.target.value })}
                            placeholder="https://images.unsplash..."
                            className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-gold-400 tracking-wider font-mono block">FABRIC & DESIGN DESCRIPTION *</label>
                          <textarea
                            required
                            value={newDish.description}
                            onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                            placeholder="Explain the organic cotton GSM, premium prints, detailing cuts, fits..."
                            rows={3}
                            className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-gold-400 hover:bg-gold-500 text-charcoal-deep font-bold text-xs uppercase rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>PUBLISH APPAREL TO STORE</span>
                        </button>
                      </form>
                    </div>

                    {/* RECIPE STATE LIST */}
                    <div className="lg:col-span-8 bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 shadow-lg space-y-4">
                      <h3 className="font-sans font-bold text-sm text-neutral-100 uppercase border-b border-white/10 pb-2">ACTIVE VELORA STREET GARMENT CATALOG ({menuList.length})</h3>
                      
                      <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                        {menuList.map((dish) => (
                          <div key={dish.id} className="p-3.5 bg-charcoal-deep rounded-xl border border-white/5 flex items-center justify-between gap-4 text-xs">
                            <img 
                              src={dish.image} 
                              alt={dish.name} 
                              className="w-12 h-12 object-cover rounded-lg border border-gold-500/15"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-white truncate">{dish.name}</h4>
                              <p className="text-gray-400 leading-tight block text-[10px] truncate">{dish.description}</p>
                              <div className="flex items-center gap-2.5 pt-1 text-[10px] font-mono text-gray-500">
                                <span className="bg-charcoal-light py-0.5 px-2 rounded text-gold-300 font-sans">{dish.category}</span>
                                <span>Prep: {dish.preparationTime} Min</span>
                                <span>Price: {dish.price} EUR</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* Toggle Availability Tag button */}
                              <button
                                onClick={() => handleToggleDishAvailability(dish.id, dish.availability)}
                                className={`px-2.5 py-1 text-[10px] rounded font-bold uppercase transition-all whitespace-nowrap ${
                                  dish.availability 
                                    ? "bg-green-950 text-green-400 border border-green-900" 
                                    : "bg-red-deep/20 text-red-bright border border-red-deep/30"
                                }`}
                              >
                                {dish.availability ? "AVAILABLE" : "SOLD OUT"}
                              </button>
                              
                              <button
                                onClick={() => handleDeleteDish(dish.id)}
                                className="text-red-bright hover:text-white p-1 rounded hover:bg-white/5"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}


              {/* ==================== G. INVENTORY STOCK MANAGEMENT ==================== */}
              {adminTab === "inventory" && (
                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 space-y-4 text-left shadow-lg">
                  <div className="flex justify-between items-center border-b border-gold-500/10 pb-4">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-white uppercase tracking-wider">INGREDIENT DISPENSARY INVENTORY</h2>
                      <p className="text-xs text-gray-400">Track raw salmon fillets, grains, avocado units and sushi sheets with low thresholds alerts.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-gold-500/10 text-gold-400 font-mono text-[10px] tracking-widest uppercase">
                          <th className="py-3 px-2">Raw Ingredient</th>
                          <th className="py-3 px-2">Wholesale Supplier</th>
                          <th className="py-3 px-2 text-center font-mono">Stock Quantity</th>
                          <th className="py-3 px-2">Threshold Limit</th>
                          <th className="py-3 px-2">Status Alert Tag</th>
                          <th className="py-3 px-2 text-right">Instant Restock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {inventory.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2">
                              <strong className="text-white text-sm block">{item.name}</strong>
                              <span className="text-gray-400 block text-[10px] font-mono">Last Restocked: {item.lastRestocked}</span>
                            </td>
                            <td className="py-4 px-2 text-gray-300 font-light">{item.supplier}</td>
                            <td className="py-4 px-2 font-mono text-center font-bold text-white">
                              {item.stockLevel} {item.unit}
                            </td>
                            <td className="py-4 px-2 font-mono text-gray-400 font-light">{item.reorderLevel} {item.unit}</td>
                            <td className="py-4 px-2 font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.status === "good" ? "bg-green-950 text-green-400 border border-green-900" :
                                item.status === "low" ? "bg-yellow-950 text-yellow-400 border border-yellow-900 animate-pulse" :
                                "bg-red-deep/20 text-red-bright border border-red-deep/30 animate-pulse"
                              }`}>
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <button
                                onClick={() => handleRestockInventory(item.id, item.stockLevel)}
                                className="bg-gold-500/10 text-gold-400 hover:bg-gold-500 hover:text-charcoal-deep border border-gold-500/30 px-3 py-1 text-[10px] font-bold rounded flex items-center gap-1.5 uppercase tracking-wide ml-auto cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>ADD 25 UNITS</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* ==================== H. DELIVERY DISTRIBUTOR LOG ==================== */}
              {adminTab === "delivery" && (
                <div className="bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 space-y-4 text-left shadow-lg">
                  <div className="flex justify-between items-center border-b border-gold-500/10 pb-4">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-white uppercase tracking-wider">COURIER DISPATCH & ROUTING</h2>
                      <p className="text-xs text-gray-400">Coordinate drivers assigned to outstanding takeaway and contactless home deliveries.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* DRIVERS DATABASE STATUS */}
                    <div className="space-y-3">
                      <h3 className="font-sans font-bold text-xs text-neutral-100 uppercase border-b border-white/5 pb-2">ACTIVE COURIER LOGISTICS STATUS</h3>
                      {drivers.map((drv) => (
                        <div key={drv.id} className="p-3 bg-charcoal-deep rounded-lg border border-white/5 flex items-center justify-between text-xs">
                          <div>
                            <strong className="text-white block text-sm">{drv.name}</strong>
                            <span className="text-gray-400 block font-mono text-[10px]">{drv.phone}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            drv.status === "Available" ? "bg-green-950 text-green-400 border border-green-900" :
                            drv.status === "On Delivery" ? "bg-yellow-950 text-yellow-400 border border-yellow-900" : "bg-charcoal-deep text-gray-500"
                          }`}>
                            {drv.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* ROUTING LINK AND MANUAL ASSIGNMENT FOR LIVE DELIVERIES */}
                    <div className="space-y-4">
                      <h3 className="font-serif font-bold text-xs text-gold-400 uppercase border-b border-white/5 pb-2">MANUAL DRIVER ASSIGNMENTS</h3>
                      
                      {orders.filter(o => o.serviceType === "delivery" && o.status !== "Delivered" && o.status !== "Cancelled").length === 0 ? (
                        <div className="py-12 text-center text-xs text-gray-500">
                          No pending delivery parcels need driver routing today.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {orders.filter(o => o.serviceType === "delivery" && o.status !== "Delivered" && o.status !== "Cancelled").map((ord) => (
                            <div key={ord.id} className="p-3 bg-charcoal-deep rounded-lg border border-gold-500/10 text-xs flex justify-between items-center gap-4">
                              <div>
                                <strong className="text-white block">Order #{ord.orderNumber} - {ord.customerName}</strong>
                                <span className="text-gray-400 text-[10px] block max-w-xs truncate">Address: {ord.deliveryAddress}</span>
                                {ord.driverId && (
                                  <span className="text-gold-400 text-[10px] block font-mono mt-0.5">Assigned to: {drivers.find(d => d.id === ord.driverId)?.name || ord.driverId}</span>
                                )}
                              </div>
                              <div>
                                <select
                                  value={ord.driverId || ""}
                                  onChange={(e) => handleUpdateOrderStatus(ord.id, ord.status, e.target.value)}
                                  className="bg-charcoal-dark border border-gold-500/20 text-[10px] p-1.5 text-white font-mono rounded"
                                >
                                  <option value="">ASSIGN DRIVER...</option>
                                  {drivers.filter(d => d.status === "Available").map((d) => (
                                    <option key={d.id} value={d.id}>{d.name.split(' ')[0]}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}


              {/* ==================== I. ANALYTICS SUITE GRAPH CHARTING ==================== */}
              {adminTab === "analytics" && (
                <div className="space-y-6 text-left">
                  
                  {/* CHARTS GRAPH GRID CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* 1. WEEKLY REVENUES TIMELINE */}
                    <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-2xl shadow-lg space-y-4">
                      <h4 className="font-serif font-bold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2">
                        Weekly Net Revenue (EUR)
                      </h4>
                      <div className="h-56 flex items-end justify-between pt-6 px-4">
                        {[
                          { day: "Mon", val: 42 },
                          { day: "Tue", val: 48 },
                          { day: "Wed", val: 51 },
                          { day: "Thu", val: 65 },
                          { day: "Fri", val: 89 },
                          { day: "Sat", val: 104 },
                          { day: "Sun", val: 82 }
                        ].map((d, index) => (
                          <div key={index} className="flex flex-col items-center w-8 gap-2 group cursor-pointer">
                            <span className="text-[10px] font-mono text-gold-450 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {d.val}k
                            </span>
                            <div 
                              className="w-4 bg-gradient-to-t from-gold-600 to-gold-400 group-hover:from-gold-400 group-hover:to-gold-300 rounded-t transition-all duration-1000"
                              style={{ height: `${d.val * 1.5}px` }}
                            />
                            <span className="text-[10px] font-mono text-gray-400 block">{d.day}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono text-center pt-2">
                        * Compiled nightly. Solid recovery driven by weekend catering.
                      </p>
                    </div>

                    {/* 2. POPULAR DISHES METRICS */}
                    <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-2xl shadow-lg space-y-4">
                      <h4 className="font-sans font-bold text-sm text-white uppercase tracking-widest border-b border-white/5 pb-2">
                        Most Demanded Apparel Items
                      </h4>
                      <div className="space-y-3.5 pt-4">
                        {[
                          { name: "Classic Gothic Hoodie", pct: 88, count: "48 sold" },
                          { name: "Milano Minimalist Tee", pct: 72, count: "34 sold" },
                          { name: "Eight-Pocket Ripstop Cargo Pants", pct: 54, count: "25 sold" },
                          { name: "Velora Element Runner 'v1'", pct: 40, count: "18 sold" }
                        ].map((dish, i) => (
                          <div key={i} className="space-y-1 text-xs font-sans">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300 font-medium">{dish.name}</span>
                              <span className="text-gold-400 font-mono text-[10px]">{dish.count}</span>
                            </div>
                            <div className="h-2 w-full bg-charcoal-deep rounded-full relative overflow-hidden">
                              <div 
                                className="absolute h-full bg-gradient-to-r from-red-deep to-gold-500 rounded-full transition-all duration-1000"
                                style={{ width: `${dish.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. LOYAL SEGMENT DEMOGRAPHICS MAP */}
                    <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-2xl shadow-lg space-y-4">
                      <h4 className="font-serif font-bold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2">
                        LOYAL DEMOGRAPHICS SEGMENTS CRM
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center pt-6">
                        <div className="bg-charcoal-deep border border-gold-500/10 p-4 rounded-xl">
                          <span className="text-[10px] text-gray-400 tracking-wider font-mono block">VIP GUEST</span>
                          <strong className="text-2xl font-serif text-red-bright block mt-1">
                            {customers.filter(c => c.segment === "VIP").length}
                          </strong>
                          <span className="text-[9px] text-gray-500">Spend &gt; 350 EUR</span>
                        </div>
                        <div className="bg-charcoal-deep border border-gold-500/10 p-4 rounded-xl">
                          <span className="text-[10px] text-gray-400 tracking-wider font-mono block">REGULARS</span>
                          <strong className="text-2xl font-serif text-gold-400 block mt-1">
                            {customers.filter(c => c.segment === "Regular").length}
                          </strong>
                          <span className="text-[9px] text-gray-500">Spend &gt; 100 EUR</span>
                        </div>
                        <div className="bg-charcoal-deep border border-gold-500/10 p-4 rounded-xl">
                          <span className="text-[10px] text-gray-400 tracking-wider font-mono block">NEW ACCOUNTS</span>
                          <strong className="text-2xl font-serif text-white block mt-1">
                            {customers.filter(c => c.segment === "New").length}
                          </strong>
                          <span className="text-[9px] text-gray-500">First-time dine-in</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono text-center">
                        * CRM profiles are mapped automatically through phone registers.
                      </p>
                    </div>

                    {/* 4. BUSINESS STATS BLOCK */}
                    <div className="bg-charcoal-dark border border-gold-500/10 p-5 rounded-2xl shadow-lg space-y-3 flex flex-col justify-between">
                      <h4 className="font-serif font-bold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2">
                        Operational Health Analytics
                      </h4>
                      <div className="space-y-2.5 text-xs font-mono text-gray-400">
                        <div className="flex justify-between">
                          <span>AVERAGE TICKET SIZE:</span>
                          <strong className="text-white">1,820 EUR</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>AVG CUSTOMER RETENTION:</span>
                          <strong className="text-green-400">76.3% (Very High)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>WOK VS ROLL RATIO:</span>
                          <strong className="text-white">30% Outerwear / 70% Hoodies</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>AVERAGE PREP COOK SPEED:</span>
                          <strong className="text-white">11.4 Minutes</strong>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gold-550/10 border border-gold-500/20 text-gold-400 rounded-lg text-[10px] leading-relaxed">
                        <strong>MARKETING FOCUS TIP:</strong> Promos directed to VIP segments on Thursday nights yield 35% higher response factors than standard weekend newsletters.
                      </div>
                    </div>

                  </div>
                </div>
              )}


              {/* ==================== J. NOTIFICATION SIMULATORS / SETTINGS ==================== */}
              {adminTab === "settings" && (
                <div className="space-y-6 text-left">
                  
                  {/* MARKETING CAMPAIGN INJECTOR */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    <div className="md:col-span-7 bg-charcoal-dark border border-gold-500/12 rounded-xl p-5 shadow-lg space-y-4">
                      <h3 className="font-serif font-bold text-sm text-gold-400 uppercase border-b border-white/5 pb-2">
                        TRIGGER PROMOTIONAL CAMPAIGNS (SIMULATOR)
                      </h3>
                      <p className="text-xs text-gray-400 font-sans leading-relaxed">
                        Deploy custom campaign segments across registered CRM clients inside the sandbox to test automated WhatsApp, Email, or SMS delivery triggers.
                      </p>

                      <form onSubmit={handleLaunchCampaign} className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-gold-400 font-mono uppercase block">Channel Gateway</label>
                            <select
                              value={campaignData.channel}
                              onChange={(e) => setCampaignData({ ...campaignData, channel: e.target.value })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white"
                            >
                              <option value="sms">SMS ALERTS</option>
                              <option value="whatsapp">WHATSAPP CHATS</option>
                              <option value="email">EMAIL BULKS</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-gold-400 font-mono uppercase block">Target Segment</label>
                            <select
                              value={campaignData.segment}
                              onChange={(e) => setCampaignData({ ...campaignData, segment: e.target.value })}
                              className="w-full bg-charcoal-deep border border-gold-500/15 p-2 rounded text-white"
                            >
                              <option value="All">All CRM CLients</option>
                              <option value="VIP">VIP Segment Only</option>
                              <option value="Regular">Regular Segments</option>
                              <option value="New">First Timers (New)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-gold-400 font-mono uppercase block">Automated Message Template</label>
                          <textarea
                            value={campaignData.message}
                            onChange={(e) => setCampaignData({ ...campaignData, message: e.target.value })}
                            rows={3}
                            className="w-full bg-charcoal-deep border border-gold-500/15 p-2.5 rounded text-white resize-none max-w-full font-sans"
                          />
                          <span className="text-[10px] text-gray-500 block font-mono">
                            Available slots: {`{name}`} (Customer Name), {`{points}`} (Loyalty Score).
                          </span>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-450 text-charcoal-deep font-bold text-xs uppercase rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>LAUNCH SIMULATED ALERT DISPATCH</span>
                        </button>
                      </form>

                      {campaignSuccessCount !== null && (
                        <div className="p-3 bg-green-950/40 border border-green-900 rounded text-green-400 text-xs">
                          Success! Promo dispatched to <b>{campaignSuccessCount}</b> filtered clients in CRM. Trace logs on the right column!
                        </div>
                      )}
                    </div>

                    {/* COMPREHENSIVE NOTIFICATION STREAMS LOGS */}
                    <div className="md:col-span-5 bg-charcoal-dark border border-gold-500/10 rounded-xl p-5 shadow-lg space-y-4">
                      <h3 className="font-serif font-bold text-sm text-white uppercase border-b border-white/5 pb-2">
                        ALL NOTIFICATION SENT LOG PANEL
                      </h3>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {notifications.map((notif) => (
                          <div key={notif.id} className="p-3 bg-charcoal-deep rounded-lg border border-white/5 text-[11px] font-mono leading-relaxed relative">
                            <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider bg-green-900/30 text-green-400 px-1 py-0.5 rounded font-bold font-sans">
                              {notif.status}
                            </span>
                            <div className="flex justify-between text-gray-500 text-[10px]">
                              <span>CH: <b className="text-gold-300 uppercase">{notif.type}</b></span>
                              <span>{notif.recipient}</span>
                            </div>
                            <strong className="block text-white text-[12px] font-sans mt-1">{notif.title}</strong>
                            <p className="text-gray-300 font-sans text-xs mt-0.5">{notif.message}</p>
                            <span className="text-[9px] text-gray-550 block text-right mt-1">🕒 {new Date(notif.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}
        </section>

      </div>
    </div>
  );
}
