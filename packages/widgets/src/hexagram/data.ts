/** 六十四卦：序号 1–64，上卦/下卦 0–7 = 乾兑离震巽坎艮坤 */
export type Hexagram = {
  readonly index: number
  readonly name: string
  readonly upper: number
  readonly lower: number
  readonly judgment: string
  readonly image: string
  readonly note: string
}

const TRIGRAMS = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"] as const

/** King Wen order simplified entries — judgment/image are traditional short forms */
export const HEXAGRAMS: readonly Hexagram[] = [
  { index: 1, name: "乾", upper: 0, lower: 0, judgment: "元亨利贞。", image: "天行健，君子以自强不息。", note: "纯阳刚健，宜进取持正。" },
  { index: 2, name: "坤", upper: 7, lower: 7, judgment: "元亨，利牝马之贞。", image: "地势坤，君子以厚德载物。", note: "纯阴柔顺，宜承载守成。" },
  { index: 3, name: "屯", upper: 5, lower: 3, judgment: "元亨利贞，勿用有攸往，利建侯。", image: "云雷，屯；君子以经纶。", note: "始生艰难，宜经营奠基。" },
  { index: 4, name: "蒙", upper: 7, lower: 5, judgment: "亨。匪我求童蒙，童蒙求我。", image: "山下出泉，蒙；君子以果行育德。", note: "蒙昧待启，宜启蒙求学。" },
  { index: 5, name: "需", upper: 5, lower: 0, judgment: "有孚，光亨，贞吉。利涉大川。", image: "云上于天，需；君子以饮食宴乐。", note: "待时而动，宜蓄养耐心。" },
  { index: 6, name: "讼", upper: 0, lower: 5, judgment: "有孚，窒。惕中吉。终凶。", image: "天与水违行，讼；君子以作事谋始。", note: "争讼宜止，慎始避终凶。" },
  { index: 7, name: "师", upper: 7, lower: 5, judgment: "贞，丈人吉，无咎。", image: "地中有水，师；君子以容民畜众。", note: "众行有律，宜权威正道。" },
  { index: 8, name: "比", upper: 5, lower: 7, judgment: "吉。原筮元永贞，无咎。", image: "地上有水，比；先王以建万国，亲诸侯。", note: "亲附协同，宜择善而从。" },
  { index: 9, name: "小畜", upper: 4, lower: 0, judgment: "亨。密云不雨，自我西郊。", image: "风行天上，小畜；君子以懿文德。", note: "小有积蓄，密云待雨。" },
  { index: 10, name: "履", upper: 0, lower: 1, judgment: "履虎尾，不咥人，亨。", image: "上天下泽，履；君子以辨上下，定民志。", note: "如履薄冰，宜礼慎而行。" },
  { index: 11, name: "泰", upper: 7, lower: 0, judgment: "小往大来，吉亨。", image: "天地交，泰；后以财成天地之道。", note: "通泰交泰，宜把握时机。" },
  { index: 12, name: "否", upper: 0, lower: 7, judgment: "否之匪人，不利君子贞，大往小来。", image: "天地不交，否；君子以俭德辟难。", note: "闭塞不通，宜守静待变。" },
  { index: 13, name: "同人", upper: 0, lower: 2, judgment: "同人于野，亨。利涉大川，利君子贞。", image: "天与火，同人；君子以类族辨物。", note: "与人同道，宜开阔无私。" },
  { index: 14, name: "大有", upper: 2, lower: 0, judgment: "元亨。", image: "火在天上，大有；君子以遏恶扬善。", note: "大有收获，宜抑恶扬善。" },
  { index: 15, name: "谦", upper: 7, lower: 6, judgment: "亨，君子有终。", image: "地中有山，谦；君子以裒多益寡。", note: "谦逊有终，宜损有余补不足。" },
  { index: 16, name: "豫", upper: 3, lower: 7, judgment: "利建侯行师。", image: "雷出地奋，豫；先王以作乐崇德。", note: "和乐顺动，宜鼓舞众志。" },
  { index: 17, name: "随", upper: 1, lower: 3, judgment: "元亨利贞，无咎。", image: "泽中有雷，随；君子以向晦入宴息。", note: "随时而动，宜顺应时势。" },
  { index: 18, name: "蛊", upper: 6, lower: 4, judgment: "元亨，利涉大川。先甲三日，后甲三日。", image: "山下有风，蛊；君子以振民育德。", note: "振敝起衰，宜整治革新。" },
  { index: 19, name: "临", upper: 7, lower: 1, judgment: "元亨利贞。至于八月有凶。", image: "泽上有地，临；君子以教思无穷。", note: "临下以德，宜教养有方。" },
  { index: 20, name: "观", upper: 4, lower: 7, judgment: "盥而不荐，有孚颙若。", image: "风行地上，观；先王以省方观民设教。", note: "观示感化，宜省察示范。" },
  { index: 21, name: "噬嗑", upper: 2, lower: 3, judgment: "亨。利用狱。", image: "雷电噬嗑；先王以明罚敕法。", note: "咬合决断，宜明法正刑。" },
  { index: 22, name: "贲", upper: 6, lower: 2, judgment: "亨。小利有攸往。", image: "山下有火，贲；君子以明庶政，无敢折狱。", note: "文饰有度，宜质胜于文。" },
  { index: 23, name: "剥", upper: 6, lower: 7, judgment: "不利有攸往。", image: "山附于地，剥；上以厚下，安宅。", note: "剥落将尽，宜厚下安居。" },
  { index: 24, name: "复", upper: 7, lower: 3, judgment: "亨。出入无疾，朋来无咎。", image: "雷在地中，复；先王以至日闭关。", note: "一阳来复，宜静养复元。" },
  { index: 25, name: "无妄", upper: 0, lower: 3, judgment: "元亨利贞。其匪正有眚，不利有攸往。", image: "天下雷行，物与无妄；先王以茂对时，育万物。", note: "无妄真诚，宜守正勿妄。" },
  { index: 26, name: "大畜", upper: 6, lower: 0, judgment: "利贞，不家食吉，利涉大川。", image: "天在山中，大畜；君子以多识前言往行。", note: "大有畜积，宜博学笃行。" },
  { index: 27, name: "颐", upper: 6, lower: 3, judgment: "贞吉。观颐，自求口实。", image: "山下有雷，颐；君子以慎言语，节饮食。", note: "颐养得正，宜慎言节食。" },
  { index: 28, name: "大过", upper: 1, lower: 4, judgment: "栋桡，利有攸往，亨。", image: "泽灭木，大过；君子以独立不惧。", note: "非常之时，宜独立担当。" },
  { index: 29, name: "坎", upper: 5, lower: 5, judgment: "习坎，有孚，维心亨，行有尚。", image: "水洊至，习坎；君子以常德行，习教事。", note: "重险有孚，宜习德守信。" },
  { index: 30, name: "离", upper: 2, lower: 2, judgment: "利贞，亨。畜牝牛，吉。", image: "明两作，离；大人以继明照于四方。", note: "附丽光明，宜柔顺文明。" },
  { index: 31, name: "咸", upper: 1, lower: 6, judgment: "亨，利贞，取女吉。", image: "山上有泽，咸；君子以虚受人。", note: "感应相通，宜虚心接纳。" },
  { index: 32, name: "恒", upper: 3, lower: 4, judgment: "亨，无咎，利贞，利有攸往。", image: "雷风，恒；君子以立不易方。", note: "恒久有常，宜守正不移。" },
  { index: 33, name: "遁", upper: 0, lower: 6, judgment: "亨，小利贞。", image: "天下有山，遁；君子以远小人，不恶而严。", note: "退避得时，宜远害全身。" },
  { index: 34, name: "大壮", upper: 3, lower: 0, judgment: "利贞。", image: "雷在天上，大壮；君子以非礼弗履。", note: "强盛宜正，非礼勿行。" },
  { index: 35, name: "晋", upper: 2, lower: 7, judgment: "康侯用锡马蕃庶，昼日三接。", image: "明出地上，晋；君子以自昭明德。", note: "明出地上，宜昭德进取。" },
  { index: 36, name: "明夷", upper: 7, lower: 2, judgment: "利艰贞。", image: "明入地中，明夷；君子以莅众，用晦而明。", note: "明伤于下，宜晦而守正。" },
  { index: 37, name: "家人", upper: 4, lower: 2, judgment: "利女贞。", image: "风自火出，家人；君子以言有物，而行有恒。", note: "家道正位，宜言信行恒。" },
  { index: 38, name: "睽", upper: 2, lower: 1, judgment: "小事吉。", image: "上火下泽，睽；君子以同而异。", note: "乖离之中，宜求同存异。" },
  { index: 39, name: "蹇", upper: 5, lower: 6, judgment: "利西南，不利东北；利见大人，贞吉。", image: "山上有水，蹇；君子以反身修德。", note: "蹇难当前，宜反身修德。" },
  { index: 40, name: "解", upper: 3, lower: 5, judgment: "利西南，无所往，其来复吉。", image: "雷雨作，解；君子以赦过宥罪。", note: "舒缓解散，宜赦过宽宥。" },
  { index: 41, name: "损", upper: 6, lower: 1, judgment: "有孚，元吉，无咎，可贞，利有攸往。", image: "山下有泽，损；君子以惩忿窒欲。", note: "损下益上，宜惩忿窒欲。" },
  { index: 42, name: "益", upper: 4, lower: 3, judgment: "利有攸往，利涉大川。", image: "风雷，益；君子以见善则迁，有过则改。", note: "损上益下，宜迁善改过。" },
  { index: 43, name: "夬", upper: 1, lower: 0, judgment: "扬于王庭，孚号，有厉，告自邑，不利即戎，利有攸往。", image: "泽上于天，夬；君子以施禄及下，居德则忌。", note: "决断扬善，宜刚而能和。" },
  { index: 44, name: "姤", upper: 0, lower: 4, judgment: "女壮，勿用取女。", image: "天下有风，姤；后以施命诰四方。", note: "不期而遇，宜慎始防微。" },
  { index: 45, name: "萃", upper: 1, lower: 7, judgment: "亨。王假有庙，利见大人，亨，利贞。", image: "泽上于地，萃；君子以除戎器，戒不虞。", note: "会聚有时，宜备而不虞。" },
  { index: 46, name: "升", upper: 7, lower: 4, judgment: "元亨，用见大人，勿恤，南征吉。", image: "地中生木，升；君子以顺德，积小以高大。", note: "积小高大，宜顺德渐进。" },
  { index: 47, name: "困", upper: 1, lower: 5, judgment: "亨，贞，大人吉，无咎，有言不信。", image: "泽无水，困；君子以致命遂志。", note: "困穷见节，宜守志致命。" },
  { index: 48, name: "井", upper: 5, lower: 4, judgment: "改邑不改井，无丧无得，往来井井。", image: "木上有水，井；君子以劳民劝相。", note: "井养不穷，宜守常修治。" },
  { index: 49, name: "革", upper: 1, lower: 2, judgment: "己日乃孚。元亨利贞，悔亡。", image: "泽中有火，革；君子以治历明时。", note: "变革有时，宜信而后动。" },
  { index: 50, name: "鼎", upper: 2, lower: 4, judgment: "元吉，亨。", image: "木上有火，鼎；君子以正位凝命。", note: "鼎新凝命，宜正位养贤。" },
  { index: 51, name: "震", upper: 3, lower: 3, judgment: "亨。震来虩虩，笑言哑哑。", image: "洊雷，震；君子以恐惧修省。", note: "震动警醒，宜恐惧修省。" },
  { index: 52, name: "艮", upper: 6, lower: 6, judgment: "艮其背，不获其身，行其庭，不见其人，无咎。", image: "兼山，艮；君子以思不出其位。", note: "止于当止，宜思不出位。" },
  { index: 53, name: "渐", upper: 4, lower: 6, judgment: "女归吉，利贞。", image: "山上有木，渐；君子以居贤德，善俗。", note: "渐进有序，宜居德善俗。" },
  { index: 54, name: "归妹", upper: 3, lower: 1, judgment: "征凶，无攸利。", image: "泽上有雷，归妹；君子以永终知敝。", note: "归妹失位，宜慎终知敝。" },
  { index: 55, name: "丰", upper: 3, lower: 2, judgment: "亨。王假之，勿忧，宜日中。", image: "雷电皆至，丰；君子以折狱致刑。", note: "丰盛盛大，宜持中防盈。" },
  { index: 56, name: "旅", upper: 2, lower: 6, judgment: "小亨，旅贞吉。", image: "山上有火，旅；君子以明慎用刑，而不留狱。", note: "行旅寄寓，宜柔顺持正。" },
  { index: 57, name: "巽", upper: 4, lower: 4, judgment: "小亨，利有攸往，利见大人。", image: "随风，巽；君子以申命行事。", note: "巽顺入微，宜申命行事。" },
  { index: 58, name: "兑", upper: 1, lower: 1, judgment: "亨，利贞。", image: "丽泽，兑；君子以朋友讲习。", note: "兑悦相丽，宜朋友讲习。" },
  { index: 59, name: "涣", upper: 4, lower: 5, judgment: "亨。王假有庙，利涉大川，利贞。", image: "风行水上，涣；先王以享于帝立庙。", note: "离散可聚，宜立本济险。" },
  { index: 60, name: "节", upper: 5, lower: 1, judgment: "亨。苦节不可贞。", image: "泽上有水，节；君子以制数度，议德行。", note: "节制有度，忌苦节过中。" },
  { index: 61, name: "中孚", upper: 4, lower: 1, judgment: "豚鱼吉，利涉大川，利贞。", image: "泽上有风，中孚；君子以议狱缓死。", note: "中心诚信，宜感通济险。" },
  { index: 62, name: "小过", upper: 3, lower: 6, judgment: "亨，利贞，可小事，不可大事。", image: "山上有雷，小过；君子以行过乎恭。", note: "小有过越，宜恭慎小事。" },
  { index: 63, name: "既济", upper: 5, lower: 2, judgment: "亨，小利贞，初吉终乱。", image: "水在火上，既济；君子以思患而豫防之。", note: "事已成济，宜思患预防。" },
  { index: 64, name: "未济", upper: 2, lower: 5, judgment: "亨，小狐汔济，濡其尾，无攸利。", image: "火在水上，未济；君子以慎辨物居方。", note: "事未完成，宜慎辨慎行。" },
] as const

export function trigramName(i: number): string {
  return TRIGRAMS[i] ?? "?"
}

export function findByTrigrams(upper: number, lower: number): Hexagram | undefined {
  return HEXAGRAMS.find((h) => h.upper === upper && h.lower === lower)
}

export function findByIndex(index: number): Hexagram | undefined {
  return HEXAGRAMS.find((h) => h.index === index)
}

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function randomHexagram(rng: () => number = Math.random): Hexagram {
  const i = Math.floor(rng() * 64)
  const h = HEXAGRAMS[i]
  if (!h) return HEXAGRAMS[0]!
  return h
}
