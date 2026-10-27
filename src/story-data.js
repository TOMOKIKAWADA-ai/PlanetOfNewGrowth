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
  hirugi: { name: 'ヒルギ', color: '#a9d8c4', role: 'シラユリ観測所・観測員', artwork: CIVILIAN_ART.mangrove },
  keshi: { name: 'ケシ', color: '#efc3a2', role: 'ハスノ区・避難者', artwork: CIVILIAN_ART.poppy },
  kunugi: { name: 'クヌギ', color: '#dac69f', role: 'ハスノ区・避難者', artwork: CIVILIAN_ART.acorn }
};

// 物語の芯：卵と三人は同じ「白蓮保管庫」から来ている。
// プロローグで「同じ冬」を並べて置き、第1章の母卵の殻で名前を見せ、エンジュが口止めする。
export const PROLOGUE = {
  title: 'PROLOGUE', subtitle: '触れられない手',
  lines: [
    { background: WORLD, blackout: true, text: '「触らないで！」' },
    { background: WORLD, label: '前日・シラユリ観測所', text: '伸ばした手の先で、根を張った市民が身をよじった。\n周りは卵だらけなのに、彼女が怯えたのは、こちらの手だった。' },
    { background: WORLD, art: [CIVILIAN_ART.lotus, CIVILIAN_ART.milkweed, CIVILIAN_ART.ash], label: 'かつて、地球だった場所', text: '人類は生き延びるために、動く肉体を手放した。\nいまは植物と機械の体で根を張り、水と光を分け合って暮らす。' },
    { background: WORLD, label: '白蓮保管庫', text: '手放した肉体は、白い蓮の塔で眠らせた。\n二度と使わない、という約束とともに。' },
    { background: INVASION, label: '黒い卵', text: '一年前の冬、黒い卵が降ってきた。\n卵は孵り、また卵を産み、根を張った人々を呑み込んでいく。' },
    { blackout: true, text: '根を張った人々は、逃げられない。\nだから、走れる体がもう一度必要になった。' },
    { background: SOLDIERS, label: '旧人類型の兵士', text: '同じ冬、白蓮保管庫で三人の兵士が目を覚ました。\nツキミ、アカメ、キイチゴ。旧人類の姿を模した、守り手。' },
    { background: SOLDIERS, art: CIVILIAN_ART.lotus, text: '市民は三人に守られ、三人を恐れる。\nその姿をした者たちが昔なにをしたのか、誰も口にしない。' },
    { background: WORLD, label: '観測記録', text: '救い出した観測員は、震える根で記録を差し出した。\n卵は、防除線の内側で生まれていた。' },
    { background: INVASION, text: '記録が示す一斉孵化は、七日後。\n卵はどこから来るのか——その問いを残して、夜が明ける。' }
  ]
};

const narration = (text, extra = {}) => ({ background: WORLD, text, ...extra });
const dialogue = (speaker, expression, text, extra = {}) => ({
  background: WORLD, speaker, expression, text, ...extra
});
const soldierId = id => ['tsukimi', 'akame', 'kiichigo'].includes(id) ? id : 'tsukimi';
// 選択キャラはポンプ側にいるため、救助側の台詞は選ばれなかった兵士に言わせる。
const otherThan = (selected, preferred, fallback) => selected === preferred ? fallback : preferred;

const BRIEFINGS = {
  1: id => createChapterOneBriefing(id),
  2: id => createShirayuriBriefing(id),
  3: id => createVaultBriefing(id),
  4: id => createRootsBriefing(id),
  5: id => createReservoirBriefing(id),
  6: id => createFinalBriefing(id)
};
const AFTERMATHS = {
  1: id => createChapterOneAftermath(id),
  2: id => createShirayuriAftermath(id),
  3: id => createVaultAftermath(id),
  4: id => createRootsAftermath(id),
  5: id => createReservoirAftermath(id),
  6: id => createEnding(id)
};

export const STORY_CHAPTER_COUNT = Object.keys(BRIEFINGS).length;

export function createBriefing(characterId, stageId = 1) {
  return (BRIEFINGS[stageId] ?? BRIEFINGS[1])(characterId);
}

// 各章の母卵撃破時だけ再生する。最終章の後はそのままエンディングになる。
export function createAftermath(characterId, stageId = 1) {
  return AFTERMATHS[stageId]?.(characterId) ?? null;
}

function createChapterOneBriefing(characterId) {
  const selected = soldierId(characterId);
  const departures = {
    tsukimi: '言い出したのは私。ポンプは私が持つ。\n二人は六人を、一人も残さずに。',
    akame: 'ポンプは私が守る。……一人で走るんじゃない。\n二人が戻るまで、ここを動かないだけ。',
    kiichigo: 'ポンプは私ね。いちばん速いのが残れば、\nいちばん早く片づくでしょ。'
  };
  return {
    title: 'CHAPTER 01', subtitle: '守る順番',
    lines: [
      narration('作業台に、割れた肩当てが置かれている。\n昨日、アカメが市民に触れないまま庇い、代わりに受けた傷だ。', { label: '中央拠点・朝 ／ 一斉孵化まで、あと六日' }),
      dialogue('kiichigo', 'smile', '「触らないで」って言われて、ほんとに触らずに庇うんだもん。\n器用っていうか、頑固っていうか。'),
      dialogue('akame', 'normal', '言われたとおりにしただけ。'),
      dialogue('tsukimi', 'sad', 'あの人、最後までアカメの顔を見なかったね。'),
      dialogue('kiichigo', 'normal', '卵には叫ばないのに、私たちには叫ぶ。\n……ま、慣れたけど。'),
      narration('キイチゴは肩当ての欠片を指で弾いて、すぐに話を変えた。'),
      dialogue('kiichigo', 'smile', 'それより昨日の卵。鳥になってつついたら、\n焦がした砂糖みたいな味がした。'),
      dialogue('akame', 'angry', '食べた感想を言わない。'),
      dialogue('kiichigo', 'smile', 'だって、食べると傷まで治るんだよ？\n体に合う味がするの、当たり前じゃない？'),
      dialogue('tsukimi', 'normal', '……そういえば、どうして治るんだろうね。'),
      dialogue('enju', 'normal', '雑談はそこまでだ。地図を見ろ。'),
      narration('机の地図に、ハスノ区の水路が浮かぶ。\n四つの居住区へ水を送るポンプの脇で、巨大な卵が脈打っていた。'),
      dialogue('enju', 'normal', '母卵——卵を産み続ける親の卵だ。\nポンプが呑まれれば、四つの区、二千人の水が止まる。'),
      narration('通信窓が割り込んだ。根を張った蓮型の住民。\nハスノ区の代表、ミナリだった。', { art: CIVILIAN_ART.lotus }),
      dialogue('minari', 'normal', '東の温室に、六人が取り残されています！\nお願いです、先にそちらへ——'),
      narration('画面に映った三人を見て、ミナリの声が途切れた。\n花弁の縁が、細かく震えている。'),
      dialogue('minari', 'normal', '……あなたたちが、守り手？'),
      dialogue('tsukimi', 'normal', 'はい。驚かせてごめんなさい。\n六人のこと、聞かせてください。'),
      dialogue('enju', 'normal', '待て。温室とポンプは反対方向だ。\n三人で、両方は守れない。'),
      dialogue('enju', 'normal', '順番を決める。ポンプが先だ。\n六人は、母卵を壊したあとで回収する。', { close: true }),
      dialogue('minari', 'normal', 'あとって、いつです？\n温室の壁は、もう卵に覆われてるんです！'),
      dialogue('enju', 'normal', '二千人と六人だ、ミナリ代表。\nあなたが私の席にいても、同じ順番を選ぶ。'),
      narration('ミナリは答えなかった。\n答えられないことが、通信越しにも伝わってきた。'),
      dialogue('akame', 'angry', '私が温室へ行く。ポンプは二人で——'),
      dialogue('enju', 'normal', '一人で六人をどう運ぶ。\n昨日は一人を庇って、肩当てを割ったばかりだろう。'),
      narration('アカメの指が、割れた肩当ての縁で止まった。'),
      dialogue('tsukimi', 'normal', '……なら、逆にしよう。ポンプを一人で守る。\n残りの二人で、六人を運ぶ。'),
      dialogue('enju', 'normal', '一人が崩れれば、二千人も六人も失う。'),
      dialogue('kiichigo', 'smile', '崩れなきゃいいんでしょ。\nうちの三人、崩れたことある？'),
      dialogue('akame', 'normal', '肩当ては割れた。'),
      dialogue('kiichigo', 'surprise', '肩当ては三人に数えないの。'),
      narration('短い沈黙。回線の向こうで、エンジュが何かを数える気配がした。'),
      dialogue('enju', 'normal', '……人だけだ。苗は捨てろ。\nポンプが崩れたら、救助を捨ててでも全員そちらへ戻れ。'),
      dialogue('minari', 'normal', '苗は、三か月かけて——\n……いえ。人が先です。お願いします。'),
      narration('通信を切る前に、ミナリは一度だけ三人を見た。\n今度は、目を逸らさなかった。'),
      narration('道はポンプと温室に分かれていた。\n黒い卵が、水を送る管に沿って脈打っている。', { label: 'ハスノ区・分かれ道' }),
      dialogue(selected, 'normal', departures[selected], { close: true }),
      dialogue('enju', 'normal', 'ポンプ担当へ。持たせるのは四分だ。\n三分で母卵が殻を破る。残りの一分で仕留めろ。'),
      dialogue('akame', 'normal', '鳥になれば、卵は一撃で落とせる。\n飛ぶほど力が減るから、切れる前に人の形へ戻って。'),
      dialogue('kiichigo', 'smile', 'つつけば傷も治るしね。\n……味の感想は、あとで聞かせて。'),
      narration('通信の向こうで、荷車の車輪が回り出す。\n背中に預けたのは、二千人と六人だった。'),
      narration('増え続ける卵を減らし、三分後に現れる母卵を破壊せよ。\n救助が終わるまで、ポンプを守り抜け。', { label: '作戦目標 ／ ハスノ区の水を守る', blackout: true })
    ]
  };
}

// 救助と温室の損失、白い破片の発見は固定の物語。
function createChapterOneAftermath(characterId) {
  const selected = soldierId(characterId);
  const carrier = otherThan(selected, 'akame', 'tsukimi');
  const seedKeeper = otherThan(selected, 'kiichigo', 'akame');
  const asker = otherThan(selected, 'kiichigo', 'tsukimi');
  const returns = {
    tsukimi: 'ポンプは無事。そっちは？　六人は？',
    akame: '母卵は止めた。……みんな、戻れた？',
    kiichigo: 'こっち片づいた！　六人、いる？　全員？'
  };
  const discoveries = {
    tsukimi: '……どうして、卵の中に\n私たちの生まれた場所が。',
    akame: '白蓮保管庫……。\n私たちが、眠っていた場所。',
    kiichigo: '……え、待って。\nこれ、うちの実家の名前じゃん。'
  };
  const caught = {
    tsukimi: '……見てたの？',
    akame: '……見てたの。',
    kiichigo: 'うわ。……見てたの？'
  };
  const questions = {
    tsukimi: 'エンジュは知ってるの？\n卵が、どこから来るのか。',
    akame: '隠すなら、理由を言って。\n私たちは、何から作られたの？',
    kiichigo: '待って。「まだ」って何？\nいつなら話していいの？'
  };
  const askLines = {
    kiichigo: 'おかえり。ねえ、今日の卵も甘かった？',
    tsukimi: 'おかえり。……今日の卵も、甘かった？'
  };
  const tastes = {
    tsukimi: '……よく、覚えてない。',
    akame: '……今日は、味がしなかった。',
    kiichigo: '……今日は、あんまり食べたくなかった。'
  };
  return {
    title: 'CHAPTER 01 — AFTER', subtitle: '白い破片',
    lines: [
      narration('母卵が崩れ、地面の脈動が止んだ。\nポンプは回り続けている。水の音が戻ってきた。', { label: 'ハスノ区・ポンプ付近 ／ 作戦終了' }),
      dialogue(selected, 'normal', returns[selected]),
      dialogue('minari', 'normal', '六人とも、避難所に着きました。\n……温室は、卵に呑まれました。'),
      narration('通信を聞きながら、崩れた母卵の殻を足でどけた。\n黒い外殻の内側は、驚くほど白く、滑らかだった。'),
      narration('白い内殻に、文字が刻まれている。\n——白蓮保管庫。'),
      narration('一年前、三人が目を覚ました場所の名前だった。', { blackout: true }),
      dialogue(selected, 'surprise', discoveries[selected], { close: true }),
      narration('手のひらに収まる白い破片を拾い上げた。\n通信の向こうで、二人が名前を呼んでいる。'),
      narration('破片はポーチにしまった。\nなぜ黙っておこうと思ったのか、自分でもうまく言えなかった。'),
      narration('避難所の入口に、荷車の轍が二本。\n六つの根鉢が、新しい土の上に並んでいる。', { label: 'ハスノ区・仮設避難所', art: [CIVILIAN_ART.acorn, CIVILIAN_ART.poppy, CIVILIAN_ART.milkweed] }),
      narration('三人が戸口に立つと、避難者たちの葉が一斉に縮んだ。', { art: [CIVILIAN_ART.ash, CIVILIAN_ART.dandelion, CIVILIAN_ART.burdock] }),
      dialogue('keshi', 'normal', '……人の顔をして、歩いてる。\nあんな姿、卵より気味が悪い。'),
      dialogue('kiichigo', 'sad', '傷つくなあ。……ほんとに、ちょっとだけね。'),
      dialogue('minari', 'normal', 'ケシ。この人たちが、あなたを運んだのよ。'),
      dialogue('keshi', 'normal', '分かってる。分かってるから、怖いの。\nあの形をしたものが、昔なにをしたか——'),
      dialogue('minari', 'normal', 'ケシ。'),
      narration('誰も、続きを聞き返さなかった。\n知らないのは、戸口に立つ三人だけのようだった。'),
      dialogue('kunugi', 'normal', 'でも、運んでくれたとき、根っこに一回も触らなかったよ。\n「触っていい？」って、ずっと聞いてた。'),
      dialogue('kunugi', 'normal', 'うるさいくらい、ずっと。'),
      dialogue(carrier, 'smile', '……うるさかった？　ごめん。'),
      dialogue('kunugi', 'normal', 'ううん。だから、怖くなかった。'),
      narration('ケシの葉が、ほんの少しだけ開いた。\nそれきり、ケシは何も言わなかった。'),
      dialogue('tsukimi', 'normal', '私たちは外で待ちます。\n必要なものがあれば、戸口から呼んでください。'),
      dialogue('minari', 'normal', '温室は、三か月かけた苗ごと呑まれました。\n来年の分まで、全部あの中に。'),
      dialogue('tsukimi', 'sad', '守れませんでした。……ごめんなさい。'),
      dialogue('minari', 'normal', '謝らないで。人が先だと言ったのは、私です。'),
      dialogue('minari', 'normal', 'それでも——六人を、ありがとう。\n怖いことと感謝は、別の話だから。'),
      narration('入口で運搬器の車輪が鳴った。観測係のリンドウだ。\n殻の内側に光が灯り、荷台には小さな種の箱が一つ。', { art: CIVILIAN_ART.ginkgo }),
      dialogue('rindou', 'normal', '温室から、これだけ。\n荷車の隅に、括りつけてもらったの。'),
      dialogue(seedKeeper, 'smile', '「苗は捨てろ」って命令だったから。\n種とは言われてない。'),
      dialogue('rindou', 'normal', '屁理屈。……でも、ありがとう。'),
      narration('種の箱が、戸口の内側へ運ばれていく。\n箱ひとつ分だけ、来年が残った。'),
      narration('個別回線が開いた。相手はエンジュ。\n二人には聞こえていない。', { label: '個別回線', blackout: true }),
      dialogue('enju', 'normal', '母卵の殻から、何か拾ったな。'),
      dialogue(selected, 'surprise', caught[selected]),
      dialogue('enju', 'normal', '回収班に渡せ。報告書には書くな。\n二人にも、まだ話すな。', { close: true }),
      dialogue(selected, 'angry', questions[selected]),
      dialogue('enju', 'normal', '一斉孵化まで、あと五日。市民がお前たちを拒めば、\n守れるものも守れなくなる。'),
      dialogue('enju', 'normal', '……今は休め。それも命令だ。'),
      narration('回線が切れた。\nポーチの中で、白い破片が冷たく重い。'),
      dialogue(asker, 'smile', askLines[asker]),
      dialogue(selected, 'sad', tastes[selected], { close: true }),
      narration('一斉孵化まで、あと五日。\n白い破片のことは、まだ誰にも話していない。', { blackout: true })
    ]
  };
}

// 第2章：「触らないで」と叫んだ観測員ヒルギを、恐れられている三人が運ぶ。
// 記録から、卵が白蓮保管庫から来ていることと、三人の後を追っていることが分かる。
function createShirayuriBriefing(characterId) {
  const selected = soldierId(characterId);
  const carrier = otherThan(selected, 'akame', 'tsukimi');
  const departures = {
    tsukimi: '観測所の前は私が持つ。\n二人は、ヒルギさんを地下まで。',
    akame: '外は私が守る。\n……ヒルギさんの槽、揺らさないでね。',
    kiichigo: '外は私が片づける。\n二人は地下へ。ゆっくりでいいよ、こっちは速いから。'
  };
  return {
    title: 'CHAPTER 02', subtitle: 'シラユリの記録',
    lines: [
      narration('救護所の隅に、蔓の絡んだ移動槽が一つ置かれている。\nシラユリ観測所から救い出した観測員、ヒルギだ。', { label: 'ハスノ区・救護所 ／ 一斉孵化まで、あと五日', art: CIVILIAN_ART.mangrove }),
      narration('二日前、伸ばされた手に「触らないで」と叫んだのは、\nこの人だった。'),
      dialogue('hirugi', 'normal', '来てくれて、ありがとう。\n……そこから、近づかないで。'),
      dialogue('akame', 'normal', '近づかない。用件だけ聞く。'),
      dialogue('hirugi', 'normal', '観測所の地下に、記録の本体が残ってる。\n卵がどこから来て、どこへ向かうのか。全部、あの中。'),
      dialogue('tsukimi', 'normal', '取ってくればいいですか。'),
      dialogue('hirugi', 'normal', '開けられるのは、私の根だけ。\n……私を、運んでもらうしかない。'),
      narration('ヒルギの蔓が、移動槽の縁を強く握った。\n自分で言った言葉に、自分で怯えているようだった。'),
      dialogue('kiichigo', 'surprise', '運ばれるの、怖いんでしょ。いいの？'),
      dialogue('hirugi', 'normal', '怖い。でも、記録を見ないまま孵化の日を迎えるほうが、\nもっと怖い。'),
      dialogue('enju', 'normal', 'シラユリは放棄した区域だ。\n……回収した記録は、まず私に送れ。'),
      narration('エンジュの返事は、いつもより一拍遅かった。\nポーチの中の破片が、急に重くなった気がした。'),
      dialogue(carrier, 'normal', '槽は私が押す。縁はつかまない。\n曲がるときは、先に声をかける。'),
      dialogue('hirugi', 'normal', '……それなら。'),
      narration('観測所は、沈みかけた夕日の中にあった。\n白い外壁を、黒い卵がびっしりと覆っている。', { label: 'シラユリ観測所・夕方' }),
      dialogue(selected, 'normal', departures[selected], { close: true }),
      dialogue('enju', 'normal', '四分だ。三分で、観測所に巣くった母卵が出る。\n残りの一分で仕留めろ。'),
      dialogue('kiichigo', 'smile', '卵、つつくのはいいけど。\n……食べすぎないでね。なんとなく。'),
      narration('観測所に群がる卵を減らし、三分後に現れる母卵を破壊せよ。\n地下の扉が開くまで、入口を守り抜け。', { label: '作戦目標 ／ 観測所の入口を守る', blackout: true })
    ]
  };
}

function createShirayuriAftermath(characterId) {
  const selected = soldierId(characterId);
  const returns = {
    tsukimi: 'こっちは片づいた。……記録は？',
    akame: '外は静かになった。ヒルギさん、無事？',
    kiichigo: '外、全部片づけた！　そっちは？'
  };
  const caught = {
    tsukimi: '……顔に、出てた？',
    akame: '……分かるの？',
    kiichigo: 'え、顔に出てた？　うそ。'
  };
  return {
    title: 'CHAPTER 02 — AFTER', subtitle: '同じ匂い',
    lines: [
      narration('母卵が崩れると、観測所の灯りが一つずつ戻った。\n地下から、記録装置の起動音が響く。', { label: 'シラユリ観測所・地下 ／ 作戦終了' }),
      dialogue(selected, 'normal', returns[selected]),
      dialogue('hirugi', 'normal', '開いた。……今、映す。'),
      narration('壁一面に、一年分の卵の記録が広がった。\n黒い点が、日を追うごとに増えていく。'),
      dialogue('hirugi', 'normal', '卵は、ばらばらに増えてるんじゃない。\n水路をさかのぼってる。'),
      narration('黒い点の流れは、すべて同じ場所から始まっていた。\n地図の北、水没区域に立つ白い塔——'),
      narration('白蓮保管庫。', { close: true, blackout: true }),
      dialogue('tsukimi', 'surprise', '……卵は、ここから溢れてる？'),
      dialogue('hirugi', 'normal', 'もう一つ。卵は、あなたたちが通った道に、\n必ず集まってる。'),
      narration('記録の上で、三人の移動経路に黒い点が寄り添っていた。\nまるで、後を追うように。'),
      dialogue('kiichigo', 'sad', '……私たち、卵に好かれてるの？'),
      dialogue('hirugi', 'normal', 'あの日、触らないでと叫んだのは——\nあなたたちの手が、卵と同じ匂いがしたから。'),
      narration('誰も、すぐには言葉を返せなかった。\n記録装置の低い音だけが続いていた。'),
      narration('ポーチの中で、白い破片が冷たい。\n同じ匂いの理由を、たぶん自分だけが半分知っている。'),
      dialogue('enju', 'normal', '記録をこちらへ送れ。\nヒルギ、その記録は防除隊が預かる。'),
      dialogue('hirugi', 'normal', '……送ったら、市民には見せないつもり？'),
      dialogue('enju', 'normal', '混乱を防ぐためだ。'),
      narration('二人が荷車を回しに出た、わずかな間だった。\nヒルギが、蔓の先で小さな殻を差し出してきた。'),
      dialogue('hirugi', 'normal', '記録の写し。あなたが持ってて。\n……いちばん、何かを隠してる顔をしてるから。'),
      dialogue(selected, 'surprise', caught[selected]),
      dialogue('hirugi', 'normal', '出てた。私も、ずっと隠してたから分かる。\n……怖いって気持ちを。'),
      narration('帰り道、ヒルギの移動槽は二人が押した。\nヒルギは一度も「触らないで」と言わなかった。'),
      dialogue('tsukimi', 'normal', 'エンジュ。明日、保管庫の下層へ行かせて。'),
      dialogue('enju', 'normal', '……許可する。水門の母卵を落とせ。\nそれ以上は、見るな。'),
      narration('一斉孵化まで、あと五日。\n「見るな」という命令は、なぜか「来い」と聞こえた。', { blackout: true })
    ]
  };
}

// 第3章：破片と記録を持ったまま保管庫の水没した下層へ。エンジュの居場所と卵の出どころが明かされる。
function createVaultBriefing(characterId) {
  const selected = soldierId(characterId);
  const watcher = otherThan(selected, 'kiichigo', 'akame');
  const departures = {
    tsukimi: '私が先に行く。\n……二人とも、扉の前で待ってて。',
    akame: '私が道を開く。\n二人とも、離れすぎないで。',
    kiichigo: '先頭は任せて。\n……ちゃんと、三人で帰るから。'
  };
  return {
    title: 'CHAPTER 03', subtitle: '水底に残るもの',
    lines: [
      narration('水面の下に、白い塔の根元が沈んでいる。\n白蓮保管庫の、水没した下層だった。', { label: '水没区域・出撃前 ／ 一斉孵化まで、あと四日' }),
      dialogue('kiichigo', 'surprise', '水の中まで卵だらけ。\n……ほんとに、ヒルギさんの記録のとおりだ。'),
      dialogue('akame', 'normal', '流れてきたんじゃない。並んでる。\n水門から、保管庫の入口まで。'),
      dialogue('tsukimi', 'sad', '道みたい。……帰り道を、作ってるみたい。', { close: true }),
      dialogue('enju', 'normal', '推測はいらない。水門の母卵を壊せ。それだけだ。'),
      dialogue('kiichigo', 'normal', 'エンジュ、最近「それだけ」が多くない？'),
      narration('エンジュは答えなかった。\n回線の向こうで、水の滴る音だけがした。'),
      dialogue('kiichigo', 'normal', 'そういえば、エンジュの顔って見たことないね。'),
      dialogue('akame', 'normal', '声だけで十分。……いつも、すぐ近くにいる気がするし。'),
      narration('ポーチには、白い破片と、ヒルギから預かった記録の殻。\nどちらのことも、まだ二人に話していない。'),
      dialogue('enju', 'normal', '持たせるのは四分。三分で水門の母卵が浮上する。\n残りの一分で沈めろ。'),
      dialogue('akame', 'normal', '水中の卵には魚形態で近づく。\n力を使い切る前に、人の形へ戻って。'),
      dialogue('tsukimi', 'normal', '増殖を抑えて、最後に母卵を壊す。\nそのあとで、保管庫の扉を見に行こう。'),
      dialogue(watcher, 'smile', '帰りは三人一緒ね。\n今度は誰も、一人で何か拾ってこないこと。'),
      narration('軽い口調だった。\n軽すぎて、返事が一拍遅れた。', { blackout: true }),
      dialogue(selected, 'smile', departures[selected], { close: true })
    ]
  };
}

function createVaultAftermath(characterId) {
  const selected = soldierId(characterId);
  const confidant = otherThan(selected, 'akame', 'tsukimi');
  const returns = {
    tsukimi: '扉が開いてる。……入ろう、三人で。',
    akame: '扉、開いてる。私が先に——いや、三人で行こう。',
    kiichigo: 'ねえ、扉開いてるんだけど。\nこういうの、だいたい嫌なやつだよね。'
  };
  const confessions = {
    tsukimi: 'ハスノ区の母卵の殻に、ここの名前があった。\n……黙っててごめん。二人とも。',
    akame: 'ハスノ区の母卵から出てきた。黙ってた。\n……一人で抱えるのは、もうやめる。',
    kiichigo: 'これ、ハスノ区の母卵から出てきたの。\n……ずっと言えなくて、ごめん。冗談にもできなかった。'
  };
  const questions = {
    tsukimi: '白蓮を壊したら、私たちはどうなるの。',
    akame: '……核と私たちは、繋がってるんだね。\n壊したら、どうなるの。',
    kiichigo: 'ちょっと待って。\nそれ壊したら、私たち、どうなるの？'
  };
  return {
    title: 'CHAPTER 03 — AFTER', subtitle: '空の保管槽',
    lines: [
      narration('水門の母卵が沈むと、濁った水がゆっくり引いていった。\n水底から、白い扉が現れる。', { label: '白蓮保管庫・下層 ／ 作戦終了' }),
      dialogue(selected, 'normal', returns[selected]),
      narration('中は、果てが見えないほど長い回廊だった。\n両側に、蓮の蕾の形をした保管槽が並んでいる。'),
      narration('保管槽は、どれも内側から割れていた。\n底に残っているのは、黒く乾いた殻だけだ。'),
      dialogue('kiichigo', 'surprise', '……これ、卵の殻と同じだ。'),
      dialogue('akame', 'normal', '同じなんじゃない。\n……卵が、ここから出ていったんだ。'),
      narration('回廊の奥に、蓋の開いた槽が三つだけ並んでいた。\n割れていない。外から、そっと開けられている。'),
      narration('槽の縁に、手書きの札が括りつけてある。\nツキミ。アカメ。キイチゴ。', { close: true }),
      dialogue('tsukimi', 'sad', '……私たちの名前。'),
      dialogue('kiichigo', 'normal', '手書きだ。字、きれいだね。\n……誰が書いたんだろ。'),
      narration('札の裏に、短い音声記録が残っていた。\n再生すると、聞き慣れた声が流れ出す。'),
      dialogue('enju', 'normal', '記録。下層が浸水した。眠っていた者たちが、黒く崩れていく。\n止められない。'),
      dialogue('enju', 'normal', '三体だけ、間に合った。\n名前を付ける。私の民と同じ、草木の名を。'),
      narration('記録が終わった。\n回廊の奥で、同じ声が、もう一度した。', { blackout: true }),
      dialogue('enju', 'normal', '……そこまで来たか。'),
      narration('制御室の床を割って、一本の槐が根を張っていた。\n幹に埋め込まれた通信機が、静かに点滅している。', { label: '白蓮保管庫・制御室' }),
      dialogue('kiichigo', 'surprise', 'エンジュ……？\nずっと、ここから通信してたの？'),
      dialogue('enju', 'normal', '私は保管庫の番人だ。\n二百年、ここで眠る者たちの水を守ってきた。'),
      narration('ポーチから、白い破片を取り出した。\nもう、隠しておく理由はなかった。'),
      dialogue(selected, 'sad', confessions[selected], { close: true }),
      dialogue(confidant, 'normal', '知ってた。ずっとポーチを触ってたから。\n……話してくれて、よかった。'),
      dialogue('tsukimi', 'angry', 'エンジュ。卵は、どこから来たの。'),
      dialogue('enju', 'normal', '空からではない。ここから溢れた。\n眠っていた旧人類の体が、崩れて、増えた。'),
      dialogue('enju', 'normal', '天井が裂けて、黒い雨になって街へ降った。\n市民は異界から来たと思った。私は、訂正しなかった。'),
      dialogue('akame', 'angry', 'どうして。'),
      dialogue('enju', 'normal', '本当のことを言えば、市民はお前たちを拒んだ。\nお前たちの体も、同じ旧人類の体だからだ。'),
      dialogue('kiichigo', 'sad', '……卵が甘かったの、そういうこと？\n同じものだから、体に合うって？'),
      narration('誰も答えなかった。\n水の滴る音だけが、制御室に響いていた。'),
      dialogue('enju', 'normal', '一斉孵化の夜、保管庫の核——白蓮が咲く。\n咲けば卵は人の形で孵り、水を奪いに歩き出す。'),
      dialogue('tsukimi', 'normal', '止める方法は？'),
      dialogue('enju', 'normal', '白蓮を壊す。咲く前にだ。'),
      dialogue(selected, 'angry', questions[selected]),
      narration('エンジュは、しばらく答えなかった。\n通信機の点滅だけが、規則正しく続いていた。'),
      dialogue('enju', 'normal', '……順番を決めるのは、私の仕事だ。', { close: true }),
      narration('一斉孵化まで、あと四日。\nそれが答えになっていないことだけは、三人とも分かっていた。', { blackout: true })
    ]
  };
}

// 第4章：真実を市民に告げ、拒まれたまま避難所を守る。市民が「渇く」ことを選ぶ。
function createRootsBriefing(characterId) {
  const selected = soldierId(characterId);
  const guard = otherThan(selected, 'akame', 'kiichigo');
  const departures = {
    tsukimi: '順番なら、もう決めた。\n目の前の人が先。……ここを守る。',
    akame: '嫌われててもいい。\n触らないまま守るのは、得意だから。',
    kiichigo: '連れてきたなら、責任取って全部片づける。\n……それなら、文句ないでしょ。'
  };
  return {
    title: 'CHAPTER 04', subtitle: '根の誓い',
    lines: [
      narration('夜の避難所に、市民たちが集まっていた。\n根を張れない者は、移動槽ごと戸口の近くに並んでいる。', { label: 'ハスノ区・仮設避難所 ／ 一斉孵化まで、あと二日', art: [CIVILIAN_ART.lotus, CIVILIAN_ART.poppy, CIVILIAN_ART.acorn] }),
      narration('保管庫から戻った三人は、丸一日の待機を命じられた。\nその命令を破って、本当のことを伝えにここへ来た。'),
      dialogue('tsukimi', 'normal', '卵は、空から来たんじゃありません。\n白蓮保管庫で眠っていた、旧人類の体から生まれました。'),
      dialogue('tsukimi', 'sad', '私たちも、同じ保管庫で作られました。\n……同じ体です。'),
      narration('避難所の葉が、一斉に閉じた。\n誰かの移動槽が、軋むほど後ずさった。', { art: [CIVILIAN_ART.ash, CIVILIAN_ART.dandelion, CIVILIAN_ART.burdock] }),
      dialogue('hirugi', 'normal', '本当よ。シラユリの記録にも残ってる。\n卵は、あの白い塔から来た。'),
      dialogue('keshi', 'normal', 'やっぱり。あの形は、奪う形なのよ。'),
      dialogue('minari', 'normal', 'ケシ——'),
      dialogue('keshi', 'normal', '言わせて。この子たちは知らないんでしょう。\n旧人類が、なにをしたのか。'),
      dialogue('keshi', 'normal', '水を奪い合って、森を焼いて、逃げる相手を追いかけた。\n足があったから、どこまでも奪いに行けた。'),
      dialogue('keshi', 'normal', 'だから私たちの祖先は、根を張ったの。\n動けなければ、奪いに行けない。', { close: true }),
      narration('戸口の外で、三人は立ったまま聞いていた。\n誰も、一歩も前に出なかった。'),
      dialogue('kiichigo', 'sad', '……そっか。だから、足が怖いんだ。'),
      dialogue('kunugi', 'normal', 'でも、この人たちは奪ってないよ。\n水、運んでくれたもん。'),
      dialogue('keshi', 'normal', '今はね。体が覚えてることは、いつか出てくる。\n卵を食べて傷が治る体なんでしょう？'),
      narration('キイチゴが何か言いかけて、やめた。\n言い返せる言葉が、どこにもなかった。'),
      dialogue('minari', 'normal', '……三人とも、今夜は区の外で待機してください。\nそれが、皆の答えです。'),
      dialogue('akame', 'normal', '分かった。戸口からも離れる。'),
      narration('そのとき、地面が低く脈打った。\n防除線の外から、卵の群れが避難所へ向かってくる。'),
      dialogue('rindou', 'normal', '卵が集まってきてる。\n水と……三人のいる場所に。'),
      dialogue('keshi', 'normal', 'ほら。……あなたたちが、連れてきたのよ。'),
      narration('避難所の誰も、逃げられない。\n根を張った体は、戸口から一歩も動けない。'),
      dialogue('enju', 'normal', '撤退しろ。お前たちが離れれば、卵も散る。\n白蓮へ向かう三人を、ここで削るわけにいかない。'),
      dialogue('tsukimi', 'angry', '離れたら、散る前にここが呑まれる。'),
      dialogue('enju', 'normal', '順番だ。二日後の数千人と、今夜の数十人。'),
      dialogue(selected, 'angry', departures[selected], { close: true }),
      dialogue('enju', 'normal', '……四分だ。三分で、群れの母卵が姿を見せる。\n残りの一分で仕留めろ。'),
      dialogue(guard, 'normal', 'こっちは戸口を固める。\n避難所には、一匹も入れない。'),
      narration('避難所へ迫る卵を減らし、三分後に現れる母卵を破壊せよ。\n戸口の向こうには、動けない人々がいる。', { label: '作戦目標 ／ 避難所を守る', blackout: true })
    ]
  };
}

function createRootsAftermath(characterId) {
  const selected = soldierId(characterId);
  const returns = {
    tsukimi: '避難所は無事。……誰も、怪我してない？',
    akame: '一匹も入れてない。……みんな、無事？',
    kiichigo: '全部片づけた！　……中、大丈夫？'
  };
  const answers = {
    tsukimi: '足があるから、ここまで来られたんです。',
    akame: '足は、来るために使った。',
    kiichigo: '足あるもん。逃げるのも、戻ってくるのも、\n自分で選べるの。'
  };
  return {
    title: 'CHAPTER 04 — AFTER', subtitle: '渇くことなら',
    lines: [
      narration('母卵が砕けると、群れは潮が引くように散っていった。\n避難所の戸口には、黒い殻が一つも届いていない。', { label: 'ハスノ区・避難所前 ／ 夜明け前' }),
      dialogue(selected, 'normal', returns[selected]),
      dialogue('minari', 'normal', '全員、無事です。\n……あなたたちの声が、ずっと戸口の外から聞こえていました。'),
      narration('戸口の内側で、ケシの葉が揺れた。\n閉じたまま、こちらを向いている。', { art: CIVILIAN_ART.poppy }),
      dialogue('keshi', 'normal', '……どうして、逃げなかったの。\n足があるのに。'),
      dialogue(selected, 'normal', answers[selected], { close: true }),
      narration('ケシは長いあいだ黙っていた。\nやがて、葉が一枚だけ、戸口のほうへ開いた。'),
      dialogue('rindou', 'normal', 'ねえ。三人の体、調べさせて。\nずっと、気になってたの。'),
      narration('リンドウの殻の内側で、計測の光が三人をなぞった。\nしばらくして、光が止まる。', { art: CIVILIAN_ART.ginkgo }),
      dialogue('rindou', 'normal', '卵と同じ成分が、前より減ってる。\n水を飲んで、食べて、眠って——その分だけ。'),
      dialogue('rindou', 'normal', '少しずつ、あなたたち自身の体になってるの。\n白蓮が壊れても、残れるかもしれない。'),
      dialogue('kiichigo', 'surprise', '「かもしれない」って、何割くらい？'),
      dialogue('rindou', 'normal', '……五分五分。'),
      dialogue('kiichigo', 'smile', '半分あるなら、けっこう多いじゃん。'),
      narration('笑ったのはキイチゴだけだった。\nそれでも、さっきより空気は軽かった。'),
      dialogue('rindou', 'normal', 'それと、白蓮は水を吸って咲くの。\n保管庫の水は、ハスノ区のポンプから引かれてる。'),
      dialogue('tsukimi', 'surprise', '……ポンプを止めれば、白蓮は弱る？'),
      dialogue('minari', 'normal', '四つの区の水を、孵化の夜まで止めることになります。\n根を張った者には、長すぎる一日です。'),
      narration('避難所が静まり返った。\n水のない一日がどれほど苦しいか、皆が知っていた。'),
      dialogue('keshi', 'normal', '止めなさい。'),
      dialogue('minari', 'normal', 'ケシ？'),
      dialogue('keshi', 'normal', '動けない私たちにも、渇くことならできる。\n……奪わないって、そういうことでしょう。', { close: true }),
      dialogue('kunugi', 'normal', 'ぼくも。がまんできるよ。'),
      narration('一枚、また一枚と、葉が開いていった。\n賛成の印だと、三人にもすぐに分かった。', { art: [CIVILIAN_ART.ash, CIVILIAN_ART.dandelion, CIVILIAN_ART.milkweed] }),
      dialogue('enju', 'normal', 'ポンプを止めるのか。\n……孵化の前に、市民のほうが持たないかもしれないぞ。'),
      dialogue('minari', 'normal', '持たせます。私たちが決めたことですから。'),
      narration('夜明け前、四つの区のポンプが止まった。\nハスノ区から、水の音が消えた。', { blackout: true }),
      narration('一斉孵化まで、あと一日。\n静かすぎる朝だった。', { blackout: true })
    ]
  };
}

// 第5章：水を止めた代償で、古株のニレが枯れかける。水路を使わず、旧人類の貯水池から歩いて水を運ぶ。
// 「奪いに行く足」が「運ぶ足」になる章。エンジュが三人を作った本当の理由を明かす。
function createReservoirBriefing(characterId) {
  const selected = soldierId(characterId);
  const departures = {
    tsukimi: '水場は私が空ける。\n二人は槽を並べて、汲めるだけ汲んで。',
    akame: '貯水池は私が守る。\n……一滴もこぼさずに帰ろう。',
    kiichigo: '水場の掃除は任せて。\nいちばん速いのが、いちばん多く運ぶからね。'
  };
  return {
    title: 'CHAPTER 05', subtitle: '水を運ぶ足',
    lines: [
      narration('ポンプが止まって半日。\n避難所は、乾いた葉の擦れる音で満ちていた。', { label: 'ハスノ区・仮設避難所 ／ 一斉孵化まで、あと一日' }),
      narration('奥の根鉢で、年老いたニレの葉が、\n端から茶色く丸まり始めている。', { art: CIVILIAN_ART.elm }),
      dialogue('minari', 'normal', 'ニレは、この区でいちばん古い株です。\n……夜までは、もたないかもしれない。'),
      dialogue('keshi', 'normal', '分かってて決めたことよ。\n……止めなさいって言ったのは、私なんだから。'),
      narration('ケシの声は、いつもより細かった。'),
      dialogue('kunugi', 'normal', 'ニレおばあちゃん、ずっと寝てる。'),
      dialogue('rindou', 'normal', '水路の水は使えない。\n流せば、白蓮まで届いてしまう。'),
      dialogue('tsukimi', 'normal', '水路を通らない水なら？'),
      dialogue('hirugi', 'normal', '防除線の外に、旧人類の古い貯水池がある。\nどこの水路にも繋がってない。……でも、卵の巣の真ん中よ。'),
      dialogue('enju', 'normal', '却下だ。孵化の前日に、三人を削るわけにいかない。'),
      dialogue('akame', 'normal', '行く。歩いて汲んで、歩いて運ぶ。\n水路が使えないなら、足を使えばいい。'),
      dialogue('keshi', 'normal', '……旧人類の足は、水を奪いに行く足だった。'),
      dialogue('kiichigo', 'smile', 'じゃ、私たちのは、水を返しに行く足ってことで。'),
      narration('ケシは答えなかった。\nただ、ニレの根鉢のほうへ、葉を一枚傾けた。'),
      dialogue('enju', 'normal', '……四分だけだ。三分で、貯水池の母卵が浮上する。\n残りの一分で仕留めて、汲んで、帰れ。'),
      dialogue('minari', 'normal', '空の移動槽を、ありったけ用意します。\n水を入れて運んでください。'),
      narration('貯水池は、乾いた夕日の色をしていた。\n水面のあちこちで、黒い卵が喉を鳴らすように脈打っている。', { label: '防除線の外・旧貯水池' }),
      dialogue(selected, 'normal', departures[selected], { close: true }),
      narration('貯水池を占拠する卵を減らし、三分後に現れる母卵を破壊せよ。\n水を汲み終えるまで、水辺を守り抜け。', { label: '作戦目標 ／ 水を持ち帰る', blackout: true })
    ]
  };
}

function createReservoirAftermath(characterId) {
  const selected = soldierId(characterId);
  const returns = {
    tsukimi: '水、きれいになった。……汲もう。',
    akame: '片づいた。槽を持ってきて。',
    kiichigo: '片づいた！　ねえ、この水、すごく冷たい。'
  };
  const answers = {
    tsukimi: '運ぶ足です。……今日からは。',
    akame: '足は、何に使うかだと思う。',
    kiichigo: 'でしょ。……あ、今の、褒められた？'
  };
  return {
    title: 'CHAPTER 05 — AFTER', subtitle: '奪わない足',
    lines: [
      narration('母卵が沈み、水面の脈動が止んだ。\n濁りが引くと、底まで見える水が残っていた。', { label: '旧貯水池 ／ 作戦終了' }),
      dialogue(selected, 'normal', returns[selected]),
      narration('三人は、移動槽に水を満たして背負った。\n帰り道は長く、槽は重かった。'),
      dialogue('kiichigo', 'normal', 'ねえ。鳥になったら、すぐ着くのにね。'),
      dialogue('akame', 'normal', '鳥だと、槽を持てない。'),
      dialogue('kiichigo', 'smile', '知ってる。言ってみただけ。'),
      narration('避難所に着くころには、日が沈みかけていた。\nニレの葉は、もう半分以上が丸まっている。', { label: 'ハスノ区・仮設避難所 ／ 夕方', art: CIVILIAN_ART.elm }),
      dialogue('minari', 'normal', 'ニレの根鉢へ。……ゆっくり、少しずつ。'),
      narration('戸口の外から、管を伸ばす。\n乾いた土が、水を吸う音がした。'),
      narration('しばらくして、ニレの葉が一枚、ゆっくりと開いた。', { close: true }),
      dialogue('kunugi', 'normal', 'ニレおばあちゃん、起きた！'),
      dialogue('keshi', 'normal', '……奪う足じゃ、なかったのね。'),
      dialogue(selected, 'smile', answers[selected]),
      dialogue('keshi', 'normal', '褒めてない。……水の分の、礼を言っただけ。'),
      narration('回線が鳴った。エンジュだった。', { blackout: true }),
      dialogue('enju', 'normal', '勝手な真似を。……白蓮は、お前たちと一緒に壊すはずだった。\nそのために、作った。'),
      narration('回線の向こうの声が、初めて揺れていた。'),
      dialogue('enju', 'normal', '名前を付けたのは、間違いだった。\n名前のあるものは、燃やせなくなる。'),
      dialogue('akame', 'normal', '間違いじゃない。\nその名前で、ここの人たちに呼ばれたい。'),
      dialogue('tsukimi', 'normal', 'エンジュ。順番は、私たちが決める。\n全員で帰る順番を。……あなたも入れて。'),
      dialogue('enju', 'normal', '……私は根を張っている。保管庫からは動けない。'),
      dialogue('kiichigo', 'smile', '知ってる。ちょうど移動槽が一つ空いたし、\nそれで迎えに行くね。'),
      dialogue('minari', 'normal', 'いちばん大きいのにしてください。\n槐の根なら、三人がかりでも重いですよ。'),
      narration('日が沈む。\n一斉孵化の夜が、来る。', { blackout: true })
    ]
  };
}

// 最終章：水を断たれた白蓮を砕く。エンディングで三人は鳥の形を失い、戸口の内側へ入る。
function createFinalBriefing(characterId) {
  const selected = soldierId(characterId);
  const departures = {
    tsukimi: '行こう。三人で行って、四人で帰る。',
    akame: '一人では行かない。\n……でも、最初の一撃は私にちょうだい。',
    kiichigo: 'いちばん速いのが先頭。\n……で、いちばん先に帰ってくる。約束。'
  };
  return {
    title: 'FINAL CHAPTER', subtitle: '白蓮',
    lines: [
      narration('水を断たれた保管庫は、ひび割れた貝殻のように乾いていた。\nその中心で、巨大な蕾がゆっくりと開きかけている。', { label: '白蓮保管庫・最深部 ／ 一斉孵化の夜', background: INVASION }),
      dialogue('enju', 'normal', '白蓮だ。乾いても、まだ咲こうとしている。\n咲けば、街じゅうの卵が一斉に孵る。', { background: INVASION }),
      dialogue('kiichigo', 'surprise', '近くで見ると、ほんとに花だね。\n……きれいなのが、いちばん嫌。', { background: INVASION }),
      dialogue('akame', 'normal', '移動槽は、制御室の前に置いてきた。\n帰りに、エンジュを積む。'),
      dialogue('enju', 'normal', '私は最後でいい。お前たちが先に——'),
      dialogue('tsukimi', 'smile', 'それは、もう決めたでしょ。'),
      narration('通信に、ハスノ区の声が順に重なっていく。\nミナリ、リンドウ、ヒルギ、クヌギ。そして、ケシ。'),
      dialogue('minari', 'normal', 'ハスノ区、ポンプ停止を維持。ニレも持ちこたえてる。\n……朝までなら、もちます。'),
      dialogue('keshi', 'normal', '戸口は開けておくから。\n……さっさと帰ってきなさい。'),
      dialogue('kunugi', 'normal', 'がんばって！\nツキミ、アカメ、キイチゴ！'),
      narration('市民に名前を呼ばれたのは、初めてだった。', { blackout: true }),
      dialogue('kiichigo', 'smile', '……今の、録音しとけばよかった。'),
      dialogue('enju', 'normal', '白蓮が殻を破るまで、三分。\n残る一分で、核を砕け。それで終わる。'),
      dialogue(selected, 'smile', departures[selected], { close: true }),
      narration('増え続ける卵を退け、三分後に姿を現す白蓮の核を破壊せよ。\n四分を越えれば、白蓮が咲く。', { label: '最終目標 ／ 白蓮を砕く', blackout: true })
    ]
  };
}

function createEnding(characterId) {
  const selected = soldierId(characterId);
  const waker = otherThan(selected, 'kiichigo', 'akame');
  const returns = {
    tsukimi: '……止まった。卵が、全部。',
    akame: '終わった。……みんな、いる？',
    kiichigo: 'やった……？　ねえ、やったよね？'
  };
  const survivals = {
    tsukimi: '……五分五分、勝ったね。',
    akame: '……生きてる。三人とも。',
    kiichigo: '……半分って、けっこう多かったでしょ。'
  };
  const promises = {
    tsukimi: 'はい。……手なら、六本あります。',
    akame: '任せて。根には触らないように蒔くから。',
    kiichigo: '蒔く蒔く。……あ、つまみ食いはしないから。'
  };
  return {
    title: 'ENDING', subtitle: '根のない朝',
    lines: [
      narration('核が砕けた瞬間、白い花弁が一斉に散った。\n保管庫じゅうの卵から、脈動が消えていく。', { label: '白蓮保管庫・最深部', background: INVASION }),
      dialogue(selected, 'surprise', returns[selected], { background: INVASION }),
      narration('次の瞬間、胸の奥が焼けるように熱くなった。\n体の中の何かが、白蓮と一緒に剥がれていく。', { background: INVASION }),
      narration('膝をついた。\n視界が白く、遠くなっていく——', { blackout: true }),
      dialogue(waker, 'surprise', '起きて！　ねえ、起きてってば！'),
      narration('目を開けると、二人の顔があった。\n三人とも、まだ、ここにいた。'),
      dialogue(selected, 'smile', survivals[selected], { close: true }),
      narration('立ち上がりながら、鳥の形を思い浮かべる。\n何も起きなかった。体は、人の形のままだった。'),
      dialogue('kiichigo', 'surprise', 'あれ、飛べない。\n……卵の分、全部なくなったんだ。'),
      dialogue('akame', 'smile', 'じゃあ、歩いて帰ろう。荷物もあるし。'),
      narration('制御室で、槐の根を土ごと掘り起こす。\n二百年張り続けた根を、三人がかりで移動槽へ移した。', { label: '白蓮保管庫・制御室' }),
      dialogue('enju', 'normal', '……乱暴だな。'),
      dialogue('tsukimi', 'smile', '根には触らないように、気をつけてます。'),
      dialogue('enju', 'normal', '運んでいいとは、言っていない。'),
      dialogue('kiichigo', 'smile', 'じゃ、今聞くね。運んでいい？'),
      narration('長い沈黙のあと、通信機ではなく、幹そのものから声がした。'),
      dialogue('enju', 'normal', '……頼む。', { close: true }),
      narration('ハスノ区に着いたのは、日が昇りきってからだった。\nポンプが動き出し、水路に音が戻ってくる。', { label: 'ハスノ区・朝 ／ 一斉孵化の朝' }),
      narration('避難所の戸口は、開いたままだった。', { art: [CIVILIAN_ART.lotus, CIVILIAN_ART.poppy, CIVILIAN_ART.acorn] }),
      dialogue('keshi', 'normal', '遅い。'),
      dialogue('keshi', 'normal', '……靴は脱いで。泥を持ち込まないで。'),
      narration('三人は顔を見合わせてから、靴を脱いだ。\n戸口の線を越えるのに、少しだけ時間がかかった。'),
      dialogue('kunugi', 'normal', 'おかえり！\nツキミ、アカメ、キイチゴ！'),
      dialogue('hirugi', 'normal', '……おかえり。\n今日は、叫ばないわ。'),
      dialogue('minari', 'normal', '水は、もう流れています。ニレも無事です。\n……あなたたちの分も、用意してありますよ。'),
      dialogue('kiichigo', 'smile', 'お腹すいた。卵じゃないもの、食べたい。'),
      dialogue('minari', 'normal', 'パンなら。……温室を建て直せば、いつか苗も。'),
      narration('リンドウが、種の箱を卓に置いた。\nハスノ区の温室から、一つだけ持ち出せた箱だった。', { art: CIVILIAN_ART.ginkgo }),
      dialogue('rindou', 'normal', '春に蒔くの。手伝って。\n……手のある人は、多いほうがいいから。'),
      dialogue(selected, 'smile', promises[selected], { close: true }),
      narration('戸口の脇で、エンジュの葉が朝日を受けていた。\nその根は、ハスノ区の土に下ろされるのを待っている。'),
      narration('根を持たない三人は、その日、初めて屋根の下で眠った。', { blackout: true }),
      narration('一斉孵化の朝は、来なかった。\n来たのは、ただの朝だった。', { label: 'EPILOGUE', blackout: true })
    ]
  };
}
