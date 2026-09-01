const FALLBACK=[
{id:"f1",type:"judge",question:"驾驶机动车通过没有交通信号灯的交叉路口时，应当减速慢行。",options:["正确","错误"],answer:0,explain:"没有信号灯不等于可以直接通过。先减速观察，并让行人和优先通行的车辆先行。",category:"safety"},
{id:"f2",type:"single",question:"驾驶机动车在道路上发生故障，难以移动时，首先应当怎样做？",options:["集中精力排除故障","开启危险报警闪光灯","向过往车辆求救","立即报警"],answer:1,explain:"先让其他道路使用者看见危险，再按规定设置警告标志并转移人员。",category:"accident"},
{id:"f3",type:"single",question:"无交通信号控制、无交警指挥且没有交通标志标线的路口，两车相对方向行驶，右转弯车应当让哪辆车先行？",options:["左转弯车","直行车","速度快的车","大型车"],answer:0,explain:"相对方向来车：右转弯让左转弯。右转弯路径短、调整空间大，应当让行。",category:"intersection"}
];
const DATA_URL="./data/questions-2026.json?v=20260901";
const $=id=>document.getElementById(id);
const storage=window.localStorage;
let state=TingState.load(storage);
let storageAvailable=true;
let bank=FALLBACK.slice(),list=bank,index=0,selected=null,mode="practice",mockAnswers=new Set(),mockCorrect=0;
function persist(){storageAvailable=TingState.save(storage,state);return storageAvailable}
function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function roadAnimation(){return '<div class="road-demo"><div class="road road-x"></div><div class="road road-y"></div><div class="lane lane-x"></div><div class="lane lane-y"></div><div class="car car-blue">左转</div><div class="car car-orange">右转</div><div class="tag tag-one">① 左转先行</div><div class="tag tag-two">② 右转后行</div></div>'}
function categoryName(value){return ({points_penalties:"记分处罚",license:"驾驶证",intersection:"路口通行",sign:"交通标志",marking:"交通标线",light:"灯光",highway:"高速公路",accident:"事故处理",parking:"停车",overtaking:"超车",meeting:"会车",new_energy:"新能源",vehicle_operation:"车辆操作",case:"事故案例",safety:"安全驾驶"})[value]||"基础练习"}

const bankPromise=fetch(DATA_URL,{cache:"no-cache"}).then(r=>r.ok?r.json():Promise.reject(new Error("题库请求失败"))).then(data=>{
  if(!Array.isArray(data)||!data.length)throw new Error("题库为空");
  bank=data;
  TingState.reconcile(state,bank);persist();
  $("source-note").textContent=`✓ 已载入 ${data.length} 道 2026 C1/C2 精选题 · 学习记录保存在当前浏览器`;
  updateHome();return bank;
}).catch(()=>{
  $("source-note").textContent="⚠ 完整题库暂未加载，已保存的记录不会丢失；请稍后刷新";
  return bank;
});

updateHome();
document.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
  const action=button.dataset.action;
  if(["practice","random","wrong","mock"].includes(action))start(action);
  if(action==="demo"){list=[FALLBACK[2],...bank];openQuiz("demo",0)}
}));
$("back").onclick=goHome;$("previous").onclick=previous;$("next").onclick=nextAction;$("favorite").onclick=toggleFavorite;
window.addEventListener("pagehide",persist);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")persist()});

function updateHome(){
  const completed=state.answeredIds.length||state.answerTotal||0;
  $("done-text").textContent=completed+" 题已完成";
  const savedAt=bank.findIndex(q=>q.id===state.practiceQuestionId);
  const position=savedAt>=0?savedAt:Math.min(state.practiceIndex||0,Math.max(bank.length-1,0));
  $("continue-title").textContent=completed?"继续第 "+(position+1)+" 题":"从第一题开始";
  $("done-bar").style.width=Math.min(completed/Math.max(bank.length,1)*100,100)+"%";
  $("wrong-mode").disabled=!state.wrongIds.length;
  $("wrong-count").textContent=state.wrongIds.length?state.wrongIds.length+" 道待巩固":"答错后自动收录";
  if(!storageAvailable)$("source-note").textContent="⚠ 当前浏览器禁止本地存储，退出后可能无法保留进度";
}

function stratifiedMock(items){
  const targets={sign:17,marking:12,points_penalties:14,license:10,intersection:12,light:7,highway:10,accident:8};
  const picked=[];const used=new Set();
  for(const [category,count] of Object.entries(targets)){
    for(const q of shuffle(items.filter(item=>item.category===category)).slice(0,count)){if(!used.has(q.id)){used.add(q.id);picked.push(q)}}
  }
  for(const q of shuffle(items)){if(picked.length>=100)break;if(!used.has(q.id)){used.add(q.id);picked.push(q)}}
  return shuffle(picked);
}

async function start(nextMode){
  mode=nextMode;await bankPromise;
  if(mode==="wrong")list=bank.filter(q=>state.wrongIds.includes(q.id));
  else if(mode==="mock"){list=stratifiedMock(bank);mockAnswers=new Set();mockCorrect=0}
  else if(mode==="random")list=shuffle(bank);
  else list=bank;
  if(!list.length){alert("目前没有可练习的错题");updateHome();return}
  let startAt=0;
  if(mode==="practice"){
    const byId=list.findIndex(q=>q.id===state.practiceQuestionId);
    startAt=byId>=0?byId:Math.min(state.practiceIndex||0,list.length-1);
  }
  openQuiz(mode,startAt);
}
function openQuiz(nextMode,startAt=0){
  mode=nextMode;index=startAt;selected=null;
  $("mode-title").textContent={wrong:"错题重练",mock:"模拟考试",random:"随机练习",demo:"动态解析示范"}[mode]||"顺序练习";
  $("home").classList.add("hidden");$("quiz").classList.remove("hidden");scrollTo(0,0);render();
}
function current(){return list[index]||FALLBACK[0]}
function savePosition(){if(mode==="practice"){state.practiceIndex=index;state.practiceQuestionId=current().id;persist()}}
function render(){
  const q=current();$("counter").textContent=(index+1)+" / "+list.length;$("progress-bar").style.width=((index+1)/list.length*100)+"%";
  $("question-type").textContent=q.type==="judge"?"判断题":"单选题";$("category").textContent=categoryName(q.category);$("question-text").textContent=q.question;
  $("favorite").textContent=state.favorites.includes(q.id)?"♥":"♡";$("favorite").classList.toggle("active",state.favorites.includes(q.id));
  $("question-image").classList.add("hidden");if(q.image){$("question-image").src=q.image;$("question-image").classList.remove("hidden")}$("question-image").onerror=()=>$("question-image").classList.add("hidden");
  $("options").innerHTML="";q.options.forEach((option,i)=>{const button=document.createElement("button");button.className="option";button.innerHTML="<b>"+String.fromCharCode(65+i)+"</b><span>"+escapeHtml(option)+"</span>";button.onclick=()=>choose(i);$("options").appendChild(button)});
  $("result").className="result hidden";$("result").innerHTML="";$("next").textContent="暂时不会 →";savePosition();
}
function choose(choice){
  if(selected!==null)return;const q=current();selected=choice;const correct=choice===q.answer;
  state.answerTotal++;if(!state.answeredIds.includes(q.id))state.answeredIds.push(q.id);
  if(correct)state.correctCount++;else{state.wrongCount++;if(!state.wrongIds.includes(q.id))state.wrongIds.push(q.id)}
  if(mode==="mock"){mockAnswers.add(q.id);if(correct)mockCorrect++}persist();
  [...$("options").children].forEach((button,i)=>button.classList.add(i===q.answer?"correct":i===choice?"wrong":"dim"));
  const animated=q.id==="f3"||/右转弯.*让.*左转弯|右转.*左转/.test(q.question);
  $("result").className="result "+(correct?"":"bad");
  $("result").innerHTML="<strong>"+(correct?"✓ 答对了 · 记录已保存":"✕ 答错了，已加入错题本 · 正确答案是 "+String.fromCharCode(65+q.answer))+"</strong>"+(animated?'<div class="animation-label" style="margin-top:18px">✨ 动态解析</div>'+roadAnimation():"")+"<h3>这样理解</h3><p>"+escapeHtml(q.explain)+"</p>"+(q.law?"<details><summary>查看法规依据</summary><p>"+escapeHtml(q.law)+"</p></details>":"");
  $("next").textContent="下一题 →";updateHome();
  if(mode==="mock"&&mockAnswers.size===list.length){state.mockRecords.push({date:new Date().toISOString(),correct:mockCorrect,total:list.length});state.mockRecords=state.mockRecords.slice(-20);persist()}
}
function nextAction(){selected===null?choose(-1):next()}
function next(){index=(index+1)%list.length;selected=null;savePosition();render();scrollTo(0,0)}
function previous(){index=(index-1+list.length)%list.length;selected=null;savePosition();render();scrollTo(0,0)}
function toggleFavorite(){const id=current().id;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist();render()}
function goHome(){$("quiz").classList.add("hidden");$("home").classList.remove("hidden");updateHome()}
