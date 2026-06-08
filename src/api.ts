import { 
  MenuItem, Order, Reservation, Customer, 
  Ingredient, CustomerReview, SystemNotification, Driver
} from "./types";

const BASE_URL = ""; // Relative paths will target our server automatically

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${BASE_URL}/api/menu`);
  if (!res.ok) throw new Error("Failed to fetch menu");
  return res.json();
}

export async function createMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
  const res = await fetch(`${BASE_URL}/api/menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error("Failed to create menu item");
  return res.json();
}

export async function updateMenuItem(id: string, item: Partial<MenuItem>): Promise<MenuItem> {
  const res = await fetch(`${BASE_URL}/api/menu/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error("Failed to update menu item");
  return res.json();
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/menu/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete menu item");
  return true;
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${BASE_URL}/api/orders`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function createOrder(orderData: {
  customerName: string;
  phone: string;
  email: string;
  deliveryAddress?: string;
  serviceType: string;
  items: Array<{ menuItem: MenuItem; quantity: number; customizationNotes?: string }>;
  notes?: string;
}): Promise<Order> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) throw new Error("Failed to place order");
  return res.json();
}

export async function updateOrder(id: string, updateData: Partial<Order>): Promise<Order> {
  const res = await fetch(`${BASE_URL}/api/orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error("Failed to update order");
  return res.json();
}

export async function fetchReservations(): Promise<Reservation[]> {
  const res = await fetch(`${BASE_URL}/api/reservations`);
  if (!res.ok) throw new Error("Failed to fetch reservations");
  return res.json();
}

export async function createReservation(resData: {
  customerName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  specialRequests?: string;
}): Promise<Reservation> {
  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resData)
  });
  if (!res.ok) throw new Error("Failed to schedule reservation");
  return res.json();
}

export async function updateReservation(id: string, updateData: Partial<Reservation>): Promise<Reservation> {
  const res = await fetch(`${BASE_URL}/api/reservations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error("Failed to update reservation");
  return res.json();
}

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch(`${BASE_URL}/api/customers`);
  if (!res.ok) throw new Error("Failed to fetch CRM customers");
  return res.json();
}

export async function fetchInventory(): Promise<Ingredient[]> {
  const res = await fetch(`${BASE_URL}/api/inventory`);
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
}

export async function updateInventoryItem(id: string, stockLevel: number, lastRestocked?: string): Promise<Ingredient> {
  const res = await fetch(`${BASE_URL}/api/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stockLevel, lastRestocked })
  });
  if (!res.ok) throw new Error("Failed to update inventory ingredient");
  return res.json();
}

export async function fetchDrivers(): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/api/drivers`);
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
}

export async function fetchReviews(): Promise<CustomerReview[]> {
  const res = await fetch(`${BASE_URL}/api/reviews`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function submitReview(review: { name: string; rating: number; comment: string }): Promise<CustomerReview> {
  const res = await fetch(`${BASE_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review)
  });
  if (!res.ok) throw new Error("Failed to submit review");
  return res.json();
}

export async function fetchNotifications(): Promise<SystemNotification[]> {
  const res = await fetch(`${BASE_URL}/api/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notify logs");
  return res.json();
}

export async function triggerCampaign(data: { channel: string; message: string; segment: string }): Promise<{ success: boolean; count: number }> {
  const res = await fetch(`${BASE_URL}/api/notifications/test-campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to execute promotional campaign");
  return res.json();
}

export async function fetchAnalytics(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/analytics`);
  if (!res.ok) throw new Error("Failed to compile analytics feed");
  return res.json();
}

export async function customerRegister(data: any): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to register account");
  }
  return res.json();
}

export async function customerLogin(data: any): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to login");
  }
  return res.json();
}

export async function customerUpdateProfile(data: any): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/api/auth/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update profile");
  }
  return res.json();
}

export async function fetchCustomerOrders(email: string, phone: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (email) params.append("email", email);
  if (phone) params.append("phone", phone);
  
  const res = await fetch(`${BASE_URL}/api/orders/customer?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch customer orders history");
  return res.json();
}
