import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const SUPPORT_NUMBER = '263776344339';
const SUPPORT_MESSAGE = encodeURIComponent('Hello, I need help with my email hosting.');

export function FloatingWhatsApp() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/admin')) return null;

  const href = `https://wa.me/${SUPPORT_NUMBER}?text=${SUPPORT_MESSAGE}`;

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with support on WhatsApp"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 900,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37,211,102,0.4)',
          animation: 'whatsappPulse 2s ease-in-out infinite',
          textDecoration: 'none',
        }}
      >
        <MessageCircle size={30} color="white" strokeWidth={2.4} aria-hidden="true" />
      </a>

      <style>{`
        @keyframes whatsappPulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(37,211,102,0.4); }
          50%       { box-shadow: 0 4px 24px rgba(37,211,102,0.7); }
        }
      `}</style>
    </>
  );
}
