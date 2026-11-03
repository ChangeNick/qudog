// GitHub Pages has no backend. This creates a draft, never sends mail.
function buildContactMailto(values){
 const lines=['Заявка на автономную навигацию','',
  'Имя: '+(values.name||''),
  'Компания: '+(values.company||''),
  'Телефон: '+(values.phone||''),
  'Email: '+(values.email||'')];
 if(values.model)lines.push('Модель: '+values.model);
 if(values.license)lines.push('Лицензия ПО: '+values.license);
 lines.push('','Задача:',values.message||'');
 return 'mailto:info@qubot.ru?subject='+encodeURIComponent('Заявка на автономную навигацию')+'&body='+encodeURIComponent(lines.join('\r\n'));
}
