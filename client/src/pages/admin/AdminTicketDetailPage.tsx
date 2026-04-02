import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTickets } from '../../hooks/useTickets';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { ChevronLeft, Send, CheckCircle } from 'lucide-react';
import type { SupportTicket, SupportMessage, Client } from '../../types';

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)'
};

export function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<(SupportTicket & { client: Client }) | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { fetchMessages, sendMessage } = useTickets();

  useEffect(() => {
    if (!id) return;
    
    async function load() {
      setLoading(true);
      try {
        const { data: ticketData } = await supabase
          .from('support_tickets')
          .select('*, client:clients(*)')
          .eq('id', id)
          .single();
        
        if (ticketData && id) {
          setTicket(ticketData as any);
          const msgs = await fetchMessages(id);
          setMessages(msgs);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!id || !msgInput.trim() || sending) return;
    setSending(true);
    const ok = await sendMessage(id, msgInput, true); // true for isAdmin
    if (ok) {
      setMsgInput('');
      const msgs = await fetchMessages(id);
      setMessages(msgs);
      // Update ticket status in current local state
      if (ticket) setTicket({ ...ticket, status: 'in_progress' });
    }
    setSending(false);
  }

  async function handleResolve() {
    if (!id || !ticket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', id);
      if (error) throw error;
      setTicket({ ...ticket, status: 'resolved' });
    } catch {
      alert('Failed to resolve ticket');
    }
  }

  if (loading) return <SkeletonLoader height="400px" borderRadius="12px" />;
  if (!ticket) return <div>Ticket not found.</div>;

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button 
          onClick={() => navigate('/admin/support')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ChevronLeft size={20} />
          Back to support queue
        </button>
        {ticket.status !== 'resolved' && (
          <button
            onClick={handleResolve}
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              color: 'rgb(21, 128, 61)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 700
            }}
          >
            <CheckCircle size={18} />
            Mark as Resolved
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ color: 'var(--ink)', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                {ticket.subject}
              </h1>
              <StatusBadge status={ticket.status} />
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Client: <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{ticket.client.company_name}</span> ({ticket.client.domain})
            </div>
          </div>
        </div>

        {/* Original Message */}
        <div style={{ background: 'var(--cream-2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <p style={{ color: 'var(--ink)', margin: 0, fontSize: '0.925rem', whiteSpace: 'pre-wrap' }}>
            {ticket.message}
          </p>
        </div>

        <h3 style={{ color: 'var(--ink)', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Communication Thread</h3>
        
        {/* Message Thread */}
        <div 
          ref={scrollRef}
          style={{ 
            height: '400px', 
            overflowY: 'auto', 
            padding: '1.5rem', 
            background: 'var(--cream-3)', 
            borderRadius: '12px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', marginTop: '2rem' }}>
              No messages yet. Send the first response to the client.
            </p>
          ) : (
            messages.map(m => (
              <div 
                key={m.id}
                style={{
                  alignSelf: m.is_admin ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: m.is_admin ? 'var(--primary)' : 'white',
                  color: m.is_admin ? 'white' : 'var(--ink)',
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  border: m.is_admin ? 'none' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '0.925rem', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                <div style={{ fontSize: '0.625rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  {m.is_admin ? 'Support Agent' : ticket.client.company_name} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Area */}
        {ticket.status !== 'resolved' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <textarea
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              placeholder="Type your reply to the client..."
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: '0.925rem',
                minHeight: '80px',
                resize: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={handleSend}
              disabled={sending || !msgInput.trim()}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                opacity: (sending || !msgInput.trim()) ? 0.6 : 1
              }}
            >
              <Send size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
