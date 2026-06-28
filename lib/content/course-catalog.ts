import type { StudyMaterialRecord } from "@/lib/content/types";
import {
  supplementalCourseStageMaterialIds,
  supplementalSeedMaterialContentById
} from "@/lib/content/seed-expansion";

export type CourseStage = {
  id: string;
  title: string;
  goal: string;
  materialIds: string[];
  completionCriteria: string[];
  outputTask: string;
};

export type CourseTrack = {
  id: string;
  title: string;
  subtitle: string;
  levelRange: string;
  weeklyGoal: string;
  focus: string;
  materialIds: string[];
  outcomes: string[];
  stages: CourseStage[];
};

export type CourseStageSummary = CourseStage & {
  total: number;
  completed: number;
  started: number;
  progress: number;
  isCurrent: boolean;
  nextMaterial?: StudyMaterialRecord;
};

export const courseTracks: CourseTrack[] = [
  {
    id: "survival-foundation",
    title: "美国生活生存英语",
    subtitle: "先把看医生、买东西、银行和交通这些高频场景听懂说清楚。",
    levelRange: "A1-A2",
    weeklyGoal: "每周 4 篇短材料 + 3 次跟读",
    focus: "生活高频句、礼貌请求、听懂前台和柜台问题",
    materialIds: [
      "doctor-visit",
      "grocery-store",
      "pharmacy-refill",
      "restaurant-order",
      "bank-account",
      "bus-directions",
      "post-office",
      "phone-plan",
      ...supplementalCourseStageMaterialIds["survival-medical-shopping"],
      ...supplementalCourseStageMaterialIds["survival-services-transit"]
    ],
    outcomes: ["能预约和确认时间", "能询问商品和价格", "能处理简单柜台问题"],
    stages: [
      {
        id: "survival-medical-shopping",
        title: "阶段 1：医生和购物",
        goal: "先听懂最常见的预约、药房、超市和点餐问题。",
        materialIds: [
          "doctor-visit",
          "grocery-store",
          "pharmacy-refill",
          "restaurant-order",
          ...supplementalCourseStageMaterialIds["survival-medical-shopping"]
        ],
        completionCriteria: ["完成 4 篇材料听读", "保存 8 个生活高频表达", "完成 2 次跟读输出"],
        outputTask: "用 3 句话说明症状、想买什么、点什么餐或药房问题。"
      },
      {
        id: "survival-services-transit",
        title: "阶段 2：柜台和出行",
        goal: "能处理银行开户、公交问路、寄件和办手机卡这类基础服务场景。",
        materialIds: [
          "bank-account",
          "bus-directions",
          "post-office",
          "phone-plan",
          ...supplementalCourseStageMaterialIds["survival-services-transit"]
        ],
        completionCriteria: ["完成 4 篇服务场景材料", "能说出 ID、地址、路线、单号和付款方式", "完成 1 次角色演练"],
        outputTask: "模拟一次银行、公交、邮局或手机店问答，把关键信息说完整。"
      }
    ]
  },
  {
    id: "housing-and-neighborhood",
    title: "租房和社区融入",
    subtitle: "围绕看房、维修、账单和邻里交流建立真实输入。",
    levelRange: "A1-A2",
    weeklyGoal: "每周 3 篇材料 + 2 次复述",
    focus: "租房关键词、维修描述、邻里寒暄和生活问题说明",
    materialIds: [
      "apartment-tour",
      "maintenance-request",
      "lease-signing",
      "utility-bill",
      "neighbor-small-talk",
      ...supplementalCourseStageMaterialIds["housing-rent-maintenance"],
      ...supplementalCourseStageMaterialIds["housing-bills-community"]
    ],
    outcomes: ["能问租金押金", "能描述家里问题", "能和邻居进行简单寒暄"],
    stages: [
      {
        id: "housing-rent-maintenance",
        title: "阶段 1：看房、签约和维修",
        goal: "先掌握租金、押金、included、lease、maintenance 这些高频表达。",
        materialIds: [
          "apartment-tour",
          "maintenance-request",
          "lease-signing",
          ...supplementalCourseStageMaterialIds["housing-rent-maintenance"]
        ],
        completionCriteria: ["完成看房、签约和维修材料", "保存 6 个租房表达", "能描述一个家里问题"],
        outputTask: "复述一次看房或签约问题，或打电话说明水槽漏水。"
      },
      {
        id: "housing-bills-community",
        title: "阶段 2：账单和邻里",
        goal: "能处理生活账单，并进行简单社区寒暄。",
        materialIds: [
          "utility-bill",
          "neighbor-small-talk",
          ...supplementalCourseStageMaterialIds["housing-bills-community"]
        ],
        completionCriteria: ["完成账单和寒暄材料", "能说明 due date、late fee、account number", "完成 1 次邻里寒暄角色演练"],
        outputTask: "写 2 句账单提醒，再说 2 句邻里 small talk。"
      }
    ]
  },
  {
    id: "work-automation",
    title: "自动化职场英语",
    subtitle: "用你的自动化背景做职场输入，慢慢积累可说可写的专业表达。",
    levelRange: "A2-B1",
    weeklyGoal: "每周 3 篇材料 + 1 次角色演练",
    focus: "设备故障、交接班、安全会议、面试表达",
    materialIds: [
      "work-intro",
      "plc-basic",
      "equipment-checklist",
      "safety-meeting",
      "shift-handover",
      "interview-automation",
      ...supplementalCourseStageMaterialIds["automation-self-intro-troubleshooting"],
      ...supplementalCourseStageMaterialIds["automation-shift-safety"],
      ...supplementalCourseStageMaterialIds["automation-interview"]
    ],
    outcomes: ["能介绍工作背景", "能描述故障和排查步骤", "能回答基础岗位面试问题"],
    stages: [
      {
        id: "automation-self-intro-troubleshooting",
        title: "阶段 1：背景介绍、点检和故障描述",
        goal: "把你的自动化背景、开机点检和基础排查步骤说清楚。",
        materialIds: [
          "work-intro",
          "plc-basic",
          "equipment-checklist",
          ...supplementalCourseStageMaterialIds["automation-self-intro-troubleshooting"]
        ],
        completionCriteria: ["完成 3 篇职场材料", "能说出 sensors、PLC、fault alarm、checklist", "完成 1 次复述"],
        outputTask: "用 4 句话介绍你的自动化背景、一次点检和一次简单排查。"
      },
      {
        id: "automation-shift-safety",
        title: "阶段 2：安全会议和交接班",
        goal: "听懂班前安全提醒，能交代设备状态和下一步检查。",
        materialIds: [
          "safety-meeting",
          "shift-handover",
          ...supplementalCourseStageMaterialIds["automation-shift-safety"]
        ],
        completionCriteria: ["完成安全和交接班材料", "保存 8 个职场固定表达", "完成 1 次角色演练"],
        outputTask: "模拟一次 shift handover，说明 alarm、sensor 和 next check。"
      },
      {
        id: "automation-interview",
        title: "阶段 3：岗位面试表达",
        goal: "准备基础自动化岗位面试里的经历、安全和排查回答。",
        materialIds: [
          "interview-automation",
          ...supplementalCourseStageMaterialIds["automation-interview"]
        ],
        completionCriteria: ["完成面试材料", "写出 1 段英文自我介绍", "完成 1 次面试角色演练"],
        outputTask: "回答 Tell me about your experience 和 How do you handle safety?"
      }
    ]
  },
  {
    id: "immigration-civics",
    title: "移民和入籍基础",
    subtitle: "提前熟悉 N-400、地址、工作、家庭和公民常识相关表达。",
    levelRange: "A2",
    weeklyGoal: "每周 2 篇材料 + 1 次问答练习",
    focus: "身份信息问答、入籍面试 warm-up、公民常识高频句",
    materialIds: [
      "n400-small-talk",
      "address-change",
      "civics-rights",
      "civics-history",
      "oath-ceremony",
      ...supplementalCourseStageMaterialIds["immigration-identity-address"],
      ...supplementalCourseStageMaterialIds["immigration-civics-oath"]
    ],
    outcomes: ["能回答个人信息问题", "能理解常见移民表述", "能为后续入籍材料学习打底"],
    stages: [
      {
        id: "immigration-identity-address",
        title: "阶段 1：个人信息和地址",
        goal: "熟悉入籍面试 warm-up、地址和表格相关基础问题。",
        materialIds: [
          "n400-small-talk",
          "address-change",
          ...supplementalCourseStageMaterialIds["immigration-identity-address"]
        ],
        completionCriteria: ["完成 2 篇个人信息材料", "能回答姓名、地址、生日和工作问题", "完成 1 次问答练习"],
        outputTask: "慢速回答 5 个个人信息问题，听不懂时会请求重复。"
      },
      {
        id: "immigration-civics-oath",
        title: "阶段 2：公民常识和宣誓",
        goal: "提前理解 rights、responsibilities、the Constitution、oath ceremony 的基础意思。",
        materialIds: [
          "civics-rights",
          "civics-history",
          "oath-ceremony",
          ...supplementalCourseStageMaterialIds["immigration-civics-oath"]
        ],
        completionCriteria: ["完成 3 篇公民常识材料", "能解释 rights、responsibilities 和基础 civics 常识", "保存 6 个入籍相关表达"],
        outputTask: "用简单英文解释一个权利、一个责任、一个 civics 事实和宣誓流程。"
      }
    ]
  }
];

export function createCourseStageSummaries(
  track: CourseTrack,
  materials: StudyMaterialRecord[]
): CourseStageSummary[] {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const summaries = track.stages.map((stage) => {
    const stageMaterials = stage.materialIds
      .map((id) => materialById.get(id))
      .filter((material): material is StudyMaterialRecord => Boolean(material));
    const completed = stageMaterials.filter((material) => material.status === "已完成").length;
    const started = stageMaterials.filter((material) => material.status !== "未开始" || material.progress > 0).length;
    const total = stageMaterials.length;
    const progress = Math.round((completed / Math.max(1, total)) * 100);
    const nextMaterial = stageMaterials.find((material) => material.status !== "已完成") ?? stageMaterials[0];

    return {
      ...stage,
      total,
      completed,
      started,
      progress,
      isCurrent: false,
      nextMaterial
    };
  });
  const currentIndex = summaries.findIndex((stage) => stage.progress < 100);
  const fallbackIndex = summaries.length > 0 ? summaries.length - 1 : -1;

  return summaries.map((stage, index) => ({
    ...stage,
    isCurrent: index === (currentIndex >= 0 ? currentIndex : fallbackIndex)
  }));
}

export function getCurrentCourseStage(
  track: CourseTrack,
  materials: StudyMaterialRecord[]
) {
  return createCourseStageSummaries(track, materials).find((stage) => stage.isCurrent);
}

export type CourseStageRetrospective = {
  trackId: string;
  trackTitle: string;
  hasCompletedStage: boolean;
  trackCompleted: boolean;
  completedStageTitles: string[];
  coveredMaterials: string[];
  currentStage?: CourseStageSummary;
  nextStage?: CourseStageSummary;
  nextMaterialId?: string;
  headline: string;
  advice: string;
  nextActionLabel: string;
};

export function createCourseStageRetrospective(
  track: CourseTrack,
  materials: StudyMaterialRecord[]
): CourseStageRetrospective {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const summaries = createCourseStageSummaries(track, materials);
  const completedStages = summaries.filter((stage) => stage.progress >= 100);
  const currentStage = summaries.find((stage) => stage.isCurrent);
  const trackCompleted = summaries.length > 0 && summaries.every((stage) => stage.progress >= 100);
  const hasCompletedStage = completedStages.length > 0;
  const nextStage = trackCompleted ? undefined : currentStage;
  const nextMaterialId = trackCompleted ? undefined : currentStage?.nextMaterial?.id;

  const coveredMaterials = completedStages
    .flatMap((stage) => stage.materialIds)
    .map((id) => materialById.get(id))
    .filter((material): material is StudyMaterialRecord => Boolean(material) && material!.status === "已完成")
    .map((material) => material.title);

  let headline: string;
  let advice: string;
  let nextActionLabel: string;

  if (trackCompleted) {
    headline = `已完成「${track.title}」全部阶段`;
    advice = `你已经完成这条路径的全部 ${summaries.length} 个阶段，可以挑战新的课程路径，或回到复习巩固已经学过的句子。`;
    nextActionLabel = "挑战新路径";
  } else if (hasCompletedStage && nextStage) {
    headline = `已完成 ${completedStages.length} 个阶段，进入「${nextStage.title}」`;
    advice = `下一阶段：${nextStage.goal} 先完成 ${nextStage.nextMaterial?.title ?? "下一篇材料"}，再按完成标准做一次输出。`;
    nextActionLabel = "进入下一篇";
  } else if (currentStage) {
    headline = `继续推进当前阶段「${currentStage.title}」`;
    advice = `先完成当前阶段：${currentStage.completionCriteria[0] ?? currentStage.goal} 完成后这里会给出下一阶段建议。`;
    nextActionLabel = "继续当前阶段";
  } else {
    headline = `开始「${track.title}」`;
    advice = "这条路径还没有阶段进度，先从第一篇材料开始。";
    nextActionLabel = "开始学习";
  }

  return {
    trackId: track.id,
    trackTitle: track.title,
    hasCompletedStage,
    trackCompleted,
    completedStageTitles: completedStages.map((stage) => stage.title),
    coveredMaterials,
    currentStage,
    nextStage,
    nextMaterialId,
    headline,
    advice,
    nextActionLabel
  };
}

export const seedMaterialContentById: Record<string, string> = {
  "apartment-tour":
    "Mia is looking for a small apartment near her work. The landlord shows her a one-bedroom unit on the second floor. Mia asks about the monthly rent and the security deposit. She also asks if heat and water are included. The landlord says the bus stop is two blocks away. Mia wants to know if maintenance is available on weekends.",
  "work-intro":
    "My name is Li, and I studied automation in college. I have worked with control systems, sensors, and production equipment. In my last job, I helped check alarms and find simple faults. I can read basic diagrams and follow safety steps. I am still improving my English, but I can explain problems step by step. I want to become more comfortable in meetings and interviews.",
  "grocery-store":
    "Chen walks into a grocery store after work. He wants to buy milk, eggs, rice, and apples. He asks an employee where he can find the rice. The employee says it is in aisle five, near the noodles. At checkout, the cashier asks if Chen wants a receipt. Chen pays with a debit card and says thank you.",
  "n400-small-talk":
    "The officer greets Wei and asks him to raise his right hand. Wei promises to tell the truth. The officer asks for his full name, current address, and date of birth. Then the officer asks where Wei works and how long he has lived at his address. Wei answers slowly and clearly. When he does not understand a question, he asks the officer to repeat it.",
  "plc-basic":
    "A machine stops during the morning shift. The operator sees a fault alarm on the screen. The technician checks the sensor signal first. Then he checks the input and output lights on the PLC. One sensor is dirty, so the signal is weak. The technician cleans the sensor and restarts the machine. He writes a short note for the next shift.",
  "pharmacy-refill":
    "Ana goes to the pharmacy to refill her medicine. The pharmacist asks for her name and date of birth. Ana says she has two pills left. The pharmacist checks the computer and says the refill is ready. Ana asks if she should take the medicine with food. The pharmacist explains the instructions and gives her the receipt.",
  "bank-account":
    "David goes to a bank to open a checking account. The banker asks for his photo ID and proof of address. David gives his passport and a utility bill. The banker explains the debit card, online banking, and monthly fee. David asks how to deposit his paycheck. The banker says direct deposit is usually the easiest way.",
  "bus-directions":
    "Sam needs to take the bus to a clinic. He opens the map on his phone but feels unsure. He asks a woman at the bus stop, 'Does this bus go to Main Street?' The woman says yes, but Sam needs to get off after five stops. Sam thanks her and sits near the front. When the bus gets close, he presses the stop button.",
  "maintenance-request":
    "The kitchen sink in Grace's apartment is leaking. She calls the leasing office in the morning. She says water is dripping under the sink and the cabinet is wet. The office asks if it is an emergency. Grace says the water is slow but constant. The office creates a maintenance request and says someone can come tomorrow.",
  "neighbor-small-talk":
    "Kevin meets his neighbor in the hallway. The neighbor smiles and says, 'Good morning.' Kevin says good morning and asks how her weekend was. She says it was quiet and asks if Kevin is new in the building. Kevin says he moved in last month. They talk for one minute, and Kevin feels more comfortable.",
  "utility-bill":
    "Lily receives her first electricity bill in the mail. She sees the account number, due date, and total amount. The bill says she can pay online or by phone. Lily creates an online account and adds her bank card. She sets a reminder before the due date. She wants to avoid a late fee.",
  "safety-meeting":
    "Before the shift starts, the supervisor holds a short safety meeting. He reminds everyone to wear safety glasses and lock out the machine before repair. One worker asks about a wet area near the line. The supervisor says maintenance will check it. The team repeats the main rule: stop the machine before touching moving parts.",
  "shift-handover":
    "At the end of the shift, Maria gives a handover to the next technician. She says line two had two short stops in the afternoon. The temperature sensor looked unstable, but the machine is running now. She left a note in the logbook. The next technician asks what to check first if the alarm returns.",
  "interview-automation":
    "During an interview, the manager asks Daniel to describe his experience. Daniel says he has worked with sensors, motors, and control panels. He explains that he likes troubleshooting because it is like solving a puzzle step by step. The manager asks about safety. Daniel says he follows procedures and asks questions when he is not sure.",
  "address-change":
    "After moving to a new apartment, Omar needs to update his address. He opens the official website and reads the instructions carefully. The form asks for his old address, new address, and move-in date. Omar checks every line before he submits it. He saves the confirmation number in a folder.",
  "civics-rights":
    "In a citizenship class, the teacher talks about rights and responsibilities. Students learn that people can vote, speak freely, and practice their religion. They also learn that citizens should obey the law and serve on a jury if called. The teacher says it is important to understand the meaning, not only memorize the words.",
  "oath-ceremony":
    "At the oath ceremony, many people sit in a large room. An officer explains the steps and asks everyone to stand. People repeat the oath together. Some people feel nervous, and some people smile. After the ceremony, they receive their certificates. Many families take photos outside the building.",
  "restaurant-order":
    "Tina sits down at a small diner for lunch. The server brings the menu and a glass of water. Tina is not ready yet, so she asks for a few more minutes. When the server comes back, Tina orders a chicken sandwich and a small salad. She asks if the sandwich comes with fries. At the end, she asks the server to split the check with her friend.",
  "post-office":
    "Raj goes to the post office to mail a box to his family. The clerk asks if anything inside is fragile or liquid. Raj says it is only clothes and a small gift. The clerk weighs the box and explains two shipping options. Raj chooses the cheaper one that takes about five days. He pays at the counter and keeps the tracking number.",
  "phone-plan":
    "Sofia visits a phone store to set up a new plan. She wants enough data but does not want to pay too much. The worker explains a plan with unlimited talk, text, and ten gigabytes of data. Sofia asks if there is a contract or a monthly fee. The worker says it is month to month, so she can cancel anytime. Sofia signs up and moves her old number to the new plan.",
  "lease-signing":
    "Before moving in, Hassan reads the lease with the property manager. The lease lists the monthly rent, the deposit, and the move-in date. The manager explains that rent is due on the first of each month. Hassan asks what happens if he pays late. The manager points to the late fee section and the rules about guests. Hassan asks for a copy after he signs every page.",
  "equipment-checklist":
    "At the start of the shift, Ken follows a simple checklist before he starts the machine. First, he checks that the emergency stop button works. Next, he looks at the air pressure and the oil level. He also makes sure no tools are left near the moving parts. If something looks wrong, he marks it on the sheet and tells the supervisor. When everything is clear, he signs the checklist and starts the line.",
  "civics-history":
    "In class, students learn a few basic facts about the United States. They learn that the country has fifty states and a flag with thirteen stripes. The teacher explains that the Constitution is the highest law of the land. Students also learn the names of the three branches of government. The teacher asks simple questions, like who the first president was. Many of these questions also appear on the citizenship test.",
  ...supplementalSeedMaterialContentById
};
