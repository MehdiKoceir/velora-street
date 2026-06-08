export type ServiceType = 'delivery' | 'pickup' | 'takeaway' | 'dinein' | 'drivethrough' | 'catering';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export type CustomerSegment = 'New' | 'Regular' | 'VIP';

export type IngredientStatus = 'critical' | 'low' | 'adequate' | 'good';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  availability: boolean;
  preparationTime: number; // dispatch/preparation hours or minutes
  category: 'Hoodies' | 'T-Shirts' | 'Outerwear' | 'Sneakers' | 'Caps' | 'Cargo Pants';
  sizes?: string[];
  colors?: string[];
  rating?: number;
  reviewsCount?: number;
}

export interface CartItem {
  id: string; // Dynamic combination of item id and options description
  menuItem: MenuItem;
  quantity: number;
  customizationNotes?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  deliveryAddress?: string;
  serviceType: ServiceType;
  items: CartItem[];
  status: OrderStatus;
  totalAmount: number;
  timestamp: string; // ISO String
  notes?: string;
  driverId?: string;
  rating?: number;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  guests: number;
  specialRequests?: string;
  status: ReservationStatus;
  tableNumber?: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  password?: string; // Optional password for Customer Account Sign-in
  totalOrders: number;
  totalSpending: number;
  lastOrder?: string; // YYYY-MM-DD
  loyaltyPoints: number;
  favoriteItems: string[]; // menuItem names
  segment: CustomerSegment;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'Available' | 'On Delivery' | 'Offline';
  currentOrderId?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  stockLevel: number;
  unit: string;
  reorderLevel: number;
  supplier: string;
  pricePerUnit: number;
  lastRestocked: string; // Date
  status: IngredientStatus;
}

export interface CustomerReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  avatar?: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  code: string;
}

export interface SystemNotification {
  id: string;
  type: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  title: string;
  message: string;
  timestamp: string;
  status: 'Sent' | 'Failed';
}
