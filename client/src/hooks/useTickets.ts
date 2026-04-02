import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { SupportTicket, SupportMessage } from '../types/index';

export function useTickets(clientId?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = useCallback(
    async (subject: string, message: string): Promise<boolean> => {
      if (!clientId) return false;
      try {
        const { error } = await supabase
          .from('support_tickets')
          .insert({ client_id: clientId, subject, message, status: 'open' });
        if (error) throw error;
        await fetchTickets();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create ticket';
        toast(msg, 'error');
        return false;
      }
    },
    [clientId, fetchTickets, toast]
  );

  const fetchMessages = useCallback(async (ticketId: string): Promise<SupportMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as SupportMessage[];
    } catch (err: unknown) {
      toast('Failed to load messages', 'error');
      return [];
    }
  }, [toast]);

  const sendMessage = useCallback(async (ticketId: string, message: string, isAdmin: boolean): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message,
          is_admin: isAdmin
        });
      if (error) throw error;
      
      // Update status if needed
      if (isAdmin) {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticketId);
      }

      return true;
    } catch (err: unknown) {
      toast('Failed to send message', 'error');
      return false;
    }
  }, [toast]);

  return { tickets, loading, createTicket, fetchMessages, sendMessage, refresh: fetchTickets };
}
