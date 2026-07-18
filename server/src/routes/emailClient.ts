import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { emailClientService } from '../services/emailClient';
import { smtpClientService } from '../services/smtpClient';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// Helper to get user's mailbox email
async function getUserMailboxEmail(userId: string): Promise<string> {
  const { data: mailboxes, error } = await supabaseAdmin
    .from('mailboxes')
    .select('email')
    .eq('client_id', userId)
    .limit(1);

  if (error || !mailboxes || mailboxes.length === 0) {
    throw new Error('No mailbox found for user');
  }

  return mailboxes[0].email;
}

// ---------------------------------------------------------------------------
// GET /api/email/mailboxes
// Get list of mailboxes for the authenticated user
// ---------------------------------------------------------------------------

router.get('/mailboxes', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const email = await getUserMailboxEmail(user.id);
    
    const mailboxes = await emailClientService.listMailboxes(email);
    res.json(mailboxes);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/email/mailboxes/:mailbox/emails
// Get list of emails from a specific mailbox
// ---------------------------------------------------------------------------

router.get('/mailboxes/:mailbox/emails', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const mailbox = Array.isArray(req.params.mailbox) ? req.params.mailbox[0] : req.params.mailbox;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const email = await getUserMailboxEmail(user.id);
    const emails = await emailClientService.listEmails(email, mailbox, limit);
    res.json(emails);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/email/mailboxes/:mailbox/emails/:uid
// Get a specific email
// ---------------------------------------------------------------------------

router.get('/mailboxes/:mailbox/emails/:uid', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const mailbox = Array.isArray(req.params.mailbox) ? req.params.mailbox[0] : req.params.mailbox;
    const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
    
    const email = await getUserMailboxEmail(user.id);
    const message = await emailClientService.getEmail(email, parseInt(uid), mailbox);
    
    if (!message) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    
    res.json(message);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/email/mailboxes/:mailbox/emails/:uid/read
// Mark an email as read
// ---------------------------------------------------------------------------

router.post('/mailboxes/:mailbox/emails/:uid/read', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const mailbox = Array.isArray(req.params.mailbox) ? req.params.mailbox[0] : req.params.mailbox;
    const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
    
    const email = await getUserMailboxEmail(user.id);
    await emailClientService.markAsRead(email, parseInt(uid), mailbox);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/email/mailboxes/:mailbox/emails/:uid
// Delete an email
// ---------------------------------------------------------------------------

router.delete('/mailboxes/:mailbox/emails/:uid', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const mailbox = Array.isArray(req.params.mailbox) ? req.params.mailbox[0] : req.params.mailbox;
    const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
    
    const email = await getUserMailboxEmail(user.id);
    await emailClientService.deleteEmail(email, parseInt(uid), mailbox);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/email/mailboxes/:mailbox/emails/:uid/move
// Move an email to another mailbox
// ---------------------------------------------------------------------------

router.post('/mailboxes/:mailbox/emails/:uid/move', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const mailbox = Array.isArray(req.params.mailbox) ? req.params.mailbox[0] : req.params.mailbox;
    const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
    const { toMailbox } = req.body;
    
    if (!toMailbox) {
      res.status(400).json({ error: 'toMailbox is required' });
      return;
    }
    
    const userEmail = await getUserMailboxEmail(user.id);
    await emailClientService.moveEmail(userEmail, parseInt(uid), mailbox, toMailbox);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/email/send
// Send an email
// ---------------------------------------------------------------------------

router.post('/send', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const fromEmail = await getUserMailboxEmail(user.id);
    
    const emailParams = {
      from: fromEmail,
      to: req.body.to,
      cc: req.body.cc,
      bcc: req.body.bcc,
      subject: req.body.subject,
      text: req.body.text,
      html: req.body.html,
      attachments: req.body.attachments,
    };
    
    const result = await smtpClientService.sendEmail(emailParams);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/email/test-connection
// Test SMTP connection
// ---------------------------------------------------------------------------

router.get('/test-connection', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const email = await getUserMailboxEmail(user.id);
    
    const connected = await smtpClientService.testConnection(email);
    res.json({ connected });
  } catch (err) {
    next(err);
  }
});

export default router;
