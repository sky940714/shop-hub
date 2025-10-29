// types/index.ts

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface Order {
  id: string;
  customerName: string;
  products: string[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  date: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  joinDate: string;
}

export interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalMembers: number;
  totalRevenue: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';

export interface OrderStatusConfig {
  label: string;
  color: string;
}