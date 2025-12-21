# VaultMesh Founder Research Engine — Pack Specification (v0.2)

This document defines what a **research pack** is, what it means to be **cryptographically whole**, and how to **verify** integrity and reproducibility.

This spec is written to be audit-friendly: deterministic rules, explicit exclusions, and stable hashing semantics.

---

## 1. Definitions

### Pack

A **pack** is an exported bundle containing:
- source documents and metadata
- - run records (phase executions)
  - - artifacts (phase outputs)
    - - hash manifests
      - - a Merkle root commitment (ROOT.txt)
        - - Merkle parameters (hashes/MERKLE.json)
         
          - ### Artifact
         
          - An **artifact** is an immutable output from a run (e.g., DOCUMENT_INDEX.json, FACTS_ASSUMPTIONS_SPLIT.json), versioned via lineage.
         
          - ### Run
         
          - A **run** is one execution of a phase. Runs are immutable. Re-running a phase creates a new run and new artifact versions.
         
          - ---

          ## 2. Determinism rules

          ### 2.1 Path normalization

          All pack file paths MUST:
          - use forward slashes /
          - - have no leading slash
            - - have no ./ segments
              - - have no empty segments (//)
                - - be Unicode NFC normalized
                 
                  - ### 2.2 Sorting (no locale)
                 
                  - All path sorting MUST be code-unit lexicographic:
                  - - Use a < b ? -1 : a > b ? 1 : 0
                    - - Do not use locale-dependent comparisons
                     
                      - ---

                      ## 3. Hashing

                      ### 3.1 Hash algorithm

                      All cryptographic hashing uses **BLAKE3**.
                      - File hashes are 32-byte BLAKE3 digests, represented as **64 lowercase hex characters**.
                     
                      - ### 3.2 Hash bytes, not objects
                     
                      - When hashing structured data:
                      - - Serialize deterministically (stable key ordering)
                        - - Hash UTF-8 bytes of the canonical serialization
                         
                          - ### 3.3 Hash manifest (hashes/HASHES.json)
                         
                          - Records file hashes for export contents.
                         
                          - **Manifest exclusion rule:** To avoid recursion, hashes/HASHES.json DOES NOT include itself.
                         
                          - The manifest MUST declare its exclusions explicitly:
                          - - hashes/HASHES.json (self)
                            - - ROOT.txt
                              - - hashes/MERKLE.json
                               
                                - (These files exist to describe/commit the pack; they are excluded from the manifest list to prevent chicken-egg recursion.)
                               
                                - ---

                                ## 4. Merkle commitment (ROOT.txt)

                                ### 4.1 Leaf set

                                The Merkle leaf set is derived from HASHES.json.entries, excluding:
                                - ROOT.txt
                                - - hashes/MERKLE.json
                                  - - (and excluding hashes/HASHES.json because it is excluded from the manifest)
                                   
                                    - ### 4.2 Leaf encoding (byte-precise)
                                   
                                    - For each leaf entry:
                                   
                                    - ```
                                      leaf_i = BLAKE3( utf8(path_i) || 0x00 || hexToBytes(file_hash_i) )
                                      ```

                                      Where:
                                      - path_i is the normalized path
                                      - - 0x00 is a single null-byte separator
                                        - - file_hash_i is a 64-char lowercase hex BLAKE3 digest of the file bytes
                                         
                                          - ### 4.3 Tree construction
                                         
                                          - Binary Merkle tree, left-to-right.
                                         
                                          - Per-level padding rule:
                                          - - If a level has an odd number of nodes, duplicate the last node at that level.
                                           
                                            - Parent computation:
                                            - - parent = BLAKE3( left_digest_bytes || right_digest_bytes )
                                             
                                              - ROOT.txt contains the final root digest as 64 lowercase hex characters.
                                             
                                              - ### 4.4 Merkle metadata (hashes/MERKLE.json)
                                             
                                              - Documents:
                                              - - spec_version
                                                - - algorithm
                                                  - - leaf_format
                                                    - - leaf_set_excludes
                                                      - - padding_rule
                                                        - - leaf_count (count BEFORE padding)
                                                         
                                                          - ---

                                                          ## 5. Prompt hashing & reproducibility

                                                          ### 5.1 Prompt normalization

                                                          Prompt text hashing follows specs/PROMPT_NORMALIZATION.md (versioned).

                                                          ### 5.2 prompt_hash vs run_hash

                                                          - **prompt_hash** commits to the normalized **prompt text only** (system + developer + phase).
                                                          - - **run_hash** commits to:
                                                            -   - prompt_hash
                                                                -   - engine parameters (provider/model/temperature/max_tokens)
                                                                    -   - inputs_hash
                                                                     
                                                                        - This separation prevents prompt drift and preserves reproducibility semantics.
                                                                     
                                                                        - ### 5.3 inputs_hash
                                                                     
                                                                        - inputs_hash is computed from **content hashes**, not IDs:
                                                                        - - source content hashes
                                                                          - - artifact content hashes
                                                                            - - stable ordering (sorted by IDs for labeling, hashes are the substance)
                                                                             
                                                                              - ---

                                                                              ## 6. Deltas & replay

                                                                              ### 6.1 Declared delta rules

                                                                              Keyed array diff rules are declared (not hidden in code) and exported in pack.json under delta_rules.

                                                                              ### 6.2 Replay semantics

                                                                              If new evidence alters ground truth or invalidates prior assumptions:
                                                                              - the system emits a REPLAY_REQUIRED warning
                                                                              - - earlier phases can be rerun to produce new artifact versions with lineage + deltas
                                                                               
                                                                                - ---

                                                                                ## 7. Verification

                                                                                A pack verifies if:
                                                                                1. Re-hashing exported file bytes reproduces HASHES.json entries
                                                                                2. 2. Rebuilding the Merkle tree reproduces ROOT.txt
                                                                                  
                                                                                   3. A verification run SHOULD emit a VERIFY_REPORT.json artifact for auditability (recommended).
                                                                                  
                                                                                   4. ---
                                                                                  
                                                                                   5. ## 8. Security posture
                                                                                  
                                                                                   6. This pack format provides:
                                                                                   7. - tamper evidence (Merkle commitment)
                                                                                      - - reproducibility boundaries (prompt/run hashes)
                                                                                        - - audit-friendly replay and lineage
                                                                                         
                                                                                          - It does not provide confidentiality by itself; sensitive documents should be encrypted at rest prior to inclusion if required.
