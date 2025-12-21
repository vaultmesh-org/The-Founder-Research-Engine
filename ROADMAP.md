# Roadmap

**Current version: v0.1.0**

This is the brutally honest roadmap. Not marketing promises—engineering reality.

---

## v0.1.0 - Foundation (Current)

**Status:** ✅ Shipped

### What Works
- [x] Six-phase workflow with hard boundaries
- [x] Document intake with trust classification
- [x] Phase iteration support (re-run with new context)
- [x] Artifact hashing (SHA-256 signatures)
- [x] Version tracking (iteration numbers)
- [x] Model metadata (track which model/prompt produced what)
- [x] Signed artifact exports
- [x] Processing logs
- [x] Consequence warnings

### What Doesn't
- [ ] No delta tracking between iterations
- [ ] No artifact chain visualization
- [ ] No multi-model comparison
- [ ] No offline mode
- [ ] No bulk document processing
- [ ] No Merkle tree construction
- [ ] No LAWCHAIN export

### Known Issues
- API key stored in localStorage (not ideal for security)
- No rate limiting on API calls
- Large documents may timeout
- PDF parsing not implemented
- No mobile optimization

**Assessment:** This proves the concept. Not production-ready for high-stakes use.

---

## v0.2.0 - Iteration Intelligence (Next)

**Target:** Q2 2025
**Goal:** Make iteration *useful*, not just *possible*

### Planned Features

#### 1. Delta Artifacts
**Problem:** Re-running a phase produces a new artifact, but you can't see *what changed*.

**Solution:** Generate diff artifacts:
```json
{
  "artifact": "FACTS_ASSUMPTIONS_SPLIT.json",
  "iteration": 2,
  "delta": {
    "added": {
      "verifiableFacts": [...]
    },
    "removed": {
      "assumptions": [...]
    },
    "modified": {
      "contradictions": [...]
    }
  },
  "changeReason": "New authoritative document added"
}
```

**Why:** Regulators care about *when you learned what*.

#### 2. Artifact Chain Visualization
**Problem:** Hard to see how artifacts depend on each other.

**Solution:** DAG visualization showing:
- Phase 1 outputs → Phase 2 inputs
- Which iteration of Phase 2 informed Phase 5
- Hash-based references between artifacts

**Why:** Audit trails must be *navigable*.

#### 3. Multi-Model Comparison
**Problem:** Different models extract different "facts" from the same input.

**Solution:** Run same phase with multiple models:
- Claude Opus 4.5 (deep reasoning)
- Claude Sonnet 4.5 (balanced)
- Claude Haiku 4.0 (fast)

Show hash diffs + semantic diffs.

**Why:** Model-dependent conclusions are a compliance risk.

#### 4. Provenance Weighting
**Problem:** Trust levels are categorical, not weighted.

**Solution:** Let users set weights:
- Authoritative: 1.0
- Internal: 0.7
- Third-Party: 0.5
- Speculative: 0.2

Artifacts include weighted trust scores.

**Why:** "We trusted this 70%" is better than "we trusted this."

---

## v0.3.0 - Proof Architecture (Future)

**Target:** Q3 2025
**Goal:** Make outputs *verifiable* by third parties

### Planned Features

#### 1. Merkle Tree Construction
**Problem:** Artifacts are signed individually, not as a chain.

**Solution:** Build Merkle tree:
- Leaf: Artifact hash
- Branch: Phase outputs
- Root: Entire research session

Export root hash for external anchoring.

**Why:** VaultMesh-native proof structure.

#### 2. LAWCHAIN Export Format
**Problem:** Artifacts are JSON blobs, not blockchain-ready events.

**Solution:** Export as LAWCHAIN-compatible:
```json
{
  "event": "research.phase.completed",
  "phaseId": "extraction",
  "artifacts": ["FACTS_ASSUMPTIONS_SPLIT.json", "TRUTH_GRAPH.json"],
  "merkleRoot": "0x...",
  "timestamp": "2025-06-15T10:30:00Z",
  "signature": "..."
}
```

**Why:** Research becomes on-chain provable.

#### 3. Third-Party Verification
**Problem:** Stakeholders must "trust" your research.

**Solution:** Verification endpoint:
```
POST /verify
{
  "artifactHash": "a3f7b2c1...",
  "merkleProof": [...],
  "anchoredRoot": "0x..."
}
→ { "valid": true, "timestamp": "..." }
```

**Why:** Don't ask for trust—provide proof.

---

## v0.4.0 - Regulator Mode (Future)

**Target:** Q4 2025
**Goal:** Make this *useful for regulators*, not just founders

### Planned Features

#### 1. Compliance Mapping
**Problem:** Hard to know if you've met regulatory requirements.

**Solution:** Pre-built phase templates:
- **GDPR Audit** - Maps to Articles 5, 25, 30, 35
- **SOC 2** - Maps to Trust Service Criteria
- **HIPAA** - Maps to Privacy Rule requirements

**Why:** Compliance is just proof surface discovery with a checklist.

#### 2. Evidence Graph Export
**Problem:** Regulators don't want JSON—they want "show me the evidence."

**Solution:** Generate evidence graph:
- Nodes: Claims
- Edges: Supporting facts
- Colors: Trust levels
- Export as PDF + interactive HTML

**Why:** Auditors think visually.

#### 3. Timeline Reconstruction
**Problem:** "When did you know X?" questions are hard to answer.

**Solution:** Auto-generate timeline:
- T1: Document uploaded (trust: internal)
- T2: Fact extracted (verifiable)
- T3: Contradiction detected (Phase 2, iteration 2)
- T4: Decision made (Phase 6)

**Why:** Liability hinges on *when you knew*.

---

## v0.5.0 - AI Governance (Future)

**Target:** 2026
**Goal:** Make this work for *AI system oversight*, not just documents

### Planned Features

#### 1. Live System Monitoring
**Problem:** Current engine only processes static documents.

**Solution:** Ingest live events:
- API logs
- Model outputs
- User feedback
- System alerts

Run phases *continuously*.

**Why:** AI governance is not a one-time audit.

#### 2. Autonomous Decision Tracking
**Problem:** AI systems make decisions. Humans don't know which ones are irreversible.

**Solution:** Auto-detect irreversible decisions:
- User account deletions
- Financial transactions
- Data sharing events
- Model deployments

Flag for Phase 3 (Reality Check).

**Why:** You can't govern what you can't see.

#### 3. Proof-Native Logging
**Problem:** Standard logs are not compliance-ready.

**Solution:** Every log entry includes:
- Content hash
- Merkle proof
- Anchor reference
- Verification endpoint

**Why:** Logs become evidence, not just debugging tools.

---

## Research Questions (Unsolved)

These are *hard problems* with no obvious solution:

### 1. Model Hallucination Detection
**Problem:** How do you know if the model invented a "fact"?

**Current state:** Trust levels help, but not enough.

**Possible solutions:**
- Multi-model consensus (if 3 models agree, higher confidence)
- External verification hooks (query external APIs for fact-checking)
- Human-in-the-loop checkpoints (flag low-confidence extractions)

**Blocker:** No ground truth for most documents.

### 2. Semantic Drift Over Iterations
**Problem:** Iteration 5 might contradict iteration 1, but you don't notice.

**Current state:** Hash diffs show *that* things changed, not *why*.

**Possible solutions:**
- Semantic similarity scoring between iterations
- Auto-flagging of inversions ("was true, now false")
- Conflict resolution prompts

**Blocker:** Defining "contradiction" formally is non-trivial.

### 3. Trust Level Automation
**Problem:** Manual trust classification is slow and subjective.

**Current state:** Users must classify every document.

**Possible solutions:**
- ML model trained on document type → trust level
- Metadata extraction (if signed by regulator → authoritative)
- Heuristics (if ends in .gov → authoritative)

**Blocker:** Edge cases break heuristics. High stakes = no room for error.

---

## Non-Goals

**What we will NOT build:**

### ❌ General-Purpose Research Tool
This is for high-stakes forensic analysis. Not for "learn about topic X."

### ❌ Content Summarization
Use Claude directly for that. This tool is about *structure*, not speed.

### ❌ Automatic Decision-Making
Phase 6 outputs *lists*, not *commands*. Humans decide.

### ❌ Magic Insight Generator
If you skip phases, you get garbage. The tool won't "fix" bad process.

---

## How to Contribute

**Priority areas:**

1. **Prompt Engineering**
   - Better fact extraction patterns
   - Domain-specific templates (legal, financial, technical)
   - Multi-language support

2. **Visualization**
   - Artifact chain graphs
   - Trust distribution heatmaps
   - Iteration delta views

3. **Export Formats**
   - LAWCHAIN compatibility
   - PDF report generation
   - Regulator-friendly outputs

4. **Testing**
   - Benchmark datasets (GDPR audits, SOC 2 reports, incident logs)
   - Multi-model consistency checks
   - Hash verification test suite

**See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.**

---

## Version Philosophy

**How we version:**

- **v0.x** - Breaking changes expected. Not production-ready.
- **v1.0** - Stable API. Audit trail guarantees.
- **v2.0+** - New proof architectures (e.g., LAWCHAIN integration).

**We will NOT:**
- Ship features that break reproducibility
- Change prompt versions without user consent
- Hide breaking changes in patch releases

**Artifact hashes are sacred. If a version change alters hashes for identical inputs, it's a major version bump.**

---

## Success Metrics (Long-Term)

**How we know this worked:**

1. **Regulators accept artifact exports** - No manual translation required
2. **Founders use this for board meetings** - Red flags become action items
3. **VaultMesh products emerge from Phase 4** - Proof surfaces → product ideas
4. **Academic citations** - Method becomes standard practice

**If this becomes "just another research tool," we failed.**

---

## Timeline Reality Check

These dates are estimates. Reality:
- v0.2 might slip to Q3 if delta tracking is harder than expected
- v0.3 depends on LAWCHAIN spec stabilizing
- v0.4 requires actual regulator feedback
- v0.5 requires AI governance use cases

**We will NOT ship broken features to hit dates.**

---

## Open Questions

**Decisions we haven't made:**

1. Should we support custom phases, or keep it six forever?
2. Should artifacts be stored locally, on-chain, or both?
3. Should we build a hosted service, or keep it local-first?
4. Should we charge for this, or keep it open-source?

**Your input matters.** [File an issue](https://github.com/vaultmesh-org/The-Founder-Research-Engine/issues).

---

**Roadmaps are lies. But at least this one is honest about it.**
