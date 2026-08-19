# Founder Research Engine

> [!WARNING]
> **Archived historical prototype (December 2025).**
>
> This repository preserves an old Replit experiment for inspection. It is not maintained, not production-ready, not a WitnessOps product, and should not be used for high-stakes work. **Do not enter a real API key or upload sensitive documents.** The current default branch contains known functional and verification-contract defects documented below.

**Forensic reconstruction of reality. Not research—proof surface discovery.**

**Version:** 0.2.0 | **Status:** Archived prototype | **License:** MIT

## v0.2 Release Notes

**Major update:** Complete data model rewrite with iteration support, provenance tracking, and BLAKE3 hashing.

**New in v0.2:**
- ✅ Provenance model with confidence weighting (replaces trust levels)
- ✅ Full iteration support with delta computation (JSON + Markdown)
- ✅ BLAKE3 cryptographic hashing (WASM-backed)
- ✅ Run tracking with reproducibility metadata
- ✅ Artifact lineage with parent references
- ✅ IndexedDB storage (replaces in-memory)
- ✅ ZIP export with HASHES.json manifest
- ✅ Schema validation (Ajv)

**⚠️ Breaking Change:** v0.1 data is not compatible. See [CHANGELOG.md](./CHANGELOG.md) for migration guide.

## Known limitations

The following limitations were identified during a public-surface audit on 2026-08-19:

- The configured Anthropic model, `claude-sonnet-4-20250514`, has been retired, so model-backed processing is not currently operational.
- Run creation is wired with IDs where the run model expects full source and artifact objects; recorded input lineage and `inputs_hash` are therefore unreliable.
- IndexedDB queries use undeclared Dexie compound indexes, which can prevent artifact lookup during processing.
- Source content is stored in an internal `_content` field that the ZIP exporter removes; exported packs do not contain the original source documents required for reconstruction.
- The browser stores the Anthropic API key in `localStorage`.
- Schema-validation code is present but is not wired into the active application path.

## What pack verification means

The included verifier checks whether files match the manifest and whether those hashes reproduce the root stored **inside the same ZIP**. This is an internal-consistency check only.

It does **not**:

- authenticate the author or producer;
- prove when the pack was created;
- establish an externally anchored root;
- prove the correctness of model-generated content; or
- detect coordinated replacement of files, manifest, and root.

The project does not implement a digital signature or independent trust anchor. Historical references below to “signed,” “proof,” “reproducibility,” or “verified” should be read in light of these limits.

---

## What This Is

A six-phase document analysis engine that forces cognitive discipline on founders, investigators, and operators who need to understand complex situations *correctly* rather than *quickly*.

This is not:
- A summarization tool
- An insight generator
- A faster way to read documents

This is:
- A forensic workflow
- A proof surface mapper
- An accountability tracer
- A VaultMesh thinking tool

## Philosophy

> "Insight emerges from structure, not from reading harder."

Most research tools optimize for speed. This one optimizes for **not lying to yourself**.

The engine enforces:
- **No opinions before structure exists**
- **Facts separated from assumptions**
- **Trust boundaries on source material**
- **Provenance tracking on all artifacts**
- **Content hashes on outputs**

## The Six Phases

### 1. Containment (Phase: Intake)
**Purpose:** Stop the bleeding. Create boundaries.
**Output:** `DOCUMENT_INDEX.json`
**Rule:** DO NOT summarize. DO NOT provide insights.

Classify documents by type, audience, time-relevance, and risk level. Build a map before you start reading.

**Warning:** *If you skip this phase, you will process noise as signal.*

---

### 2. Ground Truth (Phase: Extraction)
**Purpose:** Separate fact from narrative.
**Outputs:** `FACTS_ASSUMPTIONS_SPLIT.json`, `TRUTH_GRAPH.json`
**Rule:** No opinions allowed.

Extract:
- Verifiable facts (with verification method)
- Assumptions (with risk assessment)
- Claims requiring proof
- Missing information that should exist
- Contradictions between sources

**Warning:** *If you skip this phase, you will build on assumptions.*

---

### 3. Reality Check (Phase: Reality)
**Purpose:** Map accountability.
**Outputs:** `ACTOR_IMPACT_MATRIX.md`, `IRREVERSIBLE_DECISIONS.md`
**Rule:** Reality is defined by who is liable.

For every fact and decision point, answer:
- WHO ACTS on this?
- WHO IS LIABLE if it fails?
- WHO AUDITS it later?
- WHO CANNOT AFFORD AMBIGUITY?

Also identify decisions that:
- Cannot be undone
- Regulators will ask about
- AI systems will make autonomously

**Warning:** *If you skip this phase, you will miss who is actually liable.*

---

### 4. VaultMesh Leverage (Phase: Leverage)
**Purpose:** Find proof surfaces.
**Outputs:** `MISSING_PROOF_SURFACES.md`, `PROOF_COLLAPSE_MAP.md`
**Rule:** Post-incident reality defines pre-incident value.

For every decision, artifact, or process, answer:
**"What proof would be demanded after a failure?"**

If proof does not already exist → This is a VaultMesh opportunity.

Then **COLLAPSE COMPLIANCE** by mapping complexity to:
- One receipt
- One hash
- One event
- One anchor

**Warning:** *If you skip this phase, you will hallucinate leverage.*

---

### 5. Synthesis (Phase: Synthesis)
**Purpose:** Structure → Understanding.
**Output:** `FOUNDER_RESEARCH_REPORT.md`
**Rule:** Now—and ONLY now—you may "understand."

Based on all previous artifacts, write ONE FOUNDER REPORT:
1. Executive Reality Check (3-5 sentences max)
2. Critical Path Items (what blocks everything else)
3. Hidden Leverage Points (opportunities others miss)
4. Governance Gaps (what will regulators/auditors demand)
5. VaultMesh Value Propositions (specific proof opportunities)
6. Red Flags (uncomfortable truths)

**Warning:** *If you skip this phase, you will have data without meaning.*

---

### 6. Decision (Phase: Decision)
**Purpose:** Four lists only.
**Output:** `FOUNDER_DECISIONS.md`
**Rule:** Anything else is distraction.

Create exactly 4 lists:
1. **BUILD NEXT** - Immediate priorities with clear scope
2. **STOP BUILDING** - What to kill now (sunk cost irrelevant)
3. **DELAY** - What can wait and why
4. **UNCOMFORTABLE RISKS** - What keeps you up at night

Max 5 items per list.

**Warning:** *If you skip this phase, you will never actually decide.*

---

## Key Features (v0.2)

### ✅ Implemented
- **Provenance Model** - Structured source classification:
  - `source_type`: regulator / operator / vendor / internal / speculative
  - `authority_level`: binding / advisory / informational
  - `confidence_weight`: 0.0-1.0 numeric scoring

- **Iteration & Lineage** - Full version history:
  - Re-run any phase to create new artifact versions
  - Parent artifact references
  - Delta computation (JSON + Markdown)
  - Confidence scoring (high/medium/low)

- **BLAKE3 Hashing** - Cryptographic integrity:
  - Primary: BLAKE3 (WASM)
  - Fallback: SHA-256
  - Two-hash system: `prompt_hash` + `run_hash`
  - Canonical JSON stringification

- **Run Tracking** - Full reproducibility:
  - Input/output artifact tracking
  - Prompt versioning
  - Model metadata (provider, model, temperature, max_tokens)
  - Warning system with consequences

- **Storage & Export**:
  - IndexedDB (Dexie) for structured persistence
  - ZIP export with full pack structure
  - HASHES.json manifest
  - Schema validation (Ajv)

### 🚧 Roadmap (v0.3+)
- Merkle tree construction
- LAWCHAIN export format
- Multi-model comparison
- Regulator prep mode
- Live system monitoring

## Installation

> Historical instructions only. The current repository is not expected to complete its workflow successfully. Do not provide a real API key or sensitive documents.

```bash
# Clone the repository
git clone https://github.com/vaultmesh-org/The-Founder-Research-Engine.git
cd The-Founder-Research-Engine

# Install dependencies
npm install

# Set your Anthropic API key (required)
# The app will prompt you on first run, or set it via the UI

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## Usage

1. **Set API Key** - Add your Anthropic API key (from console.anthropic.com)
2. **Upload Documents** - Drag & drop files or paste text directly
3. **Set Trust Levels** - Classify each document's provenance
4. **Run Phase 1** - Start with Containment (do not skip)
5. **Progress Sequentially** - Each phase builds on previous artifacts
6. **Iterate as Needed** - Re-run phases when new context emerges
7. **Export Pack** - Download the historical hash-manifest pack; see the verification limits above

## Trust Levels Explained

**Why this matters:** Not all documents are equally reliable. Regulators will ask "Why did you trust this?"

- **Authoritative** (Green) - Regulatory, legal, contractual. Highest weight.
- **Internal** (Blue) - Company-generated, engineering specs. Trusted but verify.
- **Third-Party** (Amber) - External reports, vendor docs. Context-dependent.
- **Speculative** (Red) - Marketing, projections, assumptions. Treat as hypothesis.

The engine records trust metadata alongside artifact hashes.

## Artifact Hash Metadata

Every artifact includes:
```json
{
  "artifactName": "DOCUMENT_INDEX.json",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "contentHash": "a3f7b2c1d4e5f6a7b8c9d0e1f2a3b4c5...",
  "metadata": {
    "model": "claude-sonnet-4-20250514",
    "promptVersion": "1.0.0",
    "phaseId": "intake",
    "iterationNumber": 1,
    "documentCount": 5,
    "trustDistribution": {
      "authoritative": 2,
      "internal": 3
    }
  }
}
```

This records content and execution metadata. It can support later comparison, but the current implementation does not independently prove reproducibility, authenticity, or creation time.

## When to Use This

### ✅ Good Use Cases
- Post-incident investigation
- Regulatory compliance prep
- Merger due diligence
- Contract dispute analysis
- AI governance design
- Failure mode analysis

### ❌ Bad Use Cases
- General research ("learn about X")
- Content summarization
- Creative writing
- Quick answers

This tool is for **high-stakes situations where being wrong is expensive**.

## Methodology Principles

1. **Never read everything linearly** - Structure first, details later
2. **Force structure before understanding** - Resist premature insight
3. **Reality is defined by accountability** - Follow liability, not org charts
4. **Post-incident reality defines pre-incident value** - Think backwards from failure
5. **Complexity kills adoption** - Collapse compliance to one proof point
6. **Insight emerges from structure** - The method creates the clarity

## Development

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Technical Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Anthropic Claude API** - LLM processing
- **Web Crypto API** - Content hashing

## License

MIT

## Contributing

This repository is preserved as a historical prototype and is intended to return to archived, read-only status after this documentation correction. The roadmap and contributing documents are historical and may contradict the implemented code.

## Warning

This tool forces cognitive discipline.

If you:
- Skip phases
- Ignore trust levels
- Don't iterate when blocked
- Treat outputs as final

...you will produce garbage.

The engine is only as good as the operator's commitment to **not lying to themselves**.

---

**Built for founders who need reality, not reassurance.**
