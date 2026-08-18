import { z } from "zod";

export const moduleReportItemSchema = z.object({
  moduleId: z.string().min(1),
  moduleTitle: z.string().min(1),
  serviceContent: z.string().nullable(),
  elderResponse: z.string().nullable(),
  completion: z.string().nullable(),
  remarks: z.string().nullable()
});

export const elderStatusSectionSchema = z.object({
  statusTags: z.array(z.string()),
  interactionPerformance: z.string().nullable(),
  physicalCondition: z.string().nullable()
});

export const completedServicesSectionSchema = z.object({
  serviceItems: z.array(z.string()),
  completion: z.string().nullable(),
  elderPerformance: z.string().nullable()
});

export const summaryRemarksSectionSchema = z.object({
  summary: z.string().nullable(),
  incident: z.string().nullable(),
  recommendation: z.string().nullable()
});

export const formDraftSectionSchema = z.object({
  attendanceCount: z.string().nullable(),
  attendees: z.string().nullable(),
  environmentIssue: z.string().nullable(),
  bloodPressure: z.string().nullable(),
  heartRate: z.string().nullable(),
  bloodOxygen: z.string().nullable(),
  basicServices: z.string().nullable(),
  basicServiceReason: z.string().nullable(),
  cognitiveTrainingProvided: z.string().nullable(),
  realityOrientationSharing: z.string().nullable(),
  realityOrientationQuestioning: z.string().nullable(),
  shortTermMemoryObjects: z.string().nullable(),
  shortTermMemoryCards: z.string().nullable(),
  reminiscenceTherapy: z.string().nullable(),
  delayedRecall: z.string().nullable(),
  verbalFluencyNaming: z.string().nullable(),
  verbalFluencyRepeat: z.string().nullable(),
  arithmeticTraining: z.string().nullable(),
  associationTrainingChain: z.string().nullable(),
  associationTrainingHint: z.string().nullable(),
  auditoryAttentionDigits: z.string().nullable(),
  auditoryAttentionMenu: z.string().nullable(),
  auditoryAttentionSpotDifference: z.string().nullable(),
  vitalSignsModule: z.string().nullable(),
  cognitiveTrainingReason: z.string().nullable(),
  motionTrainingProvided: z.string().nullable(),
  motionTrainingReason: z.string().nullable(),
  specialServiceProvided: z.string().nullable(),
  specialServiceDetail: z.string().nullable(),
  valueAddedService: z.string().nullable(),
  brainTraining: z.string().nullable(),
  trainingOther: z.string().nullable()
});

export const moduleStructuredReportSchema = z.object({
  elderStatus: elderStatusSectionSchema,
  completedServices: completedServicesSectionSchema,
  moduleReports: z.array(moduleReportItemSchema),
  summaryAndRemarks: summaryRemarksSectionSchema,
  formDraft: formDraftSectionSchema
});

export const generatedReportSchema = z.object({
  elderId: z.string().min(1),
  transcript: z.string().min(1),
  sessionDate: z.string().nullable(),
  selectedModules: z.array(z.string().min(1)),
  elderStatus: elderStatusSectionSchema,
  completedServices: completedServicesSectionSchema,
  moduleReports: z.array(moduleReportItemSchema),
  summaryAndRemarks: summaryRemarksSectionSchema,
  formDraft: formDraftSectionSchema,
  reportText: z.string().min(1),
  generatedAt: z.string().min(1),
  model: z.string().nullable()
});

export type ModuleReportItem = z.infer<typeof moduleReportItemSchema>;
export type ModuleStructuredReport = z.infer<typeof moduleStructuredReportSchema>;
export type GeneratedReport = z.infer<typeof generatedReportSchema>;
export type ElderStatusSection = z.infer<typeof elderStatusSectionSchema>;
export type CompletedServicesSection = z.infer<typeof completedServicesSectionSchema>;
export type SummaryRemarksSection = z.infer<typeof summaryRemarksSectionSchema>;
export type FormDraftSection = z.infer<typeof formDraftSectionSchema>;

export interface AsrTranscription {
  transcript: string;
  model: string | null;
}

export interface AudioInputMetadata {
  mimeType?: string;
  sampleRateHertz?: number;
  audioChannelCount?: number;
}

export interface AsrStreamSession {
  sessionId: string;
  model: string | null;
}

export interface AsrStreamEvent {
  type: "transcript" | "done" | "error";
  transcript: string;
  interimTranscript?: string;
  finalTranscript?: string;
  isFinal?: boolean;
  model: string | null;
  message?: string;
}
