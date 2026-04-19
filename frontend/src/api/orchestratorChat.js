import api from './axios';

export async function listOrchestratorSessions(classroomId) {
  const res = await api.get(`/classrooms/${classroomId}/orchestrator-chat/sessions`);
  return res.data.data.sessions;
}

export async function getOrchestratorSession(classroomId, sessionId) {
  const res = await api.get(
    `/classrooms/${classroomId}/orchestrator-chat/sessions/${sessionId}`,
  );
  return res.data.data.session;
}

export async function deleteOrchestratorSession(classroomId, sessionId) {
  await api.delete(`/classrooms/${classroomId}/orchestrator-chat/sessions/${sessionId}`);
}

/**
 * Open an SSE stream for a new orchestrator message.
 *
 * Returns an async iterator of parsed events. Consumer is responsible for
 * calling `controller.abort()` if they want to cancel early.
 */
export async function* streamOrchestratorMessage({
  classroomId,
  question,
  sessionId,
  signal,
}) {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${api.defaults.baseURL}/classrooms/${classroomId}/orchestrator-chat/messages/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        question,
        sessionId: sessionId || undefined,
      }),
      signal,
    },
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || 'Failed to start orchestrator stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6));
      } catch {
        // skip malformed SSE line
      }
    }
  }
}
