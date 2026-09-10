const questions = [
  {
    id: "present",
    title: "現在",
    prompt: "今の学習状態は？",
    options: [
      ["stable", "毎日の学習リズムがある"],
      ["uneven", "日によって取り組みに差がある"],
      ["stuck", "何から始めるべきか迷っている"],
    ],
  },
  {
    id: "past",
    title: "過去",
    prompt: "これまでの学習で多かったことは？",
    options: [
      ["success", "成功体験がある"],
      ["gap", "苦手を後回しにしがちだった"],
      ["reset", "勉強法を何度か変えてきた"],
    ],
  },
  {
    id: "future",
    title: "未来",
    prompt: "これからの目標は？",
    options: [
      ["clear", "志望校・目標点がはっきりしている"],
      ["broad", "大まかな方向性はある"],
      ["unclear", "まだ決めきれていない"],
    ],
  },
  {
    id: "grades",
    title: "成績",
    prompt: "成績について近いものは？",
    options: [
      ["high", "得意科目をさらに伸ばしたい"],
      ["middle", "平均前後で伸び悩んでいる"],
      ["low", "基礎から立て直したい"],
    ],
  },
  {
    id: "personality",
    title: "性格",
    prompt: "自分の性格に近いものは？",
    options: [
      ["planner", "計画を立てると動きやすい"],
      ["starter", "まず始めると集中できる"],
      ["worrier", "失敗や遅れが気になりやすい"],
    ],
  },
  {
    id: "life",
    title: "生活",
    prompt: "生活リズムは？",
    options: [
      ["regular", "睡眠・食事が安定している"],
      ["busy", "忙しくて時間が細切れ"],
      ["late", "夜更かしや疲れが残りやすい"],
    ],
  },
  {
    id: "club",
    title: "部活",
    prompt: "部活・習い事との両立は？",
    options: [
      ["balanced", "両立できている"],
      ["heavy", "活動量が多く勉強時間が限られる"],
      ["none", "部活以外の時間を活用したい"],
    ],
  },
  {
    id: "home",
    title: "家庭",
    prompt: "家庭での学習環境は？",
    options: [
      ["quiet", "集中しやすい場所がある"],
      ["shared", "家族の予定に左右される"],
      ["distracting", "誘惑や中断が多い"],
    ],
  },
  {
    id: "school",
    title: "学校",
    prompt: "学校の授業・課題との関係は？",
    options: [
      ["caughtup", "授業内容を理解できている"],
      ["homework", "課題に追われがち"],
      ["lost", "授業で分からない部分が増えている"],
    ],
  },
  {
    id: "friends",
    title: "友人",
    prompt: "友人との関わりは学習にどう影響している？",
    options: [
      ["positive", "励まし合える友人がいる"],
      ["neutral", "勉強とは切り分けている"],
      ["pulled", "遊びやSNSに流されやすい"],
    ],
  },
];

const adviceRules = {
  stuck: ["最初の一歩", "今日やることを『5分で終わる行動』に分解しましょう。例：英単語10個、計算3問、ノート1ページ確認。"],
  gap: ["苦手の回収", "苦手単元を3つだけ書き出し、最も点につながる単元から復習しましょう。完璧より先に一周することを優先します。"],
  unclear: ["目標設定", "次の定期テストで取りたい点数を1科目だけ決めましょう。将来の目標が未定でも、短期目標が学習の軸になります。"],
  low: ["基礎固め", "教科書例題・学校ワークの基本問題を反復しましょう。間違えた問題は翌日と3日後に解き直すと定着しやすくなります。"],
  worrier: ["不安対策", "できなかった量ではなく、完了した行動を記録しましょう。小さな達成の見える化が継続力を高めます。"],
  busy: ["時間活用", "15分単位の学習枠を作りましょう。移動前後や夕食前など、固定しやすい時間に暗記・復習を入れるのがおすすめです。"],
  late: ["生活改善", "就寝30分前はスマホを離し、翌日の教材を机に置いてから寝ましょう。睡眠の安定は集中力と記憶に直結します。"],
  heavy: ["部活両立", "部活がある日は短時間復習、休みの日は演習中心にしましょう。疲れている日は暗記カードや音読など負荷の軽い学習が有効です。"],
  distracting: ["環境づくり", "机の上を教材1つだけにし、スマホは別室へ置きましょう。家で難しい日は図書館や学校の自習スペースも候補にします。"],
  lost: ["授業フォロー", "分からない箇所に印をつけ、翌日までに先生・友人・解説動画のどれかで確認しましょう。疑問をためないことが最優先です。"],
  pulled: ["友人・SNS対策", "遊びの予定を否定せず、先に学習終了条件を決めましょう。『数学2ページが終わったら返信』のように境界を作ります。"],
};

const defaultAdvice = [
  ["強みを伸ばす", "今できている習慣を残したまま、週1回だけ応用問題や過去問に挑戦しましょう。"],
  ["復習サイクル", "授業当日・翌日・週末の3回復習を基本にすると、短時間でも忘れにくくなります。"],
  ["相談の活用", "困った項目は一人で抱えず、先生・家族・友人に『具体的に1つ』相談しましょう。"],
];

const questionList = document.querySelector("#questionList");
const form = document.querySelector("#surveyForm");
const result = document.querySelector("#result");
const resultSummary = document.querySelector("#resultSummary");
const adviceList = document.querySelector("#adviceList");
const weeklyPlan = document.querySelector("#weeklyPlan");
const resetButton = document.querySelector("#resetButton");

function renderQuestions() {
  questionList.innerHTML = questions.map((question) => `
    <fieldset class="question">
      <legend>${question.title}</legend>
      <p>${question.prompt}</p>
      ${question.options.map(([value, label], index) => `
        <label class="option">
          <input type="radio" name="${question.id}" value="${value}" ${index === 0 ? "required" : ""} />
          <span>${label}</span>
        </label>
      `).join("")}
    </fieldset>
  `).join("");
}

function collectAnswers() {
  return Object.fromEntries(new FormData(form).entries());
}

function buildAdvice(answers) {
  const selected = Object.values(answers);
  const matched = selected
    .filter((value) => adviceRules[value])
    .map((value) => adviceRules[value]);

  return [...matched, ...defaultAdvice].slice(0, 5);
}

function buildWeeklyPlan(answers) {
  const plan = [
    "1日目：アンケート結果を見て、最優先で改善する項目を1つ決める。",
    "2日目：学校ワークや教科書から、基礎問題を20〜30分だけ解く。",
    "3日目：間違えた問題を解き直し、原因を『知識不足・計算ミス・読み違い』に分類する。",
    "4日目：暗記科目を15分、主要科目を25分の2セットで取り組む。",
    "5日目：先生・家族・友人の誰かに、分からない問題を1つ質問する。",
    "6日目：小テスト形式で確認し、できたことを記録する。",
    "7日目：次週の学習時間と科目を決め、無理のない計画に更新する。",
  ];

  if (answers.life === "busy" || answers.club === "heavy") {
    plan[3] = "4日目：15分学習を2〜3回に分け、部活や予定のすき間に復習を入れる。";
  }

  if (answers.grades === "low" || answers.school === "lost") {
    plan[1] = "2日目：教科書例題と学校ワークの基本問題に絞り、理解できる問題を増やす。";
  }

  return plan;
}

function renderResult(answers) {
  const advice = buildAdvice(answers);
  const difficultCount = Object.values(answers).filter((value) => adviceRules[value]).length;

  resultSummary.textContent = difficultCount >= 4
    ? "まずは課題を絞り、生活・基礎・環境を同時に整えることが効果的です。"
    : "今ある強みを活かしながら、学習の優先順位を明確にするとさらに伸びやすくなります。";

  adviceList.innerHTML = advice.map(([title, body]) => `
    <article class="advice-item">
      <h3>${title}</h3>
      <p>${body}</p>
    </article>
  `).join("");

  weeklyPlan.innerHTML = buildWeeklyPlan(answers).map((item) => `<li>${item}</li>`).join("");
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderResult(collectAnswers());
});

resetButton.addEventListener("click", () => {
  form.reset();
  result.hidden = true;
});

renderQuestions();
