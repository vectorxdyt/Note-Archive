import {storedAccessPolicy, validateAccessPolicy, type AccessPolicy} from './access-policy.ts';

export const DEFAULT_CLASSROOM_ID = 'ap-calculus';
export const DEFAULT_CLASSROOM_NAME = 'AP Calculus';
export const MAX_CLASSROOMS = 30;

export type Classroom = AccessPolicy & {
  id: string;
  name: string;
};

export const validClassroomId = (value: unknown): value is string =>
  value === DEFAULT_CLASSROOM_ID || (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));

export function sanitizeClassroomName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  return name.length >= 1 && name.length <= 80 ? name : null;
}

export function validateClassroom(value: unknown, id: unknown): Classroom | null {
  if (!value || typeof value !== 'object' || !validClassroomId(id)) return null;
  const record = value as Record<string, unknown>;
  const name = sanitizeClassroomName(record.name);
  const policy = validateAccessPolicy(record);
  return name && policy ? {id, name, ...policy} : null;
}

export function storedClassroom(value: unknown, id: string, fallbackPolicy?: AccessPolicy): Classroom {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const name = sanitizeClassroomName(record.name) ?? (id === DEFAULT_CLASSROOM_ID ? DEFAULT_CLASSROOM_NAME : 'Untitled classroom');
  const policy = value && typeof value === 'object'
    ? storedAccessPolicy(value, true)
    : fallbackPolicy ?? {publicAccess: false, allowedEmails: []};
  return {id, name, ...policy};
}

export const classroomForLesson = (value: unknown) => validClassroomId(value) ? value : DEFAULT_CLASSROOM_ID;
