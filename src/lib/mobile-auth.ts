import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';

export class MobileError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface MobileUser { uid: string; name: string; role: string; assignedCategoryIds: string[]; }

function adminApp() {
  const projectId = process.env.MOBILE_FIREBASE_PROJECT_ID;
  if (!projectId || !process.env.MOBILE_FIREBASE_APP_ID) throw new MobileError(503, 'Mobile authentication is not configured');
  const existing = getApps().find(app => app.name === 'mobile-upload');
  if (existing) return existing;
  // Credential belongs only in server env/ADC. Never read client Remote Config/service_account_json.
  const json = process.env.MOBILE_FIREBASE_SERVICE_ACCOUNT_JSON;
  return initializeApp({ projectId, credential: json ? cert(JSON.parse(json)) : applicationDefault() }, 'mobile-upload');
}
export function mobileFirestore() { return getFirestore(adminApp()); }

export function mobileRole(data: Record<string, unknown> | undefined, uid: string): MobileUser {
  const ranks = ['SUPER_ADMIN','ADMIN','MODERATOR','PUBLISHER'];
  const names: Record<string,string> = { '0 - SUPER_ADMIN':'SUPER_ADMIN','1 - ADMIN':'ADMIN','2 - MODERATOR':'MODERATOR','3 - PUBLISHER':'PUBLISHER' };
  const raw = String(data?.role || '');
  const role = names[raw] || raw;
  if (!data || data.disabled === true || !ranks.includes(role)) throw new MobileError(403, 'An active publisher account is required');
  return { uid, role, name: typeof data.name === 'string' ? data.name : uid,
    assignedCategoryIds: Array.isArray(data.assignedCategoryIds) ? data.assignedCategoryIds.filter((id): id is string => typeof id === 'string') : [] };
}
export function isMobileAdmin(user: MobileUser) { return ['SUPER_ADMIN','ADMIN'].includes(user.role); }
export function authorizeMobileStory(user: MobileUser, story: Record<string, unknown> | undefined, categoryId: string, ownerUid?: string | null, deleting = false) {
  if (story) {
    if (!isMobileAdmin(user) && story.addedBy !== user.uid) throw new MobileError(403, 'Story ownership required');
  } else {
    if (ownerUid && !isMobileAdmin(user) && ownerUid !== user.uid) throw new MobileError(403, 'Asset ownership required');
    if (!deleting && (!categoryId || (user.role === 'PUBLISHER' && !user.assignedCategoryIds.includes(categoryId))))
      throw new MobileError(403, 'Assigned category required for a new story');
  }
}
export async function authenticateMobile(request: Request): Promise<MobileUser> {
  const auth = request.headers.get('authorization');
  const check = request.headers.get('x-firebase-appcheck');
  if (!auth?.startsWith('Bearer ') || !check) throw new MobileError(401, 'Firebase Auth and App Check tokens required');
  const app = adminApp();
  let uid: string;
  try {
    const [identity, attestation] = await Promise.all([getAuth(app).verifyIdToken(auth.slice(7), true), getAppCheck(app).verifyToken(check)]);
    if (attestation.appId !== process.env.MOBILE_FIREBASE_APP_ID) throw new Error('Wrong application');
    uid = identity.uid;
  } catch { throw new MobileError(401, 'Invalid or revoked Firebase credentials'); }
  const account = await mobileFirestore().doc(`users/${uid}`).get();
  return mobileRole(account.data(), uid); // Read live roles; never trust client role/name/preferences.
}
export function mobileId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id)) throw new MobileError(400, 'Invalid story document ID');
  return id;
}
