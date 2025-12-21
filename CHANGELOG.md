# Changelog

All notable changes to the Founder Research Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-21

### 🎯 Major Release: Full v0.2 Data Model

This is a **breaking change** from v0.1. Complete rewrite of the data layer to support iteration, provenance tracking, and reproducibility.

### Added

#### Core Data Model
- **Sources with Provenance**
  - `source_type`: regulator / operator / vendor / internal / speculative
  - `authority_level`: binding / advisory / informational
  - `confidence_weight`: 0.0-1.0 numeric weighting
  - Chain of custody metadata

- **Runs with Iteration Support**
  - Run objects track each phase execution
  - Iteration numbers per phase
  - Complete input/output tracking
  - Warning system with consequence codes

- **Artifacts with Lineage**
  - Version tracking (v1, v2, v3...)
  - Parent artifact references
  - Delta computation (JSON + Markdown)
  - Trust summaries based on source confidence

- **Pack Structure**
  - Research pack container
  - HASHES.json manifest
  - Schema validation (Ajv)
  - ZIP export format

#### Hashing & Cryptography
- BLAKE3 primary hash (WASM-backed)
- SHA-256 fallback
- Two-hash system:
  - `prompt_hash` (text-only, normalized)
  - `run_hash` (includes execution context)
- Canonical JSON stringification
- Prompt normalization (whitespace, unicode)

#### Delta Computation
- **JSON Deltas**
  - Keyed-array transforms (stable IDs for facts/assumptions/etc.)
  - Deep diff algorithm
  - Confidence scoring (high/medium/low)
  - Sample previews

- **Markdown Deltas**
  - Section-level diff (by header anchor)
  - Bullet-level diff (optional)
  - Body hash comparison

#### Storage
- IndexedDB via Dexie
  - packs, sources, runs, artifacts, hashes tables
  - Efficient querying by phase, name, version
  - Export entire pack to ZIP

#### Validation
- JSON Schema validation (draft 2020-12)
- Ajv validator at write time
- 5 schemas: pack, source, run, artifact, hashes

#### Warning System
- Machine-actionable warning codes:
  - `SKIP_GROUND_TRUTH`
  - `SKIP_REALITY_CHECK`
  - `SKIP_LEVERAGE`
  - `LOW_SOURCE_CONFIDENCE`
  - `REPLAY_REQUIRED`
- Severity levels: info / warn / block
- Consequence text for each code

#### UI Improvements
- Provenance dropdown per source
- Iteration badges on phase progress
- Delta summaries in artifact cards
- Trust confidence scores
- Hash display (first 12 chars)
- Export pack as ZIP
- Re-run phase button

### Changed

#### Breaking Changes
- **Data Model**: Complete rewrite from v0.1 signature model
  - Old: `{ content, signature }`
  - New: `{ artifact_id, hashes, lineage, trust_summary }`

- **Storage**: IndexedDB replaces in-memory state
  - Old: localStorage for artifacts
  - New: Structured IndexedDB with schemas

- **Hashing**: BLAKE3 replaces SHA-256 as primary
  - Old: Web Crypto SHA-256
  - New: WASM BLAKE3 + fallback SHA-256

- **Trust Model**: Provenance replaces trust levels
  - Old: 4 categorical levels (authoritative/internal/third-party/speculative)
  - New: Structured provenance with numeric weights

#### Migration from v0.1
- v0.1 data is **not** automatically migrated
- v0.1 tagged as `git tag v0.1.0`
- Clean break to enable proper architecture
- Manual migration: export v0.1 artifacts → re-upload to v0.2

### Removed
- Old crypto.js (replaced by hashing.js)
- Old signature model
- In-memory artifact storage
- v0.1 trust level system

### Fixed
- Index-based array diffs (now use stable keys)
- Whitespace-sensitive hash comparison (now normalized)
- No iteration tracking (now full lineage)
- No delta visibility (now shown in UI)

### Technical Debt Paid
- Reproducibility: Full run_hash includes model params
- Provenance: "Why did you trust this?" now answerable
- Iteration: Re-running phases creates versioned artifacts with deltas
- Validation: Schema enforcement at write time

### Documentation
- Updated README.md for v0.2 usage
- Added CHANGELOG.md (this file)
- Updated METHODOLOGY.md with provenance model
- Updated ROADMAP.md (delta tracking → complete)

### Dependencies Added
- `blake3-wasm@^2.1.5` - BLAKE3 hashing
- `dexie@^3.2.7` - IndexedDB wrapper
- `ajv@^8.12.0` - JSON Schema validation
- `jszip@^3.10.1` - ZIP export

---

## [0.1.0] - 2025-12-21

### Initial Release

- Six-phase forensic workflow
- Basic iteration support
- SHA-256 artifact signing
- Trust level classification
- Consequence warnings
- React + Vite + Tailwind
- Anthropic Claude API integration

**Note**: v0.1.0 is tagged but superseded by v0.2.0.

---

## Migration Guide (v0.1 → v0.2)

### What Changed
1. **Trust Levels → Provenance**
   ```
   Old: trustLevel: 'authoritative'
   New: provenance: {
     source_type: 'regulator',
     authority_level: 'binding',
     confidence_weight: 1.0
   }
   ```

2. **Signatures → Hashes**
   ```
   Old: artifact.signature.contentHash
   New: artifact.hashes.content_hash (BLAKE3)
   ```

3. **Storage**
   ```
   Old: localStorage
   New: IndexedDB (Dexie)
   ```

### How to Migrate
1. Export artifacts from v0.1 (download JSON files)
2. Clear browser data
3. Install v0.2: `npm install`
4. Re-upload documents to v0.2
5. Re-run phases (will compute deltas if re-running)

### What You Lose
- v0.1 iteration history (not preserved)
- Old signatures (BLAKE3 will be different from SHA-256)

### What You Gain
- Full lineage tracking
- Delta computation
- Provenance weighting
- Schema validation
- ZIP export with HASHES.json

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features:
- v0.3: Merkle trees + LAWCHAIN export
- v0.4: Regulator mode
- v0.5: AI governance integration
