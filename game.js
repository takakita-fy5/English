(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=[],questions=[],current=0,score=0,correct=0,combo=0,maxCombo=0,answered=false,questionCount=20;
function show(id){['start','game','result'].forEach(x=>$(x).classList.toggle('hidden',x!==id));window.scrollTo(0,0)}
function normalize(raw){
 if(!Array.isArray(raw)) throw new Error('単語データが配列ではありません');
 return raw.map((x,i)=>({id:Number(x.id)||i+1,word:String(x.word??'').trim(),meaning:String(x.meaning??'').trim(),example:String(x.example??''),example_jp:String(x.example_jp??'')})).filter(x=>x.word&&x.meaning);
}
async function loadData(){
 const paths=['data/TARGET_GAME.json','./data/TARGET_GAME.json','/data/TARGET_GAME.json'];
 let last='';
 for(const p of paths){try{const r=await fetch(p,{cache:'no-store'});if(!r.ok) throw new Error('HTTP '+r.status);const j=await r.json();data=normalize(j);if(!data.length) throw new Error('単語データが0件です');$('from').max=data.length;$('to').max=data.length;$('to').value=data.length;$('info').textContent=`${data.length}語を読み込みました。ゲームスタートできます！`;return;}catch(e){last=e.message}}
 throw new Error('単語データを読み込めませんでした。'+(last?' ('+last+')':''));
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function makeQuestions(){
 let from=Math.max(1,Number($('from').value)||1),to=Math.min(data.length,Number($('to').value)||data.length);if(from>to)[from,to]=[to,from];$('from').value=from;$('to').value=to;
 let pool=data.filter(x=>x.id>=from&&x.id<=to);if(pool.length<4) throw new Error('出題範囲には4語以上必要です。');
 questionCount=Math.min(Number($('count').value)||20,pool.length);pool=shuffle(pool);
 questions=pool.slice(0,questionCount).map(item=>{let mode=$('mode').value==='mixed'?(Math.random()<.5?'en-ja':'ja-en'):$('mode').value;let key=mode==='en-ja'?'meaning':'word', correctValue=item[key];let candidates=shuffle(pool.filter(x=>x.id!==item.id).map(x=>x[key]).filter(Boolean)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3);return {item,mode,correctValue,choices:shuffle([correctValue,...candidates])};});
}
function startGame(){
 try{if(!data.length) throw new Error('単語データがまだ読み込まれていません。ページを再読み込みしてください。');makeQuestions();current=0;score=0;correct=0;combo=0;maxCombo=0;answered=false;show('game');render();}
 catch(e){$('err').textContent=e.message;}
}
function render(){const q=questions[current];answered=false;$('qnum').textContent=`Q ${current+1} / ${questions.length}`;$('bar').style.width=`${current/questions.length*100}%`;$('score').textContent=score;$('combo').textContent=`🔥 COMBO ×${combo}`;$('type').textContent=q.mode==='en-ja'?'英語 → 日本語':'日本語 → 英語';$('question').textContent=q.mode==='en-ja'?q.item.word:q.item.meaning;$('example').classList.add('hidden');$('feedback').textContent='';$('next').classList.add('hidden');const box=$('choices');box.innerHTML='';q.choices.forEach(v=>{const b=document.createElement('button');b.type='button';b.className='choice';b.textContent=v;b.addEventListener('click',()=>answer(b,v));box.appendChild(b)});}
function answer(btn,value){if(answered)return;answered=true;const q=questions[current], ok=value===q.correctValue;document.querySelectorAll('.choice').forEach(b=>b.disabled=true);if(ok){correct++;combo++;maxCombo=Math.max(maxCombo,combo);score+=100+Math.max(0,combo-1)*20;btn.classList.add('correct');$('feedback').textContent=`⭕ 正解！ +${100+Math.max(0,combo-1)*20}点`;}else{combo=0;btn.classList.add('wrong');document.querySelectorAll('.choice').forEach(b=>{if(b.textContent===q.correctValue)b.classList.add('correct')});$('feedback').textContent=`❌ 不正解… 正解は「${q.correctValue}」`}$('score').textContent=score;$('combo').textContent=`🔥 COMBO ×${combo}`;$('next').textContent=current+1<questions.length?'次の問題へ':'結果を見る';$('next').classList.remove('hidden');}
function next(){if(!answered)return;if(current+1<questions.length){current++;render()}else finish()}
function finish(){show('result');$('finalScore').textContent=score;$('correct').textContent=correct;$('total').textContent=questions.length;$('accuracy').textContent=Math.round(correct/questions.length*100)+'%';$('maxCombo').textContent=maxCombo;const r=correct/questions.length;$('message').textContent=r===1?'パーフェクト！すごい！':r>=.8?'かなりいい感じ！':r>=.6?'あと少し！もう一回挑戦しよう！':'まずはもう一度挑戦してみよう！'}
$('startBtn').addEventListener('click',startGame);$('next').addEventListener('click',next);$('again').addEventListener('click',()=>{show('start');$('err').textContent='';});
loadData().catch(e=>{$('info').textContent='読み込みに失敗しました';$('err').textContent=e.message;$('startBtn').disabled=true;});
})();
