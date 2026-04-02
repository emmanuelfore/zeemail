import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { Mailbox } from '../types/index';

export function useMailboxes(clientId?: string) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function fetchMailboxes() {
      setLoading(true);
      try {
        let query = supabase
          .from('mailboxes')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientId) {
          query = query.eq('client_id', clientId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setMailboxes(data ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load mailboxes';
        toast(message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMailboxes();
    return () => { cancelled = true; };
  }, [clientId, toast]);

  return { mailboxes, loading };
}
