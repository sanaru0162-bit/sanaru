(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const regions = {owari:'愛知・尾張',mikawa_with:'愛知・三河（個別指導あり）',mikawa_without:'愛知・三河（個別指導なし）',shizuoka:'静岡'};
  const schools = [{id:'elementary',name:'小学生',prefix:'小',count:6},{id:'middle',name:'中学生',prefix:'中',count:3},{id:'high',name:'高校生',prefix:'高',count:3}];
  const config = window.COURSE_CONFIG;
  const enabled = (v) => v === true || v === 1 || String(v).toLowerCase() === 'true';
  let data = config.apiUrl ? null : window.COURSE_DATA;
  let selected = new Set(['小4','小5','小6']);
  let canPrint = false, backgroundReady = false, backgroundFailed = false, loading = false, failed = false, requestId = 0;
  const currency = new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0});
  const schoolOf = (grade) => schools.find((s)=>grade.startsWith(s.prefix))?.id;
  const element = (tag,text,className) => {const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;};
  const setStatus = (text,type='') => { $('status').textContent=text; $('status').className=type; };
  const setPrintable = (value) => {canPrint=value;$('print').disabled=!value;document.body.classList.toggle('print-blocked',!value);};
  function buildGrades(){
    schools.forEach((s)=>{
      const group=element('div',undefined,'school');group.append(element('span',s.name,'school-title'));
      const options=element('div',undefined,'grade-options');
      for(let n=1;n<=s.count;n++){
        const grade=s.prefix+n,box=element('div',undefined,'grade-choice'),label=element('label');
        const input=element('input');input.type='checkbox';input.value=grade;input.dataset.school=s.id;input.checked=selected.has(grade);
        input.addEventListener('change',()=>{
          const existing=selected.size?schoolOf([...selected][0]):null;
          if(input.checked && existing && existing!==s.id){input.checked=false;return;}
          input.checked?selected.add(grade):selected.delete(grade);render();
        });label.append(input,document.createTextNode(grade));box.append(label);options.append(box);
      }
      group.append(options);$('grades').append(group);
    });
  }
  function lockSchools(){
    const active=selected.size?schoolOf([...selected][0]):null;
    $('grades').querySelectorAll('input').forEach((input)=>{input.checked=selected.has(input.value);input.disabled=!!active&&input.dataset.school!==active;});
    $('grade-help').textContent=active?'学校段階を変えるときは、選択中の学年をすべて外してください。':'小4〜小6の紙面を確認できます。';
  }
  function resize(){
    if($('paper-frame').hidden)return;
    const scale=Math.min(1,$('paper-frame').clientWidth/1123);
    $('paper').style.transform=`scale(${scale})`;
    $('paper-frame').style.height=`${794*scale}px`;
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
  function fit(){
    const paper=$('paper'),table=$('plans'),wrap=paper.querySelector('.table-wrap'),notes=paper.querySelector('.paper-notes');
    let body=13,note=12;
    paper.style.setProperty('--body-size',`${body}px`);paper.style.setProperty('--note-size',`${note}px`);
    while(table.getBoundingClientRect().height>wrap.getBoundingClientRect().height+.5&&body>8.5){body-=.25;paper.style.setProperty('--body-size',`${body}px`);}
    while(notes.scrollHeight>notes.clientHeight+1&&note>8.5){note-=.25;paper.style.setProperty('--note-size',`${note}px`);}
    const fitsHeight=table.getBoundingClientRect().height<=wrap.getBoundingClientRect().height+.5&&notes.scrollHeight<=notes.clientHeight+1;
    const fitsWidth=[...paper.querySelectorAll('td,th')].every((cell)=>cell.scrollWidth<=cell.clientWidth+1);
    return {fits:fitsHeight&&fitsWidth,font:body};
  }
  function chooseBackground(){
    const summer=$('season').value==='summer', first=[...selected][0]||'小4';
    const stage=schoolOf(first)||'elementary', variant=stage==='middle'?(first==='中2'?'middle2':'middle1'):stage;
    $('paper').dataset.layout=summer?variant:'winter';
    const asset=summer?'summer-'+variant+'.png':'winter-elementary.png';
    const src=config.backgrounds?.[asset]||'assets/'+asset;
    if($('background').getAttribute('src')!==src){backgroundReady=false;backgroundFailed=false;$('background').src=src;$('background').alt=(summer?'夏期':'冬期')+'講座 '+(schools.find(s=>s.id===stage)?.name||'')+'用の背景デザイン';}
  }
  function render(){
    lockSchools();setPrintable(false);chooseBackground();
    const summer=$('season').value==='summer';$('rate-field').hidden=!summer;
    const label=regions[$('region').value];
    $('summary').textContent=`${label} ／ ${[...selected].join('・')||'学年未選択'}`;
    if(loading){unavailable('最新データを取得しています。');return;}
    if(failed){unavailable('データを取得できませんでした。接続が回復するまで紙面の出力は停止します。');return;}
    if(!['winter','summer'].includes($('season').value)){unavailable('この季節の背景とプランは準備中です。冬期を選択するとデモを確認できます。');return;}
    if(!selected.size){unavailable('掲載する学年を選択してください。');return;}
    if([...selected].some((g)=>!(summer?['小4','小5','小6','中1','中2','高1','高2']:['小4','小5','小6']).includes(g))){unavailable('選択した学年の背景またはプランは準備中です。デモは小4〜小6に対応しています。');return;}
    if($('region').value!=='owari'){unavailable('この地域版のプランは準備中です。愛知・尾張を選択するとデモを確認できます。');return;}
    try{
      if(!data||!Array.isArray(data.planRows)||!Array.isArray(data.unitRows)||!Array.isArray(data.noteRows))throw new Error('データの形式を確認してください。');
      const stage=schools.find(s=>s.id===schoolOf([...selected][0])).name;
      const applicable=data.unitRows.filter(r=>enabled(r[0])&&(!r[4]||r[4]===stage));
      const units=new Map(applicable.filter(r=>summer?r[5]==='紙面掲載':!r[5]&&!r[6]).map(r=>[r[1],Number(r[2])]));
      if(summer&&$('rate-mode').value==='正規')applicable.filter(r=>r[5]==='正規').forEach(r=>units.set(r[1],Number(r[2])));
      const rows=data.planRows.filter((r)=>enabled(r[0])&&(!r[1]||r[1]===label)&&selected.has(r[2])).sort((a,b)=>Number(a[11]||0)-Number(b[11]||0));
      if(!rows.length||[...selected].some((g)=>!rows.some((r)=>r[2]===g))){unavailable('選択した学年のプランが揃っていません。プランマスターを確認してください。');return;}
      let unknown=false;
      const tbody=$('plans').querySelector('tbody');tbody.replaceChildren();
      rows.forEach((row)=>{
        const tr=element('tr'),course=element('td',row[3],'course');if(row[14]&&row[14]!==row[3])course.append(element('small',row[14]));tr.append(element('td',row[2]),course,element('td',row[4]));
        const detail=['個別指導','AI学トレ','力シリーズ','映像授業','自立学習'].map((kind,i)=>{const count=row[i===4?12:i+5];return Number(count)>0?`${kind} ${count}回`:null;}).filter(Boolean).join(' ＋ ');
        const cell=element('td',detail,'detail');if(row[10] && !detail.replaceAll(' ','').endsWith(String(row[10]).replaceAll(' ','')))cell.append(element('small',row[10]));
        const price=rowPrice(row,units);unknown ||= price.unknown;tr.append(cell,element('td',price.text),element('td',row[13]||'','lesson-description'));tbody.append(tr);
      });
      $('paper-meta').textContent=[label,[...selected].join('・'),summer?[String(data.settings?.年度||''),$('rate-mode').value==='正規'?'正規料金':'資料掲載料金'].filter(Boolean).join(' ／ '): 'デモ用'].filter(Boolean).join('　');
      $('paper-title').textContent=data.settings?.見出し||((summer?'夏期':'冬期')+'講座 おすすめプラン');
      $('notes-heading').hidden=!summer;
      $('notes-title').textContent=data.settings?.特記事項見出し||'特記事項';
      $('deadline').textContent=data.settings?.申込締切?'申込締切：'+data.settings.申込締切:'';
      $('notes').replaceChildren();
      // 紙面の「注意事項」は、シート「特記事項」の内容だけを表示する。
      data.noteRows.filter((r)=>enabled(r[0])&&(!r[1]||r[1]===label)&&(!r[4]||r[4]===stage)&&(!r[5]||String(r[5]).split(/[,、・\s]+/).some(g=>selected.has(g)))&&String(r[3]??'').trim()).sort((a,b)=>Number(a[2]||0)-Number(b[2]||0)).forEach((r)=>$('notes').append(element('li',r[3])));
      if(summer&&data.settings?.料金注記&&$('rate-mode').value==='紙面掲載')$('notes').append(element('li',data.settings.料金注記));
      $('empty').hidden=true;$('paper-frame').hidden=false;resize();
      const fitted=fit();
      if(backgroundFailed){setStatus('背景画像を読み込めませんでした。紙面の出力を停止しています。','error');return;}
      if(!backgroundReady){setStatus('背景画像を読み込んでいます。');return;}
      if(!fitted.fits){setStatus('紙面に収まりません。掲載する学年を減らしてください。内容の欠落を防ぐため出力を停止しています。','error');return;}
      setPrintable(true);setStatus(`${rows.length}件のプランを表示しています。${unknown?'単価未設定のプランは「料金確認中」です。':''} デモ用の紙面としてPDF保存できます。`,unknown?'warning':'');
    }catch(error){unavailable(error.message);}
  }
  function loadApi(){
    if(!config.apiUrl){data=window.COURSE_DATASETS?.[$('season').value]||window.COURSE_DATA;render();return;}
    if(!['winter','summer'].includes($('season').value)){++requestId;loading=false;failed=false;data=null;render();return;}
    if($('region').value!=='owari'){++requestId;loading=false;failed=false;data=null;render();return;}
    const region=$('region').value,season=$('season').value;
    const id=++requestId,callback=`courseGuide_${Date.now()}_${id}`,script=document.createElement('script');
    loading=true;failed=false;render();
    let timer;
    const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
    const fail=()=>{clearTimeout(timer);script.remove();window[callback]=()=>{};setTimeout(()=>{delete window[callback];},60000);if(id!==requestId)return;loading=false;failed=true;data=null;$('source-info').textContent='最新データを取得できません。自動で再接続します。';render();};
    window[callback]=(response)=>{
      cleanup();if(id!==requestId)return;
      if(response?.ok!==true||response.region!==region||response.season!==season||!Array.isArray(response.planRows)||!Array.isArray(response.unitRows)||!Array.isArray(response.noteRows)){fail();return;}
      data=response;loading=false;failed=false;render();$('source-info').textContent=`シート取得日時：${new Date(response.generatedAt).toLocaleString('ja-JP')}`;
    };
    timer=setTimeout(fail,45000);script.onerror=fail;
    const url=new URL(config.apiUrl);url.searchParams.set('callback',callback);url.searchParams.set('region',region);url.searchParams.set('season',season);url.searchParams.set('_',Date.now());script.src=url.href;document.head.append(script);
  }
  buildGrades();$('source-info').textContent=config.apiUrl?'最新データを取得しています。':`${data.sourceSheet}の${data.capturedAt}取得データを使用しています。`;
  $('refresh-info').textContent=config.apiUrl?'ページを開くと最新データを取得し、60秒ごとに更新します。特記事項は紙面の注意事項に反映します。':'取得済みデータを使用しています。シート変更の自動反映は準備中です。';
  $('season').addEventListener('change',loadApi);$('rate-mode').addEventListener('change',render);$('region').addEventListener('change',()=>config.apiUrl?loadApi():render());
  $('print').addEventListener('click',()=>{render();if(canPrint)window.print();});
  window.addEventListener('resize',()=>{resize();render();});
  window.addEventListener('beforeprint',()=>{render();document.body.classList.toggle('print-blocked',!canPrint);});
  $('background').addEventListener('load',()=>{backgroundReady=true;render();});$('background').addEventListener('error',()=>{backgroundFailed=true;render();});
  if($('background').complete&&$('background').naturalWidth){backgroundReady=true;}
  render();document.fonts.ready.then(render);if(config.apiUrl){loadApi();setInterval(loadApi,config.refreshMs);}
})();

