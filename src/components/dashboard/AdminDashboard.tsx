import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Package, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Award,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalDonors: number;
  totalRecipients: number;
  totalListings: number;
  totalClaims: number;
  totalMealsServed: number;
  totalFoodSaved: number;
  activeListings: number;
  expiredListings: number;
  completedTransactions: number;
}

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role');

      const { data: listings } = await supabase
        .from('food_listings')
        .select('*');

      const { data: claims } = await supabase
        .from('claims')
        .select('*');

      const { data: platformStats } = await supabase
        .from('platform_stats')
        .select('*')
        .single();

      if (profiles && listings && claims) {
        const adminStats: AdminStats = {
          totalUsers: profiles.length,
          totalDonors: profiles.filter(p => p.role === 'donor').length,
          totalRecipients: profiles.filter(p => p.role === 'ngo').length,
          totalListings: listings.length,
          totalClaims: claims.length,
          totalMealsServed: platformStats?.total_meals_served || 0,
          totalFoodSaved: platformStats?.total_food_saved_kg || 0,
          activeListings: listings.filter(l => l.status === 'available').length,
          expiredListings: listings.filter(l => l.status === 'expired').length,
          completedTransactions: claims.filter(c => c.completed_at).length,
        };

        setStats(adminStats);

        // Generate chart data
        const chartData = [
          { name: 'Available', value: listings.filter(l => l.status === 'available').length, color: '#10B981' },
          { name: 'Claimed', value: listings.filter(l => l.status === 'claimed').length, color: '#F59E0B' },
          { name: 'Completed', value: listings.filter(l => l.status === 'completed').length, color: '#3B82F6' },
          { name: 'Expired', value: listings.filter(l => l.status === 'expired').length, color: '#EF4444' },
        ];

        setChartData(chartData);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Failed to load admin data</div>
      </div>
    );
  }

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDonors} donors, {stats.totalRecipients} recipients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeListings} currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meals Served</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMealsServed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalFoodSaved}kg food saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalClaims > 0 ? Math.round((stats.completedTransactions / stats.totalClaims) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTransactions} completed transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Listing Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-success" />
                    <span className="text-sm">Active Listings</span>
                  </div>
                  <Badge variant="secondary">{stats.activeListings}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">Expired Listings</span>
                  </div>
                  <Badge variant="destructive">{stats.expiredListings}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-info" />
                    <span className="text-sm">Completed Transactions</span>
                  </div>
                  <Badge variant="secondary">{stats.completedTransactions}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm">Pending Claims</span>
                  </div>
                  <Badge variant="secondary">
                    {stats.totalClaims - stats.completedTransactions}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>Listing Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Donors</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(stats.totalDonors / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats.totalDonors}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Recipients</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-success h-2 rounded-full" 
                          style={{ width: `${(stats.totalRecipients / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats.totalRecipients}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{stats.totalFoodSaved}kg</div>
                    <p className="text-sm text-muted-foreground">Food Waste Prevented</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success">{stats.totalMealsServed}</div>
                    <p className="text-sm text-muted-foreground">Meals Provided</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-info">
                      {Math.round((stats.completedTransactions / stats.totalListings) * 100) || 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminDashboard;