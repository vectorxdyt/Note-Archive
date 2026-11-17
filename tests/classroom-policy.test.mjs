import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classroomForLesson, DEFAULT_CLASSROOM_ID, sanitizeClassroomName,
  storedClassroom, validateClassroom, validClassroomId,
} from '../lib/classroom-policy.ts';

const classroomId = '32b9f99e-8a32-4bb8-8498-e620a66af613';

test('existing lessons without a classroom stay in the original AP Calculus classroom', () => {
  assert.equal(classroomForLesson(undefined), DEFAULT_CLASSROOM_ID);
  assert.equal(classroomForLesson('not-a-classroom'), DEFAULT_CLASSROOM_ID);
  assert.equal(classroomForLesson(classroomId), classroomId);
});

test('classroom names are normalized and reject empty or oversized values', () => {
  assert.equal(sanitizeClassroomName('  AP   Calculus · Period 3  '), 'AP Calculus · Period 3');
  assert.equal(sanitizeClassroomName('  '), null);
  assert.equal(sanitizeClassroomName('x'.repeat(81)), null);
});

test('classroom settings normalize independent student rosters', () => {
  assert.deepEqual(validateClassroom({
    name: 'Calculus · Period 2',
    publicAccess: false,
    allowedEmails: [' Student@school.edu ', 'student@school.edu'],
  }, classroomId), {
    id: classroomId,
    name: 'Calculus · Period 2',
    publicAccess: false,
    allowedEmails: ['student@school.edu'],
  });
  assert.equal(validateClassroom({name: 'Period 2', publicAccess: false, allowedEmails: ['invalid']}, classroomId), null);
  assert.equal(validClassroomId('ap-calculus'), true);
  assert.equal(validClassroomId('period-2'), false);
});

test('stored classroom data fails closed while the legacy classroom keeps its old policy', () => {
  assert.deepEqual(storedClassroom({name: 'Period 4', allowedEmails: ['valid@school.edu']}, classroomId), {
    id: classroomId,
    name: 'Period 4',
    publicAccess: false,
    allowedEmails: ['valid@school.edu'],
  });
  assert.deepEqual(storedClassroom(undefined, DEFAULT_CLASSROOM_ID, {publicAccess: true, allowedEmails: []}), {
    id: DEFAULT_CLASSROOM_ID,
    name: 'AP Calculus',
    publicAccess: true,
    allowedEmails: [],
  });
});
