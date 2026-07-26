/** Equity premises GPS — used to verify staff check-in location */

export const PREMISES_LOCATION = {
  latitude: 0.3003189086066935,
  longitude: 32.51002992832647,
  label: 'Equity premises',
} as const;

/** Max distance from premises (meters) to count as on-site */
export const PREMISES_RADIUS_METERS = 200;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Haversine distance in meters between two WGS84 points */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function evaluatePremisesPresence(
  latitude?: number | null,
  longitude?: number | null,
  radiusMeters: number = PREMISES_RADIUS_METERS
): {
  hasLocation: boolean;
  distanceMeters: number | null;
  onPremises: boolean | null;
  premises: typeof PREMISES_LOCATION;
} {
  if (
    latitude == null ||
    longitude == null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return {
      hasLocation: false,
      distanceMeters: null,
      onPremises: null,
      premises: PREMISES_LOCATION,
    };
  }

  const distance = distanceMeters(
    { latitude, longitude },
    {
      latitude: PREMISES_LOCATION.latitude,
      longitude: PREMISES_LOCATION.longitude,
    }
  );
  const rounded = Math.round(distance * 10) / 10;

  return {
    hasLocation: true,
    distanceMeters: rounded,
    onPremises: rounded <= radiusMeters,
    premises: PREMISES_LOCATION,
  };
}

export function formatCoords(latitude?: number | null, longitude?: number | null): string {
  if (latitude == null || longitude == null) return '—';
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/** Browser geolocation for check-in */
export function getCurrentPosition(): Promise<GeoPoint & { accuracyMeters?: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not available on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(new Error(err.message || 'Could not read GPS location'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

/** Resolve public IP via app API (falls back to empty) */
export async function fetchClientIp(): Promise<string | undefined> {
  try {
    const res = await fetch('/api/client-ip', { cache: 'no-store' });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { ip?: string };
    return data.ip || undefined;
  } catch {
    return undefined;
  }
}
