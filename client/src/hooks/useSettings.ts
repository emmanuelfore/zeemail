import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SystemSetting, Plan } from '../types';

export function usePricing() {
  const [pricing, setPricing] = useState<Record<Plan, number>>({
    starter: 5,
    business: 12,
    pro: 25,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPricing() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'pricing')
          .single();

        if (data) {
          setPricing(data.value as Record<Plan, number>);
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, []);

  return { pricing, loading };
}
