import type { CareModuleId } from "@/lib/care-modules";
import type { ElderlyProfile } from "@/types/elderly";

const now = new Date().toISOString();

export const demoElders: ElderlyProfile[] = [
  {
    id: "elder-chan",
    fullName: "陳小麗",
    roomNo: "OR-0847",
    orderNo: "CLT-0847",
    riskLevel: "medium",
    medicalNotes: "反應遲緩，情緒低落，睡眠不良，高血壓。",
    tips: "今天重點關注精神狀態、認知訓練參與度和防跌運動完成情況。",
    avatar: "sunflower",
    statusTags: ["反應遲緩", "情緒低落", "睡眠不良", "高血壓"],
    vitals: {
      bloodPressure: "158/85",
      heartRate: "82",
      bloodOxygen: "95"
    },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "elder-wong",
    fullName: "黃婆婆",
    roomNo: "B-108",
    orderNo: "CLT-0921",
    riskLevel: "high",
    medicalNotes: "夜間血氧需要重點觀察。",
    tips: "記錄呼吸情況、服藥依從性，以及是否出現疲倦或咳嗽。",
    avatar: "daisy",
    statusTags: ["血氧觀察", "容易疲倦", "服藥提醒"],
    vitals: {
      bloodPressure: "142/78",
      heartRate: "76",
      bloodOxygen: "93"
    },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "elder-lee",
    fullName: "李姨",
    roomNo: "C-215",
    orderNo: "CLT-1068",
    riskLevel: "low",
    medicalNotes: "糖尿病飲食控制中。",
    tips: "優先記錄運動配合度、食慾和情緒波動。",
    avatar: "sakura",
    statusTags: ["飲食控制", "運動觀察", "情緒平穩"],
    vitals: {
      bloodPressure: "128/76",
      heartRate: "74",
      bloodOxygen: "97"
    },
    createdAt: now,
    updatedAt: now
  }
];

export interface DemoModuleAssignment {
  elderId: string;
  requiredModuleIds: CareModuleId[];
  optionalModuleIds: CareModuleId[];
}

export const demoModuleAssignments: DemoModuleAssignment[] = [
  {
    elderId: "elder-chan",
    requiredModuleIds: ["reality_orientation", "short_term_memory"],
    optionalModuleIds: ["reminiscence_therapy", "verbal_fluency", "auditory_attention_training", "brain_training", "fall_prevention_exercise"]
  },
  {
    elderId: "elder-wong",
    requiredModuleIds: ["reality_orientation", "auditory_attention_training"],
    optionalModuleIds: ["short_term_memory", "arithmetic_training", "fall_prevention_exercise"]
  },
  {
    elderId: "elder-lee",
    requiredModuleIds: ["verbal_fluency", "brain_training"],
    optionalModuleIds: ["reality_orientation", "association_training", "fall_prevention_exercise"]
  }
];

export interface DemoCareTask {
  id: string;
  elderId: string;
  scheduledAt: string;
  dueAt: string;
}

function hkTime(offsetMs: number): string {
  const utc = new Date(Date.now() + offsetMs + 8 * 36e5);
  return utc.toISOString().replace("Z", "+08:00");
}

const HOUR = 36e5;

export const demoCareTasks: DemoCareTask[] = [
  {
    id: "task-chan-noon",
    elderId: "elder-chan",
    scheduledAt: hkTime(-2 * HOUR),
    dueAt: hkTime(6 * HOUR)
  },
  {
    id: "task-wong-noon",
    elderId: "elder-wong",
    scheduledAt: hkTime(-1 * HOUR),
    dueAt: hkTime(2 * HOUR)
  },
  {
    id: "task-chan-overdue",
    elderId: "elder-chan",
    scheduledAt: hkTime(-27 * HOUR),
    dueAt: hkTime(-25 * HOUR)
  },
  {
    id: "task-lee-soon",
    elderId: "elder-lee",
    scheduledAt: hkTime(-26 * HOUR),
    dueAt: hkTime(-2 * HOUR)
  }
];

export function getModuleAssignment(elderId: string): DemoModuleAssignment {
  return (
    demoModuleAssignments.find((assignment) => assignment.elderId === elderId) ?? {
      elderId,
      requiredModuleIds: ["reality_orientation"],
      optionalModuleIds: ["short_term_memory", "reminiscence_therapy", "fall_prevention_exercise"]
    }
  );
}
