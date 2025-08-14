import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FoodListing, Claim } from '@/types';
import { Plus, Package, Clock, CheckCircle, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch user's food listings if they're a donor
        if (profile?.role === 'donor' || profile?.role === 'admin') {
          const { data: listingsData } = await supabase
            .from('food_listings')
            .select(`
              *,
              profiles:claimed_by (full_name, organization_name)
            `)
            .eq('donor_id', user.id)
            .order('created_at', { ascending: false });
          
          if (listingsData) setListings(listingsData as any);
        }

        // Fetch user's claims if they're an NGO or recipient
        if (profile?.role === 'ngo' || profile?.role === 'admin') {
          const { data: claimsData } = await supabase
            .from('claims')
            .select(`
              *,
              food_listings (
                id, title, description, pickup_location, 
                pickup_time_start, pickup_time_end,
                profiles:donor_id (full_name, phone)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'claimed': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-info text-info-foreground';
      case 'expired': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name}!
          </p>
        </div>
        
        {(profile?.role === 'donor' || profile?.role === 'admin') && (
          <Button asChild>
            <Link to="/create-listing">
              <Plus className="mr-2 h-4 w-4" />
              Create Listing
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={profile?.role === 'donor' ? 'listings' : 'claims'} className="space-y-6">
        <TabsList>
          {(profile?.role === 'donor' || profile?.role === 'admin') && (
            <TabsTrigger value="listings">My Listings</TabsTrigger>
          )}
          {(profile?.role === 'ngo' || profile?.role === 'admin') && (
            <TabsTrigger value="claims">My Claims</TabsTrigger>
          )}
        </TabsList>

        {/* Food Listings Tab */}
        {(profile?.role === 'donor' || profile?.role === 'admin') && (
          <TabsContent value="listings" className="space-y-6">
            <div className="grid gap-6">
              {listings.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start making a difference by creating your first food listing.
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
                listings.map((listing) => (
                  <Card key={listing.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{listing.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {listing.description}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>Quantity: {listing.quantity}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{listing.pickup_location}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>Expires: {format(new Date(listing.expiry_date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      
                      {listing.claimed_by && listing.profiles && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">
                            Claimed by: {listing.profiles.full_name}
                            {listing.profiles.organization_name && ` (${listing.profiles.organization_name})`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Claimed on: {format(new Date(listing.claimed_at!), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}

        {/* Claims Tab */}
        {(profile?.role === 'ngo' || profile?.role === 'admin') && (
          <TabsContent value="claims" className="space-y-6">
            <div className="grid gap-6">
              {claims.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No claims yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Browse available food to start claiming donations.
                    </p>
                    <Button asChild>
                      <Link to="/browse">
                        Browse Food
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                claims.map((claim) => (
                  <Card key={claim.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {claim.food_listings?.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {claim.food_listings?.description}
                          </CardDescription>
                        </div>
                        <Badge className="bg-info text-info-foreground">
                          Claimed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{claim.food_listings?.pickup_location}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>
                            Pickup: {format(new Date(claim.food_listings?.pickup_time_start!), 'MMM dd, HH:mm')} - 
                            {format(new Date(claim.food_listings?.pickup_time_end!), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                      
                      {claim.food_listings?.profiles && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">
                            Donor: {claim.food_listings.profiles.full_name}
                          </p>
                          {claim.food_listings.profiles.phone && (
                            <p className="text-xs text-muted-foreground">
                              Phone: {claim.food_listings.profiles.phone}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {claim.notes && (
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <strong>Notes:</strong> {claim.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;