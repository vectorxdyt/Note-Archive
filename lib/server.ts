import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';
import { allowedTeacher } from './security';
import {verifiedGoogleEmail} from './google-identity.mjs';
import { photoStorageConfigured } from './cloudinary';
import {approvedStudent} from './access-policy';
import {getClassrooms} from './classrooms';
import {validClassroomId} from './classroom-policy';

export const SESSION_COOKIE = 'notehub_firebase_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 5;
export const configured = () => Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID && process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.TEACHER_EMAIL && photoStorageConfigured()
);
export function sameOrigin(req: Request) {
  // Next.js can reconstruct req.url with an internal hostname. Compare with the
  // browser-facing Host header, preserving the scheme and port exactly.
  const host = req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || new URL(req.url).protocol.slice(0, -1);
  if (!host || !['http', 'https'].includes(protocol)) return false;
  return req.headers.get('origin') === `${protocol}://${host}`;
}
export async function sessionUser() {
  if (!configured()) return null;
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    return await adminAuth().verifySessionCookie(session, true);
  } catch { return null; }
}
export async function teacher() {
  const claims = await sessionUser();
  return claims && allowedTeacher(claims, process.env.TEACHER_EMAIL) ? claims : null;
}
export async function viewerAccess(classroomId?: string) {
  if (!configured()) return {authorized: true, publicAccess: true, teacher: false, user: null, email: null, classrooms: []};
  if (classroomId && !validClassroomId(classroomId)) return {authorized: false, publicAccess: false, teacher: false, user: null, email: null, classrooms: []};
  const [classrooms, user] = await Promise.all([getClassrooms(), sessionUser()]);
  const isTeacher = Boolean(user && allowedTeacher(user, process.env.TEACHER_EMAIL));
  const accessible = isTeacher ? classrooms : classrooms.filter(classroom => classroom.publicAccess || approvedStudent(user, classroom));
  const authorized = classroomId ? accessible.some(classroom => classroom.id === classroomId) : accessible.length > 0;
  return {
    authorized,
    publicAccess: accessible.some(classroom => classroom.publicAccess),
    teacher: isTeacher,
    user,
    email: user ? verifiedGoogleEmail(user) : null,
    classrooms: accessible,
  };
}
export function failure(error: unknown) {
  // Do not return SDK errors or service account details to browsers.
  console.error('Notehub Firebase operation failed:', (error as { code?: string })?.code || 'unknown');
  return Response.json({ error: 'Could not reach your classroom. Check the Firebase and Cloudinary setup or try again shortly.' }, { status: 503 });
}
