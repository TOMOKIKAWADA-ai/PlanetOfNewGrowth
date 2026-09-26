const WORLD = new URL('../assets/promo/world-awakening.png', import.meta.url).href;
const INVASION = new URL('../assets/promo/invasive-source.png', import.meta.url).href;
const SOLDIERS = new URL('../assets/promo/three-soldiers.png', import.meta.url).href;

export const CIVILIAN_ART = Object.freeze({
  lotus: new URL('../assets/story/civilian-lotus-rooted.png', import.meta.url).href,
  ginkgo: new URL('../assets/story/civilian-ginkgo-rooted.png', import.meta.url).href,
  poppy: new URL('../assets/story/civilian-poppy-rooted.png', import.meta.url).href,
  acorn: new URL('../assets/story/civilian-acorn-rooted.png', import.meta.url).href,
  milkweed: new URL('../assets/story/civilian-milkweed-rooted.png', import.meta.url).href,
  mangrove: new URL('../assets/story/civilian-mangrove-rooted.png', import.meta.url).href,
  dandelion: new URL('../assets/story/civilian-dandelion-rooted.png', import.meta.url).href,
  elm: new URL('../assets/story/civilian-elm-rooted.png', import.meta.url).href,
  ash: new URL('../assets/story/civilian-ash-rooted.png', import.meta.url).href,
  burdock: new URL('../assets/story/civilian-burdock-rooted.png', import.meta.url).href
});

export const STORY_CHARACTERS = {
  tsukimi: { name: 'ツキミ', color: '#92d8ff', portrait: true },
  akame: { name: 'アカメ', color: '#c9e2b7', portrait: true },
  kiichigo: { name: 'キイチゴ', color: '#ffbf9a', portrait: true },
  enju: { name: 'エンジュ', color: '#d5c8ee', role: '防除隊司令・通信' },
  minari: { name: 'ミナリ', color: '#e5cf91', role: 'ハスノ区・住民代表', artwork: CIVILIAN_ART.lotus },
  rindou: { name: 'リンドウ', color: '#aabfee', role: 'ハスノ区・観測係', artwork: CIVILIAN_ART.ginkgo },
  keshi: { name: 'ケシ', color: '#efc3a2', role: 'ハスノ区・避難者', artwork: CIVILIAN_ART.poppy },
  kunugi: { name: 'クヌギ', color: '#dac69f', role: 'ハスノ区・避難者', artwork: CIVILIAN_ART.acorn }
};

export const PROLOGUE = {
  title: 'PROLOGUE', subtitle: '防除線のこちら側',
  lines: [
    { background: WORLD, label: 'かつて、地球だった場所', text: '人類は、生き延びるために\n動く肉体を手放した。' },
    { background: WORLD, art: [CIVILIAN_ART.lotus, CIVILIAN_ART.milkweed, CIVILIAN_ART.mangrove], label: '今を生きる人々', text: 'いまの市民は、植物と機械を合わせた体で暮らす。\n根を張り、水と光を分け合い、街を営んできた。' },
    { background: INVASION, label: '黒い卵', text: 'そこへ、別の世界から黒い卵が降ってきた。\n卵は孵り、また卵を産み、地上へ広がっていく。' },
    { blackout: true, text: '卵が迫っても、根を張った人々は\nその場からすぐには動けない。' },
    { background: SOLDIERS, label: '旧人類型の兵士', text: '旧人類の肉体を模して作られた、三人の兵士。\nツキミ、アカメ、キイチゴは根を持たずに走れる。' },
    { background: SOLDIERS, art: CIVILIAN_ART.lotus, text: 'その姿は、市民にとって遠い過去の人間そのもの。\n助けに来たと知る前に、悲鳴を上げる者もいる。' },
    { background: WORLD, text: '人々は卵を食い止める境界を「防除線」と呼んだ。\nその内側なら、安全なはずだった。' },
    { background: WORLD, label: '前日・シラユリ観測所', text: '前日、三人はシラユリ観測所に残された二人を救い出した。\n一人は、伸ばされた手を見て「触らないで」と叫んだ。' },
    { background: WORLD, text: '二人が持ち出した観測記録には、\n防除線の内側にいる卵が映っていた。' },
    { background: INVASION, text: '観測記録が示したのは、七日後の一斉孵化。\nその最初の夜が、明けようとしていた。' }
  ]
};

export function createBriefing(characterId, stageId = 1) {
  if (stageId === 1) return createChapterOneBriefing(characterId);
  const water = stageId === 2;
  const line = (speaker, expression, text, extra = {}) => ({ speaker, expression, text, background: WORLD, ...extra });
  const departure = {
    tsukimi: '私が先に行く。二人とも、帰り道を頼むね。',
    akame: '私が道を開く。二人とも、離れすぎないで。',
    kiichigo: '先頭は任せて。……ちゃんと、帰ってくるから。'
  };
  return {
    title: water ? 'CHAPTER 02' : 'CHAPTER 01',
    subtitle: water ? '水底に残るもの' : '最初の足音',
    lines: [
      { background: WORLD, label: water ? '水没区域・出撃前' : '草原区域・出撃前', text: water ? '水面の下で、黒い種子が揺れている。\n三人の通信に、小さな息遣いが重なった。' : '風に揺れる草の奥に、異界の種子が見える。\nツキミは足を止め、二人の到着を待った。' },
      line('kiichigo', 'surprise', water ? '水の中まで、卵だらけ。あれ、全部孵るの？' : '……ねえ、あの黒いの。さっきより増えてない？'),
      line('akame', 'normal', '立ち止まっている間にも孵る。根のある場所まで行かせない。'),
      line('tsukimi', 'sad', 'ここにいる人たちは、逃げられないんだよね。', { close: true }),
      line('akame', 'normal', 'ええ。だから、私たちがここで止める。'),
      line('kiichigo', 'smile', 'じゃ、競争。私がいちばん多く片づけたら、帰りは先頭ね。'),
      line('akame', 'angry', '先走らない。帰り道がなくなる。'),
      line('kiichigo', 'surprise', '帰る話をしたんだけど。'),
      line('tsukimi', 'smile', '……うん。三人で帰ろう。競争の結果は、そのあと。', { close: true }),
      { blackout: true, text: '通信の向こうで、短い返事が二つ。\nそれだけで、足を踏み出せた。' },
      line('akame', 'normal', water ? '水中の卵には魚形態で近づく。力を使い切る前に、人間形態へ戻って。' : '卵は鳥形態で捕食できる。飛び続けると力を使うから、無理はしないで。'),
      line('tsukimi', 'normal', '増殖を抑えて、最後に母卵を壊す。ここを取り戻そう。'),
      line(characterId, 'smile', departure[characterId] ?? departure.tsukimi, { close: true })
    ]
  };
}

const narration = (text, extra = {}) => ({ background: WORLD, text, ...extra });
const dialogue = (speaker, expression, text, extra = {}) => ({
  background: WORLD, speaker, expression, text, ...extra
});
const soldierId = id => ['tsukimi', 'akame', 'kiichigo'].includes(id) ? id : 'tsukimi';

function createChapterOneBriefing(characterId) {
  const selected = soldierId(characterId);
  const departures = {
    tsukimi: '私がポンプを守る。\n二人は、ミナリさんたちの帰り道をお願い。',
    akame: '私はポンプのほうへ行く。\n救助は、二人に任せるね。',
    kiichigo: 'じゃ、ポンプは私。\nそっちは六人と荷車。置いてこないでよ。'
  };
  return {
    title: 'CHAPTER 01', subtitle: '守る順番',
    lines: [
      narration('昨夜の救助で、アカメの肩当てが割れた。\n救った市民に腕を避けられた感触が、まだ残っている。', { label: '中央拠点・朝 ／ 卵が一斉に孵るまで六日' }),
      dialogue('kiichigo', 'smile', '肩だけ新品だ。私の分は？'),
      dialogue('akame', 'normal', '壊してないでしょ。'),
      dialogue('tsukimi', 'smile', '壊さないでもらえるなら、私も助かる。'),
      dialogue('enju', 'normal', '装備の話はそこまで。ハスノ区の水を送るポンプの近くに、\n大きな親の卵——母卵がいる。'),
      narration('机の地図に、四つの居住区へ伸びる水路が浮かぶ。\n水はすべて、一台のポンプから送られていた。'),
      dialogue('enju', 'normal', 'ポンプが止まれば、四つの居住区に水が届かない。\n増える卵を抑えて、母卵を壊してくれ。'),
      narration('通信窓に、根を張った蓮型の住民が映る。\nハスノ区の代表、ミナリだった。', { art: CIVILIAN_ART.lotus }),
      dialogue('minari', 'normal', 'その前に。東の温室には、まだ六人いるんです。'),
      narration('画面に三人の姿が映ると、ミナリの声が止まった。\n花弁の縁が、細かく震えている。'),
      dialogue('minari', 'normal', '……旧人類の姿で来るとは、聞いていませんでした。'),
      dialogue('tsukimi', 'normal', '驚かせてごめんなさい。こちらからは近づきません。\nまず、六人の移動に何が必要か教えてください。'),
      dialogue('minari', 'normal', '二人は根を傷めていて、土ごと移動槽に載せないと。\nほかの四人も、根鉢をほどく時間が要ります。'),
      narration('ミナリが地図の温室を示す。\nツキミは手を出さず、指された位置を端末に写した。'),
      dialogue('enju', 'normal', '道は卵に塞がれ、追加の部隊は出せない。\n救助に時間をかければ、ポンプの周りの卵が増える。'),
      dialogue('akame', 'normal', 'わかった。私が六人を運んで、そのあとポンプへ——'),
      dialogue('enju', 'normal', 'アカメ。一人で走る順番の話ではない。'),
      narration('アカメの指が、地図の上で止まった。\nツキミは、その指の下に隠れていた細い道を見つけた。'),
      dialogue('tsukimi', 'normal', 'この裏道は？　温室のすぐ横まで続いてる。'),
      dialogue('minari', 'normal', '使えます。移動槽を載せた荷車も通れます。'),
      dialogue('kiichigo', 'surprise', 'でも「行き止まり」って。'),
      dialogue('minari', 'normal', '苗を盗られるので、そう書いてあります。'),
      dialogue('kiichigo', 'smile', '地図にまで？　徹底してるなあ。'),
      dialogue('minari', 'normal', '実際、減りましたから。'),
      narration('キイチゴが端末に「行き止まりじゃない」と吹き込む。\nミナリは荷車の寸法を、地図の余白に書き始めた。'),
      dialogue('tsukimi', 'normal', 'ここで分かれよう。一人がポンプを守る。\n残る二人とミナリさんで、六人を裏道へ。'),
      dialogue('enju', 'normal', '許可する。ただし、人を運び出したら温室から離れろ。\n苗を取りに戻る余裕はない。'),
      narration('ミナリは書きかけの数字を仕上げてから、頷いた。'),
      dialogue('minari', 'normal', '六人と移動槽が乗ります。あなたたちが荷台に乗らなければ。'),
      dialogue('kiichigo', 'smile', '私たちの席、最初からない感じ？'),
      dialogue('minari', 'normal', '飛べるんでしょう？　……足もあるし。'),
      dialogue('akame', 'normal', '歩いて押すよ。根には触れない。必要なことは指示して。'),
      narration('アカメは地図から手を離し、新しい肩当ての留め具を締めた。\n今度は、誰も先に部屋を出なかった。'),
      narration('ハスノ区へ着くと、道はポンプと温室に分かれた。\n黒い卵が、水を送る管に沿って脈打っている。', { label: 'ハスノ区・ポンプへ続く道' }),
      dialogue(selected, 'normal', departures[selected], { close: true }),
      dialogue('enju', 'normal', 'ポンプを守る担当へ。母卵が姿を現すまで、\n周りの小さな卵を減らしてくれ。制限時間は五分だ。'),
      dialogue('akame', 'normal', '鳥形態なら、小さな卵を一撃で捕食できる。\nMPが減ったら人間形態へ。無理して飛び続けないで。'),
      dialogue('kiichigo', 'smile', '母卵を見つけたら、そっちが本命ね。\n小さいのを数えてて、忘れないでよ。'),
      narration('救助班の通信に、根鉢を包む布の数を確かめる声が混じった。\nツキミは一度だけ空を見て、ポンプへ走り出した。'),
      narration('増え続ける卵を減らし、最後に現れる母卵を壊す。\n六人の救助が終わるまで、ポンプを守り抜こう。', { label: '作戦目標 ／ ハスノ区の水を守る', blackout: true })
    ]
  };
}

// 救助と温室の損失は固定の物語。第1章の母卵撃破時だけ再生する。
export function createAftermath(characterId, stageId = 1) {
  if (stageId !== 1) return null;
  const selected = soldierId(characterId);
  const returns = {
    tsukimi: 'ポンプの周りは片づいたよ。そっちは？',
    akame: '母卵は止めた。みんな、戻れた？',
    kiichigo: 'こっち片づいた！　六人、いる？'
  };
  return {
    title: 'CHAPTER 01 — AFTER', subtitle: '六人分の水音',
    lines: [
      narration('母卵が崩れると、地面を伝う振動が止んだ。\nポンプはまだ動いている。水の流れる音が戻ってきた。', { label: 'ハスノ区・ポンプ付近 ／ 作戦終了' }),
      dialogue(selected, 'normal', returns[selected]),
      dialogue('minari', 'normal', '六人とも、避難所に着きました。\n根も運べています。……温室は、もう使えません。'),
      narration('通信の向こうで、移動槽の給水を確かめる声がした。\nミナリが六人分を数え終えるまで、三人とも回線を切らなかった。', { blackout: true }),
      narration('避難所の入口には泥の轍が二本続いていた。\n六つの根鉢が、新しい土の上に並んでいる。', { label: 'ハスノ区・仮設避難所', art: [CIVILIAN_ART.acorn, CIVILIAN_ART.poppy, CIVILIAN_ART.milkweed] }),
      narration('脱いだ靴を手にしたまま三人が入ると、\n避難者たちの葉が一斉に身を縮めた。', { art: [CIVILIAN_ART.mangrove, CIVILIAN_ART.dandelion, CIVILIAN_ART.elm] }),
      dialogue('keshi', 'normal', '……人の顔をしたまま歩くのね。\nあんな姿、卵より気味が悪い。'),
      dialogue('kiichigo', 'surprise', '聞こえてるよ。……外で待とうか。'),
      dialogue('minari', 'normal', 'ケシ、やめて。\nでも三人とも、少し入口で待ってください。'),
      narration('キイチゴは返事を飲み込み、給水管を戸口に置いた。\n内側からミナリが受け取る。'),
      dialogue('kunugi', 'normal', '運んでくれたのは、あの人たち？'),
      dialogue('minari', 'normal', 'ええ。根に触る前に、ちゃんと聞いてくれました。'),
      dialogue('keshi', 'normal', '助かったのは分かる。\nでも、すぐ近くにいられると怖いの。'),
      dialogue('tsukimi', 'normal', '分かりました。必要なら、ここから話します。'),
      narration('管に水が通り、移動槽の土が暗い色に変わる。\n乾いた根の匂いが、戸口まで流れてきた。'),
      dialogue('kiichigo', 'smile', 'あ。ちゃんと水が来てる匂い。'),
      dialogue('minari', 'normal', '六つとも、流量を確かめて。戸口からでいいから。'),
      dialogue('kiichigo', 'surprise', '匂いを褒めたら仕事が来た。'),
      narration('キイチゴが外側で計器を読み上げる。\nミナリの葉先が、アカメの肩当てへ向いた。'),
      dialogue('minari', 'normal', 'その留め具。外れかけてる。'),
      dialogue('akame', 'normal', 'あとで締める。水槽なら、運べるよ。'),
      dialogue('minari', 'normal', 'それで管を壊されると困る。外の椅子に座って。'),
      narration('アカメが椅子に収まったのを確かめて、ツキミは報告回線を開いた。'),
      dialogue('tsukimi', 'normal', '母卵は破壊。主ポンプは稼働しています。\n取り残されていた六人も、全員退避できました。'),
      dialogue('tsukimi', 'sad', '東の温室は……守れませんでした。'),
      dialogue('minari', 'normal', '三か月かけた苗だったんです。\nあと少しで、植え替えられたのに。'),
      narration('ミナリの葉先は流量計の灯りに向いたままだった。\nツキミは端末を下ろし、六番目の水音が落ち着くのを待った。'),
      dialogue('minari', 'normal', 'でも、あの六人を連れてきてくれて、ありがとう。\n怖かったこととは、別に伝えたい。'),
      narration('入口で小さな箱が鳴った。殻の内側に光を宿した観測係リンドウの\n運搬器に、救助のときに持ち出した種の箱が載っている。', { art: CIVILIAN_ART.ginkgo }),
      dialogue('rindou', 'normal', '苗は無理だったけど、これだけ。\n……どこに置けばいい？'),
      narration('アカメは膝から工具をどけ、卓に乾いた布を敷いた。\nリンドウが運搬器を寄せるまで、一歩下がって待つ。'),
      dialogue('akame', 'normal', 'ここに置ける。……重かったでしょ。'),
      dialogue('rindou', 'normal', 'うん。途中から、すごく。'),
      narration('箱を移しても、リンドウは運搬器を動かさなかった。\nアカメは急かさず、距離を保ったまま留め具を締め直した。'),
      dialogue('enju', 'normal', '速報は受け取った。詳細報告は明朝までに。\n今は補給と整備を済ませろ。'),
      dialogue('kiichigo', 'surprise', '今の、報告じゃなかったの？'),
      dialogue('tsukimi', 'normal', '速報。道順と、救助の経過もまとめないと。'),
      dialogue('kiichigo', 'normal', '報告書って、卵みたいに増えるね。'),
      narration('ツキミの端末に、キイチゴの音声記録が届いた。\n一つ目は「行き止まりじゃない」。二つ目は——'),
      dialogue('kiichigo', 'smile', '「ツキミ、これ全部聞くの？」まで入ってる。\nそこは飛ばしていいから。'),
      dialogue('tsukimi', 'smile', 'まだ聞いてない。まず補給しよう。\n私たちの分も、用意してある。'),
      narration('キイチゴが三人の補給包を戸口の外へ運んだ。\n内側では、六つの根鉢に水が行き渡っている。', { art: [CIVILIAN_ART.lotus, CIVILIAN_ART.ginkgo, CIVILIAN_ART.burdock] }),
      narration('戸を隔てたまま、それぞれの体へ水が届く。\n窓の外では、送水路の流れが途切れずにいた。', { blackout: true })
    ]
  };
}
