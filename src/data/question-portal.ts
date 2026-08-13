export const questionPortalCopy = {
  seo: {
    title: {
      absolute:
        "Ask a Psychology Question | Dr. Vandana Rajiv Chaudhary",
    },
    description:
      "Submit a psychology-related question for review by Dr. Vandana Rajiv Chaudhary. This form is educational and is not an emergency or diagnostic service.",
  },
  hero: {
    eyebrow: "Private question review",
    heading: "Ask a Psychology Question",
    supportingText:
      "Have a question about emotional well-being, stress, relationships, parenting, confidence, or other psychological concerns? You may submit your question for review.",
  },
  notices: [
    "This form is not an emergency service. If you need urgent help, please contact local emergency services.",
    "Submitting a question does not create an immediate psychologist–patient relationship.",
    "Some questions may need a fuller professional assessment than a written reply can provide.",
    "Please share only what is needed to ask your question. You do not have to include your name.",
    "A response is not guaranteed to be immediate.",
  ],
  consentLabel:
    "I understand this is not an emergency service, that a written reply is educational and not a diagnosis or treatment, and that I should avoid sharing unnecessary personal or medical details.",
  successTitle: "Your question has been received",
  successMessage:
    "Thank you. Your question has been submitted for review. If you included an email address and a reply is appropriate, Dr. Vandana may respond when she is able to.",
  abuseRejectedMessage:
    "We could not accept this submission. Please try again in a little while.",
  rateLimitedMessage:
    "Please wait a little while before submitting another question.",
  deliveryFailedMessage:
    "Your question could not be saved just now. Please try again later, or use the contact page if the difficulty continues.",
  categories: [
    { value: "stress-management", label: "Stress Management" },
    { value: "anxiety", label: "Anxiety" },
    { value: "emotional-well-being", label: "Emotional Well-being" },
    { value: "relationships", label: "Relationships" },
    { value: "parenting", label: "Parenting" },
    { value: "child-psychology", label: "Child Psychology" },
    { value: "adolescent-mental-health", label: "Adolescent Mental Health" },
    { value: "self-esteem", label: "Self-esteem" },
    { value: "workplace-stress", label: "Workplace Stress" },
    { value: "anger-management", label: "Anger Management" },
    { value: "grief-loss", label: "Grief & Loss" },
    { value: "personal-growth", label: "Personal Growth" },
    { value: "mindfulness", label: "Mindfulness" },
    { value: "other", label: "Other" },
  ],
  responseMethods: [
    { value: "email", label: "Email, if I provided one" },
    { value: "portal-only", label: "No email reply needed" },
    { value: "no-preference", label: "No preference" },
  ],
} as const;
