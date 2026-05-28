export const DEFAULT_WORKSPACE_ID = "syntheci-demo-workspace";

export const SOURCE_BUCKET = "sources";

export const EMBEDDING_DIMENSIONS = 1536;

export const DEMO_WORKFLOWS = [
  {
    id: "voyage-risk",
    title: "Voyage risk briefing",
    prompt: "Which current voyages changed risk status since yesterday?",
  },
  {
    id: "charterparty-claims",
    title: "Charterparty and claims Q&A",
    prompt: "Which clause applies to this delay event and what evidence supports it?",
  },
  {
    id: "emissions-compliance",
    title: "Compliance and emissions exposure",
    prompt: "Which voyages have EU ETS or FuelEU exposure this week?",
  },
  {
    id: "fleet-intelligence",
    title: "Market and fleet intelligence",
    prompt: "Where should we position tonnage based on approved market notes?",
  },
] as const;
