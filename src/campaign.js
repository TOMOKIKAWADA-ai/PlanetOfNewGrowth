// The later arenas reuse the existing grass and flooded maps until bespoke levels are ready.
export const CAMPAIGN_STAGES = Object.freeze([
  { id: 1, title: '守る順番', place: 'ハスノ区・送水ポンプ', terrain: 'grass', worldColor: 0x15201d, groundTint: 0xffffff, objective: '水と六人の避難路を守る', bossScale: 1, extraEnemies: 0, result: '六人を救出し、ハスノ区の水を守った。\n東の温室は失われた。' },
  { id: 2, title: '花の隣で', place: '深淵域・水没温室', terrain: 'water', worldColor: 0x173a43, groundTint: 0xffffff, objective: '行方不明の兵士と花々を守り、暴走した母卵を止める', bossScale: 1.05, extraEnemies: 0, result: 'サヨとユラの無事を確認したが、中央は二人を追討対象にした。\n三人も中央から遠ざけられた。' },
  { id: 3, title: '赤い判定', place: '外縁区・監査所', terrain: 'grass', worldColor: 0x322a22, groundTint: 0xbfb399, objective: 'クーデターの原命令と花々の研究記録を確保する', bossScale: 1.1, extraEnemies: 1, result: '監査所の母卵を破壊し、エンジュの原命令を確保した。\n深淵の花々への旧人類遺伝子移植が明らかになった。' },
  { id: 4, title: '焼却線', place: '外縁区・水没した防除路', terrain: 'water', worldColor: 0x263b3b, groundTint: 0xffffff, objective: '市民と和解した花々を守り、全域焼却を止める', bossScale: 1.15, extraEnemies: 1, result: '市民と和解した花々の退路を守り、焼却を一時停止した。\nエンジュが改造した巨大母卵は、まだ動いている。' },
  { id: 5, title: '防除線の向こう側', place: '中央根網・巨大母卵', terrain: 'grass', worldColor: 0x302124, groundTint: 0xbba6a0, objective: '市民と和解した花々を守り、再生炉を止める', bossScale: 1.25, extraEnemies: 2, result: '巨大母卵の再生炉は止まり、全域焼却も中止された。\n市民と和解した花々を守り、エンジュのクーデターを終わらせた。' }
]);

export const FINAL_STAGE_ID = CAMPAIGN_STAGES.at(-1).id;
export const getCampaignStage = id => CAMPAIGN_STAGES.find(stage => stage.id === Number(id)) ?? CAMPAIGN_STAGES[0];
export const getNextCampaignStage = id => CAMPAIGN_STAGES.find(stage => stage.id === Number(id) + 1) ?? null;
