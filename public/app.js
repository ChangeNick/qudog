(()=>{
"use strict";
const $=id=>document.getElementById(id);
const ids=Object.keys(MODELS);
const features={
  patrol:{title:'Автономные обходы<br>по расписанию.',description:'Обходы по расписанию, контрольные точки и возврат на зарядку. Робот сам поднимается и спускается по лестницам, переключается между картами этажей и продолжает миссию при кратковременной потере связи.',tags:['LiDAR + IMU','Несколько этажей','Работа без GNSS'],event:'Контрольная точка пройдена',detail:'Корпус А · фото и координаты сохранены',icon:'✓'},
  vision:{title:'Обнаружение нарушений<br>и фиксация событий.',description:'Люди и транспорт, курение, задымление, СИЗ и изменения на объекте. От 13 моделей компьютерного зрения и VLM-анализ помогают превратить видеопоток в понятный журнал событий.',tags:['Фото + время + место','Журнал событий','VLM-отчёт'],event:'Человек в контролируемой зоне',detail:'Событие отмечено на карте · оператор уведомлён',icon:'!'},
  data:{title:'Сбор данных<br>и контроль изменений.',description:'Сбор трёхмерных данных, фото контрольных точек и визуальная инспекция. Сравнение состояния объекта между обходами и передача результатов в системы заказчика.',tags:['3D-картографирование','Контроль изменений','Подключение систем'],event:'Данные контрольной точки обновлены',detail:'Лидар и фотоснимки · результаты доступны оператору',icon:'⌁'}
};
let currentFeature='patrol';
function selectFeature(key){
  currentFeature=key;const f=features[key];
  document.querySelectorAll('[data-feature]').forEach(b=>{const on=b.dataset.feature===key;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  $('feature-panel').setAttribute('aria-labelledby','tab-'+key);$('feature-title').innerHTML=f.title;$('feature-description').textContent=f.description;
  $('feature-tags').replaceChildren(...f.tags.map(t=>{const s=document.createElement('span');s.textContent=t;return s;}));
  document.querySelector('.map').dataset.mode=key;$('demo-event-title').textContent=f.event;$('demo-event-description').textContent=f.detail;$('demo-icon').textContent=f.icon;
}
document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>selectFeature(b.dataset.feature)));
$('demo-next').addEventListener('click',()=>{const keys=Object.keys(features);selectFeature(keys[(keys.indexOf(currentFeature)+1)%keys.length]);});
function tabKeys(container,select,keyFor){
 container.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const bs=[...container.querySelectorAll('[role=tab]')];let i=bs.indexOf(document.activeElement);if(i<0)return;i=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+bs.length)%bs.length;select(keyFor(bs[i]));bs[i].focus();});
}
tabKeys(document.querySelector('.platform-tabs'),selectFeature,b=>b.dataset.feature);
$('model-tabs').innerHTML=ids.map(id=>{const m=MODELS[id];return `<button type="button" class="model-tab" role="tab" id="model-tab-${id}" data-model="${id}" aria-selected="${id==='m1'}" aria-controls="model-detail" tabindex="${id==='m1'?0:-1}"><span>${m.maker.toUpperCase()}</span><strong>${m.name}</strong><small>${m.from?'от ':''}${rubles(m.price)}</small></button>`;}).join('');
function selectModel(id){
 const m=MODELS[id];
 document.querySelectorAll('[data-model]').forEach(b=>{const on=b.dataset.model===id;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
 $('model-detail').setAttribute('aria-labelledby','model-tab-'+id);$('model-kind').textContent=m.kind.toUpperCase();const image=$('model-image');image.srcset=m.srcset||'';image.src=m.image;image.alt=m.maker+' '+m.name;
 $('model-maker').textContent=m.maker.toUpperCase();$('model-index').textContent=`0${ids.indexOf(id)+1} / 05`;$('model-name').textContent=m.name;$('model-desc').textContent=m.desc;
 $('model-specs').innerHTML=m.specs.map(s=>`<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join('');
 $('model-price').textContent=(m.from?'от ':'')+rubles(m.price);$('model-price-label').textContent='Платформа с НДС';$('model-buy').href=m.url;$('model-request').href=m.url;
 $('model-buy').setAttribute('aria-label',`Подробнее о ${m.maker} ${m.name} на qubot.ru`);
 $('image-note').textContent='ПО подключается отдельно. Комплектация согласуется в ТКП.';
}
document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>selectModel(b.dataset.model)));
tabKeys($('model-tabs'),selectModel,b=>b.dataset.model);
selectModel('m1');

const menu=document.querySelector('.menu-toggle');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');$('navigation').dataset.open='false';}
menu.addEventListener('click',()=>{const on=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',on);menu.setAttribute('aria-label',on?'Закрыть меню':'Открыть меню');$('navigation').dataset.open=on;});
$('navigation').querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('click',e=>{if(!document.querySelector('.header').contains(e.target))closeMenu();});

let lastModalTrigger=null;
function openDialog(id,trigger){lastModalTrigger=trigger;$(id).showModal();}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openDialog(b.dataset.open,b)));
document.querySelectorAll('dialog').forEach(d=>{d.querySelectorAll('.close-modal').forEach(b=>b.addEventListener('click',()=>d.close()));d.addEventListener('close',()=>lastModalTrigger?.focus());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
function goToContact(){
 $('contact').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function updateInterest(){
 const model=MODELS[$('contact-model').value];
 const license=$('contact-license').value;
 const items=[model?model.maker+' '+model.name:'',license==='monthly'?'ПО автономной навигации · 70 000 ₽/месяц':license==='perpetual'?'ПО автономной навигации · 1 200 000 ₽ бессрочно':''].filter(Boolean);
 $('contact-interest').hidden=items.length===0;$('contact-interest').textContent=items.length?'Интересует: '+items.join(' · '):'';
}
document.querySelectorAll('[data-license]').forEach(button=>button.addEventListener('click',()=>{
 $('contact-license').value=button.dataset.license;updateInterest();goToContact();
}));
$('contact-form').addEventListener('submit',event=>{
 event.preventDefault();const form=event.currentTarget,status=$('contact-status'),button=$('contact-submit');
 status.textContent='';status.className='contact-status';
 const values=Object.fromEntries(new FormData(form));
 const name=String(values.name||'').trim(),phone=String(values.phone||'').trim(),email=String(values.email||'').trim();
 let error='',field=null;
 if(name.length<2){error='Укажите ваше имя — минимум 2 символа.';field=$('contact-name');}
 else if(!phone&&!email){error='Укажите телефон или email, чтобы мы могли связаться с вами.';field=$('contact-phone');}
 else if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){error='Проверьте адрес электронной почты.';field=$('contact-email');}
 else if(phone&&!/^\+?[0-9 ()-]{7,40}$/.test(phone)||phone&&phone.replace(/\D/g,'').length<7||phone&&phone.replace(/\D/g,'').length>15){error='Проверьте номер телефона.';field=$('contact-phone');}
 else if(!$('contact-consent').checked){error='Подтвердите, что с вами можно связаться по указанным контактам.';field=$('contact-consent');}
 if(error){status.textContent=error;status.classList.add('is-error');field?.focus();return;}
 const model=MODELS[values.model];
 const license=values.license==='monthly'?'70 000 ₽/месяц':values.license==='perpetual'?'1 200 000 ₽ бессрочно':'';
 const mailto=buildContactMailto({name,company:String(values.company||'').trim(),phone,email,message:String(values.message||'').trim(),model:model?model.maker+' '+model.name:'',license});
 status.textContent='Заявка подготовлена для отправки в почтовой программе. Если письмо не открылось, напишите на info@qubot.ru. Отправьте письмо, чтобы передать заявку.';
 window.location.href=mailto;
});
// A second demonstration never starts over the audio of the first one.
const demonstrationVideos=[...document.querySelectorAll('video')];
demonstrationVideos.forEach(video=>video.addEventListener('play',()=>{demonstrationVideos.forEach(other=>{if(other!==video)other.pause();});}));

document.querySelectorAll('[data-play]').forEach(button=>{
 const video=$(button.dataset.play),status=document.querySelector('[data-video-status="'+button.dataset.play+'"]');
 button.addEventListener('click',async()=>{
  status.textContent='';
  try{await video.play();button.hidden=true;}
  catch{status.textContent='Не удалось запустить видео. Попробуйте ещё раз.';}
 });
 video.addEventListener('play',()=>{button.hidden=true;});
 video.addEventListener('ended',()=>{button.hidden=false;});
});

$('equipment-request').addEventListener('click',()=>{
 const message=$('contact-message');
 if(!message.value.trim())message.value='Интересует подбор навесного оборудования для робота.';
});

})();
