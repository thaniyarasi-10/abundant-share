import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

/**
 * Hook to securely fetch user roles from the user_roles table
 * This replaces the insecure profile.role check
 */
export const useUserRole = (userId: string | undefined) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const fetchUserRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
          setIsAdmin(false);
        } else {
          const userRoles = (data || []).map(r => r.role as UserRole);
          setRoles(userRoles);
          setIsAdmin(userRoles.includes('admin'));
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [userId]);

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  return { roles, isAdmin, hasRole, loading };
};
