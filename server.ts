import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import { 
  MenuItem, Order, Reservation, Customer, 
  Ingredient, CustomerReview, SystemNotification, 
  OrderStatus, ReservationStatus, ServiceType, Driver
} from "./src/types";

// Firebase Integration Setup
let dbInstance: any = null;

function getDb() {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const app = initializeApp(config);
      setLogLevel("silent");
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, config.firestoreDatabaseId);
    }
  } catch (err) {
    console.warn("Could not lazily initialize Firebase database client:", err);
  }
  return dbInstance;
}

async function persistDoc(colName: string, id: string, docData: any) {
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, colName, id), docData);
  } catch (err) {
    console.warn(`Firestore write exception in secondary thread for ${colName}/${id}:`, err);
  }
}

async function removeDoc(colName: string, id: string) {
  const db = getDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (err) {
    console.warn(`Firestore delete exception in secondary thread for ${colName}/${id}:`, err);
  }
}

// Generates unique short IDs
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

// Seeding Initial Data
let menuItems: MenuItem[] = [
  {
    id: "M1",
    name: "Classic Gothic Hoodie",
    description: "Heavyweight 450GSM organic cotton hoodie with premium high-density gothic print, distress accents, and custom steel cord tips. True streetwear cut.",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80",
    price: 8500,
    availability: true,
    preparationTime: 24, // 24 hours dispatch
    category: "Hoodies",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Midnight Black", "Vintage Grey", "Cream White"],
    rating: 4.9,
    reviewsCount: 124
  },
  {
    id: "M2",
    name: "Cyber-Aura Reflective Hoodie",
    description: "Futuristic oversized cyberpunk hoodie featuring 3M light-reflective linework, double-layered hood, and stealth utility zipper sleeve pockets.",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
    price: 9200,
    availability: true,
    preparationTime: 24,
    category: "Hoodies",
    sizes: ["M", "L", "XL"],
    colors: ["Matte Black", "Volt Acid"],
    rating: 4.8,
    reviewsCount: 88
  },
  {
    id: "M3",
    name: "Milano Minimalist Tee",
    description: "Luxury soft-spun combed cotton tee with drop-shoulder silhouette and a premium minimalist clean embroidered branding on the left chest.",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    price: 4200,
    availability: true,
    preparationTime: 12,
    category: "T-Shirts",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Olive Green", "Oatmeal", "Jet Black"],
    rating: 4.7,
    reviewsCount: 65
  },
  {
    id: "M4",
    name: "Graffiti Collage Heavy Tee",
    description: "Oversized street tee with hand-rendered graffiti tag collar collage representing Milano center avenues, heavy-knit luxury collar.",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80",
    price: 4500,
    availability: true,
    preparationTime: 12,
    category: "T-Shirts",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Washed Black", "Chalk White"],
    rating: 5.0,
    reviewsCount: 42
  },
  {
    id: "M5",
    name: "Tactical Alpha Bomber Jacket",
    description: "Waterproof ripstop nylon military-style bomber with modular chest harness utility pouches, heavy duty brass locks, and windbreaker storm technology.",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80",
    price: 14500,
    availability: true,
    preparationTime: 48,
    category: "Outerwear",
    sizes: ["M", "L", "XL"],
    colors: ["Military Green", "Stealth Charcoal"],
    rating: 4.9,
    reviewsCount: 31
  },
  {
    id: "M6",
    name: "Sherpa Distressed Black Denim",
    description: "Premium heavy-wash 14oz denim jacket with cozy high-pile warm cream sheriff lining, distress details, and vintage metal buttons.",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80",
    price: 16500,
    availability: true,
    preparationTime: 48,
    category: "Outerwear",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Classic Indigo", "Aged Charcoal"],
    rating: 4.8,
    reviewsCount: 19
  },
  {
    id: "M7",
    name: "Velora Element Runner 'v1'",
    description: "Deconstructed streetwear sneakers featuring micro-suede panels, breathable tech mesh, chunky geometric cushions, retro laces, and high-traction gum tread.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    price: 18500,
    availability: true,
    preparationTime: 24,
    category: "Sneakers",
    sizes: ["40", "41", "42", "43", "44"],
    colors: ["Crimson Red", "Cyber Ghost"],
    rating: 4.9,
    reviewsCount: 56
  },
  {
    id: "M8",
    name: "Retro High-Top Street Leather",
    description: "Luxury full-grain calfskin leather high-profile sneakers with distressed soles, cream lace loops, and signature gold foil serial print.",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80",
    price: 22000,
    availability: true,
    preparationTime: 24,
    category: "Sneakers",
    sizes: ["41", "42", "43", "44", "45"],
    colors: ["Chicago Red", "Triple Black"],
    rating: 5.0,
    reviewsCount: 74
  },
  {
    id: "M9",
    name: "Eight-Pocket Ripstop Cargo Pants",
    description: "Hard-wearing streetwear cargo pants featuring modular flap-cover side bags, integrated webbing belts, and multi-point drawstrings for custom fitting.",
    image: "https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&w=600&q=80",
    price: 7800,
    availability: true,
    preparationTime: 24,
    category: "Cargo Pants",
    sizes: ["30", "32", "34", "36"],
    colors: ["Sand Desert", "Off-Black", "Sage"],
    rating: 4.6,
    reviewsCount: 29
  },
  {
    id: "M10",
    name: "Washed Distressed Signature Cap",
    description: "Classic streetwear six-panel luxury cotton baseball cap with raw distress edges, adjustable retro brass back-buckle and elegant embroidery.",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80",
    price: 2500,
    availability: true,
    preparationTime: 12,
    category: "Caps",
    sizes: ["One Size"],
    colors: ["Vintage Black", "Moss Green"],
    rating: 4.8,
    reviewsCount: 110
  }
];

let drivers: Driver[] = [
  { id: "D1", name: "Riccardo Moretti", phone: "+39 02 8765 4321", status: "Available" },
  { id: "D2", name: "Luca Rossi", phone: "+39 333 881 9900", status: "On Delivery" },
  { id: "D3", name: "Andrea Ferretti", phone: "+39 333 776 6555", status: "Offline" }
];

let inventory: Ingredient[] = [
  { id: "I1", name: "Heavyweight Cotton Fleece Blanks", stockLevel: 320, unit: "units", reorderLevel: 100, supplier: "Mitidja Textile Mill", pricePerUnit: 1800, lastRestocked: "2026-06-01", status: "adequate" },
  { id: "I2", name: "Organic Drop-Shoulder Blanks (M/L/XL)", stockLevel: 450, unit: "units", reorderLevel: 200, supplier: "Mitidja Textile Mill", pricePerUnit: 1200, lastRestocked: "2026-06-04", status: "adequate" },
  { id: "I3", name: "Premium Calfskin Leather Cuts", stockLevel: 18, unit: "m²", reorderLevel: 25, supplier: "Boumerdes Leather Co.", pricePerUnit: 8500, lastRestocked: "2026-05-25", status: "low" },
  { id: "I4", name: "Velora Street Premium Ribbon Labels", stockLevel: 1500, unit: "labels", reorderLevel: 500, supplier: "Milano Craft Labeling", pricePerUnit: 45, lastRestocked: "2026-06-02", status: "adequate" },
  { id: "I5", name: "3M Reflective Strip Piping Rolls", stockLevel: 12, unit: "rolls", reorderLevel: 15, supplier: "Tech-Trim Imports Milano", pricePerUnit: 3400, lastRestocked: "2026-05-28", status: "low" },
  { id: "I6", name: "Hardened Custom Cord Lock Ends", stockLevel: 80, unit: "pcs", reorderLevel: 150, supplier: "Milano Metal Casting", pricePerUnit: 150, lastRestocked: "2026-06-03", status: "critical" },
  { id: "I7", name: "Premium Heavy Shipping Boxes", stockLevel: 280, unit: "boxes", reorderLevel: 100, supplier: "Milano Paper Pack", pricePerUnit: 250, lastRestocked: "2026-05-30", status: "adequate" },
  { id: "I8", name: "Biodegradable Protective Garment Bags", stockLevel: 950, unit: "bags", reorderLevel: 300, supplier: "Eco-Pack Italy", pricePerUnit: 35, lastRestocked: "2026-05-15", status: "adequate" }
];

let customers: Customer[] = [
  {
    id: "C1",
    name: "Marco Bellini",
    phone: "+39 333 234 5678",
    email: "marco.bellini@gmail.com",
    address: "Via Tortona 15, Brera, Milano",
    password: "123",
    totalOrders: 6,
    totalSpending: 68500,
    lastOrder: "2026-06-05",
    loyaltyPoints: 685,
    favoriteItems: ["Classic Gothic Hoodie", "Velora Element Runner 'v1'"],
    segment: "VIP"
  },
  {
    id: "C2",
    name: "Giulia Romano",
    phone: "+39 333 987 6543",
    email: "giulia.romano@outlook.com",
    address: "Corso Buenos Aires 28, Milano",
    password: "123",
    totalOrders: 4,
    totalSpending: 38400,
    lastOrder: "2026-06-03",
    loyaltyPoints: 384,
    favoriteItems: ["Cyber-Aura Reflective Hoodie", "Washed Distressed Signature Cap"],
    segment: "Regular"
  },
  {
    id: "C3",
    name: "Luca Ferretti",
    phone: "+39 333 445 5667",
    email: "luca.ferretti@yahoo.it",
    address: "Galleria del Corso 12, Centro, Milano",
    password: "123",
    totalOrders: 1,
    totalSpending: 18500,
    lastOrder: "2026-06-06",
    loyaltyPoints: 185,
    favoriteItems: ["Velora Element Runner 'v1'"],
    segment: "New"
  }
];

let orders: Order[] = [
  {
    id: "O-8374",
    orderNumber: "8374",
    customerName: "Marco Bellini",
    phone: "+39 333 234 5678",
    email: "marco.bellini@gmail.com",
    deliveryAddress: "Via Tortona 15, Brera, Milano",
    serviceType: "delivery",
    items: [
      {
        id: "M1-normal",
        menuItem: {
          id: "M1",
          name: "Classic Gothic Hoodie",
          description: "Heavyweight 450GSM organic cotton hoodie with premium high-density gothic print, distress accents, and custom steel cord tips. True streetwear cut.",
          image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80",
          price: 8500,
          availability: true,
          preparationTime: 24,
          category: "Hoodies"
        },
        quantity: 1,
        selectedSize: "L",
        selectedColor: "Midnight Black"
      },
      {
        id: "M10-normal",
        menuItem: {
          id: "M10",
          name: "Washed Distressed Signature Cap",
          description: "Classic streetwear six-panel luxury cotton baseball cap with raw distress edges, adjustable retro brass back-buckle and elegant embroidery.",
          image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80",
          price: 2500,
          availability: true,
          preparationTime: 12,
          category: "Caps"
        },
        quantity: 1,
        selectedSize: "One Size",
        selectedColor: "Vintage Black"
      }
    ],
    status: "Delivered",
    totalAmount: 11000,
    timestamp: "2026-06-06T06:15:00.000Z",
    notes: "Leave package with the concierge at Gate Alpha.",
    driverId: "D2",
    rating: 5
  },
  {
    id: "O-8375",
    orderNumber: "8375",
    customerName: "Giulia Romano",
    phone: "+39 333 987 6543",
    email: "giulia.romano@outlook.com",
    serviceType: "pickup",
    items: [
      {
        id: "M2-normal",
        menuItem: {
          id: "M2",
          name: "Cyber-Aura Reflective Hoodie",
          description: "Futuristic oversized cyberpunk hoodie featuring 3M light-reflective linework, double-layered hood, and stealth utility zipper sleeve pockets.",
          image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
          price: 9200,
          availability: true,
          preparationTime: 24,
          category: "Hoodies"
        },
        quantity: 1,
        selectedSize: "M",
        selectedColor: "Matte Black"
      }
    ],
    status: "Preparing",
    totalAmount: 9200,
    timestamp: "2026-06-06T07:12:00.000Z",
    notes: "Will pick up from the Galleria del Corso storefront at 5 PM."
  },
  {
    id: "O-8376",
    orderNumber: "8376",
    customerName: "Matteo Ricci",
    phone: "+39 333 223 3445",
    email: "matteo.ricci@gmail.com",
    serviceType: "pickup",
    items: [
      {
        id: "M3-normal",
        menuItem: {
          id: "M3",
          name: "Milano Minimalist Tee",
          description: "Luxury soft-spun combed cotton tee with drop-shoulder silhouette and a premium minimalist clean embroidered branding on the left chest.",
          image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
          price: 4200,
          availability: true,
          preparationTime: 12,
          category: "T-Shirts"
        },
        quantity: 1,
        selectedSize: "XL",
        selectedColor: "Jet Black"
      },
      {
        id: "M9-normal",
        menuItem: {
          id: "M9",
          name: "Eight-Pocket Ripstop Cargo Pants",
          description: "Hard-wearing streetwear cargo pants featuring modular flap-cover side bags, integrated webbing belts, and multi-point drawstrings for custom fitting.",
          image: "https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&w=600&q=80",
          price: 7800,
          availability: true,
          preparationTime: 24,
          category: "Cargo Pants"
        },
        quantity: 1,
        selectedSize: "32",
        selectedColor: "Off-Black"
      }
    ],
    status: "Pending",
    totalAmount: 12000,
    timestamp: "2026-06-06T07:25:00.000Z",
    notes: "Gift wrapping with signature Velora Street ribbon, please!"
  }
];

let reservations: Reservation[] = [
  {
    id: "R-101",
    customerName: "Andrea Conti",
    phone: "+39 333 909 1920",
    email: "andrea.conti@gmail.com",
    date: "2026-06-15",
    time: "14:00",
    guests: 1,
    specialRequests: "Exclusive styling consult slot requested.",
    status: "Confirmed",
    tableNumber: "VIP Styling Suite 1",
    timestamp: "2026-06-05T14:20:00.000Z"
  }
];

let reviews: CustomerReview[] = [
  {
    id: "Rev1",
    name: "Marco Bellini",
    rating: 5,
    comment: "The fabrics on the Gothic Hoodie are simply unbelievable! 450GSM feels super heavy and sits perfectly. This is the first genuine high-end streetwear brand made in Italy. Absolute respect!",
    date: "2026-06-04",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "Rev2",
    name: "Sofia Marchetti",
    rating: 5,
    comment: "Love the Milano Minimalist Tee! Sizing is perfectly oversized and cotton texture feels like premium luxury. Picked it up directly in Galleria del Corso, beautiful store design too.",
    date: "2026-06-01",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "Rev3",
    name: "Paolo Neri",
    rating: 4.8,
    comment: "Velora Element runners fit true to size. Delivery took only 24 hours across Milano, packed extremely professionally with biodegradable covers. Excellent job team!",
    date: "2025-12-25",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80"
  }
];

let notifications: SystemNotification[] = [
  {
    id: "N-1",
    type: "sms",
    recipient: "+39 661 23 45 67",
    title: "Order Processed",
    message: "Ciao Marco! Your Velora Street order 8374 has been dispatched via courier. Track it real-time in your dashboard. Thank you for shopping with us!",
    timestamp: "2026-06-06T06:45:00.000Z",
    status: "Sent"
  }
];

// Synchronize all collections with Firestore on startup
async function loadAllFromDatabase() {
  const firestore = getDb();
  if (!firestore) {
    console.warn("Skipping Firestore sync (configuration not found or failed initialization)");
    return;
  }

  console.log("Synchronizing Firestore collections...");

  const collections = [
    { key: "menu", local: menuItems, setter: (val: any) => menuItems = val },
    { key: "drivers", local: drivers, setter: (val: any) => drivers = val },
    { key: "inventory", local: inventory, setter: (val: any) => inventory = val },
    { key: "customers", local: customers, setter: (val: any) => customers = val },
    { key: "reservations", local: reservations, setter: (val: any) => reservations = val },
    { key: "orders", local: orders, setter: (val: any) => orders = val },
    { key: "reviews", local: reviews, setter: (val: any) => reviews = val },
    { key: "notifications", local: notifications, setter: (val: any) => notifications = val }
  ];

  for (const col of collections) {
    try {
      const snap = await getDocs(collection(firestore, col.key));
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        
        // Sorting
        if (col.key === "menu") {
          list.sort((a, b) => a.id.localeCompare(b.id));
        } else if (col.key === "orders" || col.key === "notifications") {
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } else if (col.key === "reviews") {
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (col.key === "reservations") {
          list.sort((a, b) => {
            const timeA = new Date((a.date + "T" + a.time) as string).getTime();
            const timeB = new Date((b.date + "T" + b.time) as string).getTime();
            return timeB - timeA;
          });
        } else if (col.key === "drivers" || col.key === "inventory" || col.key === "customers") {
          list.sort((a, b) => a.id.localeCompare(b.id));
        }

        col.setter(list);
        console.log(`Successfully restored ${list.length} records from Firestore collection: ${col.key}`);
      } else {
        // Seeding database
        console.log(`Firestore collection '${col.key}' is empty. Auto-seeding default items...`);
        for (const docData of col.local) {
          await setDoc(doc(firestore, col.key, docData.id), docData);
        }
      }
    } catch (err) {
      console.error(`Failed to synchronize collection '${col.key}':`, err);
    }
  }
}

// Helper to trigger virtual SMS/WhatsApp/Email logger
function triggerNotification(type: 'email' | 'sms' | 'whatsapp', recipient: string, title: string, message: string) {
  const newNotif: SystemNotification = {
    id: "N-" + Math.floor(100+Math.random()*900),
    type,
    recipient,
    title,
    message,
    timestamp: new Date().toISOString(),
    status: "Sent"
  };
  notifications.unshift(newNotif);
  persistDoc("notifications", newNotif.id, newNotif);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Connect and sync database from Firebase
  await loadAllFromDatabase();

  // === API ROUTES ===

  // 1. Menu Management
  app.get("/api/menu", (req, res) => {
    res.json(menuItems);
  });

  app.post("/api/menu", (req, res) => {
    const item: MenuItem = {
      id: "M" + (menuItems.length + 1),
      ...req.body,
      price: Number(req.body.price),
      preparationTime: Number(req.body.preparationTime || 10),
      availability: req.body.availability !== undefined ? req.body.availability : true
    };
    menuItems.push(item);
    persistDoc("menu", item.id, item);
    res.status(201).json(item);
  });

  app.put("/api/menu/:id", (req, res) => {
    const { id } = req.params;
    const index = menuItems.findIndex(m => m.id === id);
    if (index !== -1) {
      menuItems[index] = { ...menuItems[index], ...req.body };
      persistDoc("menu", id, menuItems[index]);
      res.json(menuItems[index]);
    } else {
      res.status(404).json({ error: "Menu item not found" });
    }
  });

  app.delete("/api/menu/:id", (req, res) => {
    const { id } = req.params;
    menuItems = menuItems.filter(m => m.id !== id);
    removeDoc("menu", id);
    res.json({ success: true, id });
  });

  // 2. Orders Management
  app.get("/api/orders", (req, res) => {
    res.json(orders);
  });

  app.post("/api/orders", (req, res) => {
    const { customerName, phone, email, deliveryAddress, serviceType, items, notes } = req.body;
    
    // Calculate total
    const totalAmount = items.reduce((sum: number, it: any) => sum + (it.menuItem.price * it.quantity), 0);
    const orderNum = Math.floor(1000 + Math.random() * 9000).toString();
    
    const newOrder: Order = {
      id: "O-" + orderNum,
      orderNumber: orderNum,
      customerName,
      phone,
      email,
      deliveryAddress,
      serviceType: serviceType || "delivery",
      items,
      status: "Pending",
      totalAmount,
      timestamp: new Date().toISOString(),
      notes
    };

    orders.unshift(newOrder);
    persistDoc("orders", newOrder.id, newOrder);

    // CRM synchronization
    const existingCust = customers.find(c => c.phone === phone || c.email === email);
    if (existingCust) {
      existingCust.totalOrders += 1;
      existingCust.totalSpending += totalAmount;
      existingCust.lastOrder = new Date().toISOString().split('T')[0];
      existingCust.loyaltyPoints += Math.floor(totalAmount * 0.1); // 10% points
      items.forEach((it: any) => {
        if (!existingCust.favoriteItems.includes(it.menuItem.name)) {
          existingCust.favoriteItems.push(it.menuItem.name);
        }
      });
      // Update segment
      if (existingCust.totalOrders >= 15) {
        existingCust.segment = "VIP";
      } else if (existingCust.totalOrders >= 3) {
        existingCust.segment = "Regular";
      }
      persistDoc("customers", existingCust.id, existingCust);
    } else {
      // Create new customer entry in CRM
      const newCust: Customer = {
        id: "C" + (customers.length + 1),
        name: customerName,
        phone,
        email: email || "",
        address: deliveryAddress || "",
        totalOrders: 1,
        totalSpending: totalAmount,
        lastOrder: new Date().toISOString().split('T')[0],
        loyaltyPoints: Math.floor(totalAmount * 0.1),
        favoriteItems: items.map((it: any) => it.menuItem.name),
        segment: "New"
      };
      customers.push(newCust);
      persistDoc("customers", newCust.id, newCust);
    }

    // Trigger Notification Simulator
    triggerNotification(
      "sms", 
      phone, 
      "Order Received", 
      `Ciao ${customerName}! Your Velora Street order #${orderNum} has been received and is transitionally queued. (Total: ${totalAmount} EUR). Track: https://velorastreet.it/track`
    );

    // If there is an email, notify there as well
    if (email) {
      triggerNotification(
        "email",
        email,
        "Order Invoice - #" + orderNum,
        `Grazie, thank you for investing in Velora Street! We are preparing your order #${orderNum}. Total Invoice: ${totalAmount} EUR.`
      );
    }

    // Deduct stock levels in local inventory
    items.forEach((it: any) => {
      // Apparel stock tracking reduction
      const labels = inventory.find(i => i.id === 'I4');
      const bags = inventory.find(i => i.id === 'I8');
      if (labels) labels.stockLevel = Math.max(0, labels.stockLevel - it.quantity);
      if (bags) bags.stockLevel = Math.max(0, bags.stockLevel - it.quantity);

      if (it.menuItem.category === 'Hoodies') {
        const fleece = inventory.find(i => i.id === 'I1');
        if (fleece) fleece.stockLevel = Math.max(0, fleece.stockLevel - it.quantity);
      } else if (it.menuItem.category === 'T-Shirts') {
        const blanks = inventory.find(i => i.id === 'I2');
        if (blanks) blanks.stockLevel = Math.max(0, blanks.stockLevel - it.quantity);
      } else if (it.menuItem.category === 'Sneakers') {
        const leather = inventory.find(i => i.id === 'I3');
        if (leather) leather.stockLevel = Math.max(0, leather.stockLevel - (0.2 * it.quantity));
      }
    });

    // Recalculate inventory thresholds
    inventory.forEach(i => {
      if (i.stockLevel <= i.reorderLevel * 0.5) {
        i.status = "critical";
      } else if (i.stockLevel <= i.reorderLevel) {
        i.status = "low";
      } else if (i.stockLevel >= i.reorderLevel * 2) {
        i.status = "good";
      } else {
        i.status = "adequate";
      }
      // Persist stock update in Firestore
      persistDoc("inventory", i.id, i);
    });

    res.status(201).json(newOrder);
  });

  app.put("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { status, driverId } = req.body;
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      const originalStatus = orders[index].status;
      orders[index] = { ...orders[index], ...req.body };

      // Driver management updates
      if (driverId) {
        // Free prior driver
        const currentDriverId = orders[index].driverId;
        if (currentDriverId) {
          const dOld = drivers.find(d => d.id === currentDriverId);
          if (dOld) {
            dOld.status = "Available";
            persistDoc("drivers", dOld.id, dOld);
          }
        }
        
        // Bind new driver
        const dNew = drivers.find(d => d.id === driverId);
        if (dNew) {
          dNew.status = "On Delivery";
          dNew.currentOrderId = id;
          persistDoc("drivers", dNew.id, dNew);
        }
      }

      // Automatically liberate driver if delivered or cancelled
      if (status === "Delivered" || status === "Cancelled") {
        const activeDriverId = orders[index].driverId;
        if (activeDriverId) {
          const activeD = drivers.find(d => d.id === activeDriverId);
          if (activeD) {
            activeD.status = "Available";
            activeD.currentOrderId = undefined;
            persistDoc("drivers", activeD.id, activeD);
          }
        }
      }

      // Notify customer if status shifted
      if (status && status !== originalStatus) {
        let textMsg = "";
        let notifType: 'sms' | 'whatsapp' = "sms";

        if (status === "Confirmed") {
          textMsg = `Your Velora Street order #${orders[index].orderNumber} has been CONFIRMED. Our studio is preparing to pack or custom-tailor your fit!`;
        } else if (status === "Preparing") {
          textMsg = `Our styling consultants are preparing and inspecting your items. Quality check estimate: ${orders[index].items[0]?.menuItem?.preparationTime || 24} hours.`;
        } else if (status === "Ready") {
          textMsg = `Excellent news! Your Velora Street order #${orders[index].orderNumber} is beautifully packed and READY for courier dispatch/in-store pickup!`;
        } else if (status === "Out for Delivery") {
          const dName = drivers.find(d => d.id === orders[index].driverId)?.name || "Our courier";
          textMsg = `Our private courier ${dName} has left the Galleria del Corso store with your order #${orders[index].orderNumber}. Stand by!`;
          notifType = "whatsapp"; // Use WhatsApp for out for delivery live alert simulation
        } else if (status === "Delivered") {
          textMsg = `Your Velora Street order #${orders[index].orderNumber} has been successfully DELIVERED. Enjoy your new premium fit!`;
        } else if (status === "Cancelled") {
          textMsg = `We apologize! Your Velora Street order #${orders[index].orderNumber} is cancelled. Please visit our Galleria del Corso store or call for instant help.`;
        }

        if (textMsg) {
          triggerNotification(notifType, orders[index].phone, `Order Update: ${status}`, textMsg);
        }
      }

      persistDoc("orders", id, orders[index]);
      res.json(orders[index]);
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  // 3. Table Reservation
  app.get("/api/reservations", (req, res) => {
    res.json(reservations);
  });

  app.post("/api/reservations", (req, res) => {
    const { customerName, phone, email, date, time, guests, specialRequests } = req.body;
    
    const newRes: Reservation = {
      id: "R-" + Math.floor(100 + Math.random() * 900),
      customerName,
      phone,
      email,
      date,
      time,
      guests: Number(guests),
      specialRequests,
      status: "Pending",
      timestamp: new Date().toISOString()
    };

    reservations.unshift(newRes);
    persistDoc("reservations", newRes.id, newRes);

    // Register SMS notification
    triggerNotification(
      "sms", 
      phone, 
      "Table Reservation Received", 
      `Dear ${customerName}, your seat booking request for ${guests} guests on ${date} at ${time} has been received. Our team will verify table availability shortly.`
    );

    res.status(201).json(newRes);
  });

  app.put("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    const { status, tableNumber } = req.body;
    const index = reservations.findIndex(r => r.id === id);
    if (index !== -1) {
      const oldStatus = reservations[index].status;
      reservations[index] = { ...reservations[index], ...req.body };

      // Notify customer of system updates
      if (status && status !== oldStatus) {
        let msg = "";
        let type: 'sms' | 'whatsapp' | 'email' = "sms";

        if (status === "Confirmed") {
          msg = `Excellent news ${reservations[index].customerName}! Your VIP Styling & Fitting consult booking at Velora Street Brera for ${reservations[index].guests} guests on ${reservations[index].date} at ${reservations[index].time} is CONFIRMED. ${tableNumber ? 'Your styling suite is: ' + tableNumber : ''}`;
          type = "whatsapp";
        } else if (status === "Cancelled") {
          msg = `Greetings, we regret to inform you that your styling session request at Velora Street Milano for ${reservations[index].guests} guests has been Cancelled. Please schedule another slot or call +39 02 8765 4321.`;
          type = "email";
        } else if (status === "Completed") {
          msg = `Thank you for visiting us at Velora Street Galleria del Corso today! We hope you enjoyed our premium bespoke styling experience. Loyalty points updated.`;
        }

        if (msg) {
          triggerNotification(type, reservations[index].phone, `Reservation Update: ${status}`, msg);
        }
      }

      persistDoc("reservations", id, reservations[index]);
      res.json(reservations[index]);
    } else {
      res.status(404).json({ error: "Reservation not found" });
    }
  });

  // 4. CRM Details
  app.get("/api/customers", (req, res) => {
    res.json(customers);
  });

  // 4a. Customer Account Auth System
  app.post("/api/auth/register", (req, res) => {
    const { name, phone, email, address, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: "Name, phone, email, and password are required." });
    }

    const emailLower = email.toLowerCase();
    const existing = customers.find(c => c.email.toLowerCase() === emailLower || c.phone === phone);

    if (existing) {
      if (existing.password) {
        return res.status(400).json({ error: "An account with this email or phone number already exists." });
      } else {
        // Convert previous offline guest checkout to an online authenticated profile, preserving order histories!
        existing.name = name;
        if (address) existing.address = address;
        existing.password = password;
        
        triggerNotification(
          "sms",
          phone,
          "Account Registered",
          `Ciao ${name}! Your Velora Street profile is now fully verified. Log in anytime with your credentials!`
        );
        persistDoc("customers", existing.id, existing);
        return res.json(existing);
      }
    }

    const newCust: Customer = {
      id: "C" + (customers.length + 1),
      name,
      phone,
      email: emailLower,
      address: address || "",
      password,
      totalOrders: 0,
      totalSpending: 0,
      loyaltyPoints: 0,
      favoriteItems: [],
      segment: "New"
    };

    customers.push(newCust);
    persistDoc("customers", newCust.id, newCust);

    triggerNotification(
      "sms",
      phone,
      "Account Created",
      `Welcome to Velora Street Milano, ${name}! Your account has been created. Start shopping to earn VIP loyalty rewards.`
    );

    res.status(201).json(newCust);
  });

  app.post("/api/auth/login", (req, res) => {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: "Email/phone and password are required." });
    }

    const queryLower = emailOrPhone.toLowerCase();
    const user = customers.find(c => 
      (c.email.toLowerCase() === queryLower || c.phone === emailOrPhone) && 
      c.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials or password. Try '123' for test accounts." });
    }

    res.json(user);
  });

  app.post("/api/auth/update-profile", (req, res) => {
    const { id, name, phone, email, address, password } = req.body;
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (name) customers[index].name = name;
    if (phone) customers[index].phone = phone;
    if (email) customers[index].email = email.toLowerCase();
    if (address !== undefined) customers[index].address = address;
    if (password) customers[index].password = password;
    if (req.body.loyaltyPoints !== undefined) customers[index].loyaltyPoints = req.body.loyaltyPoints;

    persistDoc("customers", id, customers[index]);
    res.json(customers[index]);
  });

  // 4b. Customer Order History
  app.get("/api/orders/customer", (req, res) => {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.status(400).json({ error: "Email or phone query parameter is required." });
    }

    const emailLower = email ? (email as string).toLowerCase() : "";
    
    const matchedOrders = orders.filter(o => {
      const emailMatches = emailLower && o.email?.toLowerCase() === emailLower;
      const phoneMatches = phone && o.phone === phone;
      return emailMatches || phoneMatches;
    });

    res.json(matchedOrders);
  });

  // 5. Inventory Management
  app.get("/api/inventory", (req, res) => {
    res.json(inventory);
  });

  app.put("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const { stockLevel, lastRestocked } = req.body;
    const index = inventory.findIndex(i => i.id === id);
    if (index !== -1) {
      inventory[index].stockLevel = Number(stockLevel);
      if (lastRestocked) {
        inventory[index].lastRestocked = lastRestocked;
      }
      
      // Update status tag
      const i = inventory[index];
      if (i.stockLevel <= i.reorderLevel * 0.5) {
        i.status = "critical";
      } else if (i.stockLevel <= i.reorderLevel) {
        i.status = "low";
      } else if (i.stockLevel >= i.reorderLevel * 2) {
        i.status = "good";
      } else {
        i.status = "adequate";
      }

      persistDoc("inventory", id, inventory[index]);
      res.json(inventory[index]);
    } else {
      res.status(404).json({ error: "Ingredient not found" });
    }
  });

  // 6. Drivers
  app.get("/api/drivers", (req, res) => {
    res.json(drivers);
  });

  // 7. Customers Reviews
  app.get("/api/reviews", (req, res) => {
    res.json(reviews);
  });

  app.post("/api/reviews", (req, res) => {
    const { name, rating, comment } = req.body;
    const newReview: CustomerReview = {
      id: "Rev" + Math.floor(100+Math.random()*900),
      name: name || "Anonymous Diner",
      rating: Number(rating) || 5,
      comment,
      date: new Date().toISOString().split('T')[0],
      verified: true
    };
    reviews.unshift(newReview);
    persistDoc("reviews", newReview.id, newReview);
    res.status(201).json(newReview);
  });

  // 8. Notifications Log
  app.get("/api/notifications", (req, res) => {
    res.json(notifications);
  });

  app.post("/api/notifications/test-campaign", (req, res) => {
    const { channel, message, segment } = req.body;
    const targetedUsers = customers.filter(c => segment === 'All' || c.segment === segment);
    
    targetedUsers.forEach(u => {
      triggerNotification(
        channel || "sms",
        channel === "email" ? u.email : u.phone,
        "Exclusive Velora Street Offer",
        message.replace("{name}", u.name).replace("{points}", u.loyaltyPoints.toString())
      );
    });

    res.json({ success: true, count: targetedUsers.length });
  });

  // 9. Analytics Summary Feed
  app.get("/api/analytics", (req, res) => {
    // Current calculation
    const today = new Date().toISOString().split('T')[0];
    
    // Revenue calculations
    const todayOrders = orders.filter(o => o.timestamp.startsWith(today) && o.status !== "Cancelled");
    const revenueToday = todayOrders.reduce((acc, o) => acc + o.totalAmount, 0);

    const totalRevenueOverall = orders
      .filter(o => o.status !== "Cancelled")
      .reduce((acc, o) => acc + o.totalAmount, 0);

    const totalOrdersCount = orders.length;
    const activeReservationsToday = reservations.filter(r => r.date === today && r.status !== "Cancelled").length;
    
    // Critical inputs
    const lowStockAlertsCount = inventory.filter(i => i.status === "critical" || i.status === "low").length;

    // Aggregate dishes frequency
    const dishTally: Record<string, number> = {};
    orders.filter(o => o.status !== "Cancelled").forEach(o => {
      o.items.forEach(it => {
        dishTally[it.menuItem.name] = (dishTally[it.menuItem.name] || 0) + it.quantity;
      });
    });

    const popularDishes = Object.entries(dishTally)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    res.json({
      metrics: {
        revenueToday,
        totalRevenueOverall,
        ordersTodayCount: todayOrders.length,
        totalOrdersCount,
        reservationsTodayCount: activeReservationsToday,
        totalReservationsCount: reservations.length,
        lowStockItems: lowStockAlertsCount,
        totalCustomers: customers.length,
      },
      popularDishes,
      revenueHistory: [
        { label: "Mon", revenue: 42000, orders: 12 },
        { label: "Tue", revenue: 48000, orders: 15 },
        { label: "Wed", revenue: 51000, orders: 16 },
        { label: "Thu", revenue: 65000, orders: 22 },
        { label: "Fri", revenue: 89000, orders: 34 },
        { label: "Sat", revenue: 104000, orders: 45 },
        { label: "Sun (Today)", revenue: revenueToday, orders: todayOrders.length },
      ],
      reservationSegments: [
        { label: "Pending", count: reservations.filter(r => r.status === "Pending").length },
        { label: "Confirmed", count: reservations.filter(r => r.status === "Confirmed").length },
        { label: "Completed", count: reservations.filter(r => r.status === "Completed").length },
      ],
      customerSegments: {
        new: customers.filter(c => c.segment === "New").length,
        regular: customers.filter(c => c.segment === "Regular").length,
        vip: customers.filter(c => c.segment === "VIP").length,
      }
    });
  });

  // Vite development middleware vs Static Production bundle
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Velora Street Fullstack Server running on http://localhost:${PORT}`);
  });
}

startServer();
