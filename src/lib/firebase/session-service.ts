import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS, UserSession } from './models';
import { authService } from './auth';

export interface ClientDeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  browser: string;
  os: string;
}

export interface GeoLocationInfo {
  ipAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

function parseDeviceInfo(): ClientDeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      platform: 'unknown',
      language: 'unknown',
      screenResolution: 'unknown',
      deviceType: 'unknown',
      browser: 'unknown',
      os: 'unknown',
    };
  }

  const ua = navigator.userAgent;
  let deviceType: ClientDeviceInfo['deviceType'] = 'desktop';
  if (/Mobi|Android/i.test(ua)) deviceType = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

  let browser = 'Unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

  return {
    userAgent: ua,
    platform: navigator.platform || 'unknown',
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    deviceType,
    browser,
    os,
  };
}

async function fetchGeoLocation(): Promise<GeoLocationInfo> {
  try {
    const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      ipAddress: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    };
  } catch {
    return {};
  }
}

class SessionService {
  private activeSessionDocId: string | null = null;

  async startSession(userId: string, email: string, role: string): Promise<string | null> {
    try {
      const [device, geo] = await Promise.all([Promise.resolve(parseDeviceInfo()), fetchGeoLocation()]);

      const session: Omit<UserSession, 'id'> = {
        userId,
        email,
        role,
        loginTime: Timestamp.now(),
        lastActivity: Timestamp.now(),
        logoutTime: null,
        ipAddress: geo.ipAddress,
        userAgent: device.userAgent,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        platform: device.platform,
        screenResolution: device.screenResolution,
        language: device.language,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
        isActive: true,
        sessionDuration: 0,
        loginMethod: 'email_password',
      };

      const ref = await addDoc(collection(db, COLLECTIONS.USER_SESSIONS), session);
      this.activeSessionDocId = ref.id;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('equi_session_id', ref.id);
      }

      return ref.id;
    } catch (error) {
      console.warn('Failed to record login session:', error);
      return null;
    }
  }

  async endSession(sessionId?: string): Promise<void> {
    const id = sessionId || this.activeSessionDocId || (typeof window !== 'undefined' ? sessionStorage.getItem('equi_session_id') : null);
    if (!id) return;

    try {
      const sessionRef = doc(db, COLLECTIONS.USER_SESSIONS, id);
      const loginSnap = await getDoc(sessionRef);
      const loginTime = loginSnap.data()?.loginTime as Timestamp | undefined;
      const now = Timestamp.now();
      const durationMinutes = loginTime
        ? Math.round((now.toMillis() - loginTime.toMillis()) / 60000)
        : 0;

      await updateDoc(sessionRef, {
        isActive: false,
        logoutTime: now,
        lastActivity: now,
        sessionDuration: durationMinutes,
      });
    } catch (error) {
      console.warn('Failed to end session:', error);
    } finally {
      this.activeSessionDocId = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('equi_session_id');
      }
    }
  }

  async touchActivity(): Promise<void> {
    const id = this.activeSessionDocId || (typeof window !== 'undefined' ? sessionStorage.getItem('equi_session_id') : null);
    if (!id) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.USER_SESSIONS, id), {
        lastActivity: Timestamp.now(),
      });
    } catch {
      // non-critical
    }
  }

  async getRecentSessions(limitCount = 100): Promise<UserSession[]> {
    const q = query(
      collection(db, COLLECTIONS.USER_SESSIONS),
      orderBy('loginTime', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserSession));
  }

  async getSessionsByUser(userId: string, limitCount = 50): Promise<UserSession[]> {
    const q = query(
      collection(db, COLLECTIONS.USER_SESSIONS),
      where('userId', '==', userId),
      orderBy('loginTime', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserSession));
  }

  async getActiveSessions(): Promise<UserSession[]> {
    const q = query(
      collection(db, COLLECTIONS.USER_SESSIONS),
      where('isActive', '==', true),
      orderBy('loginTime', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserSession));
  }
}

export const sessionService = new SessionService();

/** Record session after successful auth when employee profile exists */
export async function recordLoginSession(): Promise<void> {
  const user = authService.getCurrentUser();
  if (!user?.employee) return;
  const role = user.employee.roles[0]?.jobTitle || 'Unknown';
  await sessionService.startSession(user.uid, user.email, role);
}
