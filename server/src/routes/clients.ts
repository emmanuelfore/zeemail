/**
 * Clients routes
 *
 * POST /api/clients/:id/provision  — admin-only; trigger ProvisioningEngine
 * GET  /api/clients/:id/verify-mx  — admin-only; manually trigger MX check
 *
 * Requirements: 10.3, 10.5, 11.1, 12.1, 14.2
 */
import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { ProvisioningEngine } from '../services/provisioning';
import { CloudflareService } from '../services/cloudflare';
import { mailcowService } from '../services/mailcow';
import { runSingleHealthCheck } from '../jobs/dnsHealthCheck';
import { SesRelayService } from '../services/sesRelay';
import { SendcorexRelayService } from '../services/sendcorexRelay';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:id/provision-status
// Admin-only: Check if the domain and mailboxes actually exist in Mailcow.
// ---------------------------------------------------------------------------

router.get(
  '/:id/provision-status',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    try {
      const { data: client, error } = await supabaseAdmin.from('clients').select('domain').eq('id', id).single();
      if (error || !client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      // 1. Check if domain exists in Mailcow
      const mcDomain = await mailcowService.getDomain(client.domain);
      const provisioned = !!mcDomain;

      res.json({ provisioned });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/clients/:id/cloudflare-nameservers
// Admin-only: fetch the nameservers for a client's Cloudflare zone.
// ---------------------------------------------------------------------------

router.get(
  '/:id/cloudflare-nameservers',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    try {
      const { data: client, error } = await supabaseAdmin
        .from('clients')
        .select('domain, cloudflare_zone_id')
        .eq('id', id)
        .single();
        
      if (error || !client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      if (!client.cloudflare_zone_id) {
        res.json({ nameServers: [] });
        return;
      }

      const zone = await CloudflareService.findZoneByName(client.domain);
      res.json({ nameServers: zone?.nameServers ?? [] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/clients/:id/provision
// Admin-only: trigger full provisioning sequence based on domain_owned flag.
// Requirements: 10.3, 10.5, 11.1, 12.1
// ---------------------------------------------------------------------------

router.post(
  '/:id/provision',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    try {
      // Fetch client to determine path
      const { data: client, error: fetchError } = await supabaseAdmin
        .from('clients')
        .select('id, domain_owned, plan, status')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !client) {
        res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
        return;
      }

      // Run the appropriate provisioning path
      if (client.domain_owned) {
        await ProvisioningEngine.runPathA(id as string);
      } else {
        await ProvisioningEngine.runPathB(id as string);
      }

      // Count mailboxes created
      const { count } = await supabaseAdmin
        .from('mailboxes')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', id);

      res.json({ success: true, mailboxesCreated: count ?? 0 });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/clients/:id/verify-dns
// Authenticated client/admin: manually trigger MX check for a single client.
// ---------------------------------------------------------------------------

router.post(
  '/:id/verify-dns',
  auth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const user = (req as any).user;
    const profile = (req as any).profile;

    try {
      const { data: client, error: fetchError } = await supabaseAdmin
        .from('clients')
        .select('id, profile_id, domain, status, mx_verified')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !client) {
        res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
        return;
      }

      // Authorization: Admin or the client themselves
      if (profile.role !== 'admin' && client.profile_id !== user.id) {
        res.status(403).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      // Run the comprehensive health check (MX, SPF, DKIM, DMARC)
      const { allPassing, results } = await runSingleHealthCheck(client);

      if (allPassing && (!client.mx_verified || ['pending_dns', 'pending_mx'].includes(client.status))) {
        // Update client record
        const { error: updateError } = await supabaseAdmin
          .from('clients')
          .update({
            mx_verified: true,
            mx_verified_at: new Date().toISOString(),
            // Move to active if it was pending_dns or pending_mx
            status: ['pending_dns', 'pending_mx'].includes(client.status) ? 'active' : client.status,
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      res.json({
        verified: !!results.MX,
        mxRecords: [], // Kept for backwards compatibility with UI typing
        spfVerified: !!results.SPF,
        status: allPassing ? 'active' : 'pending_dns'
      });

    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/clients/:id/dkim
// Admin-only: Fetch DKIM directly from Mailcow API for manual DNS setup
// ---------------------------------------------------------------------------

router.get(
  '/:id/dkim',
  auth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const user = (req as any).user;
    const profile = (req as any).profile;

    try {
      const { data: client, error } = await supabaseAdmin.from('clients').select('domain, profile_id').eq('id', id).single();
      if (error || !client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      // Authorization: Admin or the client themselves
      if (profile.role !== 'admin' && client.profile_id !== user.id) {
        res.status(403).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const dkimResult = await mailcowService.getDkim(client.domain);

      if (!dkimResult) {
        res.status(404).json({ error: 'DKIM not found on Mailcow' });
        return;
      }
      res.json(dkimResult);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/clients/:id/relay/provision
// Admin-only: provision or retry Amazon SES outbound relay for an existing tenant domain.
// ---------------------------------------------------------------------------

router.post(
  '/:id/relay/provision',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await SesRelayService.provisionTenantDomain(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/clients/:id/relay/status
// Admin-only: single SES verification status check without polling.
// ---------------------------------------------------------------------------

router.get(
  '/:id/relay/status',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await SesRelayService.checkRelayVerification(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/clients/:id/relay/sendcorex/provision
// Admin-only: provision Sendcorex outbound relay for an existing tenant domain.
// ---------------------------------------------------------------------------

router.post(
  '/:id/relay/sendcorex/provision',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await SendcorexRelayService.provisionTenantDomain(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/clients/:id/relay/sendcorex/status
// Admin-only: single Sendcorex verification status check without polling.
// ---------------------------------------------------------------------------

router.get(
  '/:id/relay/sendcorex/status',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await SendcorexRelayService.checkRelayVerification(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);


// ---------------------------------------------------------------------------
// POST /api/clients/:id/dns/autofix
// Admin-only: Automatically apply missing DNS records for Cloudflare-managed domains
// ---------------------------------------------------------------------------

router.post(
  '/:id/dns/autofix',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    try {
      const { data: client, error: fetchError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !client) {
        res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
        return;
      }

      if (!client.cloudflare_zone_id) {
        res.status(400).json({
          error: 'Domain not on Cloudflare',
          suggestion: 'Use the manual fix option'
        });
        return;
      }

      const results = client.dns_check_results || {};

      // Wait briefly for DKIM if it was just added
      const dkimResult = await mailcowService.getDkim(client.domain).catch(() => null);

      if (!results.MX) {
        await CloudflareService.addMxRecord(client.cloudflare_zone_id, client.domain).catch(console.error);
      }

      if (!results.SPF) {
        await CloudflareService.addSpfRecord(client.cloudflare_zone_id, client.domain).catch(console.error);
      }

      if (!results.DKIM && dkimResult?.dkim_txt) {
        await CloudflareService.addDnsRecord(client.cloudflare_zone_id, {
          type: 'TXT',
          name: 'dkim._domainkey',
          content: dkimResult.dkim_txt,
        }).catch(console.error);
      }

      if (!results.DMARC) {
        await CloudflareService.addDnsRecord(client.cloudflare_zone_id, {
          type: 'TXT',
          name: '_dmarc',
          content: `v=DMARC1; p=none; rua=mailto:postmaster@${client.domain}`,
        }).catch(console.error);
      }

      // Re-run health check
      const recheck = await runSingleHealthCheck(client);

      if (recheck.allPassing) {
        await supabaseAdmin
          .from('clients')
          .update({
            mx_verified: true,
            mx_verified_at: new Date().toISOString(),
            status: 'active',
          })
          .eq('id', id);
      }

      res.json({ success: true, newStatus: recheck });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/clients/:id/cloudflare/push-records
// Admin-only: Check if an existing domain is on Cloudflare, link it, and push records
// ---------------------------------------------------------------------------

router.post(
  '/:id/cloudflare/push-records',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    try {
      const { data: client, error: fetchError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !client) {
        res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
        return;
      }

      let zoneId = client.cloudflare_zone_id;

      if (!zoneId) {
        // Try to find it on Cloudflare
        const zone = await CloudflareService.findZoneByName(client.domain);
        if (!zone) {
          res.status(404).json({ 
            error: 'Domain not found in Cloudflare account.',
            suggestion: 'Ensure the domain is added to this Cloudflare account.'
          });
          return;
        }

        zoneId = zone.id;

        // Link the zone to the client
        await supabaseAdmin
          .from('clients')
          .update({ 
            cloudflare_zone_id: zone.id,
            name_servers: zone.nameServers
          })
          .eq('id', id);
        
        client.cloudflare_zone_id = zone.id;
        client.name_servers = zone.nameServers;
      }

      // Now push the records
      const results = client.dns_check_results || {};

      // Wait briefly for DKIM if it was just added
      const dkimResult = await mailcowService.getDkim(client.domain).catch(() => null);

      if (!results.MX) {
        await CloudflareService.addMxRecord(zoneId, client.domain).catch(console.error);
      }

      if (!results.SPF) {
        await CloudflareService.addSpfRecord(zoneId, client.domain).catch(console.error);
      }

      if (!results.DKIM && dkimResult?.dkim_txt) {
        await CloudflareService.addDnsRecord(zoneId, {
          type: 'TXT',
          name: 'dkim._domainkey',
          content: dkimResult.dkim_txt,
        }).catch(console.error);
      }

      if (!results.DMARC) {
        await CloudflareService.addDnsRecord(zoneId, {
          type: 'TXT',
          name: '_dmarc',
          content: `v=DMARC1; p=none; rua=mailto:postmaster@${client.domain}`,
        }).catch(console.error);
      }

      // Re-run health check
      const recheck = await runSingleHealthCheck(client);

      if (recheck.allPassing) {
        await supabaseAdmin
          .from('clients')
          .update({
            mx_verified: true,
            mx_verified_at: new Date().toISOString(),
            status: 'active',
          })
          .eq('id', id);
      }

      res.json({ success: true, newStatus: recheck, zoneLinked: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
