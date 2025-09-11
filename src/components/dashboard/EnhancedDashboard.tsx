import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpactStats } from '@/hooks/useImpactStats';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { FoodListing, Claim } from '@/types';
import { Plus, TrendingUp, Award, Heart, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const EnhancedDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { impact, loading: impactLoading } = useImpactStats();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time subscriptions
  useRealtimeSubscription({
    table: 'food_listings',
    event: '*',
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        setListings(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setListings(prev => prev.map(listing => 
          listing.id === payload.new.id ? payload.new : listing
        ));
      } else if (payload.eventType === 'DELETE') {
        setListings(prev => prev.filter(listing => listing.id !== payload.old.id));
      }
    }
  });

  useRealtimeSubscription({
    table: 'claims',
    event: '*',
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        setClaims(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setClaims(prev => prev.map(claim => 
          claim.id === payload.new.id ? payload.new : claim
        ));
      }
    }
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch listings based on user role
        if (profile?.role === 'donor' || profile?.role === 'admin') {
          const { data: listingsData } = await supabase
            .from('food_listings')
            .select('*')
            .eq('donor_id', user.id)
            .order('created_at', { ascending: false });
          
          if (listingsData) setListings(listingsData as any);
        }

        // Fetch claims
        if (profile?.role === 'recipient' || profile?.role === 'admin') {
          const { data: claimsData } = await supabase
            .from('claims')
            .select(`
              *,
              food_listings (
                title,
                description,
                pickup_location,
                pickup_time_start,
                pickup_time_end,
                profiles:donor_id (full_name, organization_name, phone)
              )
            `)
            .eq('claimed_by', user.id)
            .order('claimed_at', { ascending: false });
          
          if (claimsData) setClaims(claimsData as any);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  const handleMarkAsReceived = async (claimId: string) => {
    try {
      const { error } = await supabase
        .from('claims')
        .update({ 
          status: 'received',
          received_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Marked as received successfully!",
      });
    } catch (error) {
      console.error('Error updating claim:', error);
      toast({
        title: "Error",
        description: "Failed to update claim status",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsCompleted = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('food_listings')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing marked as completed!",
      });
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to complete listing",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'claimed': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-info text-info-foreground';
      case 'expired': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'received': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || impactLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your dashboard...</div>
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
      {/* Welcome Section */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.full_name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          {profile?.role === 'donor' && "Manage your food donations and track your impact"}
          {profile?.role === 'recipient' && "Browse available food and manage your bookings"}
          {profile?.role === 'admin' && "Monitor platform activity and user engagement"}
        </p>
      </motion.div>

      {/* Impact Statistics */}
      {impact && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meals Donated</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{impact.meals_donated}</div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meals Received</CardTitle>
              <Package className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{impact.meals_received}</div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Food Wasted</CardTitle>
              <TrendingUp className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{impact.food_wasted_kg}kg</div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impact Score</CardTitle>
              <Award className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">
                {impact.meals_donated + impact.meals_received}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex flex-wrap gap-4">
          {(profile?.role === 'donor' || profile?.role === 'admin') && (
            <Button asChild className="hover-scale">
              <Link to="/create-listing">
                <Plus className="mr-2 h-4 w-4" />
                Create New Listing
              </Link>
            </Button>
          )}
          {(profile?.role === 'recipient' || profile?.role === 'admin') && (
            <Button asChild variant="outline" className="hover-scale">
              <Link to="/browse">
                <Package className="mr-2 h-4 w-4" />
                Browse Food
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Dashboard Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="claims">My Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            {listings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start making a difference by creating your first food listing
                  </p>
                  <Button asChild>
                    <Link to="/create-listing">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Listing
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {listings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="hover-scale">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{listing.title}</CardTitle>
                            <p className="text-muted-foreground">{listing.description}</p>
                          </div>
                          <Badge className={getStatusColor(listing.status)}>
                            {listing.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium">Quantity:</span> {listing.quantity}
                          </div>
                          <div>
                            <span className="font-medium">Expires:</span> {format(new Date(listing.expiry_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        
                        {(listing.status as string) === 'claimed' && (
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => handleMarkAsCompleted(listing.id)}
                              size="sm"
                              className="hover-scale"
                            >
                              Mark as Completed
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            {claims.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No claims yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse available food to make your first claim
                  </p>
                  <Button asChild>
                    <Link to="/browse">
                      Browse Food
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {claims.map((claim, index) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="hover-scale">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {(claim.food_listings as any)?.title}
                            </CardTitle>
                            <p className="text-muted-foreground">
                              {(claim.food_listings as any)?.description}
                            </p>
                          </div>
                          <Badge className={getStatusColor(claim.status || 'pending')}>
                            {claim.status || 'pending'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="font-medium">Pickup Location:</span> {(claim.food_listings as any)?.pickup_location}
                          </div>
                          <div>
                            <span className="font-medium">Pickup Time:</span> {' '}
                            {(claim.food_listings as any)?.pickup_time_start && 
                              format(new Date((claim.food_listings as any).pickup_time_start), 'MMM dd, HH:mm')
                            } - {' '}
                            {(claim.food_listings as any)?.pickup_time_end && 
                              format(new Date((claim.food_listings as any).pickup_time_end), 'HH:mm')
                            }
                          </div>
                        </div>
                        
                        {claim.status === 'pending' && (
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => handleMarkAsReceived(claim.id)}
                              size="sm"
                              className="hover-scale"
                            >
                              Mark as Received
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedDashboard;