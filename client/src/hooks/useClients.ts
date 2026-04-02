import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { Client } from '../types/index';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!cancelled) setClients(data ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load clients';
        toast(message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchClients();
    return () => { cancelled = true; };
  }, [toast]);

  return { clients, loading };
}
