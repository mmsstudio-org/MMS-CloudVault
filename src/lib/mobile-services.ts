import { authenticateMobile, mobileFirestore, MobileUser } from './mobile-auth';
export interface MobileServices {
  authenticate: (request: Request) => Promise<MobileUser>;
  readDocument: (path: string) => Promise<Record<string, unknown> | undefined>;
}
export const mobileServices: MobileServices = {
  authenticate: authenticateMobile,
  readDocument: async path => (await mobileFirestore().doc(path).get()).data(),
};
