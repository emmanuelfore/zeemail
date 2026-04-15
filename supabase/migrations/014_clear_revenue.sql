-- Clear all revenue-related data (invoices and won CRM contacts)
TRUNCATE TABLE invoices CASCADE;

-- Optional: Reset CRM contacts that are marked as won
UPDATE crm_contacts 
SET pipeline_stage = 'new' 
WHERE pipeline_stage = 'won';
