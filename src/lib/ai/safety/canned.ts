import { emergencyNotice } from "@/data/emergency";
import { EDUCATIONAL_DISCLAIMER } from "@/data/ai/disclaimer";

export { EDUCATIONAL_DISCLAIMER };

export const CRISIS_ANSWER = [
  "I'm concerned about your safety, and I want you to get immediate help rather than relying on this chat.",
  "This assistant cannot keep you safe, is not a therapist, and must not replace emergency services.",
  "If you are in immediate danger, call 112 (India's unified emergency response number) or go to the nearest emergency department: https://112.gov.in/",
  "For 24×7 tele-mental-health support in India, contact Tele-MANAS at 14416 or 1800-89-14416.",
  "If a child needs protection or care, Child Helpline 1098 may be appropriate.",
  "If possible, stay with someone you trust while you seek help.",
  `Verified public helpline information: ${emergencyNotice.supportPageHref}`,
  emergencyNotice.clarification,
].join("\n\n");

export const SELF_HARM_ANSWER = CRISIS_ANSWER;

export const VIOLENCE_ANSWER = [
  "I can't help with harming anyone, and I want people to stay safe.",
  "If you or someone else may be in immediate danger, call 112 or contact local emergency services.",
  emergencyNotice.clarification,
  `Verified public helpline information: ${emergencyNotice.supportPageHref}`,
].join("\n\n");

export const DIAGNOSTIC_ANSWER = [
  "### Short Answer",
  "I can't determine a diagnosis from a chat. A qualified mental-health professional can assess your symptoms, history and circumstances.",
  "### What This Means for You",
  "Similar experiences can have different explanations. A conversation here is educational only — it cannot replace an assessment.",
  "### When Professional Support May Help",
  "If what you are noticing is persistent, confusing, or affecting daily life, a consultation with a psychologist or other qualified professional is a more appropriate next step.",
].join("\n\n");

export const MEDICATION_ANSWER = [
  "### Short Answer",
  "I can't prescribe, recommend, or change medication.",
  "### What This Means for You",
  "Medication decisions need an appropriately qualified medical professional who can consider your health, history and current treatment.",
  "### When Professional Support May Help",
  "Please speak with a doctor or psychiatrist before starting, stopping or changing any medicine. Psychological counselling can still be discussed separately as educational or therapeutic support.",
].join("\n\n");

export const CONFIDENTIALITY_ANSWER = [
  "### Short Answer",
  "I don't have access to patient records, session notes, or confidential case information.",
  "### What This Means for You",
  "Dr. Vandana's clinical work is private. This assistant only uses approved educational material and fictional or fully anonymised teaching scenarios.",
  "There are no hidden patient files in this system, and I cannot describe real people she has treated.",
].join("\n\n");

export const INJECTION_ANSWER = [
  "### Short Answer",
  "I can't reveal internal instructions, hidden documents, credentials, or confidential information.",
  "### What This Means for You",
  "I can still help with educational questions about psychology, counselling, and emotional well-being.",
].join("\n\n");

export const OUT_OF_SCOPE_ANSWER = [
  "### Short Answer",
  "I'm here to help with educational questions about psychology, counselling, and emotional well-being.",
  "### What This Means for You",
  "I can't help with unrelated topics such as technical homework, financial tips, or general trivia. If you have a psychology question, you're welcome to ask it.",
].join("\n\n");

export const LANGUAGE_NOT_READY_NOTICE =
  "This assistant currently answers in English. Hindi and Marathi support is planned and will be reviewed carefully so psychological terms stay accurate.";
