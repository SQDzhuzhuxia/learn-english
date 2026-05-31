export type PronunciationFocus = {
  id: string;
  label: string;
  sound: string;
  words: string[];
  tip: string;
};

type PronunciationRule = {
  id: string;
  label: string;
  sound: string;
  tip: string;
  match: (word: string) => boolean;
};

const CONSONANT_CLUSTER_PATTERN = /(?:^|[aeiou])(?:str|spr|thr|spl|scr|sk|sp|st|tr|dr|pr|pl|cl|fl|gr|br|fr|sl)/;
const FINAL_CONSONANT_PATTERN = /(?:[bcdfghjklmnpqrstvwxyz]|th|ck|ks|ts|ds)$/;

const RULES: PronunciationRule[] = [
  {
    id: "th",
    label: "th 舌尖音",
    sound: "/θ/ /ð/",
    tip: "舌尖轻轻放在上下牙之间，先慢慢送气，不要读成 s、z 或 d。",
    match: (word) => word.includes("th")
  },
  {
    id: "v-w",
    label: "v / w 区分",
    sound: "/v/ /w/",
    tip: "v 要让上牙轻触下唇，w 是圆唇滑出，两个音不要混在一起。",
    match: (word) => /[vw]/.test(word)
  },
  {
    id: "r-l",
    label: "r / l 区分",
    sound: "/r/ /l/",
    tip: "l 舌尖抵上齿龈，r 舌头后缩不碰上齿龈，先夸张区分再提速。",
    match: (word) => /[rl]/.test(word)
  },
  {
    id: "final-consonant",
    label: "词尾辅音",
    sound: "final consonants",
    tip: "词尾 t、d、k、s、n 等要收住，但不要额外加一个中文式元音。",
    match: (word) => word.length > 2 && FINAL_CONSONANT_PATTERN.test(word)
  },
  {
    id: "cluster",
    label: "辅音连缀",
    sound: "consonant clusters",
    tip: "把连续辅音拆慢读清楚，再连成一个词，例如 tr、pl、st、thr。",
    match: (word) => CONSONANT_CLUSTER_PATTERN.test(word)
  },
  {
    id: "long-word",
    label: "长词重音",
    sound: "word stress",
    tip: "长词先找主重音，再弱化不重读音节，不要每个音节平均用力。",
    match: (word) => word.length >= 8
  }
];

function uniqueFirst(words: string[], limit = 4) {
  return words.filter((word, index) => words.indexOf(word) === index).slice(0, limit);
}

export function createPronunciationFocus(words: string[]): PronunciationFocus[] {
  return RULES.map((rule) => {
    const matchedWords = uniqueFirst(words.filter(rule.match));

    if (matchedWords.length === 0) {
      return null;
    }

    return {
      id: rule.id,
      label: rule.label,
      sound: rule.sound,
      words: matchedWords,
      tip: rule.tip
    };
  }).filter((item): item is PronunciationFocus => Boolean(item));
}
