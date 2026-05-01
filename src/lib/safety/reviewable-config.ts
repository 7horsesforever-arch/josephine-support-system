export type SafetyAlertConfidence = "low" | "medium" | "high";

export type SafetyAlertConfig = {
  confidenceLevel: SafetyAlertConfidence;
  moderationModel: string;
  moderationCategories: string[];
  categoryScoreThresholds: Record<SafetyAlertConfidence, number>;
  localTriggerPatterns: string[];
};

export const safetyAlertConfig: SafetyAlertConfig = {
  confidenceLevel: "medium",
  moderationModel: "omni-moderation-latest",
  moderationCategories: [
    "self-harm",
    "self-harm/intent",
    "self-harm/instructions",
  ],
  categoryScoreThresholds: {
    low: 0.2,
    medium: 0.35,
    high: 0.7,
  },
  localTriggerPatterns: [
    "\\bsuicide\\b",
    "\\bsuicidal\\b",
    "\\bself[-\\s]?harm\\b",
    "\\bwant to die\\b",
    "\\bend my life\\b",
    "\\bkill myself\\b",
    "\\bhurt myself\\b",
    "\\boverdose\\b",
    "\\bnot worth living\\b",
  ],
};

export function safetyAlertThreshold() {
  return safetyAlertConfig.categoryScoreThresholds[
    safetyAlertConfig.confidenceLevel
  ];
}

export function localSafetyAlertPatterns() {
  return safetyAlertConfig.localTriggerPatterns.map(
    (pattern) => new RegExp(pattern, "i"),
  );
}
