/*
  # person_events place columns: declare WGS 84 for future readers

  place_lat / place_lon are decimal degrees on WGS 84 (EPSG:4326), latitude
  first, as returned by GeoNames and Nominatim. numeric(9,6) is ~0.1 m.
  Gazetteer ids are optional; the as-given name remains if the author typed
  a locality without picking from the list.
*/

COMMENT ON COLUMN public.person_events.place_lat IS
  'Latitude in decimal degrees, WGS 84 (EPSG:4326). Pair with place_lon. Null if the author did not pick a gazetteer hit.';

COMMENT ON COLUMN public.person_events.place_lon IS
  'Longitude in decimal degrees, WGS 84 (EPSG:4326). Pair with place_lat. Null if the author did not pick a gazetteer hit.';

COMMENT ON COLUMN public.person_events.place_geonames_id IS
  'GeoNames geonameId when the locality was chosen from GeoNames (or OSM extratags). Not a postal address.';

COMMENT ON COLUMN public.person_events.place_wikidata_qid IS
  'Wikidata item id in Q-form (e.g. Q7024) when the gazetteer supplied it. Canonical, not a URL.';

COMMENT ON COLUMN public.person_events.place_name_as_given IS
  'Locality name as the author knew it. Kept even when coordinates are absent.';
