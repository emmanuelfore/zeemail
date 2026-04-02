import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Plan } from '../types';

type DomainAvailability = 'idle' | 'loading' | 'available' | 'taken' | 'error';

export interface RegistrationState {
  path: 'A' | 'B';
  domain: string;
  domainAvailability: DomainAvailability;
  plan: Plan | null;
  billing_cycle: 'monthly' | 'annual';
  // Account fields
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  password: string;
  physical_address: string;
  previous_email_provider: string | null;
  // ZISPA checklist (Path A)
  letterhead_ready: boolean;
  signed_letter_ready: boolean;
  id_ready: boolean;
  tc_confirmed: boolean;
  // Post-registration
  clientId: string | null;
  userId: string | null;
}

type AccountField = keyof Pick<
  RegistrationState,
  'full_name' | 'company_name' | 'phone' | 'email' | 'password' | 'physical_address' | 'previous_email_provider'
>;

type ZispaField = keyof Pick<
  RegistrationState,
  'letterhead_ready' | 'signed_letter_ready' | 'id_ready' | 'tc_confirmed'
>;

export interface UseRegistrationReturn extends RegistrationState {
  setPath: (path: 'A' | 'B') => void;
  setDomain: (domain: string) => void;
  setDomainAvailability: (status: DomainAvailability) => void;
  setPlan: (plan: Plan) => void;
  setBillingCycle: (billing: 'monthly' | 'annual') => void;
  setAccountField: (field: AccountField, value: string | null) => void;
  setZispaField: (field: ZispaField, value: boolean) => void;
  setClientId: (id: string) => void;
  setUserId: (id: string) => void;
  resetDomain: () => void;
}

function getInitialPlan(searchParams: URLSearchParams): Plan | null {
  const param = searchParams.get('plan');
  if (param === 'starter' || param === 'business' || param === 'pro') {
    return param;
  }
  return null;
}

function getInitialBilling(searchParams: URLSearchParams): 'monthly' | 'annual' {
  const param = searchParams.get('billing');
  return param === 'annual' ? 'annual' : 'monthly';
}

function getInitialDomain(searchParams: URLSearchParams): string {
  return searchParams.get('domain') ?? '';
}

export function useRegistration(): UseRegistrationReturn {
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<RegistrationState>({
    path: 'A',
    domain: getInitialDomain(searchParams),
    domainAvailability: 'idle',
    plan: getInitialPlan(searchParams),
    billing_cycle: getInitialBilling(searchParams),
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    password: '',
    physical_address: '',
    previous_email_provider: null,
    letterhead_ready: false,
    signed_letter_ready: false,
    id_ready: false,
    tc_confirmed: false,
    clientId: null,
    userId: null,
  });

  function setPath(path: 'A' | 'B') {
    setState((prev) => ({ ...prev, path }));
  }

  function setDomain(domain: string) {
    setState((prev) => ({ ...prev, domain }));
  }

  function setDomainAvailability(status: DomainAvailability) {
    setState((prev) => ({ ...prev, domainAvailability: status }));
  }

  function setPlan(plan: Plan) {
    setState((prev) => ({ ...prev, plan }));
  }

  function setAccountField(field: AccountField, value: string | null) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function setZispaField(field: ZispaField, value: boolean) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function setBillingCycle(billing_cycle: 'monthly' | 'annual') {
    setState((prev) => ({ ...prev, billing_cycle }));
  }

  function setClientId(id: string) {
    setState((prev) => ({ ...prev, clientId: id }));
  }

  function setUserId(id: string) {
    setState((prev) => ({ ...prev, userId: id }));
  }

  function resetDomain() {
    setState((prev) => ({ ...prev, domain: '', domainAvailability: 'idle' }));
  }

  return {
    ...state,
    setPath,
    setDomain,
    setDomainAvailability,
    setPlan,
    setBillingCycle,
    setAccountField,
    setZispaField,
    setClientId,
    setUserId,
    resetDomain,
  };
}
