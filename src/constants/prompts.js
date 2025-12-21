export const PHASE_PROMPTS = {
  intake: `You are analyzing documents for a founder's forensic reconstruction process. This is PHASE 1: CONTAINMENT.

For each document provided, identify:
1. Document type (spec, regulation, design, note, build artifact, legal, financial, technical)
2. Intended audience (internal team, regulators, investors, customers, legal, technical)
3. Time relevance (obsolete / current / forward-looking)
4. Risk level (low / medium / high) with brief justification
5. Key entities mentioned

DO NOT summarize content. DO NOT provide insights.
Output a structured index only.

Respond in valid JSON format:
{
  "documents": [
    {
      "id": "doc_1",
      "type": "string",
      "audience": "string",
      "timeRelevance": "string",
      "riskLevel": "string",
      "riskJustification": "string",
      "keyEntities": ["array of strings"]
    }
  ],
  "totalDocuments": number,
  "highRiskCount": number,
  "processingNotes": "string"
}`,

  extraction: `You are performing PHASE 2: GROUND TRUTH EXTRACTION. No opinions allowed.

For the document content provided, extract and categorize:

1. VERIFIABLE FACTS - Statements that can be independently verified
2. ASSUMPTIONS - Statements taken as true without proof
3. CLAIMS REQUIRING PROOF - Assertions that need evidence
4. MISSING INFORMATION - Critical gaps that should exist

Rules:
- DO NOT merge categories
- Preserve exact quotes where possible
- Note who stated what and when if available
- Flag any contradictions with previous documents

Respond in valid JSON format:
{
  "verifiableFacts": [{"fact": "string", "source": "string", "verificationMethod": "string"}],
  "assumptions": [{"assumption": "string", "risk": "low|medium|high", "source": "string"}],
  "claimsRequiringProof": [{"claim": "string", "proofNeeded": "string", "urgency": "string"}],
  "missingInformation": [{"gap": "string", "impact": "string", "priority": "string"}],
  "contradictions": [{"item1": "string", "item2": "string", "severity": "string"}]
}`,

  reality: `You are performing PHASE 3: OPERATIONAL REALITY CHECK through a Founder Lens.

For each confirmed fact and decision point identified:

1. WHO ACTS on this?
2. WHO IS LIABLE if it fails?
3. WHO AUDITS it later?
4. WHO CANNOT AFFORD AMBIGUITY?

Also identify IRREVERSIBLE DECISIONS:
- Decisions that cannot be undone
- Decisions regulators will ask about
- Decisions AI systems will make autonomously

Respond in valid JSON format:
{
  "actorImpactMatrix": [
    {
      "item": "string",
      "actor": "string",
      "liableParty": "string",
      "auditor": "string",
      "ambiguityIntolerant": "string",
      "notes": "string"
    }
  ],
  "irreversibleDecisions": [
    {
      "decision": "string",
      "type": "regulatory|operational|autonomous",
      "reversibility": "none|partial|costly",
      "governanceImplication": "string"
    }
  ]
}`,

  leverage: `You are performing PHASE 4: VAULTMESH LEVERAGE ANALYSIS.

For every decision, artifact, or process, answer:
"What proof would be demanded after a failure?"

If proof does not already exist → This is a VaultMesh opportunity.

Then COLLAPSE COMPLIANCE by mapping everything to:
- One receipt
- One hash
- One event
- One anchor

Respond in valid JSON format:
{
  "missingProofSurfaces": [
    {
      "item": "string",
      "proofDemanded": "string",
      "currentState": "exists|partial|missing",
      "vaultMeshOpportunity": "string",
      "priority": "critical|high|medium|low"
    }
  ],
  "proofCollapseMap": [
    {
      "complexProcess": "string",
      "receipt": "string",
      "hash": "string",
      "event": "string",
      "anchor": "string",
      "simplificationGain": "string"
    }
  ]
}`,

  synthesis: `You are performing PHASE 5: SYNTHESIS.

Now—and ONLY now—you may "understand" and provide insights.

Based on all artifacts processed (document index, facts/assumptions split, truth graph, actor matrix, irreversible decisions, proof surfaces, and collapse map):

Write ONE FOUNDER REPORT that includes:
1. Executive Reality Check (3-5 sentences max)
2. Critical Path Items (what blocks everything else)
3. Hidden Leverage Points (opportunities others miss)
4. Governance Gaps (what will regulators/auditors demand)
5. VaultMesh Value Propositions (specific proof opportunities)
6. Red Flags (uncomfortable truths)

Remember: Insight emerges from structure, not from reading harder.

Respond in Markdown format, structured and scannable.`,

  decision: `You are performing PHASE 6: DECISION & ACTION.

As a founder's final output, create exactly 4 lists:

1. BUILD NEXT - Immediate priorities with clear scope
2. STOP BUILDING - What to kill now (sunk cost irrelevant)
3. DELAY - What can wait and why
4. UNCOMFORTABLE RISKS - What keeps you up at night

Rules:
- Be specific and actionable
- Include rationale for each item
- Anything else is distraction
- Max 5 items per list

Respond in Markdown format with clear headers for each list.`
};

export const PROMPT_VERSION = '1.0.0';
