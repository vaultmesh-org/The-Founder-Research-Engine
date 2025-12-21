# Methodology: Why This Works

## The Core Problem

**Most research fails because people optimize for speed instead of correctness.**

Common failure modes:
- Reading linearly and hoping patterns emerge
- Treating all sources as equally trustworthy
- Forming conclusions before extracting structure
- Confusing confidence with accuracy
- Ignoring accountability mapping

The Founder Research Engine fixes this by **forcing cognitive discipline** through rigid phase separation.

---

## Phase Design Philosophy

### Why Six Phases?

Each phase corresponds to a distinct **cognitive mode** that cannot be mixed without contamination:

1. **Containment** → Classification (no interpretation)
2. **Ground Truth** → Extraction (no synthesis)
3. **Reality Check** → Accountability (no abstraction)
4. **Leverage** → Proof Discovery (no solution design)
5. **Synthesis** → Integration (finally allowed to "understand")
6. **Decision** → Action (commit or kill)

**Critical insight:** Humans are bad at switching modes. The engine enforces mode separation mechanically.

---

## Why "No Insights Until Phase 5"?

**Premature insight is the death of analysis.**

What happens when you allow "understanding" too early:
- You cherry-pick facts that support your hypothesis
- You ignore contradictions
- You weight sources by narrative fit, not reliability
- You confuse "makes sense" with "is true"

By forbidding synthesis until Phase 5, the engine forces:
- **Fact collection without interpretation** (Phase 2)
- **Accountability mapping without judgment** (Phase 3)
- **Proof gap discovery without solutions** (Phase 4)

The structure creates the insight. Not the other way around.

---

## Trust Boundaries (Provenance)

**Why source classification matters:**

In a post-incident review, regulators will ask:
> "Why did you believe this document?"

Your answer cannot be "it seemed credible."

The four trust levels map to **evidentiary weight**:

### Authoritative (Green)
- Regulatory guidance
- Signed contracts
- Legal filings
- Audit reports

**Why it matters:** These create liability. Misinterpreting these is not a research error—it's a governance failure.

### Internal (Blue)
- Engineering specs
- Design documents
- Internal emails
- Build artifacts

**Why it matters:** These show *intent*, not just *outcome*. Critical for proving "we knew X at time T."

### Third-Party (Amber)
- Vendor documentation
- Industry reports
- Consultant recommendations
- News articles

**Why it matters:** Useful for context but not authoritative. Must be verified independently.

### Speculative (Red)
- Marketing claims
- Financial projections
- Roadmaps
- Unvalidated assumptions

**Why it matters:** These are *hypotheses*, not facts. Treating them as ground truth is how failures happen.

---

## Iteration Model

**Why re-running phases is critical:**

Real investigations are not linear. You discover new context in Phase 4 that changes Phase 2 extraction.

The engine supports iteration because:
1. **New documents emerge** - Investigation expands
2. **Contradictions surface** - Phase 5 reveals gaps in Phase 2
3. **Trust levels change** - A "third-party" doc becomes "authoritative" after verification
4. **Model outputs improve** - Better prompting, better extraction

**Key design choice:** Each iteration is **versioned and signed**, not overwritten.

This creates an audit trail:
- "We believed X at T1, then discovered Y at T2"
- Regulators care about *when you knew what*

---

## Artifact Hashing

**Why cryptographic signatures matter:**

Every artifact includes a SHA-256 hash of its content. This enables:

1. **Reproducibility verification**
   - "If we re-run with the same inputs, do we get the same hash?"
   - Critical for detecting model drift or prompt changes

2. **Audit trail construction**
   - "Which version of FACTS_ASSUMPTIONS_SPLIT informed SYNTHESIS?"
   - Artifacts reference each other by hash

3. **Compliance proof**
   - "We processed these documents at this time with this model"
   - Timestamped, immutable, verifiable

4. **LAWCHAIN readiness**
   - Hashes become Merkle tree leaves
   - Entire research session becomes provable event chain

**This is VaultMesh thinking applied to cognition itself.**

---

## The Four-List Decision Model

**Why exactly four lists?**

Founders drown in options. The decision phase forces brutal prioritization:

### 1. BUILD NEXT
- What has clear ROI
- What blocks everything else
- What you can ship in 2-4 weeks

**Rule:** If scope is unclear, it goes in DELAY.

### 2. STOP BUILDING
- What has no leverage
- What you're building because "we started it"
- What regulators will kill anyway

**Rule:** Sunk cost is irrelevant. Kill it.

### 3. DELAY
- What depends on BUILD NEXT completing
- What requires external input
- What might become irrelevant

**Rule:** Delay is not "build later"—it's "might never build."

### 4. UNCOMFORTABLE RISKS
- What could cause regulatory action
- What AI systems might do autonomously
- What keeps you up at night

**Rule:** If it's not uncomfortable, it's not a real risk.

**Max 5 items per list.** Anything else is noise.

---

## VaultMesh Leverage Discovery

**The core question:**
> "What proof would be demanded after a failure?"

This is not hypothetical. Post-incident investigations always ask:
- "Where is the audit trail?"
- "Who approved this?"
- "When did you know about the risk?"
- "How did you verify compliance?"

If the answer is "we didn't capture that," you lose.

### Proof Surface Mapping

For every process, ask:
- **Receipt** - Who signed off?
- **Hash** - What was the exact state?
- **Event** - When did it happen?
- **Anchor** - Where is the immutable record?

If any answer is "nowhere," that's a **VaultMesh opportunity**.

### Compliance Collapse

Most compliance is overcomplicated because it's not **proof-native**.

Example:
- **Old way:** 47-page audit report, manually reviewed quarterly
- **VaultMesh way:** One hash, anchored on-chain, auto-verified

The engine finds these collapse opportunities by:
1. Identifying complex processes (Phase 3)
2. Mapping required proof (Phase 4)
3. Exposing the gap (Phase 5)

**This is where VaultMesh product ideas come from.**

---

## Why This Feels Slow

It is.

The engine is **intentionally slow** because:
- Fast research produces confident garbage
- Skipping structure creates false insights
- Premature synthesis hides contradictions

**The speed comes later:**

Once you've run the six phases on a domain (e.g., "GDPR compliance"), you:
- Know the proof surfaces
- Have the truth graph
- Understand the liability map

**Then** you can move fast—because you're building on reality, not assumptions.

---

## Who This Is For

### ✅ Good Fit
- Founders doing post-mortem analysis
- Investigators handling complex incidents
- Compliance teams preparing for audits
- Legal teams in dispute resolution
- AI governance designers

### ❌ Bad Fit
- People who want summaries
- Teams doing exploratory research
- Anyone optimizing for "ship fast"

**If you're not willing to be slowed down, this tool will fight you.**

---

## Design Constraints

### What the Engine Does NOT Do

1. **Does not interpret for you** - Forces you to define trust levels
2. **Does not auto-progress phases** - You must consciously proceed
3. **Does not hide complexity** - Contradictions are surfaced, not smoothed over
4. **Does not reassure** - Red flags are called red flags

### What the Engine DOES Do

1. **Prevents premature synthesis** - No opinions before structure
2. **Tracks provenance** - Every artifact is signed and versioned
3. **Maps accountability** - Forces "who is liable" thinking
4. **Finds proof gaps** - Surfaces VaultMesh opportunities
5. **Forces decisions** - Four lists only

---

## Extending the Method

### Custom Phases

The six-phase model is **opinionated but not rigid**.

You can add domain-specific phases:
- **Regulatory Mapping** (for compliance teams)
- **Threat Modeling** (for security teams)
- **Cost Verification** (for finance teams)

**Rule:** New phases must maintain cognitive separation. No mixing extraction with synthesis.

### Custom Prompts

Prompt engineering improvements:
- Better fact extraction patterns
- Domain-specific entity recognition
- Contradiction detection heuristics

**Rule:** All prompts must be versioned and hashed. No silent changes.

### Multi-Model Comparison

Run the same phase with:
- Claude Opus 4.5 (deep reasoning)
- Claude Sonnet 4.5 (balanced)
- Claude Haiku 4.0 (fast iteration)

Compare outputs by hash diff. Surface model-dependent conclusions.

**This is roadmap for v0.2.**

---

## Success Metrics

**How to know this worked:**

1. **You found contradictions** - If everything "makes sense," you didn't look hard enough
2. **You killed something** - STOP BUILDING list should hurt
3. **You discovered proof gaps** - VaultMesh opportunities should be specific
4. **You can answer "who is liable"** - For every decision point

**If the output is comfortable, you did it wrong.**

---

## Failure Modes

**How people break this:**

1. **Skipping phases** - "We already know the facts, let's jump to synthesis"
2. **Treating all sources equally** - "It's all just input"
3. **Ignoring iteration** - "One pass is enough"
4. **Not tracking changes** - "Just overwrite the old artifact"
5. **Avoiding uncomfortable conclusions** - "Let's reframe this positively"

**The engine can't force honesty. Only structure.**

---

## Philosophical Foundation

This method embodies three principles:

### 1. Structure Creates Insight
You cannot "understand" your way to clarity. You extract structure, then insight emerges.

### 2. Accountability Defines Reality
The org chart doesn't matter. Liability does. Follow who gets sued.

### 3. Proof Surfaces Are Products
Post-incident demands define pre-incident value. Build what regulators will ask for.

**This is not just research methodology—it's a founder operating system.**

---

**Reality doesn't care about your narrative. Build on facts.**
