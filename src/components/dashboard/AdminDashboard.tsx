import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FoodListing, Claim, Profile } from '@/types';
import { 
  Users, 
  Package, 
  TrendingUp, 
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalDonors: number;
  totalRecipients: number;
  totalListings: number;
  totalClaims: number;
  mealsServed: number;
  foodSavedKg: number;
  activeListings: number;
  expiredListings: number;
  completedTransactions: number;
  successRate: number;
}

interface ChartData {
  name: string;
  donated: number;
  received: number;
  wasted: number;
}

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentListings, setRecentListings] = useState<FoodListing[]>([]);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdminData();
    }
  }, [profile]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch admin statistics
      const [
        { data: profiles },
        { data: listings },
        { data: claims },
        { data: platformStats }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('food_listings').select('*'),
        supabase.from('claims').select('*'),
        supabase.from('platform_stats').select('*').single()
      ]);

      if (profiles && listings && claims) {
        const totalUsers = profiles.length;
        const totalDonors = profiles.length; // All users can be donors
        const totalRecipients = profiles.length; // All users can be recipients
        const activeListings = listings.filter(l => l.status === 'available').length;
        const expiredListings = listings.filter(l => l.status === 'expired').length;
        const completedTransactions = claims.filter(c => c.status === 'received').length;
        const successRate = claims.length > 0 ? Math.round((completedTransactions / claims.length) * 100) : 0;

        setStats({
          totalUsers,
          totalDonors,
          totalRecipients,
          totalListings: listings.length,
          totalClaims: claims.length,
          mealsServed: platformStats?.total_meals_served || completedTransactions,
          foodSavedKg: Number(platformStats?.total_food_saved_kg || 0),
          activeListings,
          expiredListings,
          completedTransactions,
          successRate
        });

        // Prepare chart data for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();

        const chartData = last7Days.map(date => {
          const dateStr = format(date, 'MMM dd');
          const dayListings = listings.filter(l => 
            format(new Date(l.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          );
          const dayClaims = claims.filter(c => 
            c.received_at && format(new Date(c.received_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          );
          const dayExpired = listings.filter(l => 
            l.status === 'expired' && format(new Date(l.updated_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          );

          return {
            name: dateStr,
            donated: dayListings.length,
            received: dayClaims.length,
            wasted: dayExpired.length
          };
        });

        setChartData(chartData);
      }

      // Fetch recent listings
      const { data: recentListingsData } = await supabase
        .from('food_listings')
        .select(`
          *,
          profiles:donor_id (full_name, organization_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentListingsData) setRecentListings(recentListingsData as any);

      // Fetch recent claims
      const { data: recentClaimsData } = await supabase
        .from('claims')
        .select(`
          *,
          food_listings (title, pickup_location),
          profiles:claimed_by (full_name)
        `)
        .order('claimed_at', { ascending: false })
        .limit(10);

      if (recentClaimsData) setRecentClaims(recentClaimsData as any);

      // Fetch users
      if (profiles) setUsers(profiles as any);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'listings' | 'claims' | 'users') => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'listings':
          const { data: listingsData } = await supabase
            .from('food_listings')
            .select(`
              *,
              profiles:donor_id (full_name, organization_name, phone)
            `);
          data = listingsData || [];
          filename = 'food_listings.csv';
          break;
        case 'claims':
          const { data: claimsData } = await supabase
            .from('claims')
            .select(`
              *,
              food_listings (title, pickup_location),
              profiles:claimed_by (full_name, phone)
            `);
          data = claimsData || [];
          filename = 'claims.csv';
          break;
        case 'users':
          data = users;
          filename = 'users.csv';
          break;
      }

      // Simple CSV export
      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const csvContent = [
          headers,
          ...data.map(row => Object.values(row).map(val => 
            typeof val === 'object' ? JSON.stringify(val) : val
          ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `${type} data exported successfully`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data",
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

  const pieData = [
    { name: 'Available', value: stats?.activeListings || 0, color: '#22c55e' },
    { name: 'Claimed', value: (stats?.totalListings || 0) - (stats?.activeListings || 0) - (stats?.expiredListings || 0), color: '#f59e0b' },
    { name: 'Expired', value: stats?.expiredListings || 0, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">Failed to load admin data</div>
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
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform activity and manage the food sharing community
        </p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active community members</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">{stats.activeListings} currently available</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meals Served</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.mealsServed}</div>
            <p className="text-xs text-muted-foreground">Successful distributions</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Claims to completion</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts and Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Daily Activity (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="donated" stackId="1" stroke="#22c55e" fill="#22c55e" />
                      <Area type="monotone" dataKey="received" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                      <Area type="monotone" dataKey="wasted" stackId="1" stroke="#ef4444" fill="#ef4444" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Listing Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Listings</p>
                      <p className="text-2xl font-bold text-success">{stats.activeListings}</p>
                    </div>
                    <Package className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Expired Listings</p>
                      <p className="text-2xl font-bold text-destructive">{stats.expiredListings}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-info">{stats.completedTransactions}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-info" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Food Listings</h3>
              <Button onClick={() => exportData('listings')} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="space-y-4">
              {recentListings.map((listing) => (
                <Card key={listing.id} className="hover-scale">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{listing.title}</h4>
                        <p className="text-sm text-muted-foreground">{listing.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Donor: {(listing.profiles as any)?.full_name}</span>
                          <span>•</span>
                          <span>Quantity: {listing.quantity}</span>
                          <span>•</span>
                          <span>{format(new Date(listing.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(listing.status)}>
                        {listing.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Claims</h3>
              <Button onClick={() => exportData('claims')} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="space-y-4">
              {recentClaims.map((claim) => (
                <Card key={claim.id} className="hover-scale">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{(claim.food_listings as any)?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Location: {(claim.food_listings as any)?.pickup_location}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Claimed by: {(claim.profiles as any)?.full_name}</span>
                          <span>•</span>
                          <span>{format(new Date(claim.claimed_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(claim.status || 'pending')}>
                        {claim.status || 'pending'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Platform Users</h3>
              <Button onClick={() => exportData('users')} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.slice(0, 12).map((user) => (
                <Card key={user.id} className="hover-scale">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{user.full_name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                        {user.role}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {users.length > 12 && (
              <div className="text-center">
                <p className="text-muted-foreground">
                  Showing 12 of {users.length} users. Export CSV for complete list.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;