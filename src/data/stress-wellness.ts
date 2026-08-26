import { emergencyNotice } from "@/data/emergency";
import { professionalProfile } from "@/data/professional";
import type {
  AwarenessExperience,
  CopingPractice,
  PageCtaLink,
  TopicPoint,
} from "@/types/stress-wellness";

export const stressWellnessSeo = {
  title: `Stress, Anxiety & Emotional Wellness | ${professionalProfile.name}`,
  description:
    "Educational information on stress, anxiety awareness, depression awareness, burnout and emotional wellness, including healthy coping ideas and when professional psychological support may be helpful.",
} as const;

export const stressWellnessHero = {
  eyebrow: "Educational wellness information",
  heading: "Stress, Anxiety & Emotional Wellness",
  supportingText:
    "Stress and emotional challenges can affect how we think, feel and function in everyday life. Understanding these experiences and developing healthy coping strategies can be an important part of emotional well-being.",
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies PageCtaLink,
  secondaryCta: {
    label: "Explore Areas of Support",
    href: "/areas-of-support",
  } satisfies PageCtaLink,
} as const;

export const stressUnderstanding = {
  heading: "Understanding stress",
  lead: "Stress is a natural response to demands, uncertainty or change. Experiencing stress does not automatically mean someone has a disorder.",
  shortTermNote:
    "Short-term stress can sometimes help people respond to challenges by increasing focus or readiness.",
  ongoingNote:
    "Ongoing or overwhelming stress can sometimes affect sleep, concentration, mood, relationships and daily functioning.",
  closingNote:
    "How stress shows up varies from person to person. This page offers educational information rather than a medical definition or diagnosis.",
} as const;

export const stressEmotionalWellbeing = {
  heading: "Stress & emotional well-being",
  lead: "Emotional well-being can be influenced by many everyday circumstances. These influences do not by themselves establish a diagnosis, and they do not tell visitors exactly what their symptoms mean.",
  influences: [
    "Work demands",
    "Academic pressure",
    "Relationship difficulties",
    "Life transitions",
    "Caregiving responsibilities",
    "Uncertainty",
    "Lack of rest",
    "Major changes",
  ],
  copingNote:
    "Healthy coping can include rest, connection, realistic expectations and supportive routines. What helps one person may differ for another.",
} as const;

export const anxietyAwareness = {
  heading: "Anxiety awareness",
  lead: "Anxiety can describe a range of experiences related to worry, tension or unease. Some people experience these feelings occasionally; for others they may feel more persistent.",
  experiencesIntro:
    "People may experience things such as:",
  experiences: [
    { id: "worry", label: "Persistent worry" },
    { id: "relaxing", label: "Difficulty relaxing" },
    { id: "tense", label: "Feeling tense" },
    { id: "concentration", label: "Difficulty concentrating" },
    {
      id: "physical",
      label: "Physical sensations associated with stress",
    },
  ] satisfies readonly AwarenessExperience[],
  disclaimer:
    "Experiencing one or more of these experiences does not by itself establish a diagnosis. Persistent or significantly disruptive concerns may warrant professional assessment.",
} as const;

export const depressionAwareness = {
  heading: "Depression awareness",
  lead: "Emotional well-being can sometimes include periods of prolonged low mood. Similar experiences can occur for different reasons, and a qualified professional can help determine appropriate support.",
  experiencesIntro: "Some people may notice experiences such as:",
  experiences: [
    { id: "sadness", label: "Persistent sadness or low mood" },
    { id: "interest", label: "Reduced interest or enjoyment" },
    { id: "motivation", label: "Changes in motivation" },
    { id: "sleep-appetite", label: "Changes in sleep or appetite" },
    { id: "hopelessness", label: "Feelings of hopelessness" },
  ] satisfies readonly AwarenessExperience[],
  disclaimer:
    "These points are educational illustrations only and are not a self-diagnosis checklist. They do not mean that counselling cures depression, and no treatment outcome is promised.",
} as const;

export const burnoutSection = {
  heading: "Burnout & workplace stress",
  lead: "Prolonged work pressure can affect emotional well-being. This information is educational and does not provide employment or legal advice.",
  themes: [
    {
      id: "pressure",
      title: "Prolonged work pressure",
      description:
        "Ongoing demands can make it harder to feel rested or emotionally steady.",
    },
    {
      id: "exhaustion",
      title: "Emotional exhaustion",
      description:
        "Some people notice feeling drained even after ordinary workdays.",
    },
    {
      id: "boundaries",
      title: "Difficulty maintaining healthy boundaries",
      description:
        "Work may begin to take up space that was previously reserved for rest or personal life.",
    },
    {
      id: "wellbeing",
      title: "Reduced sense of well-being",
      description:
        "Motivation, enjoyment or emotional balance may feel harder to sustain.",
    },
    {
      id: "recovery",
      title: "Difficulty recovering from work demands",
      description:
        "Even after work ends, it can sometimes feel difficult to switch off or replenish energy.",
    },
  ] satisfies readonly TopicPoint[],
  cta: {
    label: "Explore Workplace Well-being",
    href: "/areas-of-support#workplace-wellbeing",
  } satisfies PageCtaLink,
} as const;

export const healthyCoping = {
  heading: "Healthy coping & daily wellness",
  lead: "General wellness habits may support emotional steadiness for some people. These ideas are low-risk educational suggestions and are not presented as cures for anxiety, depression or any other condition.",
  practices: [
    {
      id: "sleep",
      title: "Regular sleep routines",
      description:
        "Consistent rest patterns may support general well-being and daytime steadiness.",
    },
    {
      id: "structure",
      title: "Balanced daily structure",
      description:
        "A gentle rhythm of activity and pause can make days feel more manageable.",
    },
    {
      id: "movement",
      title: "Movement suited to the individual",
      description:
        "Physical activity appropriate to a person's circumstances may support general well-being.",
    },
    {
      id: "connection",
      title: "Social connection",
      description:
        "Supportive relationships can offer comfort, perspective and a sense of belonging.",
    },
    {
      id: "rest",
      title: "Breaks and rest",
      description:
        "Intentional pauses may help reduce the build-up of ongoing pressure.",
    },
    {
      id: "expectations",
      title: "Realistic expectations",
      description:
        "Adjusting standards to what is currently possible can ease unnecessary strain.",
    },
    {
      id: "boundaries",
      title: "Healthy boundaries",
      description:
        "Clearer limits around time and energy may support emotional balance.",
    },
    {
      id: "reflection",
      title: "Journaling or reflection",
      description:
        "Writing or quiet reflection can sometimes help organise thoughts and feelings.",
    },
    {
      id: "nature",
      title: "Time in nature",
      description:
        "Gentle time outdoors may support a calmer sense of perspective for some people.",
    },
    {
      id: "breathing",
      title: "Mindful breathing",
      description:
        "Brief attention to the breath may offer a simple pause during stressful moments.",
    },
  ] satisfies readonly CopingPractice[],
} as const;

export const mindfulnessSection = {
  heading: "Mindfulness & relaxation",
  lead: "Mindfulness can be understood as paying attention to the present moment with greater awareness. It is not presented here as a cure for mental illness or as a medical treatment protocol.",
  practices: [
    {
      id: "present",
      title: "Present-moment attention",
      description:
        "Noticing what is happening right now, rather than being pulled only into past or future concerns.",
    },
    {
      id: "thoughts",
      title: "Noticing thoughts",
      description:
        "Observing thoughts without automatically reacting to every one of them.",
    },
    {
      id: "breathing",
      title: "Gentle breathing practices",
      description:
        "Using the breath as a simple anchor during brief moments of tension.",
    },
    {
      id: "awareness",
      title: "Intentional awareness",
      description:
        "Short pauses that bring attention back to the body, surroundings or current activity.",
    },
    {
      id: "relaxation",
      title: "Relaxation routines",
      description:
        "Calm practices that may help some people create a sense of settling and rest.",
    },
  ] satisfies readonly TopicPoint[],
} as const;

export const whenProfessionalSupport = {
  heading: "When professional support may help",
  introduction:
    "Professional psychological support may be worth considering when emotional difficulties:",
  points: [
    "persist over time",
    "become difficult to manage",
    "interfere with work or study",
    "affect relationships",
    "disrupt daily functioning",
    "create significant distress",
  ],
  closingNote:
    "Only a qualified professional can determine what type of psychological support may be appropriate for an individual's circumstances. This section is educational and is not a diagnostic checklist.",
} as const;

export const stressEmergencyBoundary = {
  title: emergencyNotice.title,
  message: emergencyNotice.message,
  clarification: emergencyNotice.clarification,
  note: "See the Mental Health Support & Emergency Help page for verified Government of India numbers including 112, Tele-MANAS 14416, and Child Helpline 1098.",
  href: emergencyNotice.supportPageHref,
  ctaLabel: "View verified helplines",
} as const;

export const stressWellnessCta = {
  heading: professionalProfile.tagline,
  description:
    "If stress or emotional concerns are affecting your everyday life, professional psychological support may provide a respectful space to explore what you are experiencing.",
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies PageCtaLink,
  secondaryCta: {
    label: "About Dr. Vandana",
    href: "/about",
  } satisfies PageCtaLink,
} as const;
