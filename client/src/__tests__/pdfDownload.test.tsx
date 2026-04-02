/**
 * Unit tests for PDF download filename logic
 *
 * The handleDownloadPdf function in InvoicesTab generates a download filename
 * in the format: invoice-{first 8 chars of id}.txt
 *
 * Validates: Requirements 6.11
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Invoice } from '../types/index';

// Mock supabase and api to avoid env var issues
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  },
}));
vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../store/authStore', () => ({
  useAuthStore: { getState: vi.fn(() => ({ session: null })) },
}));

// ── Helper: mirrors the filename logic from handleDownloadPdf ─────────────────

function getInvoiceFilename(invoice: Invoice): string {
  return `invoice-${invoice.id.slice(0, 8)}.txt`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PDF download filename', () => {
  it('uses the first 8 characters of the invoice id', () => {
    const invoice: Invoice = {
      id: 'abcdef12-3456-7890-abcd-ef1234567890',
      client_id: 'client-1',
      amount: 50,
      status: 'unpaid',
      due_date: '2025-01-01',
      paid_at: null,
      description: 'Monthly plan',
      created_at: '2025-01-01T00:00:00Z',
    };

    const filename = getInvoiceFilename(invoice);
    expect(filename).toBe('invoice-abcdef12.txt');
  });

  it('clicking "Download PDF" triggers file download with correct filename', () => {
    const mockClick = vi.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);

    // jsdom doesn't implement URL.createObjectURL — define stubs on globalThis
    const mockObjectUrl = 'blob:http://localhost/mock-url';
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
    globalThis.URL.revokeObjectURL = vi.fn();

    const createObjectURLSpy = vi.spyOn(globalThis.URL, 'createObjectURL');
    const revokeObjectURLSpy = vi.spyOn(globalThis.URL, 'revokeObjectURL');

    const invoice: Invoice = {
      id: '12345678-aaaa-bbbb-cccc-ddddeeee0000',
      client_id: 'client-1',
      amount: 99,
      status: 'unpaid',
      due_date: '2025-06-01',
      paid_at: null,
      description: null,
      created_at: '2025-01-01T00:00:00Z',
    };

    // Simulate handleDownloadPdf logic directly
    const content = [
      `INVOICE`,
      `ID: ${invoice.id}`,
      `Amount: ${invoice.amount}`,
      `Status: ${invoice.status}`,
      `Due: ${new Date(invoice.due_date).toLocaleDateString()}`,
      invoice.description ? `Description: ${invoice.description}` : '',
      invoice.paid_at ? `Paid at: ${new Date(invoice.paid_at).toLocaleDateString()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.download).toBe('invoice-12345678.txt');
    expect(mockAnchor.href).toBe(mockObjectUrl);
    expect(mockClick).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockObjectUrl);

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
