// tutorOS Connect: compatible with the reviewed protocol-1 board endpoints.
export function safeOrigin(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.pathname !== '/' || u.search || u.hash) return '';
    return /(?:\.(?:ru|nl)\.tuna\.am|\.a\.tuna\.free|\.a\.2na\.am|\.ts\.net|\.lhr\.life|\.localhost\.run)$/.test(u.hostname) ? u.origin : '';
  } catch { return ''; }
}
export function validateManifest(m, installationId, now = Date.now()) {
  if (m?.protocol !== 1 || m.installationId !== installationId ||
      !Number.isFinite(m.generatedAt) || !Number.isFinite(m.expiresAt) ||
      m.generatedAt > now + 30000 || m.expiresAt <= now ||
      m.expiresAt <= m.generatedAt || m.expiresAt - m.generatedAt > 900000 ||
      !Array.isArray(m.routes) || m.routes.length > 8) throw Error('Список подключений устарел. Ожидаем преподавателя.');
  const seen = new Set();
  return m.routes.filter(r => {
    if (!r || !safeOrigin(r.origin) || !Number.isFinite(r.priority) || seen.has(r.origin)) return false;
    seen.add(r.origin); return true;
  }).sort((a, b) => a.priority - b.priority);
}
export function readInvitation(hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const valid = s => typeof s === 'string' && /^[\w-]{22,64}$/.test(s);
  if (!valid(p.get('room')) || !valid(p.get('invite'))) throw Error('Откройте персональную ссылку преподавателя или QR занятия.');
  const lesson = p.get('lesson') || '', resume = p.get('resume') || '';
  if (lesson && !/^[\w-]{1,100}$/.test(lesson)) throw Error('Некорректный номер урока в ссылке.');
  if (resume && !/^[\w-]{1,512}$/.test(resume)) throw Error('Некорректные данные восстановления.');
  return {roomId: p.get('room'), inviteToken: p.get('invite'), lesson, resume};
}
export function registryUrl(config, expectedRepository, now = Date.now()) {
  const expected = `https://raw.githubusercontent.com/${expectedRepository}/routes/active-origins.json`;
  if (config.publishRepository !== expectedRepository || config.manifest !== expected) throw Error('Адрес реестра не совпадает с настройкой сайта.');
  // Shared one-minute cache key, never one unique URL for every student/request.
  const u = new URL(expected); u.searchParams.set('v', Math.floor(now / 60000)); return u.href;
}
export function targetUrl(origin, credential, gateway) {
  if (!safeOrigin(origin)) throw Error('Недопустимый маршрут.');
  const u = new URL('/student/' + credential.roomId, origin);
  u.hash = new URLSearchParams({invite: credential.inviteToken, gateway,
    ...(credential.lesson ? {lesson: credential.lesson} : {}),
    ...(credential.resume ? {resume: credential.resume} : {})}).toString();
  return u.href;
}
function combinedSignal(timeoutMs, signal) {
  if (signal?.aborted) throw Error('Проверка отменена.');
  const c = new AbortController(), stop = () => c.abort();
  const t = setTimeout(stop, timeoutMs); signal?.addEventListener('abort', stop, {once:true});
  return {signal:c.signal, dispose(){clearTimeout(t);signal?.removeEventListener('abort',stop);}};
}
export async function probe(origin, installationId, credential,
  {fetchImpl=fetch, WebSocketImpl=WebSocket, timeoutMs=6000, signal}={}) {
  if (!safeOrigin(origin)) throw Error('Недопустимый маршрут.');
  const nonce = crypto.randomUUID(), control = combinedSignal(timeoutMs, signal);
  let health;
  try {
    const r = await fetchImpl(`${origin}/teacheros-api/connect/challenge?nonce=${nonce}`, {
      cache:'no-store', credentials:'omit', redirect:'error', signal:control.signal,
      headers:{'tuna-skip-browser-warning':'1'}
    });
    if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) throw Error('Сервер не отвечает.');
    const text = await r.text(); if (text.length > 8192) throw Error('Некорректный ответ сервера.');
    health = JSON.parse(text);
  } finally { control.dispose(); }
  if (health.service !== 'TeacherOS' || health.nonce !== nonce || health.installationId !== installationId || health.protocol !== 1) throw Error('Маршрут ведёт к другой установке TutorOS.');
  if (signal?.aborted) throw Error('Проверка отменена.');
  await new Promise((resolve,reject) => {
    let done=false;
    const ws = new WebSocketImpl(origin.replace('https:','wss:') + '/ws?connect-probe=1');
    const finish = error => {
      if(done) return; done=true; clearTimeout(timer); signal?.removeEventListener('abort',cancel);
      try { ws.close(); } catch { /* failed opening handshake */ }
      error ? reject(error) : resolve();
    };
    const cancel = () => finish(Error('Проверка отменена.'));
    const timer = setTimeout(() => finish(Error('Совместная доска не отвечает.')), timeoutMs);
    ws.onopen = () => ws.send(JSON.stringify({type:'connect-probe',payload:{roomId:credential.roomId,inviteToken:credential.inviteToken,nonce}}));
    ws.onmessage = e => {
      try {
        if (String(e.data).length > 8192) throw Error();
        const m=JSON.parse(e.data);
        if(m.type==='connect-ready' && m.nonce===nonce && m.installationId===installationId && m.protocol===1) finish();
        else finish(Error('Доступ к комнате не подтверждён.'));
      } catch { finish(Error('Некорректный ответ совместной доски.')); }
    };
    ws.onerror = () => finish(Error('Совместная доска недоступна.'));
    ws.onclose = () => { if(!done) finish(Error('Соединение прервано.')); };
    signal?.addEventListener('abort',cancel,{once:true}); if(signal?.aborted) cancel();
  });
  return origin;
}
export async function chooseRoute(routes, installationId, credential, probeFn=probe) {
  for (const route of routes) {
    try { return await probeFn(route.origin, installationId, credential); }
    catch { /* A different verified route may still be available. */ }
  }
  throw Error('Нет доступного подключения. Дождитесь преподавателя и повторите вход.');
}
