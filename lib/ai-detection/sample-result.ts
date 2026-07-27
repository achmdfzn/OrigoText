import { verdictBandForProbability } from "./scoring";
import type {
  DetectionResult,
  FeatureSignal,
  SentencePrediction,
  SuspectedModel,
} from "./types";

const sentenceSeeds: ReadonlyArray<{ text: string; aiProbability: number }> = [
  {
    text: "The proliferation of large language models has fundamentally transformed the landscape of automated content generation.",
    aiProbability: 0.84,
  },
  {
    text: "Moreover, these systems demonstrate a remarkable capacity to produce text that is coherent, contextually appropriate, and stylistically consistent.",
    aiProbability: 0.79,
  },
  {
    text: "I spent three weeks last spring wrestling with a dataset that refused to cooperate, and honestly it nearly broke me.",
    aiProbability: 0.12,
  },
  {
    text: "It is important to note that the implications of this technology are both far-reaching and multifaceted in nature.",
    aiProbability: 0.88,
  },
  {
    text: "The professor scribbled a note in the margin — \"rethink this\" — and I stared at it for an hour.",
    aiProbability: 0.09,
  },
  {
    text: "Furthermore, a comprehensive understanding of these dynamics is essential for stakeholders across various domains.",
    aiProbability: 0.83,
  },
  {
    text: "We ran the experiment twice because the first batch got contaminated when the fridge died overnight.",
    aiProbability: 0.18,
  },
  {
    text: "In conclusion, the continued advancement of these models necessitates careful consideration of ethical frameworks.",
    aiProbability: 0.76,
  },
];

const signals: ReadonlyArray<FeatureSignal> = [
  {
    id: "perplexity",
    label: "Perplexity",
    value: 0.72,
    description:
      "Low perplexity means the text is highly predictable to a language model — a common trait of machine-generated writing.",
    leansToward: "ai",
  },
  {
    id: "burstiness",
    label: "Burstiness",
    value: 0.31,
    description:
      "Human writing tends to vary sentence length and complexity. Low burstiness indicates unusually uniform structure.",
    leansToward: "ai",
  },
  {
    id: "vocabulary",
    label: "Lexical diversity",
    value: 0.48,
    description:
      "Moderate diversity — some repetition of transitional phrases typical of generated text.",
    leansToward: "mixed",
  },
  {
    id: "syntax",
    label: "Syntactic uniformity",
    value: 0.68,
    description:
      "Sentence structures are more regular than a typical human sample of this length.",
    leansToward: "ai",
  },
  {
    id: "idiom",
    label: "Idiomatic variation",
    value: 0.55,
    description:
      "Presence of personal anecdote and colloquial phrasing pulls against a purely generated signal.",
    leansToward: "human",
  },
];

const suspectedModels: ReadonlyArray<SuspectedModel> = [
  { family: "GPT-family", affinity: 0.62 },
  { family: "Claude-family", affinity: 0.41 },
  { family: "Gemini-family", affinity: 0.28 },
];

function countWords(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function buildSampleResult(): DetectionResult {
  const sentences: ReadonlyArray<SentencePrediction> = sentenceSeeds.map(
    (seed, index) => ({
      id: `sent-${index + 1}`,
      text: seed.text,
      aiProbability: seed.aiProbability,
    }),
  );

  const wordCount = sentences.reduce(
    (sum, sentence) => sum + countWords(sentence.text),
    0,
  );

  const aiProbability =
    sentences.reduce((sum, sentence) => sum + sentence.aiProbability, 0) /
    sentences.length;

  return {
    id: "det_5F1M9XQ",
    documentTitle: "Advances in Neural Text Generation and Detection.docx",
    wordCount,
    analyzedAt: "2026-07-27T09:22:00+07:00",
    aiProbability,
    confidence: 0.81,
    verdict: verdictBandForProbability(aiProbability).verdict,
    perplexity: 24.6,
    burstiness: 0.31,
    signals,
    sentences,
    suspectedModels,
  };
}
