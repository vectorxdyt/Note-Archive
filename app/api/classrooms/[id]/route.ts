import {getClassroom, setClassroom} from '@/lib/classrooms';
import {validateClassroom, validClassroomId} from '@/lib/classroom-policy';
import {failure, sameOrigin, teacher} from '@/lib/server';

export const runtime = 'nodejs';

export async function PUT(req: Request, {params}: {params: Promise<{id: string}>}) {
  if (!sameOrigin(req)) return Response.json({error: 'Request not allowed.'}, {status: 403});
  const user = await teacher();
  if (!user) return Response.json({error: 'Please sign in as the teacher.'}, {status: 401});
  const {id} = await params;
  if (!validClassroomId(id)) return Response.json({error: 'Invalid classroom.'}, {status: 400});
  if (Number(req.headers.get('content-length')) > 100_000) return Response.json({error: 'The classroom roster is too large.'}, {status: 413});
  let body;
  try { body = await req.json(); } catch { return Response.json({error: 'Invalid classroom settings.'}, {status: 400}); }
  const classroom = validateClassroom(body, id);
  if (!classroom) return Response.json({error: 'Use a valid classroom name and up to 500 valid student emails.'}, {status: 400});
  try {
    if (!await getClassroom(id)) return Response.json({error: 'Classroom not found.'}, {status: 404});
    await setClassroom(classroom, user.uid);
    return Response.json(classroom, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}
