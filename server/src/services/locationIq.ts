export interface PlaceResult {
  business_name: string;
  address: string;
  city: string;
  google_place_id: string; // Internal ID for consistency
  rating?: number;
  source: 'location_iq';
}

const API_KEY = () => process.env.LOCATIONIQ_API_KEY ?? '';

export async function searchBusinesses(
  query: string,
  city: string,
  _pageToken?: string
): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  if (!API_KEY()) {
    console.error('LOCATIONIQ_API_KEY is missing in .env');
    return { results: [] };
  }

  // LocationIQ Search API
  const searchQuery = `${query} in ${city}, Zimbabwe`;
  const url = `https://us1.locationiq.com/v1/search.php?key=${API_KEY()}&q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=50`;

  const res = await fetch(url);
  
  if (res.status === 404) {
    return { results: [] };
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown' })) as { error?: string };
    throw new Error(`LocationIQ error: ${res.status} — ${errorData.error ?? 'Unknown error'}`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    return { results: [] };
  }

  const results: PlaceResult[] = data.map((place: any) => {
    // LocationIQ display_name is often very long, we try to extract the name
    const name = place.display_name.split(',')[0];
    
    return {
      business_name: name,
      address: place.display_name,
      city,
      google_place_id: `liq_${place.place_id}`, // Prefixing for internal distinction
      source: 'location_iq' as const,
      // LocationIQ free tier doesn't always provide ratings, phone, or website in the search call
    };
  });

  return { results };
}

export async function getPlaceDetails(_placeId: string): Promise<{ phone: string | null; website: string | null }> {
  // LocationIQ doesn't have a direct "Place Details" API like Google that returns phone/website consistently
  // unless you use their specialized POI data. 
  // However, for the basic free tier, we might need to rely on the search results or additional scrapers.
  // For now, we'll return null to keep the app functional without errors.
  return { phone: null, website: null };
}
