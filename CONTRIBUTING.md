# Contributing to Founder Research Engine

**First: Thank you for considering contributing.**

This is v0.1. It's intentionally incomplete. We know where it's broken.

---

## Philosophy

This project has an opinion: **structure before understanding**.

Contributions that violate this principle will be rejected, regardless of technical quality.

### ✅ Good Contributions
- Improve fact extraction prompts
- Add domain-specific phase templates
- Better visualization of artifact chains
- Reproducibility test suites
- Documentation clarity

### ❌ Bad Contributions
- "Make it faster by skipping phases"
- "Auto-progress through phases"
- "Hide contradictions for cleaner output"
- "Summarize instead of extracting facts"

**If it optimizes for speed over correctness, it doesn't belong here.**

---

## How to Contribute

### 1. Check Existing Issues
Before starting work, check [open issues](https://github.com/vaultmesh-org/The-Founder-Research-Engine/issues).

If your idea isn't there, **open an issue first** to discuss.

### 2. Fork & Branch
```bash
git clone https://github.com/YOUR_USERNAME/The-Founder-Research-Engine.git
cd The-Founder-Research-Engine
git checkout -b feature/your-feature-name
```

### 3. Make Changes
Follow existing code style:
- React functional components
- Tailwind for styling
- Clear variable names
- Comments explain *why*, not *what*

### 4. Test Locally
```bash
npm install
npm run dev
```

Test with real documents, not toy examples.

### 5. Commit with Context
```bash
git commit -m "feat: Add delta tracking between iterations

- Generates JSON diffs between artifact versions
- Shows added/removed/modified fields
- Includes change reason metadata

Closes #42"
```

### 6. Open Pull Request
Title format: `feat: Brief description` or `fix: Brief description`

PR must include:
- **Problem** - What were you solving?
- **Solution** - How did you solve it?
- **Testing** - How did you verify it works?
- **Breaking Changes** - Does this change existing behavior?

---

## Priority Areas

### 1. Prompt Engineering
**Goal:** Improve extraction quality without changing methodology.

Examples:
- Better entity recognition in legal documents
- Financial data extraction patterns
- Technical specification parsing

**How to contribute:**
- Test prompts on real documents
- Compare outputs before/after
- Include example inputs/outputs in PR

### 2. Iteration Intelligence
**Goal:** Make re-running phases actually useful.

Examples:
- Delta artifacts (show what changed)
- Semantic similarity scoring
- Conflict detection between iterations

**See:** [ROADMAP.md](./ROADMAP.md) v0.2 section

### 3. Provenance Tracking
**Goal:** Better trust classification and weighting.

Examples:
- Auto-detect document type → suggest trust level
- Metadata extraction (signatures, certifications)
- Trust score calculation

**Critical:** Must never auto-classify as "authoritative" without human approval.

### 4. Visualization
**Goal:** Make artifact chains and dependencies clear.

Examples:
- DAG visualization of artifacts
- Trust distribution heatmaps
- Timeline reconstruction

**Constraint:** Must work without external dependencies (keep it local-first).

### 5. Export Formats
**Goal:** Make outputs useful for regulators and auditors.

Examples:
- PDF report generation
- LAWCHAIN-compatible JSON
- Evidence graph exports

**See:** [ROADMAP.md](./ROADMAP.md) v0.3 section

---

## Code Standards

### React Components
- Functional components only
- Hooks for state management
- Props destructuring
- Clear component names

Example:
```jsx
// Good
function ArtifactSignature({ hash, timestamp, metadata }) {
  return (
    <div className="artifact-sig">
      <Hash value={hash} />
      <Timestamp value={timestamp} />
    </div>
  );
}

// Bad
function Comp1({ data }) {
  return <div>{data.map(x => <span>{x}</span>)}</div>;
}
```

### Constants
- Separate files for phases, prompts, config
- UPPER_CASE for true constants
- Clear naming

### Utilities
- Pure functions where possible
- JSDoc comments for complex logic
- Unit tests for crypto functions

---

## Testing

### Manual Testing Checklist
Before submitting PR:

- [ ] Upload 3+ documents with different trust levels
- [ ] Run all six phases sequentially
- [ ] Re-run Phase 2 with new document (iteration test)
- [ ] Download signed artifacts
- [ ] Verify hash doesn't change for same input
- [ ] Clear all data and restart
- [ ] Test with long documents (>10k words)
- [ ] Test with invalid API key (error handling)

### Automated Testing (Future)
We don't have a test suite yet. If you want to build one:

Priority:
1. Crypto hash verification
2. Artifact signature validation
3. Prompt version tracking
4. Iteration delta correctness

**Use real documents, not mocks.**

---

## Documentation

### README Updates
If you add a feature, update:
- Feature list
- Usage instructions
- Screenshots (if UI change)

### ROADMAP Updates
If you complete a roadmap item:
- Move from "Planned" to "Shipped"
- Add version number
- Note any deviations from original plan

### METHODOLOGY Updates
If you change phase behavior:
- Explain *why* in METHODOLOGY.md
- Include consequences of the change
- Get approval before merging

---

## Versioning

### Semantic Versioning
- **Patch (0.1.1)** - Bug fixes, no behavior change
- **Minor (0.2.0)** - New features, backwards compatible
- **Major (1.0.0)** - Breaking changes

### What Counts as Breaking
- Changing prompt behavior without version bump
- Altering hash outputs for same input
- Removing or renaming artifact fields
- Changing trust level definitions

**Artifact hashes are sacred.** If your change alters hashes for identical inputs, it's a major version.

---

## Review Process

### What We Look For
1. **Does it preserve methodology?** - No shortcuts
2. **Does it break reproducibility?** - Hash stability
3. **Is it well-tested?** - Real document validation
4. **Is it documented?** - README/ROADMAP updated

### Timeline
- **Small PRs** - 1-3 days
- **Large PRs** - 1-2 weeks
- **Breaking changes** - 2-4 weeks + discussion

We will NOT rush reviews for high-stakes changes.

---

## Getting Help

### Questions
- **Usage questions** - [GitHub Discussions](https://github.com/vaultmesh-org/The-Founder-Research-Engine/discussions)
- **Bug reports** - [GitHub Issues](https://github.com/vaultmesh-org/The-Founder-Research-Engine/issues)
- **Feature requests** - Open an issue first

### Code Review Help
If your PR isn't getting attention:
1. Make sure it follows checklist above
2. Tag @vaultmesh-core in comments
3. Provide test examples

---

## Non-Code Contributions

### Documentation
- Fix typos
- Clarify confusing sections
- Add examples

### Prompt Engineering
- Test different extraction patterns
- Share results in issues
- Propose improvements

### Use Cases
- Share how you're using the tool
- Document failure modes
- Suggest domain-specific templates

**All contributions matter.**

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Code of Conduct

**Simple rule:** Be direct, be honest, be respectful.

This project values:
- Brutal honesty over politeness
- Technical correctness over feelings
- Clear disagreement over false consensus

But:
- No personal attacks
- No gatekeeping
- No "this is obvious" dismissals

**If you can't argue a technical point without being an asshole, don't contribute.**

---

## Final Note

This is a founder's tool built by founders.

We care about:
- Correctness over speed
- Proof over narrative
- Structure over intuition

If that resonates, welcome. If not, there are other tools.

**Let's build something that doesn't lie to us.**
