import type { StudyMaterialRecord } from "@/lib/content/types";

type SeedMaterialCard = Pick<
  StudyMaterialRecord,
  | "id"
  | "title"
  | "type"
  | "level"
  | "minutes"
  | "status"
  | "progress"
  | "knownRate"
  | "inputType"
  | "priority"
  | "summary"
  | "keyExpressions"
>;

type ScenarioSeed = {
  id: string;
  title: string;
  type: string;
  level: string;
  priority: string;
  summary: string;
  keyExpressions: [string, string, string];
  learner: string;
  place: string;
  need: string;
  problem: string;
  result: string;
};

function s(
  id: string,
  title: string,
  type: string,
  level: string,
  priority: string,
  summary: string,
  keyExpressions: [string, string, string],
  learner: string,
  place: string,
  need: string,
  problem: string,
  result: string
): ScenarioSeed {
  return {
    id,
    title,
    type,
    level,
    priority,
    summary,
    keyExpressions,
    learner,
    place,
    need,
    problem,
    result
  };
}

export const supplementalStageScenarios: Record<string, ScenarioSeed[]> = {
  "survival-medical-shopping": [
    s("urgent-care-checkin", "Checking In at Urgent Care", "美国生活", "A1+", "医疗补充", "急诊诊所登记、保险卡和等待时间。", ["check in", "insurance card", "How long is the wait?"], "Mina", "an urgent care clinic", "check in for a sore ear", "the front desk cannot find her insurance card at first", "the clerk updates the record"),
    s("dental-cleaning", "Scheduling a Dental Cleaning", "美国生活", "A1+", "医疗补充", "预约洗牙、确认保险和改时间。", ["dental cleaning", "reschedule the appointment", "covered by insurance"], "Leo", "a dental office", "schedule a cleaning", "the first time is too early in the morning", "he chooses a Friday afternoon appointment"),
    s("eye-exam", "Getting an Eye Exam", "美国生活", "A1+", "医疗补充", "预约验光、描述视力问题、领取处方。", ["eye exam", "blurry vision", "glasses prescription"], "Nora", "an eye clinic", "ask for an eye exam", "small letters are hard for her to read", "the doctor gives her a glasses prescription"),
    s("pharmacy-insurance-card", "Using an Insurance Card at the Pharmacy", "美国生活", "A1+", "医疗补充", "药房刷保险卡、核对生日、询问自付金额。", ["insurance card", "copay", "date of birth"], "Owen", "a pharmacy counter", "pick up medicine", "the price looks higher than expected", "the pharmacist checks the insurance again"),
    s("grocery-return", "Returning Groceries", "日常", "A1", "生活补充", "超市退货、出示小票、换新商品。", ["return this item", "receipt", "exchange it"], "Grace", "a grocery store", "return a bag of apples", "some apples are damaged", "the cashier gives her a fresh bag"),
    s("supermarket-coupon", "Using a Supermarket Coupon", "日常", "A1", "生活补充", "使用优惠券、确认折扣和会员号码。", ["coupon", "member number", "discount"], "Hao", "a supermarket", "use a digital coupon", "the discount does not appear on the screen", "the cashier enters his member number"),
    s("drive-through-order", "Ordering at a Drive-through", "美国生活", "A1", "生活补充", "汽车餐厅点餐、确认套餐和取餐窗口。", ["combo meal", "no ice", "pick-up window"], "Ivy", "a drive-through restaurant", "order dinner after work", "the speaker is hard to hear", "she repeats the order slowly"),
    s("coffee-shop-order", "Ordering Coffee for a Coworker", "日常", "A1", "生活补充", "咖啡店点单、选择大小和替换牛奶。", ["medium coffee", "oat milk", "for here or to go"], "Ben", "a coffee shop", "buy coffee for a coworker", "he forgets the milk choice", "he checks the message and orders again"),
    s("clinic-billing-question", "Asking About a Clinic Bill", "美国生活", "A2", "医疗补充", "看懂账单、询问余额、确认付款方式。", ["billing office", "remaining balance", "payment plan"], "Sara", "a clinic billing office", "ask about a medical bill", "the balance is different from the insurance letter", "the office explains the remaining balance")
  ],
  "survival-services-transit": [
    s("dmv-address-update", "Updating an Address at the DMV", "美国生活", "A2", "服务补充", "DMV 更新地址、排队取号、保存确认。", ["update my address", "take a number", "confirmation letter"], "Victor", "the DMV", "update his address", "he brings the wrong proof of address", "the clerk tells him what to bring next time"),
    s("library-card", "Getting a Library Card", "日常", "A1", "服务补充", "办理图书卡、填写地址、借书。", ["library card", "proof of address", "borrow books"], "Emma", "the public library", "get a library card", "she does not know if a phone bill is enough", "the librarian accepts the bill"),
    s("laundromat-help", "Using a Laundromat", "日常", "A1", "服务补充", "自助洗衣、换硬币、选择机器。", ["change machine", "detergent", "dryer"], "Ken", "a laundromat", "wash clothes on Sunday", "the change machine does not take his bill", "an employee helps him use a card"),
    s("rideshare-pickup", "Finding a Rideshare Pickup", "交通", "A1+", "出行补充", "打车定位、确认车牌和上车地点。", ["pickup spot", "license plate", "I am near the entrance"], "Lina", "a mall entrance", "find her rideshare driver", "there are two entrances with the same name", "the driver asks her to stand by the pharmacy sign"),
    s("airport-shuttle", "Taking an Airport Shuttle", "交通", "A1+", "出行补充", "机场摆渡车、确认航站楼和行李。", ["airport shuttle", "terminal", "luggage"], "Raj", "the airport shuttle stop", "get to the correct terminal", "he is not sure if the shuttle stops at terminal three", "the driver confirms the route"),
    s("package-pickup", "Picking Up a Package", "美国生活", "A1+", "服务补充", "取包裹、出示 ID、签收。", ["pick up a package", "photo ID", "sign here"], "Amy", "a package pickup counter", "pick up a missed delivery", "the tracking number is on her phone with low battery", "the clerk finds the package by address"),
    s("debit-card-replacement", "Replacing a Debit Card", "银行", "A2", "服务补充", "银行卡丢失、冻结旧卡、寄新卡。", ["replace my debit card", "freeze the card", "mail a new card"], "Daniel", "a bank branch", "replace a lost debit card", "he is worried about unknown charges", "the banker freezes the old card"),
    s("money-order", "Buying a Money Order", "银行", "A1+", "服务补充", "购买 money order、填写收款人和金额。", ["money order", "pay to the order of", "service fee"], "Mei", "a post office counter", "buy a money order for rent", "she is unsure where to write the landlord name", "the clerk shows her the line"),
    s("phone-repair", "Asking About Phone Repair", "美国生活", "A1+", "服务补充", "手机维修、说明屏幕问题、询问报价。", ["cracked screen", "repair estimate", "same-day service"], "Luis", "a phone repair shop", "ask about a cracked screen", "the repair may take longer than one day", "the worker gives him an estimate")
  ],
  "housing-rent-maintenance": [
    s("rental-application", "Filling Out a Rental Application", "租房", "A2", "租房补充", "填写租房申请、工作信息和申请费。", ["rental application", "application fee", "employment information"], "Tara", "a leasing office", "fill out a rental application", "she is not sure how to write her employer name", "the agent points to the correct line"),
    s("move-in-inspection", "Doing a Move-in Inspection", "租房", "A2", "租房补充", "入住检查、拍照记录、提交表格。", ["move-in inspection", "take photos", "damage form"], "Evan", "a new apartment", "check the unit before moving in", "one window screen is torn", "he writes it on the form"),
    s("pest-control", "Requesting Pest Control", "租房", "A1+", "维修补充", "报告虫害、预约 pest control、清理厨房。", ["pest control", "small bugs", "schedule a visit"], "Rina", "her apartment office", "request pest control", "she saw small bugs near the sink", "the office schedules a visit"),
    s("broken-heater", "Reporting a Broken Heater", "租房", "A1+", "维修补充", "暖气坏了、说明温度、询问维修时间。", ["heater is not working", "very cold", "maintenance technician"], "Omar", "his apartment", "report a broken heater", "the room is cold at night", "maintenance comes the next morning"),
    s("smoke-alarm-battery", "Changing a Smoke Alarm Battery", "租房", "A1", "维修补充", "烟雾报警器响、请求换电池、确认安全。", ["smoke alarm", "battery", "beeping sound"], "Jin", "a leasing office", "ask about a beeping smoke alarm", "the sound happens every minute", "the office sends someone to replace the battery"),
    s("parking-permit", "Getting a Parking Permit", "租房", "A1+", "社区补充", "办理停车证、登记车牌和车位。", ["parking permit", "license plate", "assigned space"], "Kelly", "the apartment office", "get a parking permit", "her license plate has a temporary tag", "the manager gives her a temporary permit"),
    s("renters-insurance", "Asking About Renters Insurance", "租房", "A2", "租房补充", "询问租客保险、上传证明和截止日期。", ["renters insurance", "proof of coverage", "deadline"], "Chris", "a leasing office", "ask about renters insurance", "he does not know what proof to upload", "the agent shows him an example"),
    s("laundry-room-issue", "Reporting a Laundry Room Issue", "租房", "A1+", "维修补充", "洗衣房机器坏、退款和维修单。", ["washing machine", "out of order", "refund"], "Priya", "the laundry room", "report a broken washing machine", "her clothes are wet and the machine stopped", "the office gives her a refund code"),
    s("mailbox-key", "Asking for a Mailbox Key", "租房", "A1", "社区补充", "领取邮箱钥匙、确认号码和押金。", ["mailbox key", "unit number", "key deposit"], "Noah", "the apartment office", "ask for a mailbox key", "he does not know the mailbox number", "the manager checks his unit number")
  ],
  "housing-bills-community": [
    s("water-bill", "Reading a Water Bill", "租房", "A1+", "账单补充", "水费账单、到期日和自动付款。", ["water bill", "due date", "auto pay"], "Helen", "her kitchen table", "read her water bill", "she cannot find the due date", "she sets auto pay online"),
    s("internet-setup", "Setting Up Home Internet", "美国生活", "A2", "账单补充", "安装网络、选择套餐和预约技术员。", ["internet plan", "installation appointment", "router"], "Marco", "an internet provider store", "set up home internet", "the fastest plan is too expensive", "he chooses a basic plan"),
    s("trash-day", "Asking About Trash Day", "社区", "A1", "社区补充", "询问垃圾日、回收箱和大件垃圾。", ["trash day", "recycling bin", "large item pickup"], "Yuki", "her apartment hallway", "ask about trash day", "she missed the pickup last week", "a neighbor explains the schedule"),
    s("community-office", "Visiting the Community Office", "社区", "A1+", "社区补充", "社区办公室咨询、打印表格和活动时间。", ["community office", "print a form", "office hours"], "Sam", "a community office", "ask for help printing a form", "the office closes soon", "the worker prints the form quickly"),
    s("neighbor-noise", "Talking About Noise Politely", "社区", "A2", "社区补充", "礼貌沟通噪音、说明时间和请求降低音量。", ["could you keep it down", "after ten o'clock", "I appreciate it"], "Alina", "her neighbor's door", "talk about loud music", "she feels nervous to complain", "the neighbor apologizes"),
    s("package-room", "Using a Package Room", "社区", "A1+", "社区补充", "包裹室取件、验证码和柜门。", ["package room", "access code", "locker"], "Peter", "the apartment package room", "pick up a package", "the locker door does not open", "the office resets the access code"),
    s("community-notice", "Understanding a Community Notice", "社区", "A2", "社区补充", "阅读停水通知、时间范围和准备事项。", ["community notice", "water shutoff", "between 9 and 12"], "Fang", "the building lobby", "understand a notice", "she is not sure when the water will stop", "she takes a photo and prepares water"),
    s("power-outage", "Reporting a Power Outage", "美国生活", "A1+", "账单补充", "停电报告、地址确认和预计恢复。", ["power outage", "report the address", "estimated time"], "Andre", "his apartment", "report a power outage", "his phone battery is low", "the utility company gives an estimated time"),
    s("community-event", "Joining a Community Event", "社区", "A1", "社区补充", "报名社区活动、询问费用和地点。", ["community event", "sign up", "free admission"], "Maya", "a neighborhood center", "join a community event", "she is not sure if she needs to pay", "the volunteer says admission is free")
  ],
  "automation-self-intro-troubleshooting": [
    s("sensor-replacement", "Replacing a Sensor", "自动化", "A2", "职场补充", "传感器更换、确认型号和测试信号。", ["replace the sensor", "part number", "test the signal"], "Kai", "the production line", "replace a sensor", "the part number is hard to read", "he checks the spare parts shelf"),
    s("motor-overload", "Checking a Motor Overload", "自动化", "A2", "职场补充", "电机过载报警、复位和记录。", ["motor overload", "reset the alarm", "write a note"], "Iris", "a control cabinet", "check a motor overload", "the alarm returns after reset", "she writes a note for maintenance"),
    s("hmi-alarm", "Reading an HMI Alarm", "自动化", "A2", "职场补充", "HMI 报警、查看代码和通知主管。", ["HMI alarm", "alarm code", "call the supervisor"], "Tom", "the machine screen", "read an HMI alarm", "the code is not in the quick guide", "he calls the supervisor"),
    s("calibration-check", "Doing a Calibration Check", "自动化", "A2", "职场补充", "校准检查、读数偏差和复测。", ["calibration check", "reading is high", "test again"], "Nina", "a test bench", "do a calibration check", "one reading is higher than normal", "she tests again and records it"),
    s("wiring-label", "Checking a Wiring Label", "自动化", "A2", "职场补充", "检查线号、图纸和端子排。", ["wiring label", "terminal block", "electrical drawing"], "Ali", "a panel room", "check a wiring label", "two wires have similar numbers", "he compares them with the drawing"),
    s("spare-parts-request", "Requesting Spare Parts", "自动化", "A2", "职场补充", "申请备件、说明数量和紧急程度。", ["spare parts", "request form", "urgent"], "Eva", "the maintenance office", "request spare parts", "only one part is left in stock", "she marks the request urgent"),
    s("production-report", "Writing a Production Report", "自动化", "A2", "职场补充", "生产报告、停机时间和原因。", ["production report", "downtime", "root cause"], "Bo", "the shift desk", "write a production report", "he must explain a short stop", "he writes the downtime and root cause"),
    s("diagram-review", "Reviewing a Simple Diagram", "自动化", "A2", "职场补充", "阅读图纸、确认传感器和输出。", ["diagram", "input signal", "output relay"], "Cindy", "a training room", "review a simple diagram", "she mixes up input and output", "the trainer explains the symbols"),
    s("tool-checkout", "Checking Out Tools", "自动化", "A1+", "职场补充", "借工具、签名和归还时间。", ["check out tools", "sign the sheet", "return time"], "Rex", "the tool room", "check out a meter", "the tool room needs his employee number", "he signs the checkout sheet")
  ],
  "automation-shift-safety": [
    s("lockout-tagout", "Following Lockout Tagout", "自动化", "A2", "安全补充", "上锁挂牌、确认能量隔离和复位。", ["lockout tagout", "energy source", "remove the lock"], "Mason", "a maintenance area", "follow lockout tagout", "one valve is still open", "the team closes it before work starts"),
    s("ppe-check", "Doing a PPE Check", "自动化", "A1+", "安全补充", "检查 PPE、安全眼镜和手套。", ["PPE check", "safety glasses", "cut-resistant gloves"], "Yara", "the line entrance", "do a PPE check", "a visitor does not have gloves", "she gives the visitor a new pair"),
    s("forklift-area", "Walking Near a Forklift Area", "自动化", "A1+", "安全补充", "叉车区域、走人行道和眼神确认。", ["forklift area", "walkway", "make eye contact"], "Owen", "the warehouse", "walk near a forklift area", "a forklift is backing up", "he waits in the walkway"),
    s("chemical-label", "Reading a Chemical Label", "自动化", "A2", "安全补充", "化学品标签、手套和通风。", ["chemical label", "wear gloves", "ventilation"], "Luna", "a supply room", "read a chemical label", "the label has a warning symbol", "she asks the safety lead"),
    s("near-miss-report", "Reporting a Near Miss", "自动化", "A2", "安全补充", "未遂事件报告、地点和改进措施。", ["near miss", "report the location", "corrective action"], "Nick", "the supervisor desk", "report a near miss", "a box almost fell from a shelf", "the supervisor creates a corrective action"),
    s("startup-meeting", "Joining a Startup Meeting", "自动化", "A2", "安全补充", "开机会议、产线目标和注意事项。", ["startup meeting", "line target", "watch for alarms"], "Ruby", "the team board", "join a startup meeting", "line three had problems yesterday", "the lead asks the team to watch for alarms"),
    s("quality-hold", "Putting Parts on Quality Hold", "自动化", "A2", "质量补充", "质量隔离、标签和通知工程师。", ["quality hold", "red tag", "call quality"], "Ian", "the inspection table", "put parts on quality hold", "one measurement is outside the limit", "he adds a red tag"),
    s("maintenance-ticket", "Opening a Maintenance Ticket", "自动化", "A2", "职场补充", "维修工单、描述问题和优先级。", ["maintenance ticket", "priority", "describe the issue"], "Zoe", "the maintenance system", "open a maintenance ticket", "the form asks for priority", "she chooses medium priority"),
    s("shift-delay", "Explaining a Shift Delay", "自动化", "A2", "职场补充", "交代延迟、原因和下一步。", ["shift delay", "waiting for parts", "next step"], "Eric", "a shift handover", "explain a shift delay", "parts have not arrived yet", "the next shift checks the delivery time")
  ],
  "automation-interview": [
    s("phone-screen", "Answering a Phone Screen", "职场", "A2", "面试补充", "电话初筛、自我介绍和时间确认。", ["phone screen", "available time", "brief introduction"], "Jade", "a phone interview", "answer a phone screen", "the recruiter speaks quickly", "she asks the recruiter to repeat the time"),
    s("safety-question", "Answering a Safety Question", "职场", "A2", "面试补充", "回答安全问题、举例和原则。", ["safety procedure", "stop the machine", "ask for help"], "Paul", "an interview room", "answer a safety question", "he needs a simple example", "he explains that he stops the machine first"),
    s("teamwork-example", "Giving a Teamwork Example", "职场", "A2", "面试补充", "团队合作例子、说明角色和结果。", ["teamwork example", "my role was", "we solved it"], "Rosa", "an interview room", "give a teamwork example", "she speaks too generally at first", "she adds her role and the result"),
    s("troubleshooting-example", "Explaining Troubleshooting Experience", "职场", "A2", "面试补充", "故障排查经历、步骤和结果。", ["troubleshooting", "step by step", "found the cause"], "Min", "an interview room", "explain troubleshooting experience", "he forgets one step", "he restarts and explains step by step"),
    s("learning-plan", "Talking About a Learning Plan", "职场", "A2", "面试补充", "说明学习计划、英语和技术提升。", ["learning plan", "improve my English", "practice every week"], "Olga", "a job interview", "talk about a learning plan", "the manager asks about English confidence", "she explains her weekly practice plan"),
    s("resume-gap", "Explaining a Resume Gap", "职场", "A2", "面试补充", "解释简历空档、家庭原因和准备。", ["resume gap", "family reason", "ready to return"], "Ben", "a job interview", "explain a resume gap", "he wants to keep the answer short", "he says he is ready to return"),
    s("salary-schedule", "Asking About Schedule and Pay", "职场", "A2", "面试补充", "询问班次、工资范围和加班。", ["work schedule", "pay range", "overtime"], "Sana", "a final interview", "ask about schedule and pay", "she does not want to sound rude", "she asks politely at the end"),
    s("onsite-interview", "Checking In for an Onsite Interview", "职场", "A1+", "面试补充", "现场面试签到、访客证和联系人。", ["onsite interview", "visitor badge", "contact person"], "Tony", "a factory lobby", "check in for an onsite interview", "security asks for the contact person", "he shows the email invitation"),
    s("reference-check", "Preparing for a Reference Check", "职场", "A2", "面试补充", "推荐人核查、联系方式和同意。", ["reference check", "phone number", "permission"], "Lily", "a recruiter call", "prepare for a reference check", "one phone number is old", "she updates the contact information")
  ],
  "immigration-identity-address": [
    s("biometrics-appointment", "Going to a Biometrics Appointment", "入籍", "A2", "移民补充", "打指纹预约、签到和证件。", ["biometrics appointment", "appointment notice", "photo ID"], "Arun", "a USCIS support center", "go to a biometrics appointment", "he is not sure where to check in", "the guard points to the window"),
    s("uscis-online-account", "Using a USCIS Online Account", "入籍", "A2", "移民补充", "USCIS 账号、验证码和案件状态。", ["online account", "verification code", "case status"], "Mei", "her laptop", "check her case status", "the verification code expires", "she requests a new code"),
    s("address-form", "Completing an Address Form", "入籍", "A1+", "移民补充", "地址表格、公寓号和搬入日期。", ["apartment number", "move-in date", "mailing address"], "Hugo", "a form website", "complete an address form", "he forgets the apartment number", "he checks the lease"),
    s("interview-checkin", "Checking In for an Immigration Interview", "入籍", "A2", "移民补充", "面试签到、安检和等待。", ["interview notice", "security check", "waiting room"], "Nadia", "a USCIS office", "check in for an interview", "security asks her to turn off her phone", "she waits in the correct room"),
    s("document-folder", "Preparing a Document Folder", "入籍", "A2", "移民补充", "准备文件夹、复印件和原件。", ["document folder", "original copy", "tax return"], "Chen", "his kitchen table", "prepare a document folder", "he mixes originals and copies", "he labels each section"),
    s("name-spelling", "Spelling a Name Slowly", "入籍", "A1", "移民补充", "慢速拼写姓名、确认字母。", ["spell my name", "middle name", "Could you repeat that?"], "Sara", "an interview desk", "spell her full name", "the officer mishears one letter", "she repeats the spelling slowly"),
    s("travel-history", "Answering Travel History Questions", "入籍", "A2", "移民补充", "旅行记录、日期和国家。", ["travel history", "departure date", "return date"], "Ivan", "an interview room", "answer travel history questions", "he cannot remember one exact date", "he checks his passport stamps"),
    s("work-history", "Explaining Work History", "入籍", "A2", "移民补充", "工作历史、职位和时间。", ["work history", "job title", "since 2022"], "Marta", "an interview room", "explain work history", "she has two similar job titles", "she explains the dates clearly"),
    s("marital-status-question", "Answering Marital Status Questions", "入籍", "A2", "移民补充", "婚姻状态、配偶信息和确认。", ["marital status", "spouse", "currently married"], "Diego", "an interview desk", "answer marital status questions", "he needs to explain a previous divorce", "he answers with short clear sentences")
  ],
  "immigration-civics-oath": [
    s("voter-registration", "Learning About Voter Registration", "入籍", "A2", "公民补充", "选民登记、资格和地址。", ["voter registration", "eligible to vote", "update your address"], "Ana", "a citizenship class", "learn about voter registration", "she asks when a new citizen can register", "the teacher explains the rule"),
    s("jury-duty-letter", "Reading a Jury Duty Letter", "入籍", "A2", "公民补充", "陪审义务信、日期和请假。", ["jury duty", "summons", "report date"], "Kim", "her mailbox", "read a jury duty letter", "she is not sure what date to report", "she circles the report date"),
    s("civics-class", "Joining a Civics Class", "入籍", "A2", "公民补充", "公民课、提问和复习卡。", ["civics class", "study cards", "practice questions"], "Ravi", "a community classroom", "join a civics class", "some questions sound similar", "the teacher gives practice cards"),
    s("flag-question", "Answering a Flag Question", "入籍", "A1+", "公民补充", "国旗问题、条纹和州数。", ["American flag", "thirteen stripes", "fifty states"], "Nina", "a study group", "answer a flag question", "she forgets the number of stripes", "a classmate reviews it with her"),
    s("government-branches", "Reviewing the Branches of Government", "入籍", "A2", "公民补充", "三权分立、简单定义和例子。", ["three branches", "Congress", "Supreme Court"], "Alex", "a civics class", "review government branches", "he mixes up Congress and the Court", "the teacher draws a simple chart"),
    s("tax-responsibility", "Talking About Taxes as a Responsibility", "入籍", "A2", "公民补充", "税务责任、报税和记录。", ["pay taxes", "file a tax return", "responsibility"], "Jenny", "a citizenship class", "talk about taxes", "she asks why taxes are a responsibility", "the teacher explains public services"),
    s("community-volunteer", "Volunteering in the Community", "入籍", "A1+", "公民补充", "社区志愿活动、签到和任务。", ["volunteer", "sign in", "community cleanup"], "Oscar", "a community cleanup", "volunteer on Saturday", "he does not know where to sign in", "a volunteer leader gives him a task"),
    s("oath-notice", "Reading an Oath Ceremony Notice", "入籍", "A2", "公民补充", "宣誓通知、时间地点和携带材料。", ["oath ceremony notice", "bring your green card", "arrive early"], "Lena", "her apartment", "read an oath ceremony notice", "she is unsure what to bring", "she makes a short checklist"),
    s("certificate-correction", "Asking About a Certificate Correction", "入籍", "A2", "公民补充", "证书信息核对、拼写错误和更正。", ["certificate", "spelling mistake", "correction form"], "Mark", "a ceremony help desk", "ask about a certificate correction", "one letter in his name is wrong", "the officer gives him a correction form")
  ]
};

function createScenarioContent(seed: ScenarioSeed) {
  return [
    `${seed.learner} goes to ${seed.place}.`,
    `${seed.learner} needs to ${seed.need}.`,
    "The worker asks one simple question and gives clear instructions.",
    `${seed.learner} says, "${seed.keyExpressions[0]}."`,
    `There is one problem: ${seed.problem}.`,
    `${seed.learner} uses "${seed.keyExpressions[1]}" to ask for help.`,
    `At the end, ${seed.result}, and ${seed.learner} saves the important information.`
  ].join(" ");
}

function knownRateForLevel(level: string, index: number) {
  if (level.startsWith("A1")) {
    return 68 + (index % 11);
  }

  return 48 + (index % 17);
}

const allScenarioSeeds = Object.values(supplementalStageScenarios).flat();

export const supplementalSeedMaterials: SeedMaterialCard[] = allScenarioSeeds.map((seed, index) => ({
  id: seed.id,
  title: seed.title,
  type: seed.type,
  level: seed.level,
  minutes: 8 + (index % 7),
  status: "未开始",
  progress: 0,
  knownRate: knownRateForLevel(seed.level, index),
  inputType: "场景短文 + 跟读",
  priority: seed.priority,
  summary: seed.summary,
  keyExpressions: seed.keyExpressions
}));

export const supplementalSeedMaterialContentById: Record<string, string> = Object.fromEntries(
  allScenarioSeeds.map((seed) => [seed.id, createScenarioContent(seed)])
);

export const supplementalCourseStageMaterialIds: Record<string, string[]> = Object.fromEntries(
  Object.entries(supplementalStageScenarios).map(([stageId, seeds]) => [
    stageId,
    seeds.map((seed) => seed.id)
  ])
);
