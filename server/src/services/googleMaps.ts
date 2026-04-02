const API_KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? '';

export interface PlaceResult {
  business_name: string;
  address: string;
  city: string;
  google_place_id: string;
  rating?: number;
  source: 'google_maps';
}

export async function searchBusinesses(
  query: string,
  city: string,
  pageToken?: string
): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  const searchQuery = `${query} in ${city} Zimbabwe`;
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${API_KEY()}`;
  if (pageToken) url += `&pagetoken=${encodeURIComponent(pageToken)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Maps error: ${data.status} — ${data.error_message ?? ''}`);
  }

  const results: PlaceResult[] = (data.results ?? []).map((place: Record<string, unknown>) => ({
    business_name: place.name as string,
    address: place.formatted_address as string,
    city,
    google_place_id: place.place_id as string,
    rating: place.rating as number | undefined,
    source: 'google_maps' as const,
  }));

  return { results, nextPageToken: data.next_page_token };
}

export async function getPlaceDetails(placeId: string): Promise<{ phone: string | null; website: string | null }> {
  const fields = 'formatted_phone_number,website';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY()}`;
  const res = await fetch(url);
  const data = await res.json();
  const r = data.result ?? {};
  return { phone: r.formatted_phone_number ?? null, website: r.website ?? null };
}
