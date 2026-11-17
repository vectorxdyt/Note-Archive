import 'server-only';
import {randomUUID} from 'node:crypto';
import {firestore} from './firebase-admin';
import {getAccessPolicy} from './access';
import {
  DEFAULT_CLASSROOM_ID, DEFAULT_CLASSROOM_NAME, MAX_CLASSROOMS,
  storedClassroom, validClassroomId, type Classroom,
} from './classroom-policy';

const collection = () => firestore().collection('classrooms');

export async function getClassrooms(): Promise<Classroom[]> {
  const [snapshot, legacyPolicy] = await Promise.all([collection().get(), getAccessPolicy()]);
  const classrooms = snapshot.docs.map(doc => storedClassroom(doc.data(), doc.id));
  if (!classrooms.some(classroom => classroom.id === DEFAULT_CLASSROOM_ID)) {
    classrooms.push({id: DEFAULT_CLASSROOM_ID, name: DEFAULT_CLASSROOM_NAME, ...legacyPolicy});
  }
  return classrooms.sort((a, b) =>
    Number(b.id === DEFAULT_CLASSROOM_ID) - Number(a.id === DEFAULT_CLASSROOM_ID) || a.name.localeCompare(b.name)
  );
}

export async function getClassroom(id: string): Promise<Classroom | null> {
  if (!validClassroomId(id)) return null;
  const snapshot = await collection().doc(id).get();
  if (snapshot.exists) return storedClassroom(snapshot.data(), id);
  if (id === DEFAULT_CLASSROOM_ID) {
    return {id, name: DEFAULT_CLASSROOM_NAME, ...await getAccessPolicy()};
  }
  return null;
}

export async function createClassroom(name: string, teacherUid: string): Promise<Classroom | null> {
  const existing = await getClassrooms();
  if (existing.length >= MAX_CLASSROOMS) return null;
  const classroom: Classroom = {id: randomUUID(), name, publicAccess: false, allowedEmails: []};
  await collection().doc(classroom.id).create({...classroom, created_at: new Date().toISOString(), created_by: teacherUid});
  return classroom;
}

export async function setClassroom(classroom: Classroom, teacherUid: string) {
  await collection().doc(classroom.id).set({
    name: classroom.name,
    publicAccess: classroom.publicAccess,
    allowedEmails: classroom.allowedEmails,
    updated_at: new Date().toISOString(),
    updated_by: teacherUid,
  }, {merge: true});
}
