import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { Invoice } from '../types/index';

export function useInvoices(clientId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function fetchInvoices() {
      setLoading(true);
      try {
        let query = supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientId) {
          query = query.eq('client_id', clientId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setInvoices(data ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load invoices';
        toast(message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInvoices();
    return () => { cancelled = true; };
  }, [clientId, toast]);

  return { invoices, loading };
}
