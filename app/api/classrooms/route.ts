import {createClassroom, getClassrooms} from '@/lib/classrooms';
import {MAX_CLASSROOMS, sanitizeClassroomName} from '@/lib/classroom-policy';
import {failure, sameOrigin, teacher} from '@/lib/server';

export const runtime = 'nodejs';

export async function GET() {
  if (!await teacher()) return Response.json({error: 'Please sign in as the teacher.'}, {status: 401});
  try {
    return Response.json({classrooms: await getClassrooms()}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({error: 'Request not allowed.'}, {status: 403});
  const user = await teacher();
  if (!user) return Response.json({error: 'Please sign in as the teacher.'}, {status: 401});
  if (Number(req.headers.get('content-length')) > 2_000) return Response.json({error: 'Classroom name is too large.'}, {status: 413});
  let body;
  try { body = await req.json(); } catch { return Response.json({error: 'Enter a classroom name.'}, {status: 400}); }
  const name = sanitizeClassroomName(body?.name);
  if (!name) return Response.json({error: 'Classroom names must be between 1 and 80 characters.'}, {status: 400});
  try {
    const classroom = await createClassroom(name, user.uid);
    if (!classroom) return Response.json({error: `You can create up to ${MAX_CLASSROOMS} classrooms.`}, {status: 409});
    return Response.json(classroom, {status: 201, headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}
