export type LeadStatus =
  | 'new'
  | 'overdue'
  | 'today'
  | 'followup'
  | 'inprocess'
  | 'converted'
  | 'dead';

export type PaymentStatus = 'paid' | 'unpaid';

export type UserRole = 'admin' | 'employee';

export interface Lead {
  id: string;
  slNo: number;
  date: string;
  name: string;
  mobileNumber: string;
  email: string;
  district: string;
  service: string;
  amount: number;
  paymentStatus: PaymentStatus;
  assignedTo: string;
  status: LeadStatus;
  address: string;
  source: string;
  notes: Note[];
  followUpDate?: string;
  createdAt: string;
  // Name of the logged-in user who created this lead from the admin panel.
  // Mirrors assignedTo at creation time, but stays put if admin reassigns
  // the lead later — so the original creator is always recoverable.
  createdBy?: string;
  // Last refund recorded for this lead (₹). A note is added alongside for
  // an audit trail, but the field gives a quick numeric indicator.
  refundAmount?: number;
  // website-lead specific fields
  leadType?: 'website' | 'manual';
  time?: string;
  orderId?: string;
  applyingFor?: string;
  gender?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  educationQualification?: string;
  employmentType?: string;
  state?: string;
  pinCode?: string;
  nearbyPoliceStation?: string;
  // flexible store for any extra service-specific form fields
  formData?: Record<string, string>;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface User {
  id: string;
  slNo: number;
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  status: 'active' | 'inactive';
  phone?: string;
  createdAt: string;
}

export interface Blog {
  id: string;
  slNo: number;
  title: string;
  image: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  createdAt: string;
  status: 'published' | 'draft';
  // website-facing fields
  category?: string;
  excerpt?: string;
  slug?: string;
  readTime?: string;
}

export type CareerType = 'Full-time' | 'Part-time' | 'Internship' | 'Contract';

export interface Career {
  id: string;
  slNo: number;
  title: string;
  slug: string;
  department: string;
  type: CareerType;
  location: string;
  experience: string;
  description: string;
  tags: string[];
  status: 'open' | 'closed';
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}
