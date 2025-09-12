import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FoodListing, FoodCategory } from '@/types';
import { MapPin, Clock, Package, Search, Filter, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const Browse: React.FC = () => {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');

  // Real-time subscription for food listings
  useRealtimeSubscription({
    table: 'food_listings',
    event: '*',
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT' && payload.new.status === 'available') {
        setListings(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setListings(prev => prev.map(listing => 
          listing.id === payload.new.id ? payload.new : listing
        ).filter(listing => listing.status === 'available'));
      } else if (payload.eventType === 'DELETE') {
        setListings(prev => prev.filter(listing => listing.id !== payload.old.id));
      }
    }
  });

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, categoryFilter, locationFilter]);

  const fetchListings = async () => {
    setLoading(true);
    
    try {
      const { data } = await supabase
        .from('food_listings')
        .select(`
          *,
          profiles:donor_id (full_name, organization_name, phone)
        `)
        .eq('status', 'available')
        .gte('expiry_date', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (data) {
        setListings(data as any[]);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch food listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = listings;

    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.pickup_location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(listing => listing.category === categoryFilter);
    }

    if (locationFilter) {
      filtered = filtered.filter(listing =>
        listing.pickup_location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredListings(filtered);
  };

  const handleClaim = async (listingId: string, quantity?: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to claim food donations",
        variant: "destructive",
      });
      return;
    }

    // Check if user is a donor trying to claim their own food
    const listing = listings.find(l => l.id === listingId);
    if (listing?.donor_id === user.id) {
      toast({
        title: "Cannot claim own food",
        description: "Donors cannot claim their own food donations",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create claim with improved data
      const { error: claimError } = await supabase
        .from('claims')
        .insert({
          listing_id: listingId,
          claimed_by: user.id,
          quantity_requested: quantity || 1,
          status: 'pending'
        });

      if (claimError) throw claimError;

      // Update listing status
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({ 
          status: 'claimed',
          claimed_by: user.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (updateError) throw updateError;

      toast({
        title: "Successfully claimed!",
        description: "You have successfully claimed this food donation. Check your dashboard for pickup details.",
      });

      // Refresh listings
      fetchListings();
    } catch (error) {
      console.error('Error claiming listing:', error);
      toast({
        title: "Error",
        description: "Failed to claim the food donation",
        variant: "destructive",
      });
    }
  };

  const foodCategories: { value: FoodCategory | 'all'; label: string }[] = [
    { label: "All Categories", value: "all" },
    { label: "Vegetarian", value: "veg" },
    { label: "Non-Vegetarian", value: "non_veg" },
    { label: "Dairy", value: "dairy" },
    { label: "Bakery", value: "bakery" },
    { label: "Packaged", value: "packaged" },
    { label: "Cooked", value: "cooked" },
    { label: "Other", value: "other" },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading available food...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold mb-2">Browse Available Food</h1>
        <p className="text-muted-foreground">
          Find food donations available in your area
        </p>
      </motion.div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search food..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {foodCategories.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={() => {
          setSearchTerm('');
          setCategoryFilter('all');
          setLocationFilter('');
        }}>
          Clear Filters
        </Button>
      </div>

      {/* Results */}
      <div className="grid gap-6">
        {filteredListings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No food available</h3>
              <p className="text-muted-foreground">
                {listings.length === 0 
                  ? "There are currently no food donations available." 
                  : "No food matches your current filters. Try adjusting your search criteria."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredListings.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="hover-scale">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{listing.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {listing.description}
                      </CardDescription>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      Available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Quantity: {listing.quantity}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {listing.category}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Expires: {format(new Date(listing.expiry_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{listing.pickup_location}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        Pickup: {format(new Date(listing.pickup_time_start), 'MMM dd, HH:mm')} - 
                        {format(new Date(listing.pickup_time_end), 'HH:mm')}
                      </span>
                    </div>
                  </div>

                  {listing.profiles && (
                    <div className="p-3 bg-muted rounded-lg mb-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Donated by: {listing.profiles.full_name}
                          {listing.profiles.organization_name && ` (${listing.profiles.organization_name})`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    {user && listing.donor_id !== user.id ? (
                      <Button 
                        onClick={() => handleClaim(listing.id)}
                        className="hover-scale"
                      >
                        Claim This Food
                      </Button>
                    ) : !user ? (
                      <Button 
                        onClick={() => window.location.href = '/auth'}
                        className="hover-scale"
                      >
                        Sign In to Claim
                      </Button>
                    ) : (
                      <Button disabled>
                        {listing.donor_id === user.id ? 'Cannot claim own food' : 'Already claimed by you'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Browse;