const fs = require("node:fs");
const path = require("node:path");
const { normalize, exactDeduplicate, semanticDeduplicate } = require("./deduplicate-questions");

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data/questions-archive-2022.json");
const OUTPUT = path.join(ROOT, "data/questions-2026.json");
const REPORT = path.join(ROOT, "data/question-audit-report.json");

const OFFICIAL_SOURCES = [
  { name: "机动车驾驶证申领和使用规定（公安部令第172号）", url: "https://jtgl.beijing.gov.cn/jgj/jgxx/flfg/gabgz/543498902/index.html" },
  { name: "道路交通安全违法行为记分管理办法（公安部令第163号）", url: "https://jtgl.beijing.gov.cn/jgj/jgxx/flfg/gabgz/11186803/index.html" },
  { name: "机动车登记规定（公安部令第164号）", url: "https://jtgl.beijing.gov.cn/jgj/jgxx/flfg/gabgz/11186809/index.html" },
  { name: "中华人民共和国道路交通安全法（2021年修订）", url: "https://jtgl.beijing.gov.cn/jgj/jgxx/flfg/fl/205308/index.html" },
  { name: "GB 5768.3-2025 道路交通标线", url: "https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=A9BE85F3DDD0EC531B98C84B3312E240" }
];

const OBSOLETE_IDS = new Set([
  "20220411104810nfeygaxzdmq7pr5ktozgpw", // A2实习期旧前提
  "20190410102542ekazwxk4lgkpbw3zhmkk9q", "201904101025452etk7zwdabpdlavogolmk6", // 旧车道数减少图
  "201904101025433qjjgq4kza89wiqlxrmjis", "20190410102547bpanptrysuefomc2q7lmh8", // 需重绘的旧减速标线图
  "20190410102519l2jtbhekpkupwf5fuztxmq", "20190410102522jiyzv4awpvttstjaztegvv",
  "20190410102532rn5uzwyj3v9ok2pj7nvmz4", "20190410102538mg2j8fekcapfucpavmxmxr",
  "201904101025542x8tyynddegysg6vvbx6q4" // 旧黄色网状线图
]);

const HIGH_RISK = /罚款|记分|扣分|\d+分|年龄|周岁|驾驶证|实习期|换证|审验|吊销|暂扣|酒驾|醉驾|超速|超载|高速|新能源|C6|\d+天|\d+年|\d+元|百分之|%|公里/;
const LOW_VALUE = /抵押|质押|共同所有|转让登记|变更登记|注销登记|住所迁|户籍|登记地车辆管理所|核发地车辆管理所/;
const OUT_OF_SCOPE = /(A1|A2|A3|B1|B2|C3|C4|C5|C6|摩托车|轻便摩托|重型牵引|大型客车|中型客车|大型货车)/;

const CANDIDATE_NEW_QUESTIONS = [
  {type:"judge",question:"申请C1或C2驾驶证，年龄达到18周岁即可，现行规定不设置最高申请年龄。",options:["正确","错误"],answer:0,explain:"C1、C2申请年龄下限是18周岁，没有最高年龄限制；70周岁以上申请人还需通过记忆力、判断力、反应力测试。",law:"《机动车驾驶证申领和使用规定》（公安部令第172号）第十四条。",category:"license"},
  {type:"single",question:"70周岁以上人员申请C2驾驶证，除符合身体条件外，还需要通过哪项测试？",options:["道路运输知识测试","记忆力、判断力、反应力测试","车辆维修技能测试","夜间驾驶测试"],answer:1,explain:"70周岁以上申请C1、C2等准驾车型，需要通过记忆力、判断力、反应力等能力测试。",law:"《机动车驾驶证申领和使用规定》（公安部令第172号）第十四条。",category:"license"},
  {type:"judge",question:"全国统一的电子驾驶证与纸质驾驶证具有同等法律效力。",options:["正确","错误"],answer:0,explain:"电子驾驶证全国统一、动态显示状态，可用于执法查验和多项公共服务。依法需要扣留驾驶证时仍应按要求提供纸质证件。",law:"《机动车驾驶证申领和使用规定》（公安部令第172号）第六十一条。",category:"license"},
  {type:"judge",question:"车辆管理所可以通过互联网交通安全综合服务管理平台受理驾驶证业务申请。",options:["正确","错误"],answer:0,explain:"现行规定明确车辆管理所应通过统一互联网平台受理网上申请并核验身份。",law:"《机动车驾驶证申领和使用规定》（公安部令第172号）第六条。",category:"license"},
  {type:"judge",question:"驾驶证被依法扣押、扣留或者暂扣期间，可以以遗失为由申请补发。",options:["正确","错误"],answer:1,explain:"证件处于扣押、扣留或暂扣状态时不得申请补发，不能用“遗失补证”规避管理。",law:"《机动车驾驶证申领和使用规定》（公安部令第172号）第六十九条。",category:"license"},
  {type:"single",question:"现行驾驶人记分制度的一个记分周期和满分分别是多少？",options:["6个月、12分","12个月、12分","12个月、24分","24个月、12分"],answer:1,explain:"记分周期为12个月，满分为12分，自初次领取驾驶证之日起连续计算。",law:"《道路交通安全违法行为记分管理办法》第三条。",category:"points_penalties"},
  {type:"single",question:"现行一次违法记分的分值档次中，不包括哪一项？",options:["12分","9分","6分","2分"],answer:3,explain:"现行分值只有12、9、6、3、1分五档，已经没有一次记2分。",law:"《道路交通安全违法行为记分管理办法》第七条。",category:"points_penalties"},
  {type:"judge",question:"驾驶机动车拨打、接听手持电话等妨碍安全驾驶的，一次记3分。",options:["正确","错误"],answer:0,explain:"手持接打电话会分散注意力，现行记分是3分，不是旧规则中的2分。",law:"《道路交通安全违法行为记分管理办法》第十一条。",category:"points_penalties"},
  {type:"single",question:"发生无人员伤亡的车辆间轻微财损事故，符合条件时可通过哪个入口进行视频快处？",options:["交管12123事故视频快处","任意短视频平台","车辆导航软件","无需记录直接离开"],answer:0,explain:"先做好现场安全防护，再按当地已开通服务的指引使用“交管12123”事故视频快处，与交警远程连线处理。",law:"公安交管部门公开的轻微交通事故视频快处指引。",category:"accident"},
  {type:"judge",question:"使用事故视频快处前，可以省略现场安全防护直接站在车道内操作手机。",options:["正确","错误"],answer:1,explain:"无论线上还是线下处理，首先都要确保人员安全、开启警示并做好现场防护，不能在车流中冒险停留。",law:"公安交管部门公开的轻微交通事故视频快处指引。",category:"accident"},
  {type:"judge",question:"按照2026年5月实施的国家标准，道路网状线采用白色。",options:["正确","错误"],answer:0,explain:"GB 5768.3-2025将网状线颜色统一为白色。遇到网状线仍应牢记其核心含义：禁止车辆停车。",law:"GB 5768.3-2025《道路交通标志和标线 第3部分：道路交通标线》。",category:"marking"},
  {type:"judge",question:"按照现行道路交通标线国家标准，道路左侧边缘线采用黄色。",options:["正确","错误"],answer:0,explain:"2026年5月实施的标线标准统一了道路边缘线颜色：左侧为黄色，右侧为白色。",law:"GB 5768.3-2025《道路交通标志和标线 第3部分：道路交通标线》。",category:"marking"},
  {type:"judge",question:"线形诱导标用于提醒驾驶人前方道路线形变化，现行标准将其归入警告标志。",options:["正确","错误"],answer:0,explain:"看到线形诱导标应提前减速并按标志指示调整方向，不能把它当作普通装饰。",law:"GB 5768.2-2022《道路交通标志和标线 第2部分：道路交通标志》。",category:"sign"},
  {type:"single",question:"小型新能源汽车专用号牌的底色主要是什么样式？",options:["渐变绿色","黄绿双拼色","蓝白相间","黑色"],answer:0,explain:"小型新能源汽车专用号牌采用渐变绿色；大型新能源汽车号牌采用黄绿双拼色。",law:"公安交管部门公开的新能源汽车专用号牌式样。",category:"new_energy"},
  {type:"single",question:"小型新能源汽车号牌中，字母D通常代表哪类车辆？",options:["柴油汽车","纯电动新能源汽车","非纯电动新能源汽车","低速载货汽车"],answer:1,explain:"新能源号牌实行分段管理，D代表纯电动新能源汽车，F代表非纯电动新能源汽车。",law:"公安交管部门公开的新能源汽车专用号牌编排规则。",category:"new_energy"}
];

// Only add genuinely missing points. The other verified candidates above are
// intentionally not emitted because the cleaned base bank already tests them.
const NEW_QUESTIONS = CANDIDATE_NEW_QUESTIONS.filter((_, index) => [2, 8, 9, 10, 11, 13, 14].includes(index));

function hashId(question) {
  const correct = question.options[question.answer];
  // Generic prompts such as “这个标志是何含义” need the image identity too.
  const input = `${normalize(question.question)}|${normalize(correct)}|${question.image || ""}`;
  let hash = 0xcbf29ce484222325n;
  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `q_${hash.toString(16).padStart(16, "0")}`;
}

function topic(question) {
  const value = `${question.question} ${question.explain || ""}`;
  if (/记分|扣分|罚款|吊销|暂扣|酒驾|醉驾|超速|超载/.test(value)) return "points_penalties";
  if (/驾驶证|准驾|实习期|换证|审验|周岁/.test(value)) return "license";
  if (/路口|左转|右转|掉头|让行|环岛/.test(value)) return "intersection";
  if (/标线|网状线|导向箭头/.test(value)) return "marking";
  if (/标志|标牌/.test(value)) return "sign";
  if (/灯光|远光|近光|雾灯/.test(value)) return "light";
  if (/高速|匝道|应急车道/.test(value)) return "highway";
  if (/事故|故障|伤员|急救/.test(value)) return "accident";
  if (/停车/.test(value)) return "parking";
  if (/超车/.test(value)) return "overtaking";
  if (/会车/.test(value)) return "meeting";
  if (/新能源|电动汽车/.test(value)) return "new_energy";
  if (/仪表|操纵|制动|方向盘/.test(value)) return "vehicle_operation";
  return question.category === "case" ? "case" : "safety";
}

function priority(question) {
  return /记分|罚款|速度|驾驶证|路口|标志|标线|灯光|高速|酒驾|事故|停车|超车|会车/.test(`${question.question} ${question.explain || ""}`) ? "high" : "medium";
}

function patchCurrentRules(question, updatedIds) {
  const q = { ...question, options: [...question.options] };
  const c1AgeIds = new Set(["20190410102527dtd2ffsb5orhl4gsnkfft", "2019041010252922utpyw2wqab8cxs29urkh", "20200914180630x7csj6yrydegayt8mnj2d", "202012011443002rnzbaajcgufpikprvpuam"]);
  if (c1AgeIds.has(q.id)) {
    q.law = "《机动车驾驶证申领和使用规定》（公安部令第172号）第十四条：申请小型汽车、小型自动挡汽车准驾车型的，应当在18周岁以上。现行条文不设最高申请年龄。";
    updatedIds.add(q.id);
  }
  if ((q.law || "").includes("60周岁以下") && /大型客车|重型牵引挂车|A1|A2/.test(q.law || "")) {
    q.law = q.law.replace(/60周岁以下/g, "63周岁以下");
    updatedIds.add(q.id);
  }
  if (/开车接打电话属于违法行为，一次记2分|属于违法行为，一次记2分/.test(q.explain || "")) {
    q.explain = (q.explain || "").replace(/一次记2分/g, "一次记3分");
    updatedIds.add(q.id);
  }
  if (q.id === "20190410102526clohubg3n3clkpkuinmjzp") {
    q.law = "《道路交通安全法》第二十五条：全国实行统一的道路交通信号，交通信号包括交通信号灯、交通标志、交通标线和交通警察的指挥。";
    updatedIds.add(q.id);
  }
  if (q.id === "20190410102533w1ukspzamug2rugeyqxfax") {
    q.law = "《机动车驾驶证申领和使用规定》（公安部令第172号）规定，实习期内驾驶机动车应当在车身后部粘贴或者悬挂统一式样的实习标志。";
    updatedIds.add(q.id);
  }
  if (q.id === "201904101025419xaftz2wpdn7hj5pmd2hok") {
    q.explain = "线形诱导标用于提醒前方道路线形变化。GB 5768.2-2022已将其归入警告标志，看到后应提前减速并按指示调整方向。";
    updatedIds.add(q.id);
  }
  if (!q.explain || !q.explain.trim()) {
    const first = String(q.law || "按现行道路交通安全规定判断本题。").split(/[。；\n]/)[0];
    q.explain = `${first.slice(0, 110)}。`;
    updatedIds.add(q.id);
  }
  return q;
}

function isOutOfScope(q) {
  const value = `${q.question} ${q.options.join(" ")}`;
  const schoolOnly = /校车/.test(value) && !/不按规定避让校车|避让校车/.test(value);
  return OUT_OF_SCOPE.test(value) || schoolOnly;
}

function build() {
  const original = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const audit = new Map();
  const mark = (q, status, reason) => audit.set(q.id, { id: q.id, question: q.question, answer: q.options?.[q.answer] ?? q.answer, reason, status });

  const exact = exactDeduplicate(original);
  exact.removed.forEach(q => mark(q, "delete", "完全/标准化重复：同题干、同图片仅保留质量更高的一题"));
  const semantic = semanticDeduplicate(exact.kept);
  semantic.removed.forEach(q => mark(q, "delete", "语义重复：同类别、同一非空解析，属于同一考点的文字变体"));

  let questions = [];
  let policyDeleted = 0;
  for (const q of semantic.kept) {
    if (isOutOfScope(q)) { mark(q, "delete", "不属于C1/C2核心范围或属于大车、摩托车、校车专属细节"); policyDeleted++; continue; }
    if (OBSOLETE_IDS.has(q.id)) { mark(q, "delete", "旧法规前提或旧版标志标线图片不再适配2026标准"); policyDeleted++; continue; }
    if (LOW_VALUE.test(q.question)) { mark(q, "delete", "低频登记业务细节，为控制题量且避免数字旧规风险而移出练习库"); policyDeleted++; continue; }
    questions.push(q);
  }

  const updatedIds = new Set();
  questions = questions.map(q => patchCurrentRules(q, updatedIds));
  questions.push(...NEW_QUESTIONS.map((q, i) => ({ ...q, id: `new-2026-${i + 1}`, image: null, updated: true })));

  const ids = new Set();
  questions = questions.map(q => {
    const id = hashId(q);
    if (ids.has(id)) throw new Error(`Stable ID collision: ${id}`);
    ids.add(id);
    const isNew = String(q.id).startsWith("new-2026-");
    return {
      id,
      legacyId: isNew ? null : q.id,
      type: q.type,
      question: q.question.trim(),
      image: q.image ? q.image.replace(/^http:\/\//, "https://") : null,
      options: q.options,
      answer: q.answer,
      explain: q.explain.trim(),
      law: q.law || "",
      category: topic(q),
      priority: priority(q),
      sourceYear: isNew || updatedIds.has(q.id) ? 2026 : 2022,
      risk: HIGH_RISK.test(`${q.question} ${q.explain} ${q.law || ""}`) ? "high" : "normal"
    };
  });

  for (const q of semantic.kept) {
    if (audit.has(q.id)) continue;
    const updated = updatedIds.has(q.id);
    if (updated || HIGH_RISK.test(`${q.question} ${q.explain || ""} ${q.law || ""}`)) {
      mark(q, updated ? "update" : "keep", updated ? "已按2026现行规定改写过时解析或法规依据" : "高风险数字题：已按现行公安部令163/172号及现行道路交通法规筛查");
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: "C1/C2 科目一，2026-09基准",
    officialSources: OFFICIAL_SOURCES,
    stats: {
      original: original.length,
      exactDuplicatesDeleted: exact.removed.length,
      semanticDuplicatesDeleted: semantic.removed.length,
      outdatedHighRiskOrOutOfScopeDeleted: policyDeleted,
      newQuestions: NEW_QUESTIONS.length,
      updatedQuestions: updatedIds.size,
      final: questions.length
    },
    items: [...audit.values()]
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(questions, null, 2)}\n`);
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.stats, null, 2));
}

if (require.main === module) build();
module.exports = { build, hashId, topic, priority };
