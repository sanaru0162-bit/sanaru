(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const regions = {owari:'愛知・尾張',mikawa_with:'愛知・三河（個別指導あり）',mikawa_without:'愛知・三河（個別指導なし）',shizuoka:'静岡'};
  const schools = [{id:'elementary',name:'小学生',prefix:'小',count:6},{id:'middle',name:'中学生',prefix:'中',count:3},{id:'high',name:'高校生',prefix:'高',count:3}];
  const config = window.COURSE_CONFIG;
  const enabled = (v) => v === true || v === 1 || String(v).toLowerCase() === 'true';
  let data = window.COURSE_DATA;
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
    const kinds=['個別指導','AI学トレ','力シリーズ','映像授業'];
    let total=0,unknown=false;
    kinds.forEach((kind,i)=>{
      const count=Number(row[i+5]||0),unit=units.get(kind);
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
    while(table.getBoundingClientRect().height>wrap.getBoundingClientRect().height+.5&&body>10.5){body-=.25;paper.style.setProperty('--body-size',`${body}px`);}
    while($('notes').getBoundingClientRect().height>notes.getBoundingClientRect().height+.5&&note>10.5){note-=.25;paper.style.setProperty('--note-size',`${note}px`);}
    const fitsHeight=table.getBoundingClientRect().height<=wrap.getBoundingClientRect().height+.5&&$('notes').getBoundingClientRect().height<=notes.getBoundingClientRect().height+.5;
    const fitsWidth=[...paper.querySelectorAll('td,th')].every((cell)=>cell.scrollWidth<=cell.clientWidth+1);
    return {fits:fitsHeight&&fitsWidth,font:body};
  }
  function render(){
    lockSchools();setPrintable(false);
    const label=regions[$('region').value];
    $('summary').textContent=`${label} ／ ${[...selected].join('・')||'学年未選択'}`;
    if(loading){unavailable('最新データを取得しています。');return;}
    if(failed){unavailable('データを取得できませんでした。接続が回復するまで紙面の出力は停止します。');return;}
    if($('season').value!=='winter'){unavailable('この季節の背景とプランは準備中です。冬期を選択するとデモを確認できます。');return;}
    if(!selected.size){unavailable('掲載する学年を選択してください。');return;}
    if([...selected].some((g)=>!['小4','小5','小6'].includes(g))){unavailable('選択した学年の背景またはプランは準備中です。デモは小4〜小6に対応しています。');return;}
    if($('region').value!=='owari'){unavailable('この地域版のプランは準備中です。愛知・尾張を選択するとデモを確認できます。');return;}
    try{
      if(!data||!Array.isArray(data.planRows)||!Array.isArray(data.unitRows)||!Array.isArray(data.noteRows))throw new Error('データの形式を確認してください。');
      const units=new Map(data.unitRows.filter((r)=>enabled(r[0])).map((r)=>[r[1],Number(r[2])]));
      const rows=data.planRows.filter((r)=>enabled(r[0])&&(!r[1]||r[1]===label)&&selected.has(r[2])).sort((a,b)=>Number(a[11]||0)-Number(b[11]||0));
      if(!rows.length||[...selected].some((g)=>!rows.some((r)=>r[2]===g))){unavailable('選択した学年のプランが揃っていません。プランマスターを確認してください。');return;}
      let unknown=false;
      const tbody=$('plans').querySelector('tbody');tbody.replaceChildren();
      rows.forEach((row)=>{
        const tr=element('tr');tr.append(element('td',row[2]),element('td',row[3],'course'),element('td',row[4]));
        const detail=['個別指導','AI学トレ','力シリーズ','映像授業'].map((kind,i)=>Number(row[i+5])>0?`${kind} ${row[i+5]}回`:null).filter(Boolean).join(' ＋ ');
        const cell=element('td',detail,'detail');if(row[10] && !detail.replaceAll(' ','').endsWith(String(row[10]).replaceAll(' ','')))cell.append(element('small',row[10]));
        const price=rowPrice(row,units);unknown ||= price.unknown;tr.append(cell,element('td',price.text));tbody.append(tr);
      });
      $('paper-meta').textContent=`${label}　${[...selected].join('・')}　／ デモ用`;
      $('notes').replaceChildren();
      data.noteRows.filter((r)=>enabled(r[0])&&(!r[1]||r[1]===label)).sort((a,b)=>Number(a[2]||0)-Number(b[2]||0)).forEach((r)=>{
        const text=!config.apiUrl&&String(r[3]).includes('スプレッドシートの変更後')?'このデモは2026年10月5日取得データを使用します。シートからの自動反映は準備中です。':r[3];
        $('notes').append(element('li',text));
      });
      if(unknown)$('notes').append(element('li','「料金確認中」のプランは単価未設定です。正式な料金をご確認ください。'));
      $('empty').hidden=true;$('paper-frame').hidden=false;resize();
      const fitted=fit();
      if(backgroundFailed){setStatus('背景画像を読み込めませんでした。紙面の出力を停止しています。','error');return;}
      if(!backgroundReady){setStatus('背景画像を読み込んでいます。');return;}
      if(!fitted.fits){setStatus('紙面に収まりません。掲載する学年を減らしてください。内容の欠落を防ぐため出力を停止しています。','error');return;}
      setPrintable(true);setStatus(`${rows.length}件のプランを表示しています。${unknown?'単価未設定のプランは「料金確認中」です。':''} デモ用の紙面としてPDF保存できます。`,unknown?'warning':'');
    }catch(error){unavailable(error.message);}
  }
  function loadApi(){
    if(!config.apiUrl)return;
    const id=++requestId,callback=`courseGuide_${Date.now()}_${id}`,script=document.createElement('script');
    loading=true;failed=false;render();
    let timer;
    const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
    const fail=()=>{cleanup();if(id!==requestId)return;loading=false;failed=true;data=null;render();};
    window[callback]=(response)=>{
      cleanup();if(id!==requestId)return;
      if(!response?.ok||!Array.isArray(response.planRows)||!Array.isArray(response.unitRows)||!Array.isArray(response.noteRows)){fail();return;}
      data=response;loading=false;failed=false;render();$('source-info').textContent=`最終更新：${new Date().toLocaleString('ja-JP')}`;
    };
    timer=setTimeout(fail,15000);script.onerror=fail;
    const url=new URL(config.apiUrl);url.searchParams.set('callback',callback);url.searchParams.set('region',$('region').value);url.searchParams.set('_',Date.now());script.src=url.href;document.head.append(script);
  }
  buildGrades();$('source-info').textContent=`${data.sourceSheet}の${data.capturedAt}取得データを使用しています。`;
  $('season').addEventListener('change',render);$('region').addEventListener('change',()=>config.apiUrl?loadApi():render());
  $('print').addEventListener('click',()=>{render();if(canPrint)window.print();});
  window.addEventListener('resize',()=>{resize();render();});
  window.addEventListener('beforeprint',()=>{render();document.body.classList.toggle('print-blocked',!canPrint);});
  $('background').addEventListener('load',()=>{backgroundReady=true;render();});$('background').addEventListener('error',()=>{backgroundFailed=true;render();});
  if($('background').complete&&$('background').naturalWidth){backgroundReady=true;}
  render();document.fonts.ready.then(render);if(config.apiUrl){loadApi();setInterval(loadApi,config.refreshMs);}
})();