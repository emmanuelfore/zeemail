import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTickets } from '../../hooks/useTickets';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { ChevronLeft, Send } from 'lucide-react';
import type { SupportTicket, SupportMessage } from '../../types';

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)'
};

export function PortalTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
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
          .select('*')
          .eq('id', id)
          .single();
        
        if (ticketData && id) {
          setTicket(ticketData);
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
    const ok = await sendMessage(id, msgInput, false);
    if (ok) {
      setMsgInput('');
      const msgs = await fetchMessages(id);
      setMessages(msgs);
    }
    setSending(false);
  }

  if (loading) return <SkeletonLoader height="400px" borderRadius="12px" />;
  if (!ticket) return <div>Ticket not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/portal/support')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={20} />
          Back to tickets
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--ink)', margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>
              {ticket.subject}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
              Opened on {new Date(ticket.created_at).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Original Message */}
        <div style={{ background: 'var(--cream-2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--ink)', margin: 0, fontSize: '0.925rem', whiteSpace: 'pre-wrap' }}>
            {ticket.message}
          </p>
        </div>

        {/* Message Thread */}
        <div 
          ref={scrollRef}
          style={{ 
            height: '300px', 
            overflowY: 'auto', 
            padding: '1rem', 
            background: 'var(--cream-3)', 
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', marginTop: '2rem' }}>
              No messages yet. Support will reply here.
            </p>
          ) : (
            messages.map(m => (
              <div 
                key={m.id}
                style={{
                  alignSelf: m.is_admin ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                  background: m.is_admin ? 'white' : 'var(--primary)',
                  color: m.is_admin ? 'var(--ink)' : 'white',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: m.is_admin ? '1px solid var(--border)' : 'none',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                <div style={{ fontSize: '0.625rem', marginTop: '0.25rem', opacity: 0.7, textAlign: 'right' }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              placeholder="Type your reply here..."
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                minHeight: '44px',
                resize: 'none'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !msgInput.trim()}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                opacity: (sending || !msgInput.trim()) ? 0.6 : 1
              }}
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
