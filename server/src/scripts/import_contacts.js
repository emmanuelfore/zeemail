const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const contacts = [
  { business_name: "My Tax Clearance Zimbabwe", phone: "263715091985", website: "mytaxclearance.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax reg & ZIMRA compliance - SME clients likely need fiscalization" },
  { business_name: "Misfort Tax Consultancy", phone: "263715091985", phone_2: "263773552313.0", website: "misforttax.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Ex-ZIMRA staff, ISO certified - high volume SME client base" },
  { business_name: "Misfort Tax Office Line", phone: "2632425719914", phone_2: "2632425709900.0", website: "misforttax.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Office line - same firm (41B Logan Rd Hatfield)" },
  { business_name: "Platinum Tax Consultancy", phone: "263778066804", email: "advisor@taxadvisoryhub.com", website: "taxadvisoryhub.com", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax advisory & dispute resolution - SME focus" },
  { business_name: "Zimbabwe Companies Registry", phone: "263715142498", phone_2: "263778702715.0", email: "info@zimbabwecompaniesregistry.org", website: "zimbabwecompaniesregistry.org", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp available - thousands of SME clients registered" },
  { business_name: "Register Your Company ZW", phone: "263786507158", phone_2: "2632420753168.0", email: "info@registeryourcompany.co.zw", website: "registeryourcompany.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp - huge client base needing fiscalization after company reg" },
  { business_name: "Tax Services Zimbabwe", phone: "263772957786", phone_2: "263719957786.0", website: "tax.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp active - tax returns & compliance SMEs" },
  { business_name: "Taxes Harare", phone: "263773625635", website: "taxes.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax registrations & clearance - ideal referral partner" },
  { business_name: "Lucent Consultancy", phone: "263771030251", phone_2: "263718717521.0", website: "lucent.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp available - 72 Samora Machel - high SME client volume" },
  { business_name: "Vision Tax Advisory", phone: "2632427909316", phone_2: "263775665660.0", email: "info@visiontax.co.zw", website: "visiontax.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Bard House 69 Samora Machel Ave - strong SME base" },
  { business_name: "Vision Tax Advisory Mobile", phone: "263772489176", email: "info@visiontax.co.zw", website: "visiontax.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Additional mobile line" },
  { business_name: "Betto Consultancy", phone: "263778224069", email: "bettoconsultancy2020@gmail.com", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp active - company reg + tax clearance focus" },
  { business_name: "Tax Pal Zimbabwe", phone: "263776903767", email: "taxpalzimbabwe@gmail.com", website: "taxpalzim.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "VAT & fiscal invoices already discussed - ideal partner" },
  { business_name: "P&R Taxcellent Consultants", phone: "263774380992", email: "prtaxcellent@gmail.com", website: "prtaxcellent.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax & accounting - WhatsApp active SME clients" },
  { business_name: "M&J Consultants Zimbabwe", phone: "263717553672", phone_2: "263719635307.0", website: "mjconsultants.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "ZIMRA tax clearance specialists - large client base" },
  { business_name: "M&J Consultants Office", phone: "263867700884", website: "mjconsultants.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Additional office line - 770 Fern Road Hatfield" },
  { business_name: "Companies Registry Zim", phone: "263774447762", phone_2: "263713370391.0", email: "info@companiesregistryzim.co.zw", website: "companiesregistryzim.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax reg & ZIMRA compliance - new biz clients need fiscalization" },
  { business_name: "Agileroc Consultants", phone: "263772450364", phone_2: "263719450364.0", email: "infor@agileroc.co.zw", website: "agileroc.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "60 L Takawira St - company reg + ZIMRA tax clearance packages" },
  { business_name: "Trinity Tax Accountants", phone: "7838380089", email: "taxtrinity2016@gmail.com", website: "trinitytax.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax advisory PAYE VAT income tax - SME clients" },
  { business_name: "Fletrix Company Reg & Tax", phone: "263774286255", email: "fletrixzw@gmail.com", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Company reg & tax clearance - WhatsApp active" },
  { business_name: "SMB Registrations ZW", phone: "263778000328", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Company reg & tax clearance - WhatsApp business" },
  { business_name: "Taxwise Solutions", phone: "263773303722", phone_2: "263719303722.0", email: "info@taxwisesolutions.co.zw", website: "taxwisesolutions.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax consultancy - SME focus" },
  { business_name: "Nare Tax Services", phone: "263773286460", phone_2: "263782806670.0", email: "info@naretaxservices.co.zw", website: "naretaxservices.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "50 Jason Moyo Ave - tax training & advisory" },
  { business_name: "ESM Tax Associates", phone: "772423883", city: "Harare (Ruwa)", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "2843 Mutare Road Ruwa - SME tax services" },
  { business_name: "N C Consultancy", phone: "263774888418", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "12 Tigere Mansions 6th & Central Avenue" },
  { business_name: "Afri-Tax Management", phone: "263772307502", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "80 Mutare Rd Masasa - tax management firm" },
  { business_name: "DM Accountants", phone: "263714560009", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Accounting bookkeeping tax & internal auditing" },
  { business_name: "Diverse Business Consultancy", phone: "263773588993", email: "info@diverseholdings.co.zw", website: "diverseholdings.co.zw", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Company reg + tax + NSSA + PRAZ - WhatsApp" },
  { business_name: "Shalom Fiscal Consultants", phone: "2630247019010", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Fiscal consultants - 41 Central Avenue (fiscal in name!)" },
  { business_name: "SMG Corporate Solutions", phone: "2630242800000", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐ WARM", notes: "Tax & corporate solutions - Graniteside" },
  { business_name: "Quirate Investments", phone: "263771587393", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐ WARM", notes: "Tax & accounting - 166A Harare Street" },
  { business_name: "Masterway Audit & Tax", phone: "263772345638", email: "patrick@masterwayconsulting.com", website: "masterwayconsulting.com", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "Chartered accountants - 56 Knightsbridge Rd - SME clients" },
  { business_name: "Leyton Consulting", phone: "263717584118", email: "enquires@leytonconsulting.co.zw", website: "leytonconsulting.co.zw", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "Accounting tax & CFO services - SME focused" },
  { business_name: "JSM Consulting", phone: "263712407700", phone_2: "263772314380.0", email: "info@jsmconsulting.co.zw", website: "jsmconsulting.co.zw", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "Chartered accountants - 48 Midlothian Ave Eastlea since 2001" },
  { business_name: "SABARM Tax Solutions", phone: "2632420708041", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "3000+ SME clients - Mt Pleasant (huge referral potential!)" },
  { business_name: "Nolston Accounting Solutions", phone: "263773048822", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "Accounting & tax - Silundika House - SME clients" },
  { business_name: "Timeous Consulting", phone: "263772691200", email: "tradekerk@gmail.com", website: "timeousexpress.co.zw", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Tax consultancy - WhatsApp active" },
  { business_name: "Phinix Consultancy", phone: "2630242254578", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Finance & tax - 62 Nelson Mandela Ave" },
  { business_name: "Taxpert Consulting Group", phone: "2630479569700", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Suite 504 Merchant House - SME tax focus" },
  { business_name: "C&J Accounting & Secretarial", phone: "2630242745951", phone_2: "2630242745958.0", email: "info@cjaccounting.co.zw", website: "cjaccounting.co.zw", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Full tax & accounting for SMEs - 162 The Chase Mt Pleasant" },
  { business_name: "REANDA Zimbabwe", phone: "26386442997450", email: "admin@reandazw.com", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Audit tax & advisory - 15 Downie Ave Belgravia" },
  { business_name: "Mashiri & Co Accountants", phone: "263783545876", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Public accountants - 9 George Silundika Ave" },
  { business_name: "ZIMDART Accountants", phone: "2630242754539", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "Accountants - 70 Chinhoyi Street" },
  { business_name: "Kreston Zimbabwe", phone: "2632427467830", email: "info@krestonzim.com", website: "krestonzim.com", city: "Harare", industry: "Accounting Firm (Mid)", lead_quality: "⭐⭐ WARM", notes: "Audit tax & accounting - mid-size firm" },
  { business_name: "HLB Zimbabwe", phone: "2630242796481", website: "hlbzimbabwe.co.zw", city: "Harare", industry: "Accounting Firm (Mid)", lead_quality: "⭐⭐ WARM", notes: "Audit tax advisory - Chiyedza House" },
  { business_name: "AMG Global Chartered Accountants", phone: "2630242251415", phone_2: "2630242251416.0", website: "amgglobal.co.zw", city: "Harare", industry: "Accounting Firm (Mid)", lead_quality: "⭐⭐ WARM", notes: "3 Elcombe Avenue Belgravia - mid-size firm" },
  { business_name: "Nolands Harare", phone: "2630242481037", phone_2: "2630242481038.0", email: "enquiries@nolandshre.co.zw", website: "nolands.global/zimbabwe", city: "Harare", industry: "Accounting Firm (Mid)", lead_quality: "⭐⭐ WARM", notes: "7 Glenara Ave South Eastlea - audit tax forensics" },
  { business_name: "PKF Chartered Accountants ZW", phone: "2630242918460", phone_2: "2630242704427.0", email: "info@pkf.co.zw", website: "pkf.co.zw", city: "Harare", industry: "Accounting Firm (Large)", lead_quality: "⭐ COOL", notes: "Large firm - 3rd Floor Takura House 67 Kwame Nkrumah Ave" },
  { business_name: "Forvis Mazars Zimbabwe", phone: "263867721043400", city: "Harare", industry: "Accounting Firm (Large)", lead_quality: "⭐ COOL", notes: "Large firm - 8th Floor Finsure House" },
  { business_name: "Baker Tilly Central Africa ZW", phone: "2630242369730", phone_2: "2630242301598.0", email: "info@bakertilly.co.zw", website: "bakertilly.co.zw", city: "Harare", industry: "Accounting Firm (Large)", lead_quality: "⭐ COOL", notes: "Large firm - Celestial Park Borrowdale" },
  { business_name: "Baker Tilly Bulawayo", phone: "263292280280", email: "info@bakertilly.co.zw", website: "bakertilly.co.zw", city: "Bulawayo", industry: "Accounting Firm (Large)", lead_quality: "⭐ COOL", notes: "Bulawayo office - large firm" },
  { business_name: "Grant Thornton Zimbabwe", phone: "2630242442511", phone_2: "2630242442512.0", email: "info@zw.gt.com", website: "grantthornton.co.zw", city: "Harare", industry: "Accounting Firm (Large)", lead_quality: "⭐ COOL", notes: "Large firm - 135 Enterprise Rd Highlands" },
  { business_name: "Mist Corporate Services BYO", phone: "263292262039", email: "info@mist.co.zw", website: "mist.co.zw", city: "Bulawayo", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "Tax compliance & accounting - Bulawayo & Harare SME clients" },
  { business_name: "Finmas Business Consultancy", phone: "263292261368", city: "Bulawayo", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "LAPF House 8th Ave Bulawayo - SME clients" },
  { business_name: "Steelpulse Advisors", phone: "263788390564", city: "Bulawayo", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax advisor - 35 Street Mpopoma North Bulawayo" },
  { business_name: "Mish Tax & Accounting", phone: "263779275242", city: "Bulawayo", industry: "Tax Clearance Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Tax & accounting - 125 R Mugabe Way Bulawayo" },
  { business_name: "Hove Brothers & Company", phone: "263927133300", city: "Bulawayo", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "6th Floor York House 8th Ave Bulawayo" },
  { business_name: "Cybertrust Accounting & Secretarial", phone: "263926111090", city: "Bulawayo", industry: "Tax Clearance Agent", lead_quality: "⭐⭐ WARM", notes: "ZIMFEP Offices Bulawayo" },
  { business_name: "Acme Accounting Services", phone: "263715373010", city: "Masvingo", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐⭐ HOT", notes: "9135 Sipambi Street Mucheke Masvingo - regional coverage" },
  { business_name: "Limitless Vision Zimbabwe", phone: "263772698846", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐ WARM", notes: "Coal House CBD - tax consulting" },
  { business_name: "Companies Made Easy Zimbabwe", phone: "263786507151", phone_2: "2630242753168.0", email: "info@companiesmadeeasy.co.zw", website: "companiesmadeeasy.co.zw", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp +263786507151 - thousands of new business clients need fiscalization!" },
  { business_name: "Company Registrations ZW", phone: "263772957786", website: "companyregistrations.co.zw", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "1st Floor Batanai Gardens 57 Jason Moyo - WhatsApp active" },
  { business_name: "Companies Made Simple", phone: "263786507158", phone_2: "2630242753168.0", website: "companiesmadesimple.co.zw", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "WhatsApp - Pockets Building 50 Jason Moyo - new biz clients" },
  { business_name: "Avance Business Consultancy", phone: "263771900123", website: "avance.co.zw", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Company reg + tax services - new clients need fiscalization" },
  { business_name: "Firstrate Consultancy Zimbabwe", phone: "263772550100", website: "firstratezim.com", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Company reg + tax + bookkeeping - SME focus" },
  { business_name: "Zi-Company Secretarial Services", phone: "2630243339181", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "Company secretarial & tax - 931 Christchurch Avenue" },
  { business_name: "Angel & Walt Company Reg", phone: "2630242251092", phone_2: "263867700748.0", website: "companyregistrations.co.zw", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐⭐ HOT", notes: "1st Floor Batanai Gardens 57 Jason Moyo Ave - active WhatsApp" },
  { business_name: "Congraft Enterprises", phone: "263475896600", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐ WARM", notes: "5th Floor Equity House 82 Rezende St - company reg" },
  { business_name: "Rostam Development Company", phone: "263473351800", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐ WARM", notes: "6th Floor Regal House 25 George Silundika" },
  { business_name: "Dreams Corporate Advisors", phone: "2630242702237", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐ WARM", notes: "30 Central Avenue - tax & corporate advisory" },
  { business_name: "Xerxes Consulting", phone: "26324338275", email: "Info@xerxesconsulting.co.zw", website: "xerxesconsulting.co.zw", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐ WARM", notes: "Management consulting accounting & tax" },
  { business_name: "Daystar Moorgate Corporate Advisory", phone: "263772400100", website: "daystaradvisory.co.zw", city: "Harare", industry: "Payroll & HR Firm", lead_quality: "⭐⭐⭐ HOT", notes: "Payroll + tax compliance + accounting - SME clients need fiscalization" },
  { business_name: "CorePay Zimbabwe", phone: "263867718338400", phone_2: "263867718491600.0", website: "corepay.co.zw", city: "Harare", industry: "Payroll & HR Firm", lead_quality: "⭐⭐ WARM", notes: "Smatsatsa Office Park Borrowdale - payroll HR solutions" },
  { business_name: "SmartHR Solutions Zimbabwe", phone: "2630242833905", website: "smarthrsolutions.co.zw", city: "Harare", industry: "Payroll & HR Firm", lead_quality: "⭐⭐ WARM", notes: "12 Harare Dr - payroll outsourcing SME & corporate" },
  { business_name: "Dube Manikai & Hwacha (DMH)", phone: "2630242780350", phone_2: "2630242780351.0", email: "admin@dmh.co.zw", website: "dmh.co.zw", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐⭐ WARM", notes: "4 Fleetwood Rd Alexandra Park - commercial law firm with SME clients" },
  { business_name: "Atherstone & Cook Legal", phone: "2630242704244", phone_2: "2630242794994.0", email: "general@paraetor.co.zw", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐⭐ WARM", notes: "7th Floor Mercury House 119 Josiah Chinamano Ave" },
  { business_name: "Chihambakwe Mutizwa & Partners", phone: "2630242708595", phone_2: "263712200210.0", email: "cmplaw@cmplaw.co.zw", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐⭐ WARM", notes: "18 Weale Road Milton Park - business law firm" },
  { business_name: "Coghlan Welsh & Guest", phone: "2630242794930", email: "email@cwg.co.zw", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐⭐ WARM", notes: "Cecil House 2 Central Avenue - business law" },
  { business_name: "Gill Godlonton & Gerrans (GGG)", phone: "2630242705528", phone_2: "2630242705529.0", email: "ggg@ggg.co.zw", website: "ggg.co.zw", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐⭐ WARM", notes: "Beverly Court Nelson Mandela/4th St - commercial law SMEs" },
  { business_name: "Honey & Blanckenberg Legal", phone: "2630242251331", phone_2: "2630242251334.0", email: "admin@honeyb.co.zw", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐⭐ WARM", notes: "200 Herbert Chitepo Avenue - business law clients" },
  { business_name: "Scanlen & Holderness Legal", phone: "2630242702561", city: "Harare", industry: "Legal / Law Firm", lead_quality: "⭐ COOL", notes: "Premier firm - mostly large corporates" },
  { business_name: "Allied Insurance Company", phone: "2630242764330", phone_2: "263772199199.0", email: "info@alliedinsurance.co.zw", website: "alliedinsurance.co.zw", city: "Harare", industry: "Insurance / Financial Services", lead_quality: "⭐⭐ WARM", notes: "52 Somerset Drive Eastlea - WhatsApp 0772 199 199" },
  { business_name: "Invent Multiple Insurance Agents", phone: "263867721159000", phone_2: "263732441441.0", city: "Harare", industry: "Insurance / Financial Services", lead_quality: "⭐⭐ WARM", notes: "WhatsApp +263732441441 - SME insurance clients" },
  { business_name: "FBC Insurance", phone: "2630242783204", phone_2: "263772419693.0", email: "info@fbc.co.zw", website: "fbc.co.zw", city: "Harare", industry: "Insurance / Financial Services", lead_quality: "⭐⭐ WARM", notes: "6th Floor FBC Centre 45 Nelson Mandela Ave - WhatsApp active" },
  { business_name: "Frontcomm Accounting Services", phone: "263477071400", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "7th Floor Throgmorton 51 S Machel Ave" },
  { business_name: "Unlimited Tax & Accounting Services", phone: "263422907303", city: "Harare", industry: "Tax Clearance Agent", lead_quality: "⭐⭐ WARM", notes: "Runhare House Cnr Kwame Nkrumah/4th St" },
  { business_name: "Business Advisory Services", phone: "263474972800", city: "Harare", industry: "Business Registration Agent", lead_quality: "⭐⭐ WARM", notes: "6th Floor Redbridge North Eastgate" },
  { business_name: "Chiro Consultants", phone: "26347045900", city: "Harare", industry: "Accounting Firm (SME)", lead_quality: "⭐⭐ WARM", notes: "32 Lanark Road Avondale - est 1989" }
];

async function seed() {
  console.log('--- CRM Contact Import ---');
  
  // 1. Delete existing
  console.log('Deleting existing contacts...');
  await supabase.from('crm_contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Prepare data mapping (using only columns that exist in 008_create_crm.sql)
  const mapped = contacts.map(c => ({
    business_name: c.business_name || null,
    phone: c.phone || null,
    email: c.email || null,
    website: c.website || null,
    industry: c.industry || null,
    city: c.city || null,
    pipeline_notes: `${c.lead_quality || ''} | ${c.phone_2 ? 'Phone 2: ' + c.phone_2 + ' | ' : ''}${c.notes || ''}`.trim(),
    source: 'import'
  }));

  // 3. Insert new
  console.log(`Inserting ${mapped.length} contacts...`);
  const { error: insError } = await supabase.from('crm_contacts').insert(mapped);
  
  if (insError) {
    console.error('Insert error:', insError.message);
  } else {
    console.log('Insert successful!');
  }
}

seed();
