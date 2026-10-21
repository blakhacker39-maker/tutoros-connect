import {readInvitation,registryUrl,validateManifest,chooseRoute,targetUrl,probe} from './protocol.js';
const REPOSITORY = 'blakhacker39-maker/tutoros-connect';
const status = document.querySelector('#status'), retry = document.querySelector('#retry');
let config, credentials, cachedRoutes, fetchedAt=0, running=false, attempts=0, timer;
const gateway = location.origin + location.pathname;
async function getJson(url, limit=16384) {
  const controller = new AbortController(), timer=setTimeout(()=>controller.abort(),8000);
  try {
    const r = await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
    if(!r.ok) throw Error('Список подключений пока недоступен.');
    const text=await r.text(); if(text.length>limit) throw Error('Некорректный размер ответа.');
    return JSON.parse(text);
  } finally {clearTimeout(timer);}
}
async function connect() {
  if(running) return; clearTimeout(timer);
  if(document.hidden) return;
  running=true; retry.disabled=true; attempts++;
  let retryAllowed=true;
  try {
    credentials ||= readInvitation(location.hash);
    config ||= await getJson('./config.json');
    if(config.enabled !== true) {
      retryAllowed=false;
      throw Error('Страница готова, но преподаватель ещё не включил постоянное подключение. Пока используйте прежнее приглашение.');
    }
    if(!/^[\w-]{16,128}$/.test(config.installationId || '')) {retryAllowed=false;throw Error('Настройка TutorOS не завершена.');}
    status.textContent='Проверяем доступ к вашей комнате…';
    if(!cachedRoutes || Date.now()-fetchedAt>=60000) {
      const value=await getJson(registryUrl(config,REPOSITORY));
      cachedRoutes=value; fetchedAt=Date.now();
    }
    const routes=validateManifest(cachedRoutes,config.installationId);
    const winner=await chooseRoute(routes,config.installationId,credentials,(origin,id,c)=>probe(origin,id,c,{publicKey:config.publicKey}));
    // Tokens remain in the URL fragment, not in public-host query strings.
    location.replace(targetUrl(winner,credentials,gateway));
    retryAllowed=false;
  } catch(e) {
    if(e.code==='ACCESS_DENIED')retryAllowed=false;
    status.textContent=e.message || 'Не удалось подключиться.';
    if(!credentials) retryAllowed=false;
  } finally {
    running=false;retry.disabled=false;
    // No endless background polling and no requests while the tab is hidden.
    if(retryAllowed && attempts<6) timer=setTimeout(connect,60000);
    else if(retryAllowed) status.textContent+=' Автопроверка приостановлена. Нажмите «Повторить». '+
      'Прежняя ссылка остаётся той же.';
  }
}
retry.addEventListener('click',()=>{attempts=0;void connect();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(attempts<6)void connect();});
void connect();
