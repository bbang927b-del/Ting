const FALLBACK=[
{id:"f1",type:"judge",question:"驾驶机动车通过没有交通信号灯的交叉路口时，应当减速慢行。",options:["正确","错误"],answer:0,explain:"没有信号灯不等于可以直接通过。先减速观察，并让行人和优先通行的车辆先行。",category:"安全常识"},
{id:"f2",type:"single",question:"驾驶机动车在道路上发生故障，难以移动时，首先应当怎样做？",options:["集中精力排除故障","开启危险报警闪光灯","向过往车辆求救","立即报警"],answer:1,explain:"先让其他道路使用者看见危险，再按规定设置警告标志并转移人员。",category:"应急处置"},
{id:"f3",type:"single",question:"无交通信号控制、无交警指挥且没有交通标志标线的路口，两车相对方向行驶，右转弯车应当让哪辆车先行？",options:["左转弯车","直行车","速度快的车","大型车"],answer:0,explain:"相对方向来车：右转弯让左转弯。右转弯路径短、调整空间大，应当让行。",category:"路权判断"},
{id:"f4",type:"judge",question:"小型自动挡汽车驾驶证的准驾车型代号是C2。",options:["正确","错误"],answer:0,explain:"C2是小型自动挡汽车，不能驾驶手动挡小型汽车。",category:"驾驶证"},
{id:"f5",type:"single",question:"机动车行经人行横道时，遇行人正在通过，应当怎样做？",options:["减速通过","鸣喇叭提醒","停车让行","从行人身后绕行"],answer:2,explain:"行人正在通过人行横道，机动车必须停车让行。",category:"安全常识"}
];
const DATA_URL="https://raw.githubusercontent.com/AgentMystia/driving-test-subject1/main/data/bank.json";
const $=id=>document.getElementById(id);
let bank=FALLBACK.slice(),list=bank,index=0,selected=null,mode="practice";
let wrong=read("ting-wrong",[]),wrongQuestions=read("ting-wrong-questions",[]),favorites=read("ting-favorites",[]);
let answered=Number(localStorage.getItem("ting-answered")||0),savedIndex=Number(localStorage.getItem("ting-practice-index")||0);
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function store(key,value){localStorage.setItem(key,JSON.stringify(value))}
function shuffle(items){return [...items].sort(()=>Math.random()-.5)}
function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function roadAnimation(){return '<div class="road-demo"><div class="road road-x"></div><div class="road road-y"></div><div class="lane lane-x"></div><div class="lane lane-y"></div><div class="car car-blue">左转</div><div class="car car-orange">右转</div><div class="tag tag-one">① 左转先行</div><div class="tag tag-two">② 右转后行</div></div>'}
const bankPromise=fetch(DATA_URL).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
 if(Array.isArray(data)&&data.length){bank=data;const recovered=bank.filter(q=>wrong.includes(q.id));if(recovered.length){wrongQuestions=recovered;store("ting-wrong-questions",wrongQuestions)}$("source-note").textContent="✓ 已载入 "+data.length+" 道基础题 · 学习记录已保存在当前浏览器";updateHome()}return bank;
}).catch(()=>{$("source-note").textContent="⚠ 完整题库暂未加载，已保存的错题和示例题仍可使用";return bank});
updateHome();
document.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
 const action=button.dataset.action;
 if(action==="practice")start("practice");
 if(action==="random")start("random");
 if(action==="wrong")start("wrong");
 if(action==="mock")start("mock");
 if(action==="demo"){list=[FALLBACK[2],...bank];openQuiz("demo",0)}
}));
$("back").onclick=goHome;$("previous").onclick=previous;$("next").onclick=nextAction;$("favorite").onclick=toggleFavorite;
function updateHome(){
 $("done-text").textContent=answered+" 题已完成";
 $("continue-title").textContent=answered?"继续第 "+(savedIndex+1)+" 题":"从第一题开始";
 $("done-bar").style.width=Math.min(answered/Math.max(bank.length,1)*100,100)+"%";
 $("wrong-mode").disabled=!wrong.length&&!wrongQuestions.length;
 $("wrong-count").textContent=(wrong.length||wrongQuestions.length)?Math.max(wrong.length,wrongQuestions.length)+" 道待巩固":"答错后自动收录";
}
async function start(nextMode){
 mode=nextMode;
 if(mode==="wrong"){$("source-note").textContent="正在整理错题，请稍候…";await bankPromise;const byId=bank.filter(q=>wrong.includes(q.id));list=byId.length?byId:wrongQuestions}
 else if(mode==="mock"){await bankPromise;list=shuffle(bank).slice(0,100)}
 else if(mode==="random"){await bankPromise;list=shuffle(bank)}
 else{await bankPromise;list=bank}
 if(!list.length){$("source-note").textContent="错题记录仍在，但对应题目暂未加载，请刷新后再试";alert("错题数据还在加载，请稍后再点一次");return}
 openQuiz(mode,mode==="practice"?Math.min(savedIndex,list.length-1):0);
}
function openQuiz(nextMode,startAt=0){
 mode=nextMode;index=startAt;selected=null;
 $("mode-title").textContent={wrong:"错题重练",mock:"模拟考试",random:"随机练习",demo:"动态解析示范"}[mode]||"顺序练习";
 $("home").classList.add("hidden");$("quiz").classList.remove("hidden");scrollTo(0,0);render();
}
function current(){return list[index]||FALLBACK[0]}
function savePosition(){if(mode==="practice"){savedIndex=index;localStorage.setItem("ting-practice-index",String(savedIndex))}}
function render(){
 const q=current();$("counter").textContent=(index+1)+" / "+list.length;$("progress-bar").style.width=((index+1)/list.length*100)+"%";
 $("question-type").textContent=q.type==="judge"?"判断题":"单选题";$("category").textContent=q.category||"基础练习";$("question-text").textContent=q.question;
 $("favorite").textContent=favorites.includes(q.id)?"♥":"♡";$("favorite").classList.toggle("active",favorites.includes(q.id));
 $("question-image").classList.add("hidden");if(q.image){$("question-image").src=q.image.replace("http://","https://");$("question-image").classList.remove("hidden")}$("question-image").onerror=()=>$("question-image").classList.add("hidden");
 $("options").innerHTML="";q.options.forEach((option,i)=>{const button=document.createElement("button");button.className="option";button.innerHTML="<b>"+String.fromCharCode(65+i)+"</b><span>"+escapeHtml(option)+"</span>";button.onclick=()=>choose(i);$("options").appendChild(button)});
 $("result").className="result hidden";$("result").innerHTML="";$("next").textContent="暂时不会 →";savePosition();
}
function choose(choice){
 if(selected!==null)return;const q=current();selected=choice;answered++;localStorage.setItem("ting-answered",String(answered));savePosition();
 if(choice!==q.answer){if(!wrong.includes(q.id)){wrong.push(q.id);store("ting-wrong",wrong)}if(!wrongQuestions.some(item=>item.id===q.id)){wrongQuestions.push(q);store("ting-wrong-questions",wrongQuestions)}}
 [...$("options").children].forEach((button,i)=>button.classList.add(i===q.answer?"correct":i===choice?"wrong":"dim"));
 const animated=q.id==="f3"||/右转弯.*让.*左转弯|右转.*左转/.test(q.question),correct=choice===q.answer;
 $("result").className="result "+(correct?"":"bad");
 $("result").innerHTML="<strong>"+(correct?"✓ 答对了 · 记录已保存":"✕ 答错了，已加入错题本 · 正确答案是 "+String.fromCharCode(65+q.answer))+"</strong>"+(animated?'<div class="animation-label" style="margin-top:18px">✨ 动态解析</div>'+roadAnimation():"")+"<h3>这样理解</h3><p>"+escapeHtml(q.explain||"请结合下方法规依据理解本题。")+"</p>"+(q.law?"<details><summary>查看法规依据</summary><p>"+escapeHtml(q.law)+"</p></details>":"");
 $("next").textContent="下一题 →";updateHome();
}
function nextAction(){selected===null?choose(-1):next()}
function next(){index=(index+1)%list.length;selected=null;savePosition();render();scrollTo(0,0)}
function previous(){index=(index-1+list.length)%list.length;selected=null;savePosition();render();scrollTo(0,0)}
function toggleFavorite(){const id=current().id;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];store("ting-favorites",favorites);render()}
function goHome(){$("quiz").classList.add("hidden");$("home").classList.remove("hidden");updateHome()}
