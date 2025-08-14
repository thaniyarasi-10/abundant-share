// Type definitions for the Surplus Food Sharing Platform

export type UserRole = 'donor' | 'ngo' | 'admin';

export type FoodCategory = 
  | 'vegetables'
  | 'fruits' 
  | 'grains'
  | 'dairy'
  | 'meat'
  | 'bakery'
  | 'prepared_food'
  | 'other';

export type ListingStatus = 'available' | 'claimed' | 'completed' | 'expired';

export type NotificationType = 
  | 'new_listing'
  | 'listing_claimed'
  | 'pickup_scheduled'
  | 'pickup_completed'
  | 'listing_expired';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  organization_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FoodListing {
  id: string;
  donor_id: string;
  title: string;
  description: string;
  quantity: string;
  category: FoodCategory;
  expiry_date: string;
  pickup_time_start: string;
  pickup_time_end: string;
  pickup_location: string;
  status: ListingStatus;
  claimed_by?: string;
  claimed_at?: string;
  completed_at?: string;
  images: string[];
  created_at: string;
  updated_at: string;
  // Relations
  profiles?: Profile;
  claimed_by_profile?: Profile;
}

export interface Claim {
  id: string;
  listing_id: string;
  claimed_by: string;
  claimed_at: string;
  pickup_scheduled_at?: string;
  completed_at?: string;
  notes?: string;
  // Relations
  food_listings?: FoodListing;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  listing_id?: string;
  read: boolean;
  created_at: string;
  // Relations
  food_listings?: FoodListing;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface PlatformStats {
  id: string;
  total_meals_served: number;
  total_food_saved_kg: number;
  total_ngos_onboarded: number;
  updated_at: string;
}

export interface AuthContextType {
  user: any;
  session: any;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}