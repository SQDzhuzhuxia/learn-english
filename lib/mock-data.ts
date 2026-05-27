import { BookOpenText, BookmarkCheck, Headphones, Mic } from "lucide-react";

export const dailyPlan = {
  title: "30 分钟英语沉浸训练",
  focus: "今天围绕美国看医生场景，先听读一段高频生活对话，再保存词句并做一次跟读。",
  durationMinutes: 30,
  steps: [
    {
      id: "input",
      title: "听读输入",
      description: "阅读和听 A Visit to the Doctor，理解主要意思。",
      minutes: 12,
      icon: Headphones
    },
    {
      id: "intensive",
      title: "逐句精学",
      description: "拆解 8 个句子，查词、看解释、标记熟悉度。",
      minutes: 7,
      icon: BookOpenText
    },
    {
      id: "shadowing",
      title: "跟读输出",
      description: "录 5 个关键句，先追求说完整和说清楚。",
      minutes: 5,
      icon: Mic
    },
    {
      id: "review",
      title: "词句复习",
      description: "复习昨天保存的表达，把错误说法换成自然说法。",
      minutes: 6,
      icon: BookmarkCheck
    }
  ]
};

export const materials = [
  {
    id: "doctor-visit",
    title: "A Visit to the Doctor",
    type: "美国生活",
    level: "A1+",
    minutes: 18,
    status: "学习中",
    summary: "预约医生、说明症状、确认时间。适合初级阶段积累生活高频句。"
  },
  {
    id: "apartment-tour",
    title: "Looking for an Apartment",
    type: "租房",
    level: "A1",
    minutes: 15,
    status: "未开始",
    summary: "看房、询问租金、押金、交通和维修。"
  },
  {
    id: "work-intro",
    title: "Introducing My Work",
    type: "职场",
    level: "A2",
    minutes: 20,
    status: "未开始",
    summary: "用简单英语介绍自动化背景、项目经验和工作职责。"
  },
  {
    id: "grocery-store",
    title: "At the Grocery Store",
    type: "日常",
    level: "A1",
    minutes: 12,
    status: "未开始",
    summary: "购物、询价、找商品、结账。"
  },
  {
    id: "n400-small-talk",
    title: "N-400 Interview Warm-up",
    type: "入籍",
    level: "A2",
    minutes: 16,
    status: "未开始",
    summary: "姓名、地址、工作、家庭等基础问答。"
  },
  {
    id: "plc-basic",
    title: "Basic PLC Troubleshooting",
    type: "自动化",
    level: "A2",
    minutes: 22,
    status: "未开始",
    summary: "设备报警、传感器、输入输出、排查步骤。"
  }
];

export const studySegments = [
  {
    id: "s1",
    text: "I have had a sore throat since yesterday.",
    translation: "我从昨天开始嗓子疼。"
  },
  {
    id: "s2",
    text: "I would like to make an appointment with a doctor.",
    translation: "我想预约医生。"
  },
  {
    id: "s3",
    text: "Do you have any openings this afternoon?",
    translation: "今天下午有空档吗？"
  },
  {
    id: "s4",
    text: "Could you please spell your last name?",
    translation: "请拼一下你的姓好吗？"
  }
];

export const reviewCards = [
  {
    id: "r1",
    front: "make an appointment",
    source: "A Visit to the Doctor",
    cardType: "短语卡",
    dueToday: true
  },
  {
    id: "r2",
    front: "sore throat",
    source: "A Visit to the Doctor",
    cardType: "词组卡",
    dueToday: true
  },
  {
    id: "r3",
    front: "Could you please spell your last name?",
    source: "A Visit to the Doctor",
    cardType: "句卡",
    dueToday: true
  },
  {
    id: "r4",
    front: "Do you have any openings this afternoon?",
    source: "A Visit to the Doctor",
    cardType: "听力卡",
    dueToday: false
  }
];

export const progressStats = [
  {
    label: "输入分钟",
    value: "86"
  },
  {
    label: "跟读次数",
    value: "14"
  },
  {
    label: "掌握词句",
    value: "42"
  },
  {
    label: "完成复习",
    value: "31"
  }
];

export const practiceModes = [
  {
    id: "shadowing",
    title: "跟读",
    description: "听一句、模仿一句、转写对比。"
  },
  {
    id: "retelling",
    title: "复述",
    description: "用简单英语讲回刚学过的内容。"
  },
  {
    id: "writing",
    title: "写作",
    description: "练邮件、消息、自我介绍和工作表达。"
  },
  {
    id: "roleplay",
    title: "场景口语",
    description: "围绕美国生活、职场和移民场景对话。"
  }
] as const;

export const scenarioMap = [
  {
    name: "看病预约",
    status: "入门",
    progress: 24
  },
  {
    name: "租房沟通",
    status: "未开始",
    progress: 0
  },
  {
    name: "面试自我介绍",
    status: "学习中",
    progress: 18
  },
  {
    name: "自动化技术沟通",
    status: "未开始",
    progress: 0
  },
  {
    name: "N-400 问答",
    status: "未开始",
    progress: 0
  }
];
