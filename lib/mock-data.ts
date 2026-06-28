import {
  BookOpenText,
  BookmarkCheck,
  Bot,
  ClipboardCheck,
  Cloud,
  Headphones,
  Mic,
  PenLine,
  ShieldCheck,
  SlidersHorizontal,
  WifiOff
} from "lucide-react";

export const dailyPlan = {
  dateLabel: "2026-05-28",
  title: "30 分钟美国生活英语输入训练",
  focus:
    "今天围绕“预约看医生”建立可理解输入：先听读，再逐句理解，最后跟读并保存真实可用表达。",
  durationMinutes: 30,
  completion: 38,
  currentMaterial: {
    title: "A Visit to the Doctor",
    type: "美国生活",
    level: "A1+",
    progress: 42,
    nextAction: "继续第 3 句精听"
  },
  steps: [
    {
      id: "warmup",
      title: "复习唤醒",
      description: "先复习昨天保存的 6 个词句，让今天的输入更容易听懂。",
      minutes: 4,
      icon: BookmarkCheck,
      status: "done"
    },
    {
      id: "input",
      title: "听读输入",
      description: "听读医生预约对话，目标是抓住大意，不追求每个词都懂。",
      minutes: 12,
      icon: Headphones,
      status: "current"
    },
    {
      id: "intensive",
      title: "逐句精学",
      description: "拆解 8 个高频句，标记认识、模糊、不认识。",
      minutes: 8,
      icon: BookOpenText,
      status: "todo"
    },
    {
      id: "output",
      title: "跟读输出",
      description: "录 5 个关键句，先追求说完整、说清楚。",
      minutes: 6,
      icon: Mic,
      status: "todo"
    }
  ],
  habits: [
    {
      label: "连续学习",
      value: "3 天"
    },
    {
      label: "今日剩余",
      value: "18 分钟"
    },
    {
      label: "输入占比",
      value: "70%"
    }
  ]
};

export const studyQueue = [
  {
    id: "doctor-input",
    label: "正在学",
    title: "A Visit to the Doctor",
    action: "继续精听",
    href: "/study"
  },
  {
    id: "review-due",
    label: "到期",
    title: "12 张词句卡",
    action: "开始复习",
    href: "/review"
  },
  {
    id: "retell",
    label: "输出",
    title: "复述 4 句看医生表达",
    action: "稍后练习",
    href: "/practice"
  }
];

export const materialFilters = [
  "全部",
  "合适",
  "美国生活",
  "日常",
  "租房",
  "银行",
  "交通",
  "职场",
  "自动化",
  "入籍",
  "用户导入"
];

export const materials = [
  {
    id: "doctor-visit",
    title: "A Visit to the Doctor",
    type: "美国生活",
    level: "A1+",
    minutes: 18,
    status: "学习中",
    progress: 42,
    knownRate: 68,
    inputType: "对话 + 音频",
    priority: "今日推荐",
    summary: "预约医生、说明症状、确认时间。适合初级阶段积累生活高频句。",
    keyExpressions: ["make an appointment", "sore throat", "Do you have any openings?"]
  },
  {
    id: "apartment-tour",
    title: "Looking for an Apartment",
    type: "租房",
    level: "A1",
    minutes: 15,
    status: "未开始",
    progress: 0,
    knownRate: 74,
    inputType: "故事 + 对话",
    priority: "本周建议",
    summary: "看房、询问租金、押金、交通和维修。",
    keyExpressions: ["security deposit", "monthly rent", "Is it available?"]
  },
  {
    id: "work-intro",
    title: "Introducing My Work",
    type: "职场",
    level: "A2",
    minutes: 20,
    status: "未开始",
    progress: 0,
    knownRate: 51,
    inputType: "短文 + 跟读",
    priority: "稍难",
    summary: "用简单英语介绍自动化背景、项目经验和工作职责。",
    keyExpressions: ["automation engineer", "control system", "troubleshooting"]
  },
  {
    id: "grocery-store",
    title: "At the Grocery Store",
    type: "日常",
    level: "A1",
    minutes: 12,
    status: "未开始",
    progress: 0,
    knownRate: 81,
    inputType: "对话",
    priority: "轻松输入",
    summary: "购物、询价、找商品、结账。",
    keyExpressions: ["Where can I find", "checkout", "receipt"]
  },
  {
    id: "n400-small-talk",
    title: "N-400 Interview Warm-up",
    type: "入籍",
    level: "A2",
    minutes: 16,
    status: "未开始",
    progress: 0,
    knownRate: 46,
    inputType: "问答",
    priority: "长期目标",
    summary: "姓名、地址、工作、家庭等基础问答。",
    keyExpressions: ["current address", "employment history", "marital status"]
  },
  {
    id: "plc-basic",
    title: "Basic PLC Troubleshooting",
    type: "自动化",
    level: "A2",
    minutes: 22,
    status: "未开始",
    progress: 0,
    knownRate: 39,
    inputType: "技术短文",
    priority: "专业储备",
    summary: "设备报警、传感器、输入输出、排查步骤。",
    keyExpressions: ["fault alarm", "sensor signal", "input and output"]
  },
  {
    id: "pharmacy-refill",
    title: "Refilling Medicine at a Pharmacy",
    type: "美国生活",
    level: "A1+",
    minutes: 10,
    status: "未开始",
    progress: 0,
    knownRate: 62,
    inputType: "对话 + 指令",
    priority: "医疗延伸",
    summary: "药房续药、核对生日、询问用药说明。",
    keyExpressions: ["refill my medicine", "date of birth", "take it with food"]
  },
  {
    id: "bank-account",
    title: "Opening a Bank Account",
    type: "银行",
    level: "A1+",
    minutes: 12,
    status: "未开始",
    progress: 0,
    knownRate: 58,
    inputType: "柜台对话",
    priority: "生活必备",
    summary: "开户、身份证明、地址证明、银行卡和 direct deposit。",
    keyExpressions: ["checking account", "proof of address", "direct deposit"]
  },
  {
    id: "bus-directions",
    title: "Taking the Bus to a Clinic",
    type: "交通",
    level: "A1",
    minutes: 9,
    status: "未开始",
    progress: 0,
    knownRate: 76,
    inputType: "短故事 + 对话",
    priority: "轻松输入",
    summary: "问公交方向、确认站点、下车提醒。",
    keyExpressions: ["Does this bus go to", "get off after five stops", "press the stop button"]
  },
  {
    id: "maintenance-request",
    title: "Calling for Apartment Maintenance",
    type: "租房",
    level: "A1+",
    minutes: 11,
    status: "未开始",
    progress: 0,
    knownRate: 61,
    inputType: "电话对话",
    priority: "本周建议",
    summary: "描述漏水、判断是否紧急、创建维修单。",
    keyExpressions: ["the sink is leaking", "maintenance request", "slow but constant"]
  },
  {
    id: "neighbor-small-talk",
    title: "Small Talk with a Neighbor",
    type: "日常",
    level: "A1",
    minutes: 8,
    status: "未开始",
    progress: 0,
    knownRate: 84,
    inputType: "短对话",
    priority: "轻松输入",
    summary: "楼道寒暄、周末问候、自我介绍。",
    keyExpressions: ["How was your weekend?", "I moved in last month", "Good morning"]
  },
  {
    id: "utility-bill",
    title: "Understanding a Utility Bill",
    type: "租房",
    level: "A2",
    minutes: 13,
    status: "未开始",
    progress: 0,
    knownRate: 52,
    inputType: "生活短文",
    priority: "生活必备",
    summary: "账单号码、到期日、线上支付和 late fee。",
    keyExpressions: ["account number", "due date", "late fee"]
  },
  {
    id: "safety-meeting",
    title: "A Short Safety Meeting",
    type: "职场",
    level: "A2",
    minutes: 14,
    status: "未开始",
    progress: 0,
    knownRate: 49,
    inputType: "会议输入",
    priority: "专业储备",
    summary: "班前安全会议、防护用品、lock out 和现场风险。",
    keyExpressions: ["safety glasses", "lock out the machine", "moving parts"]
  },
  {
    id: "shift-handover",
    title: "Shift Handover Notes",
    type: "自动化",
    level: "A2",
    minutes: 13,
    status: "未开始",
    progress: 0,
    knownRate: 44,
    inputType: "交接班短文",
    priority: "专业储备",
    summary: "交接班说明、异常记录、logbook 和下一步检查。",
    keyExpressions: ["handover", "the alarm returns", "logbook"]
  },
  {
    id: "interview-automation",
    title: "Automation Job Interview Basics",
    type: "职场",
    level: "A2",
    minutes: 15,
    status: "未开始",
    progress: 0,
    knownRate: 42,
    inputType: "面试问答",
    priority: "长期目标",
    summary: "自动化岗位面试中介绍经验、排查问题和安全意识。",
    keyExpressions: ["describe your experience", "troubleshooting", "follow procedures"]
  },
  {
    id: "address-change",
    title: "Updating an Address Online",
    type: "入籍",
    level: "A2",
    minutes: 12,
    status: "未开始",
    progress: 0,
    knownRate: 54,
    inputType: "流程短文",
    priority: "长期目标",
    summary: "搬家后更新地址、填写表格、保存确认号。",
    keyExpressions: ["old address", "new address", "confirmation number"]
  },
  {
    id: "civics-rights",
    title: "Rights and Responsibilities",
    type: "入籍",
    level: "A2",
    minutes: 14,
    status: "未开始",
    progress: 0,
    knownRate: 47,
    inputType: "公民常识短文",
    priority: "长期目标",
    summary: "权利、责任、遵守法律和 jury duty 等基础表达。",
    keyExpressions: ["rights and responsibilities", "obey the law", "serve on a jury"]
  },
  {
    id: "oath-ceremony",
    title: "At the Oath Ceremony",
    type: "入籍",
    level: "A2",
    minutes: 11,
    status: "未开始",
    progress: 0,
    knownRate: 50,
    inputType: "场景短文",
    priority: "长期目标",
    summary: "入籍宣誓仪式、听指令、领取证书。",
    keyExpressions: ["oath ceremony", "repeat the oath", "receive the certificate"]
  },
  {
    id: "restaurant-order",
    title: "Ordering at a Diner",
    type: "美国生活",
    level: "A1",
    minutes: 10,
    status: "未开始",
    progress: 0,
    knownRate: 79,
    inputType: "对话",
    priority: "轻松输入",
    summary: "看菜单、点餐、问配菜、分账。",
    keyExpressions: ["a few more minutes", "comes with fries", "split the check"]
  },
  {
    id: "post-office",
    title: "Mailing a Box at the Post Office",
    type: "美国生活",
    level: "A1+",
    minutes: 11,
    status: "未开始",
    progress: 0,
    knownRate: 64,
    inputType: "柜台对话",
    priority: "生活必备",
    summary: "寄包裹、说明内容、选邮寄方式、保存单号。",
    keyExpressions: ["mail a box", "shipping options", "tracking number"]
  },
  {
    id: "phone-plan",
    title: "Setting Up a Phone Plan",
    type: "美国生活",
    level: "A2",
    minutes: 13,
    status: "未开始",
    progress: 0,
    knownRate: 55,
    inputType: "门店对话",
    priority: "生活必备",
    summary: "办手机套餐、问流量、月费和合约、转号码。",
    keyExpressions: ["set up a new plan", "monthly fee", "month to month"]
  },
  {
    id: "lease-signing",
    title: "Signing the Lease",
    type: "租房",
    level: "A2",
    minutes: 14,
    status: "未开始",
    progress: 0,
    knownRate: 53,
    inputType: "流程对话",
    priority: "本周建议",
    summary: "读租约、确认租金押金、到期日、late fee 和签字。",
    keyExpressions: ["sign the lease", "due on the first", "late fee section"]
  },
  {
    id: "equipment-checklist",
    title: "Start-of-Shift Equipment Checklist",
    type: "自动化",
    level: "A2",
    minutes: 13,
    status: "未开始",
    progress: 0,
    knownRate: 45,
    inputType: "操作短文",
    priority: "专业储备",
    summary: "开机前点检：急停、气压、油位、清场和签字。",
    keyExpressions: ["emergency stop button", "air pressure", "checklist"]
  },
  {
    id: "civics-history",
    title: "Basic U.S. Civics Facts",
    type: "入籍",
    level: "A2",
    minutes: 14,
    status: "未开始",
    progress: 0,
    knownRate: 48,
    inputType: "公民常识短文",
    priority: "长期目标",
    summary: "州数、宪法、三权分立和入籍考试常见问题。",
    keyExpressions: ["fifty states", "the Constitution", "three branches of government"]
  }
];

export const studyMaterial = {
  title: "A Visit to the Doctor",
  subtitle: "美国生活场景 · 预约医生",
  level: "A1+",
  progress: 42,
  currentSegment: 2,
  totalSegments: 8,
  knownWords: 68,
  estimatedMinutesLeft: 11
};

export const studySegments = [
  {
    id: "s1",
    order: 1,
    text: "I have had a sore throat since yesterday.",
    translation: "我从昨天开始嗓子疼。",
    status: "done",
    familiarity: "认识",
    note: "现在完成时 + since 表示症状从过去持续到现在。"
  },
  {
    id: "s2",
    order: 2,
    text: "I would like to make an appointment with a doctor.",
    translation: "我想预约医生。",
    status: "current",
    familiarity: "重点",
    note: "would like to 比 want to 更礼貌，适合电话或前台。"
  },
  {
    id: "s3",
    order: 3,
    text: "Do you have any openings this afternoon?",
    translation: "今天下午有空档吗？",
    status: "todo",
    familiarity: "模糊",
    note: "opening 在预约场景里表示“可预约时间”。"
  },
  {
    id: "s4",
    order: 4,
    text: "Could you please spell your last name?",
    translation: "请拼一下你的姓好吗？",
    status: "todo",
    familiarity: "不认识",
    note: "Could you please 是非常高频的礼貌请求句型。"
  },
  {
    id: "s5",
    order: 5,
    text: "Please arrive fifteen minutes early to fill out the forms.",
    translation: "请提前十五分钟到，填写表格。",
    status: "todo",
    familiarity: "模糊",
    note: "fill out forms 是美国生活中非常常见的表达。"
  }
];

export const aiExplanation = {
  sentence: "I would like to make an appointment with a doctor.",
  meaning: "这句话是在预约医生时说明你的需求，语气礼貌、自然，可以直接照着说。",
  structure: [
    "I would like to...：我想要...，比 I want to 更礼貌",
    "make an appointment：预约",
    "with a doctor：和医生，表示预约对象"
  ],
  expressions: [
    {
      text: "make an appointment",
      meaning: "预约",
      example: "I need to make an appointment for next week."
    },
    {
      text: "I would like to...",
      meaning: "我想要...",
      example: "I would like to speak with a nurse."
    }
  ],
  commonMistake: "不要直接说 I want see doctor。自然说法是 I would like to see a doctor 或 I need to see a doctor.",
  shadowingTip: "把 would like 连起来读，像 /wud-laik/，不要每个词都停顿。"
};

export const reviewSummary = {
  dueToday: 12,
  newCards: 5,
  expectedMinutes: 8,
  completionRate: 0,
  focus: "优先复习预约医生场景里的短语和句子。"
};

export const reviewCards = [
  {
    id: "r1",
    front: "make an appointment",
    back: "预约",
    example: "I would like to make an appointment with a doctor.",
    source: "A Visit to the Doctor",
    cardType: "短语卡",
    dueToday: true,
    difficulty: "重点",
    nextReview: "评分后安排"
  },
  {
    id: "r2",
    front: "sore throat",
    back: "嗓子疼",
    example: "I have had a sore throat since yesterday.",
    source: "A Visit to the Doctor",
    cardType: "词组卡",
    dueToday: true,
    difficulty: "简单",
    nextReview: "评分后安排"
  },
  {
    id: "r3",
    front: "Could you please spell your last name?",
    back: "请拼一下你的姓好吗？",
    example: "Could you please spell your last name?",
    source: "A Visit to the Doctor",
    cardType: "句卡",
    dueToday: true,
    difficulty: "模糊",
    nextReview: "评分后安排"
  },
  {
    id: "r4",
    front: "Do you have any openings this afternoon?",
    back: "今天下午有空档吗？",
    example: "Do you have any openings this afternoon?",
    source: "A Visit to the Doctor",
    cardType: "听力卡",
    dueToday: false,
    difficulty: "困难",
    nextReview: "明天"
  }
];

export const reviewRatings = [
  {
    id: "again",
    label: "忘了",
    next: "6 小时后",
    tone: "border-rose-200 bg-rose-50 text-rose-700"
  },
  {
    id: "hard",
    label: "困难",
    next: "明天",
    tone: "border-amber-200 bg-amber-50 text-amber-700"
  },
  {
    id: "good",
    label: "一般",
    next: "4 天后",
    tone: "border-sky-200 bg-sky-50 text-sky-700"
  },
  {
    id: "easy",
    label: "简单",
    next: "7 天后",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
];

export const progressStats = [
  {
    label: "输入分钟",
    value: "86",
    hint: "本周听读"
  },
  {
    label: "跟读次数",
    value: "14",
    hint: "句子级输出"
  },
  {
    label: "掌握词句",
    value: "42",
    hint: "来自真实材料"
  },
  {
    label: "完成复习",
    value: "31",
    hint: "到期卡片"
  }
];

export const practiceModes = [
  {
    id: "shadowing",
    title: "跟读",
    description: "听一句、模仿一句、转写对比。",
    icon: Mic,
    todayTask: "跟读 5 个预约医生关键句",
    estimatedMinutes: 6,
    status: "今日任务",
    output: "录音 + 转写"
  },
  {
    id: "retelling",
    title: "复述",
    description: "用简单英语讲回刚学过的内容。",
    icon: ClipboardCheck,
    todayTask: "复述看医生对话大意",
    estimatedMinutes: 5,
    status: "建议",
    output: "英文短句"
  },
  {
    id: "writing",
    title: "写作",
    description: "练邮件、消息、自我介绍和工作表达。",
    icon: PenLine,
    todayTask: "写一句预约医生短信",
    estimatedMinutes: 4,
    status: "轻量",
    output: "AI 修改"
  },
  {
    id: "roleplay",
    title: "场景口语",
    description: "围绕美国生活、职场和移民场景对话。",
    icon: Headphones,
    todayTask: "前台预约角色扮演",
    estimatedMinutes: 8,
    status: "可用",
    output: "对话记录"
  }
];

export const todayPractice = {
  title: "跟读：预约医生 5 句",
  material: "A Visit to the Doctor",
  target: "能把 I would like to make an appointment 说完整、说清楚。",
  steps: [
    "先听原句 2 遍",
    "慢速跟读 3 遍",
    "录音 1 遍",
    "看转写结果，保存错误表达"
  ],
  prompt: "I would like to make an appointment with a doctor."
};

export const retellingPractice = {
  title: "复述：预约医生大意",
  material: "A Visit to the Doctor",
  prompt: "用 2-3 句简单英文复述：你想预约医生、说明症状、询问今天下午是否有空档。",
  sourceSummary:
    "I would like to make an appointment with a doctor. I have had a sore throat since yesterday. Do you have any openings this afternoon?",
  keyPoints: [
    {
      label: "想预约医生",
      keywords: ["appointment", "doctor"]
    },
    {
      label: "从昨天开始嗓子疼",
      keywords: ["throat", "yesterday"]
    },
    {
      label: "询问今天下午是否有空档",
      keywords: ["openings", "afternoon"]
    }
  ],
  usefulWords: ["appointment", "doctor", "throat", "yesterday", "openings", "afternoon"],
  starters: [
    "I would like to make an appointment with a doctor.",
    "I have had a sore throat since yesterday.",
    "I want to ask if there are any openings this afternoon."
  ]
};

export const roleplayScenario = {
  title: "前台预约医生",
  material: "A Visit to the Doctor",
  level: "A1+",
  setting: "美国诊所前台电话预约",
  learnerRole: "你是病人，需要预约医生并说明嗓子疼。",
  partnerRole: "AI 扮演诊所前台，按简单英文一步一步问你。",
  goal: "完成预约需求、说明症状、确认下午 3 点是否可以。",
  usefulExpressions: [
    "I would like to make an appointment.",
    "I have had a sore throat since yesterday.",
    "Does 3 p.m. work for you?",
    "That works for me.",
    "Thank you for your help."
  ],
  turns: [
    {
      id: "opening",
      partnerLine: "Good morning. How can I help you?",
      translation: "早上好。有什么可以帮您？",
      userGoalZh: "告诉前台：你想预约医生。",
      expectedKeywords: ["appointment", "doctor"],
      suggestedReplies: [
        "I would like to make an appointment with a doctor.",
        "Can I make an appointment with a doctor, please?"
      ]
    },
    {
      id: "symptom",
      partnerLine: "What seems to be the problem?",
      translation: "您哪里不舒服？",
      userGoalZh: "说明：你从昨天开始嗓子疼。",
      expectedKeywords: ["sore throat", "yesterday"],
      suggestedReplies: [
        "I have had a sore throat since yesterday.",
        "My throat has been sore since yesterday."
      ]
    },
    {
      id: "time",
      partnerLine: "We have an opening at 3 p.m. Does that work for you?",
      translation: "我们下午 3 点有空档。这个时间可以吗？",
      userGoalZh: "确认 3 点可以，并表示感谢。",
      expectedKeywords: ["works", "thank"],
      suggestedReplies: [
        "Yes, that works for me. Thank you.",
        "Yes, 3 p.m. works for me. Thank you for your help."
      ]
    }
  ]
};

export const writingPrompts = [
  {
    title: "预约短信",
    prompt: "用英文写一句：我想预约医生，我从昨天开始嗓子疼。",
    level: "A1+"
  },
  {
    title: "工作自我介绍",
    prompt: "用两句英文介绍：我是自动化专业，做过控制系统相关工作。",
    level: "A2"
  },
  {
    title: "生活消息",
    prompt: "用英文问：今天下午有空档吗？",
    level: "A1"
  }
];

export const learningBalance = [
  {
    label: "听读输入",
    value: 70,
    minutes: 86
  },
  {
    label: "输出练习",
    value: 18,
    minutes: 22
  },
  {
    label: "复习巩固",
    value: 12,
    minutes: 15
  }
];

export const weaknessInsights = [
  {
    title: "听力启动慢",
    detail: "预约类句子第一遍容易漏掉 would like to 和 openings。",
    action: "继续做逐句循环和慢速跟读。"
  },
  {
    title: "中式表达",
    detail: "容易说 I want see doctor。",
    action: "把 I would like to... 作为固定句型复习。"
  },
  {
    title: "词汇缺口",
    detail: "appointment、opening、fill out 需要放进高频复习。",
    action: "优先复习真实句子，不单独背词。"
  }
];

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

export const weeklyTimeline = [
  {
    day: "周一",
    input: 18,
    output: 4,
    review: 5
  },
  {
    day: "周二",
    input: 22,
    output: 6,
    review: 6
  },
  {
    day: "周三",
    input: 16,
    output: 5,
    review: 7
  },
  {
    day: "周四",
    input: 30,
    output: 7,
    review: 8
  }
];

export const settingsGroups = [
  {
    title: "学习目标",
    description: "控制每日节奏、英语方向和界面语言。",
    items: [
      {
        icon: SlidersHorizontal,
        label: "每日目标",
        value: "30-60 分钟",
        detail: "默认 30 分钟，周末可切换 60 分钟。"
      },
      {
        icon: BookOpenText,
        label: "目标英语",
        value: "美式英语",
        detail: "材料、发音、生活场景优先按美国方向组织。"
      },
      {
        icon: ClipboardCheck,
        label: "界面语言",
        value: "中文为主",
        detail: "解释、反馈和操作提示以中文为主，英语表达保持原文输入。"
      }
    ]
  },
  {
    title: "AI 和语音",
    description: "统一管理 AI 供应商、TTS、STT 和本地发音评分链路。",
    items: [
      {
        icon: Bot,
        label: "AI 供应商",
        value: "可配置",
        detail: "支持 fallback、OpenAI-compatible、OpenAI 和本地兼容 endpoint。"
      },
      {
        icon: Mic,
        label: "语音识别",
        value: "云端/本地",
        detail: "支持 OpenAI-compatible STT、本地 Whisper/whisper.cpp 和浏览器兜底。"
      },
      {
        icon: ShieldCheck,
        label: "密钥安全",
        value: "服务端代理",
        detail: "API Key 不放到前端，不提交 .env。"
      }
    ]
  },
  {
    title: "同步和离线",
    description: "服务多地点学习：办公室、家里、手机浏览器。",
    items: [
      {
        icon: Cloud,
        label: "云同步",
        value: "已接入",
        detail: "支持 Supabase 登录、手动同步、差异检查、细粒度合并和自动上传。"
      },
      {
        icon: WifiOff,
        label: "离线学习",
        value: "已增强",
        detail: "支持 PWA 离线、音频缓存、AI 队列和本地语音 endpoint 检查。"
      }
    ]
  }
];
