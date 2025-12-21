# Prompt Hash Normalization Spec v1.0

This document specifies the exact normalization rules for computing reproducible prompt hashes in the Founder Research Engine.

## Canonical Format

The prompt hash is computed from a canonical string with the following structure:

```
<SYSTEM>
{normalized_system_prompt}
</SYSTEM>
<DEVELOPER>
{normalized_developer_prompt}
</DEVELOPER>
<PHASE>
{normalized_phase_prompt}
</PHASE>
```

Each section is separated by a single newline. Empty sections use empty string between tags.

## Normalization Steps (In Order)

Apply these steps in sequence to each prompt component:

### Step 1: Line Ending Normalization
Replace all `\r\n` (CRLF) with `\n` (LF).

```javascript
text.replace(/\r\n/g, '\n')
```

### Step 2: Trailing Whitespace Removal
Remove trailing spaces and tabs at the end of each line.

```javascript
text.replace(/[ \t]+\n/g, '\n')
```

### Step 3: Newline Collapse
Collapse 4 or more consecutive newlines to exactly 3.

```javascript
text.replace(/\n{4,}/g, '\n\n\n')
```

### Step 4: Overall Trim
Remove leading and trailing whitespace from the entire string.

```javascript
text.trim()
```

### Step 5: Unicode Normalization
Apply NFC (Canonical Decomposition, followed by Canonical Composition).

```javascript
text.normalize('NFC')
```

## Excluded from Hash

The following are NOT included in the prompt hash and are stored separately in `run.engine`:

- Model name (e.g., "claude-3-opus")
- Temperature
- Max tokens
- Provider

These are excluded because they affect output but are not part of the "instruction identity".

## Hash Algorithm

- **Primary**: BLAKE3 (WASM via blake3-wasm)
- **Output**: 64-character lowercase hexadecimal string

## Reference Implementation

See `src/utils/hashing.js`:

```javascript
export const PROMPT_NORM_SPEC_VERSION = '1.0';

export function normalizePromptText(text) {
  if (!text) return '';

  return text
    .replace(/\r\n/g, '\n')           // Step 1
    .replace(/[ \t]+\n/g, '\n')       // Step 2
    .replace(/\n{4,}/g, '\n\n\n')     // Step 3
    .trim()                           // Step 4
    .normalize('NFC');                // Step 5
}

export async function computePromptHash(systemPrompt, phasePrompt, developerPrompt = '') {
  const canonical =
    `<SYSTEM>\n${normalizePromptText(systemPrompt)}\n</SYSTEM>\n` +
    `<DEVELOPER>\n${normalizePromptText(developerPrompt)}\n</DEVELOPER>\n` +
    `<PHASE>\n${normalizePromptText(phasePrompt)}\n</PHASE>\n`;

  return blake3(canonical);
}
```

## Test Vectors

### Empty Prompts
```
Input: { system: "", developer: "", phase: "" }
Canonical:
<SYSTEM>

</SYSTEM>
<DEVELOPER>

</DEVELOPER>
<PHASE>

</PHASE>

```

### Whitespace Normalization
```
Input: { system: "Hello  \nWorld\r\n", developer: "", phase: "" }
After normalization: "Hello\nWorld"
```

### Newline Collapse
```
Input: "First\n\n\n\n\nSecond"
After normalization: "First\n\n\nSecond"
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial specification |

## Compliance

A prompt hash is compliant if:

1. It uses the exact normalization steps in order
2. It uses the canonical format with XML-style tags
3. It produces a 64-character lowercase BLAKE3 hex string
4. It matches reference implementation output for test vectors
