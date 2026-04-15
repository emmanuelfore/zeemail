export interface PlaceResult {
  business_name: string;
  address: string;
  city: string;
  google_place_id: string;
  rating?: number;
  reviews_count?: number;
  categories?: string[];
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  email_type?: 'professional' | 'unprofessional' | 'unknown';
  email_provider?: string | null;
  domain_available?: boolean | null;
  source: 'google_maps';
}

const API_KEY = () => process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = () => process.env.RAPIDAPI_HOST ?? 'local-business-search.p.rapidapi.com';

export async function searchBusinesses(
  query: string,
  city: string,
  _pageToken?: string
): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  if (!API_KEY()) {
    console.error('RAPIDAPI_KEY is missing in .env');
    return { results: [] };
  }

  const searchQuery = `${query} in ${city}, Zimbabwe`;
  
  try {
    const response = await fetch(`https://${RAPIDAPI_HOST()}/search?query=${encodeURIComponent(searchQuery)}&limit=20`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY(),
        'x-rapidapi-host': RAPIDAPI_HOST(),
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'GMD API Error' })) as { message?: string };
      throw new Error(`GMD API Error: ${response.status} — ${err.message ?? 'Unknown'}`);
    }

    const data = await response.json() as any;
    
    // local-business-search typically returns an array in 'data'
    const rawResults = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);

    const results: PlaceResult[] = rawResults.map((place: any) => {
      // Some APIs return emails directly
      const emails = place.emails || (place.email ? [place.email] : []);
      const firstEmail = Array.isArray(emails) && emails.length > 0 ? emails[0] : (typeof emails === 'string' ? emails : null);

      return {
        business_name: place.name || place.business_name || place.title,
        address: place.full_address || place.address || place.address_string,
        city,
        google_place_id: place.place_id || place.business_id || place.data_id,
        rating: place.rating,
        reviews_count: place.reviews || place.reviews_count,
        categories: Array.isArray(place.types) ? place.types : (typeof place.category === 'string' ? [place.category] : []),
        phone: place.phone_number || place.phone || place.phone_string,
        website: place.website || place.site_url,
        email: firstEmail,
        source: 'google_maps_multi' as const,
      };
    });

    return { results };
  } catch (err) {
    console.error('Search failed:', err);
    return { results: [] };
  }
}

<<<<<<< HEAD
export async function getPlaceDetails(placeId: string, _businessName?: string, _city?: string): Promise<{ phone: string | null; website: string | null; email?: string | null }> {
=======
export async function getPlaceDetails(placeId: string, businessName?: string, city?: string): Promise<{ phone: string | null; website: string | null; email?: string | null }> {
>>>>>>> 7d7a145af8ec4fa5a843046524cac7cef90f3cdf
  // With GMD, the search result often already contains everything.
  try {
    const response = await fetch(`https://${RAPIDAPI_HOST()}/details?place_id=${placeId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY(),
        'x-rapidapi-host': RAPIDAPI_HOST(),
      },
    });

    if (!response.ok) return { phone: null, website: null };

    const data = await response.json() as any;
    const phone = data.phone_number || data.phone || null;
    const website = data.website || null;
    const email = Array.isArray(data.emails) ? data.emails[0] : (data.email || null);

    // If still missing website/email, we can use a "discovery" fallback later if needed.
    return { phone, website, email };
  } catch {
    return { phone: null, website: null };
  }
}
