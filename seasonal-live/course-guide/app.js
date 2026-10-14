(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const regions = {owari:'愛知・尾張',mikawa_with:'愛知・三河（個別指導あり）',mikawa_without:'愛知・三河（個別指導なし）',shizuoka:'静岡'};
  const sourceSheets = {owari:'1j63jxMDg5L09a4Gncnq7gowv8SXtjbIoJe52tC-67k8',mikawa_with:'1YBgEd8iIkobchVwnOOxr43tXJEUiLxo20f0hM1swACM',mikawa_without:'1XXGhVEQIHxNv-BGwA9Nb2VFIqoSd76LNqrGBbIsql7s'};
  const schools = [{id:'elementary',name:'小学生',prefix:'小',count:6},{id:'middle',name:'中学生',prefix:'中',count:3},{id:'high',name:'高校生',prefix:'高',count:3}];
  const config = window.COURSE_CONFIG;
  const enabled = (v) => v === true || v === 1 || String(v).toLowerCase() === 'true';
  let data = config.apiUrl ? null : window.COURSE_DATA;
  let selected = new Set(['小4','小5','小6']);
  let selectedSchool = 'elementary';
  let canPrint = false, backgroundReady = false, backgroundFailed = false, loading = false, failed = false, requestId = 0;
  const currency = new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0});
  const schoolOf = (grade) => schools.find((s)=>grade.startsWith(s.prefix))?.id;
  const element = (tag,text,className) => {const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;};
  const setStatus = (text,type='') => { $('status').textContent=text; $('status').className=type; };
  const setPrintable = (value) => {canPrint=value;$('print').disabled=!value;document.body.classList.toggle('print-blocked',!value);};
  function buildGrades(){
    schools.forEach((s)=>{
      const button=element('button',s.name,'school-button');button.type='button';button.dataset.school=s.id;
      button.addEventListener('click',()=>{selectedSchool=s.id;render();});$('grades').append(button);
    });
  }
  function availableGrades(){
    const season=$('season').value,label=regions[$('region').value];
    if(loading||failed||!['winter','summer'].includes(season)||!sourceSheets[$('region').value]||!Array.isArray(data?.planRows)||(data.season&&data.season!==season)||(data.region&&data.region!==$('region').value))return new Set();
    return new Set(data.planRows.filter(r=>enabled(r[0])&&(!r[1]||r[1]===label)&&schoolOf(r[2]||'')).map(r=>r[2]));
  }
  function lockSchools(){
    const available=availableGrades();
    selected=new Set([...available].filter(g=>schoolOf(g)===selectedSchool));
    $('grades').querySelectorAll('button').forEach(button=>{
      button.disabled=![...available].some(g=>schoolOf(g)===button.dataset.school);
      button.setAttribute('aria-pressed',String(button.dataset.school===selectedSchool));
      button.title=button.disabled?(loading?'プランを取得しています。':'この季節・地域の有効なプランがありません。'):'';
    });
    $('grade-help').textContent='選択した区分の有効なプランを全学年分表示します。';
  }
  function resize(){
    if($('paper-frame').hidden)return;
    document.querySelectorAll('.paper-frame').forEach(frame=>{const scale=Math.min(1,frame.clientWidth/1123);frame.querySelector('.paper').style.transform=`scale(${scale})`;frame.style.height=`${794*scale}px`;});
  }
  function unavailable(text){
    $('paper-frame').hidden=true;$('empty').hidden=false;$('empty').textContent=text;
    setStatus(text,'warning');setPrintable(false);
  }
  function rowPrice(row,units){
    const kinds=['個別指導','AI学トレ','力シリーズ','映像授業','自立学習'];
    let total=0,unknown=false;
    kinds.forEach((kind,i)=>{
      const count=Number(row[i===4?12:i+5]||0),unit=units.get(kind);
      if(!Number.isFinite(count)||count<0)throw new Error('回数が正しく設定されていません。');
      if(count>0){
        if(unit===undefined||!Number.isFinite(unit)||unit<0||(unit===0&&!config.freeContents.includes(kind)))unknown=true;
        else total+=count*unit;
      }
    });
    return {text:unknown?'料金確認中':currency.format(total),unknown};
  }
  function fit(paper=$('paper'),expand=false){
    const table=paper.querySelector('table'),wrap=paper.querySelector('.table-wrap'),notes=paper.querySelector('.paper-notes');
    let body=expand?18:13,note=12,padding=1.5;
    paper.style.setProperty('--row-padding',`${padding}px`);
    paper.style.setProperty('--body-size',`${body}px`);paper.style.setProperty('--note-size',`${note}px`);
    while(table.getBoundingClientRect().height>wrap.getBoundingClientRect().height+.5&&body>8.5){body-=.25;paper.style.setProperty('--body-size',`${body}px`);}
    while(notes.scrollHeight>notes.clientHeight+1&&note>8.5){note-=.25;paper.style.setProperty('--note-size',`${note}px`);}
    if(expand){
      while(padding<12&&table.getBoundingClientRect().height<wrap.getBoundingClientRect().height*.94){
        padding+=.5;paper.style.setProperty('--row-padding',`${padding}px`);
        if(table.getBoundingClientRect().height>wrap.getBoundingClientRect().height+.5){padding-=.5;paper.style.setProperty('--row-padding',`${padding}px`);break;}
      }
    }
    const fitsHeight=table.getBoundingClientRect().height<=wrap.getBoundingClientRect().height+.5&&notes.scrollHeight<=notes.clientHeight+1;
    const fitsWidth=[...paper.querySelectorAll('td,th')].every((cell)=>cell.scrollWidth<=cell.clientWidth+1);
    return {fits:fitsHeight&&fitsWidth,font:body,tableFits:table.getBoundingClientRect().height<=wrap.getBoundingClientRect().height+.5};
  }
  function paginate(){
    const first=$('paper'),rows=[...first.querySelector('tbody').children];
    first.dataset.paginated='false';
    const grades=new Map();
    rows.forEach(row=>{const grade=row.cells[0].textContent;if(!grades.has(grade))grades.set(grade,[]);grades.get(grade).push(row);});
    first.querySelector('tbody').replaceChildren();let paper=first,pages=1;
    for(const group of grades.values()){
      const tbody=paper.querySelector('tbody'),previous=tbody.children.length;tbody.append(...group);
      if(!fit(paper).tableFits&&previous>0){
        group.forEach(row=>row.remove());fit(paper);
        const frame=$('paper-frame').cloneNode(true);frame.removeAttribute('id');frame.classList.add('extra-page');
        frame.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
        paper=frame.querySelector('.paper');paper.querySelector('tbody').replaceChildren(...group);
        $('paper-frame').parentElement.append(frame);pages++;resize();fit(paper);
      }
    }
    const fits=[...document.querySelectorAll('.paper-frame .paper')].map(p=>{p.dataset.paginated=String(pages>1);return fit(p,pages>1);}).every(result=>result.fits);
    return {fits,pages};
  }
  function chooseBackground(){
    const summer=$('season').value==='summer', first=[...selected][0]||'小4';
    const stage=selectedSchool, variant=stage==='middle'?'middle1':stage;
    $('paper').dataset.layout=summer?variant:'winter';
    $('paper').dataset.school=stage;
    const asset=summer?'summer-'+variant+'.png':'winter-'+stage+'.png';
    const src=config.backgrounds?.[asset]||'assets/'+asset+(summer?'':'?v=20261006');
    if($('background').getAttribute('src')!==src){backgroundReady=false;backgroundFailed=false;$('background').src=src;$('background').alt=(summer?'夏期':'冬期')+'講座 '+(schools.find(s=>s.id===stage)?.name||'')+'用の背景デザイン';}
  }
  function render(){
    document.querySelectorAll('.extra-page').forEach(frame=>frame.remove());
    const sheetId=sourceSheets[$('region').value];
    $('source-link').hidden=!sheetId;
    if(sheetId)$('source-link').href='https://docs.google.com/spreadsheets/d/'+sheetId+'/edit';
    lockSchools();setPrintable(false);chooseBackground();
    const summer=$('season').value==='summer';
    const label=regions[$('region').value];
    $('summary').textContent=`${label} ／ ${schools.find(s=>s.id===selectedSchool).name}`;
    if(loading){unavailable('最新データを取得しています。');return;}
    if(failed){unavailable('データを取得できませんでした。接続が回復するまで紙面の出力は停止します。');return;}
    if(!['winter','summer'].includes($('season').value)){unavailable('この季節の背景とプランは準備中です。冬期または夏期を選択してください。');return;}
    if(!selected.size){unavailable('選択した区分のプランは未登録です。');return;}
    if(!sourceSheets[$('region').value]){unavailable('この地域版のプランは準備中です。愛知・尾張または愛知・三河を選択してください。');return;}
    try{
      if(!data||!Array.isArray(data.planRows)||!Array.isArray(data.unitRows)||!Array.isArray(data.noteRows))throw new Error('データの形式を確認してください。');
      const stage=schools.find(s=>s.id===schoolOf([...selected][0])).name;
      const applicable=data.unitRows.filter(r=>enabled(r[0])&&(!r[4]||r[4]===stage));
      const units=new Map(applicable.filter(r=>summer?r[5]==='紙面掲載':!r[5]&&!r[6]).map(r=>[r[1],Number(r[2])]));
      const rows=data.planRows.filter((r)=>enabled(r[0])&&(!r[1]||r[1]===label)&&selected.has(r[2])).sort((a,b)=>Number(a[11]||0)-Number(b[11]||0));
      const missingGrades=[...selected].filter(g=>!rows.some(r=>r[2]===g));
      $('paper').querySelector('.content').hidden=!rows.length;
      let unknown=false;
      const tbody=$('plans').querySelector('tbody');tbody.replaceChildren();
      rows.forEach((row)=>{
        const tr=element('tr'),course=element('td',row[3],'course');if(row[14]&&row[14]!==row[3])course.append(element('small',row[14]));tr.append(element('td',row[2]),course,element('td',row[4]));
        const detail=['個別指導','AI学トレ','力シリーズ','映像授業','自立学習'].map((kind,i)=>{const count=row[i===4?12:i+5];return Number(count)>0?`${kind} ${count}回`:null;}).filter(Boolean).join(' ＋ ');
        const cell=element('td',detail,'detail');if(row[10] && !detail.replaceAll(' ','').endsWith(String(row[10]).replaceAll(' ','')))cell.append(element('small',row[10]));
        const price=rowPrice(row,units);unknown ||= price.unknown;tr.append(cell,element('td',price.text),element('td',row[13]||'','lesson-description'));tbody.append(tr);
      });
      $('paper-meta').textContent=[label,[...selected].join('・'),[String(data.settings?.年度||''),'資料掲載料金'].filter(Boolean).join(' ／ ')].filter(Boolean).join('　');
      $('paper-title').textContent=data.settings?.見出し||((summer?'夏期':'冬期')+'講座 おすすめプラン');
      $('notes-heading').hidden=!summer;
      $('notes-title').textContent=data.settings?.特記事項見出し||'特記事項';
      $('deadline').textContent=data.settings?.申込締切?'申込締切：'+data.settings.申込締切:'';
      $('notes').replaceChildren();
      // 紙面の「注意事項」は、シート「特記事項」の内容だけを表示する。
      data.noteRows.filter((r)=>enabled(r[0])&&(!r[1]||r[1]===label)&&(!r[4]||r[4]===stage)&&(!r[5]||String(r[5]).split(/[,、・\s]+/).some(g=>selected.has(g)))&&String(r[3]??'').trim()).sort((a,b)=>Number(a[2]||0)-Number(b[2]||0)).forEach((r)=>$('notes').append(element('li',r[3])));
      if(summer&&data.settings?.料金注記)$('notes').append(element('li',data.settings.料金注記));
      $('empty').hidden=true;$('paper-frame').hidden=false;resize();
      const fitted=paginate();
      if(backgroundFailed){setStatus('背景画像を読み込めませんでした。紙面の出力を停止しています。','error');return;}
      if(!backgroundReady){setStatus('背景画像を読み込んでいます。');return;}
      if(missingGrades.length){setStatus(`${summer?'夏期':'冬期'}の${missingGrades.join('・')}のプランが未登録です。背景は取り込み済みです。プランシートに登録すると紙面へ表示されます。`,'warning');return;}
      if(!fitted.fits){setStatus('紙面に収まらない長い項目があります。シートの講座内容・注意事項をご確認ください。内容の欠落を防ぐため出力を停止しています。','error');return;}
      setPrintable(true);setStatus(`${rows.length}件のプランを${fitted.pages}ページで表示しています。${unknown?'単価未設定のプランは「料金確認中」です。':''} 印刷・PDF保存できます。`,unknown?'warning':'');
    }catch(error){unavailable(error.message);}
  }
  function loadApi(){
    if(!config.apiUrl){data=window.COURSE_DATASETS?.[$('season').value]||window.COURSE_DATA;render();return;}
    if(!['winter','summer'].includes($('season').value)){++requestId;loading=false;failed=false;data=null;render();return;}
    if(!sourceSheets[$('region').value]){++requestId;loading=false;failed=false;data=null;render();return;}
    const region=$('region').value,season=$('season').value;
    const id=++requestId,callback=`courseGuide_${Date.now()}_${id}`,script=document.createElement('script');
    loading=true;failed=false;render();
    let timer;
    const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
    const fail=()=>{clearTimeout(timer);script.remove();window[callback]=()=>{};setTimeout(()=>{delete window[callback];},60000);if(id!==requestId)return;loading=false;failed=true;data=null;$('source-info').textContent='最新データを取得できません。ページを開き直すか、再読み込みしてください。';render();};
    window[callback]=(response)=>{
      cleanup();if(id!==requestId)return;
      if(response?.ok!==true||response.region!==region||response.season!==season||!Array.isArray(response.planRows)||!Array.isArray(response.unitRows)||!Array.isArray(response.noteRows)){fail();return;}
      data=response;loading=false;failed=false;render();$('source-info').textContent=`シート取得日時：${new Date(response.generatedAt).toLocaleString('ja-JP')}`;
    };
    timer=setTimeout(fail,45000);script.onerror=fail;
    const url=new URL(config.apiUrl);url.searchParams.set('callback',callback);url.searchParams.set('region',region);url.searchParams.set('season',season);url.searchParams.set('_',Date.now());script.src=url.href;document.head.append(script);
  }
  buildGrades();$('source-info').textContent=config.apiUrl?'最新データを取得しています。':`${data.sourceSheet}の${data.capturedAt}取得データを使用しています。`;
  $('refresh-info').textContent=config.apiUrl?'ページを開く・再読み込みするタイミングでシートを取得します。開いている間の定期更新はありません。特記事項は紙面の注意事項に反映します。':'取得済みデータを使用しています。シート変更の自動反映は準備中です。';
  $('season').addEventListener('change',loadApi);$('region').addEventListener('change',()=>config.apiUrl?loadApi():render());
  $('print').addEventListener('click',()=>{render();if(canPrint)window.print();});
  window.addEventListener('resize',()=>{resize();render();});
  window.addEventListener('beforeprint',()=>{render();document.body.classList.toggle('print-blocked',!canPrint);});
  $('background').addEventListener('load',()=>{backgroundReady=true;render();});$('background').addEventListener('error',()=>{backgroundFailed=true;render();});
  if($('background').complete&&$('background').naturalWidth){backgroundReady=true;}
  window.addEventListener('pageshow',(event)=>{if(event.persisted&&config.apiUrl)loadApi();});
  render();document.fonts.ready.then(render);if(config.apiUrl)loadApi();
})();
