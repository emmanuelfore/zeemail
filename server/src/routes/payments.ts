/**
 * Payment routes
 *
 * POST /api/payments/initiate        — create Paynow payment request
 * POST /api/payments/webhook         — Paynow result URL callback
 * GET  /api/payments/poll/:clientId  — client-side polling fallback
 *
 * Requirements: 7.2, 7.3, 7.4
 */
import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { PaynowService, PaynowUnavailableError } from '../services/paynow';
import { ProvisioningEngine } from '../services/provisioning';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/payments/initiate
// Requirements: 7.2, 7.4
// ---------------------------------------------------------------------------

router.post('/initiate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { clientId, amount, email, phone } = req.body as {
    clientId?: string;
    amount?: number;
    email?: string;
    phone?: string;
  };

  if (!clientId || !amount || !email || !phone) {
    res.status(422).json({
      error: 'clientId, amount, email, and phone are required',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  try {
    const result = await PaynowService.initiatePayment(clientId, amount, email, phone);

    // Store the Paynow reference on the client record
    await supabaseAdmin
      .from('clients')
      .update({ paynow_reference: result.reference })
      .eq('id', clientId);

    res.json(result);
  } catch (err) {
    if (err instanceof PaynowUnavailableError) {
      res.status(502).json({ error: 'Payment gateway unavailable', code: 'PAYNOW_UNAVAILABLE' });
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/webhook
// Paynow sends a URL-encoded form POST to this endpoint.
// Requirements: 7.3, 7.4
// ---------------------------------------------------------------------------

router.post(
  '/webhook',
  // Parse URL-encoded body for this route specifically
  (_req: Request, _res: Response, next: NextFunction) => {
    // express.urlencoded middleware should already be applied globally;
    // if not, the body will be empty and we handle it gracefully below.
    next();
  },
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Paynow sends: reference, paynowreference, amount, status, pollurl, hash
      const { reference, status } = req.body as {
        reference?: string;
        status?: string;
        paynowreference?: string;
        amount?: string;
        pollurl?: string;
        hash?: string;
      };

      if (!reference || !status) {
        res.status(400).json({ error: 'Missing reference or status', code: 'VALIDATION_ERROR' });
        return;
      }

      const isPaid = status.toLowerCase() === 'paid' || status.toLowerCase() === 'awaiting delivery';

      if (!isPaid) {
        // Payment failed or pending — retain pending_payment status
        res.status(200).send('ok');
        return;
      }

      // Look up client by paynow_reference
      const { data: client, error: fetchError } = await supabaseAdmin
        .from('clients')
        .select('id, domain_owned, status')
        .eq('paynow_reference', reference)
        .maybeSingle();

      if (fetchError || !client) {
        // Unknown reference — acknowledge to Paynow but log
        console.warn(`[payments/webhook] Unknown reference: ${reference}`);
        res.status(200).send('ok');
        return;
      }

      // Only transition from pending_payment
      if (client.status !== 'pending_payment') {
        res.status(200).send('ok');
        return;
      }

      // Transition: Path A → pending_domain, Path B → pending_mailboxes
      const nextStatus = client.domain_owned ? 'pending_domain' : 'pending_mailboxes';

      const { error: updateError } = await supabaseAdmin
        .from('clients')
        .update({ status: nextStatus })
        .eq('id', client.id);

      if (updateError) {
        next(updateError);
        return;
      }

      // 4. TRIGGER ASYNCHRONOUS PROVISIONING (Requirements 11.1, 12.1)
      // We don't await this as we want to respond to Paynow quickly.
      // The ProvisioningEngine handles its own errors by setting 'provisioning_error' status.
      if (client.domain_owned) {
        ProvisioningEngine.runPathA(client.id).catch(console.error);
      } else {
        ProvisioningEngine.runPathB(client.id).catch(console.error);
      }

      res.status(200).send('ok');
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/payments/poll/:clientId
// Requirements: 7.3
// ---------------------------------------------------------------------------

router.get('/poll/:clientId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { clientId } = req.params;

  try {
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('id, status, paynow_reference')
      .eq('id', clientId)
      .maybeSingle();

    if (error) {
      next(error);
      return;
    }

    if (!client) {
      res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({ clientId: client.id, status: client.status });
  } catch (err) {
    next(err);
  }
});

export default router;
