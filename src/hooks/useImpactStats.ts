import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserImpact {
  meals_donated: number;
  meals_received: number;
  food_wasted_kg: number;
  updated_at: string;
}

export const useImpactStats = () => {
  const { user } = useAuth();
  const [impact, setImpact] = useState<UserImpact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setImpact(null);
      setLoading(false);
      return;
    }

    const fetchImpact = async () => {
      try {
        const { data, error } = await supabase
          .from('user_impact')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching impact:', error);
          return;
        }

        if (data) {
          setImpact(data);
        } else {
          // Create initial impact record
          const { data: newImpact } = await supabase
            .from('user_impact')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (newImpact) {
            setImpact(newImpact);
          }
        }
      } catch (error) {
        console.error('Error in fetchImpact:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();

    // Subscribe to impact updates
    const channel = supabase
      .channel('user-impact-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_impact',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            setImpact(payload.new as UserImpact);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { impact, loading };
};