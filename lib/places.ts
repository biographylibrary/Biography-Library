export type PlaceSearchHit = {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  geonamesId: number | null;
  wikidataQid: string | null;
  countryCode: string | null;
};
