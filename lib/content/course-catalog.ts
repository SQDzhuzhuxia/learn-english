export type CourseTrack = {
  id: string;
  title: string;
  subtitle: string;
  levelRange: string;
  weeklyGoal: string;
  focus: string;
  materialIds: string[];
  outcomes: string[];
};

export const courseTracks: CourseTrack[] = [
  {
    id: "survival-foundation",
    title: "美国生活生存英语",
    subtitle: "先把看医生、买东西、银行和交通这些高频场景听懂说清楚。",
    levelRange: "A1-A2",
    weeklyGoal: "每周 4 篇短材料 + 3 次跟读",
    focus: "生活高频句、礼貌请求、听懂前台和柜台问题",
    materialIds: ["doctor-visit", "grocery-store", "pharmacy-refill", "bank-account", "bus-directions"],
    outcomes: ["能预约和确认时间", "能询问商品和价格", "能处理简单柜台问题"]
  },
  {
    id: "housing-and-neighborhood",
    title: "租房和社区融入",
    subtitle: "围绕看房、维修、账单和邻里交流建立真实输入。",
    levelRange: "A1-A2",
    weeklyGoal: "每周 3 篇材料 + 2 次复述",
    focus: "租房关键词、维修描述、邻里寒暄和生活问题说明",
    materialIds: ["apartment-tour", "maintenance-request", "utility-bill", "neighbor-small-talk"],
    outcomes: ["能问租金押金", "能描述家里问题", "能和邻居进行简单寒暄"]
  },
  {
    id: "work-automation",
    title: "自动化职场英语",
    subtitle: "用你的自动化背景做职场输入，慢慢积累可说可写的专业表达。",
    levelRange: "A2-B1",
    weeklyGoal: "每周 3 篇材料 + 1 次角色演练",
    focus: "设备故障、交接班、安全会议、面试表达",
    materialIds: ["work-intro", "plc-basic", "safety-meeting", "shift-handover", "interview-automation"],
    outcomes: ["能介绍工作背景", "能描述故障和排查步骤", "能回答基础岗位面试问题"]
  },
  {
    id: "immigration-civics",
    title: "移民和入籍基础",
    subtitle: "提前熟悉 N-400、地址、工作、家庭和公民常识相关表达。",
    levelRange: "A2",
    weeklyGoal: "每周 2 篇材料 + 1 次问答练习",
    focus: "身份信息问答、入籍面试 warm-up、公民常识高频句",
    materialIds: ["n400-small-talk", "address-change", "civics-rights", "oath-ceremony"],
    outcomes: ["能回答个人信息问题", "能理解常见移民表述", "能为后续入籍材料学习打底"]
  }
];

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
    "At the oath ceremony, many people sit in a large room. An officer explains the steps and asks everyone to stand. People repeat the oath together. Some people feel nervous, and some people smile. After the ceremony, they receive their certificates. Many families take photos outside the building."
};
