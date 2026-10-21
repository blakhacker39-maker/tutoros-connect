export const protocol=1;
export const gateway='https://remarkable-gelato-57ae60.netlify.app/';
export const repository='blakhacker39-maker/tutoros-connect';
export const registry=`https://raw.githubusercontent.com/${repository}/routes/active-origins.json`;
export function gatewayUrl(value){return value===gateway?gateway:'';}
export function safeOrigin(value) {
  try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash&&/(?:\.(?:ru|nl)\.tuna\.am|\.a\.tuna\.free|\.a\.2na\.am|\.ts\.net|\.lhr\.life|\.localhost\.run)$/.test(u.hostname)?u.origin:'';} catch{return '';}
}
export function validateManifest(m,installationId,now=Date.now()) {
  if(m?.protocol!==protocol||m.installationId!==installationId||!Number.isFinite(m.generatedAt)||!Number.isFinite(m.expiresAt)||m.generatedAt>now+30000||m.expiresAt<=now||m.expiresAt<=m.generatedAt||m.expiresAt-m.generatedAt>900000||!Array.isArray(m.routes)||m.routes.length>8) throw Error('Сведения о подключении устарели');
  const seen=new Set();return m.routes.filter(r=>{if(!r||!safeOrigin(r.origin)||!Number.isFinite(r.priority)||seen.has(r.origin))return false;seen.add(r.origin);return true;}).sort((a,b)=>a.priority-b.priority);
}
export async function probe(origin,installationId,credential,{fetchImpl=fetch,WebSocketImpl=WebSocket,timeoutMs=8000,signal,publicKey}={}) {
  if(!safeOrigin(origin))throw Error('Недопустимый адрес');
  const nonce=crypto.randomUUID();
  const response=await fetchImpl(`${origin}/teacheros-api/connect/challenge?nonce=${nonce}`,{cache:'no-store',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])]),headers:{'tuna-skip-browser-warning':'1'}});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Сервер недоступен');
  const health=await response.json();if(health.service!=='TeacherOS'||health.nonce!==nonce||health.installationId!==installationId||health.protocol!==protocol)throw Error('Другой сервер');
  await verifyProof(health,origin,publicKey);
  await new Promise((resolve,reject)=>{
    const socket=new WebSocketImpl(origin.replace('https:','wss:')+'/ws?connect-probe=1');let done=false;
    const finish=error=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(error&&socket.terminate)socket.terminate();else socket.close();if(error)reject(error);else resolve();};
    const cancel=()=>finish(Error('Проверка отменена'));
    const timer=setTimeout(()=>finish(Error('Совместная доска не отвечает')),timeoutMs);
    socket.onopen=()=>socket.send(JSON.stringify({type:'connect-probe',payload:{...credential,nonce}}));
    socket.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='connect-ready'&&m.nonce===nonce&&m.installationId===installationId&&m.protocol===protocol)finish();else finish(Error('Доступ к комнате не подтверждён'));}catch{finish(Error('Некорректный ответ'));}};
    socket.onerror=()=>finish(Error('WSS недоступен'));socket.onclose=e=>{if(!done){const error=Error('Соединение закрыто');if(e.code===1008)error.code='ACCESS_DENIED';finish(error);}};
    signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  });
  return origin;
}
export function invitation(gateway,roomId,invite,lesson='',resume='') {
  const u=new URL(gateway);u.hash=new URLSearchParams({room:roomId,invite,...(lesson?{lesson}:{}),...(resume?{resume}:{})}).toString();return u.href;
}

export function manifestUrl(value, entry, now=Date.now()) {
  if(!gatewayUrl(entry)||value!==registry)throw Error('Адрес реестра не совпадает с настройкой сайта');
  const url=new URL(registry);url.searchParams.set('v',Math.floor(now/60000));return url.href;
}
export function registryUrl(config, expectedRepository=repository, now=Date.now()){
  if(expectedRepository!==repository||config.publishRepository!==repository)throw Error('Недопустимый реестр');
  return manifestUrl(config.manifest,gateway,now);
}
export function readInvitation(hash){
  const p=new URLSearchParams(hash.replace(/^#/,''));const valid=s=>typeof s==='string'&&/^[\w-]{22,64}$/.test(s);
  if(!valid(p.get('room'))||!valid(p.get('invite')))throw Error('Откройте персональную ссылку преподавателя или QR занятия.');
  const lesson=p.get('lesson')||'',resume=p.get('resume')||'';
  if(lesson&&!/^[\w-]{1,100}$/.test(lesson)||resume&&!/^[\w-]{1,512}$/.test(resume))throw Error('Некорректные данные восстановления');
  return {roomId:p.get('room'),inviteToken:p.get('invite'),lesson,resume};
}
export function targetUrl(origin,c,entry){
  if(!safeOrigin(origin)||!gatewayUrl(entry))throw Error('Недопустимый маршрут');
  const u=new URL('/student/'+c.roomId,origin);u.hash=new URLSearchParams({invite:c.inviteToken,gateway:entry,...(c.lesson?{lesson:c.lesson}:{}),...(c.resume?{resume:c.resume}:{})}).toString();return u.href;
}
export async function chooseRoute(routes,id,credential,probeFn=probe){
  for(const route of routes){try{return await probeFn(route.origin,id,credential);}catch(error){if(error.code==='ACCESS_DENIED')throw error;}}
  throw Error('Нет доступного подключения. Дождитесь преподавателя и повторите вход.');
}
export function proofPayload(health){return JSON.stringify([protocol,health.installationId,health.instanceId,health.origin,health.nonce,health.issuedAt]);}
export async function verifyProof(health,origin,publicKey,now=Date.now()){
  if(health.origin!==origin||!Number.isFinite(health.issuedAt)||Math.abs(now-health.issuedAt)>30000||!publicKey||publicKey.kty!=='EC'||publicKey.crv!=='P-256'||publicKey.d||!/^[A-Za-z0-9_-]{86}$/.test(health.signature||''))throw Error('Подлинность подключения не подтверждена');
  const key=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const signature=Uint8Array.from(atob(health.signature.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signature,new TextEncoder().encode(proofPayload(health))))throw Error('Подпись подключения не совпадает');
}
