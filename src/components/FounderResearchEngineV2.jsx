/**
 * Founder Research Engine v0.2
 *
 * Full v0.2 data model with:
 * - Sources with provenance
 * - Runs with iteration tracking
 * - Artifacts with lineage + deltas
 * - IndexedDB storage
 * - Schema validation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Upload, CheckCircle, AlertTriangle, Zap, ChevronRight,
  Loader2, Hash, FileJson, ClipboardList, X, Plus, Play, Download,
  RefreshCw, AlertCircle, Shield, Package
} from 'lucide-react';

// Import v0.2 utilities
import { initBlake3 } from '../utils/hashing.js';
import { createSource, SOURCE_TYPES, getDefaultConfidenceWeight, getDefaultAuthorityLevel } from '../utils/sources.js';
import { createRun, completeRun, checkPhaseDependencies, assessSourceConfidence, WARNING_CODES } from '../utils/runs.js';
import { createArtifact, getArtifactName, getContentType, computeTrustSummary } from '../utils/artifacts.js';
import { PACK_PHASES, getNextPhase, isPhaseComplete } from '../utils/pack.js';
import { PHASE_PROMPTS } from '../constants/prompts.js';

// Import storage
import {
  initDatabase,
  getCurrentPack,
  saveSource,
  getSourcesByPack,
  saveRun,
  getRunsByPhase,
  saveArtifact,
  getLatestArtifact,
  getArtifactsByPack,
  clearDatabase
} from '../storage/db.js';
import { exportPackAsZip, downloadArtifact } from '../storage/exporter.js';
import PackVerifier from './PackVerifier.jsx';

export default function FounderResearchEngineV2() {
  const [pack, setPack] = useState(null);
  const [sources, setSources] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [runs, setRuns] = useState({});
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedArtifact, setExpandedArtifact] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [processingLog, setProcessingLog] = useState([]);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showVerifier, setShowVerifier] = useState(false);

  // Initialize BLAKE3 and database
  useEffect(() => {
    async function init() {
      await initBlake3();
      await initDatabase();

      // Load or create pack
      const currentPack = await getCurrentPack();
      setPack(currentPack);

      // Load sources and artifacts
      const packSources = await getSourcesByPack(currentPack.pack_id);
      const packArtifacts = await getArtifactsByPack(currentPack.pack_id);

      setSources(packSources);
      setArtifacts(packArtifacts);

      addLog('Initialized v0.2 engine', 'success');
    }

    init().catch(err => {
      console.error('Initialization error:', err);
      addLog(`Init error: ${err.message}`, 'error');
    });

    // Load API key
    const stored = localStorage.getItem('anthropic_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('anthropic_api_key', key);
    setShowApiKeyInput(false);
    addLog('API key saved', 'success');
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (e) => {
    if (!pack) return;

    const files = Array.from(e.target.files);

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target.result;

          // Create source with default provenance
          const source = await createSource(
            {
              name: file.name,
              type: file.type,
              content
            },
            {
              source_type: SOURCE_TYPES.INTERNAL,
              authority_level: getDefaultAuthorityLevel(SOURCE_TYPES.INTERNAL),
              confidence_weight: getDefaultConfidenceWeight(SOURCE_TYPES.INTERNAL)
            }
          );

          source.pack_id = pack.pack_id;

          await saveSource(source);
          setSources(prev => [...prev, source]);
          addLog(`Loaded: ${file.name}`, 'success');
        } catch (err) {
          addLog(`Failed to load ${file.name}: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
    }
  }, [pack]);

  // Add text document
  const addTextDocument = useCallback(async () => {
    if (!textInput.trim() || !pack) return;

    try {
      const source = await createSource(
        {
          name: `Manual Input ${sources.length + 1}`,
          type: 'text/plain',
          content: textInput
        },
        {
          source_type: SOURCE_TYPES.INTERNAL,
          authority_level: getDefaultAuthorityLevel(SOURCE_TYPES.INTERNAL),
          confidence_weight: getDefaultConfidenceWeight(SOURCE_TYPES.INTERNAL)
        }
      );

      source.pack_id = pack.pack_id;

      await saveSource(source);
      setSources(prev => [...prev, source]);
      addLog(`Added manual document`, 'success');
      setTextInput('');
    } catch (err) {
      addLog(`Failed to add document: ${err.message}`, 'error');
    }
  }, [textInput, pack, sources.length]);

  // Remove source
  const removeSource = async (source_id) => {
    setSources(prev => prev.filter(s => s.source_id !== source_id));
    addLog('Removed document', 'info');
  };

  // Update source provenance
  const updateSourceProvenance = async (source_id, updates) => {
    setSources(prev => prev.map(s =>
      s.source_id === source_id
        ? { ...s, provenance: { ...s.provenance, ...updates } }
        : s
    ));

    const source = sources.find(s => s.source_id === source_id);
    if (source) {
      source.provenance = { ...source.provenance, ...updates };
      await saveSource(source);
      addLog('Updated source provenance', 'info');
    }
  };

  // Process phase
  const processPhase = async (phaseId, isRerun = false) => {
    if (!apiKey) {
      setError('Please set your Anthropic API key first');
      setShowApiKeyInput(true);
      return;
    }

    if (!pack || sources.length === 0) {
      setError('No sources available for processing');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const phaseRuns = runs[phaseId] || [];
    const iteration = phaseRuns.length + 1;

    addLog(`Starting ${PACK_PHASES.find(p => p.phase_id === phaseId)?.name} (iteration ${iteration})`, 'info');

    try {
      // Check dependencies
      const completedPhases = PACK_PHASES
        .filter(p => isPhaseComplete(p.phase_id, artifacts))
        .map(p => p.phase_id);

      const depWarning = checkPhaseDependencies(phaseId, completedPhases);

      if (depWarning && depWarning.severity === 'block') {
        setError(depWarning.message);
        setIsProcessing(false);
        return;
      }

      // Assess source confidence
      const confWarning = assessSourceConfidence(sources);

      const warnings = [depWarning, confWarning].filter(Boolean);

      // Get inputs
      const source_ids = sources.map(s => s.source_id);
      const artifact_ids = artifacts
        .filter(a => a.phase_id !== phaseId) // Don't include current phase artifacts as inputs
        .map(a => a.artifact_id);

      // Create run
      const run = await createRun({
        pack_id: pack.pack_id,
        phase_id: phaseId,
        iteration,
        source_ids,
        artifact_ids,
        engine: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: null
        },
        prompt_refs: {
          system_prompt: 'You are a forensic research assistant.',
          phase_prompt: PHASE_PROMPTS[phaseId],
          developer_prompt: null
        },
        warnings
      });

      // Build document context
      const documentContents = sources
        .map(s => {
          const prov = s.provenance;
          return `--- Document: ${s.filename} ---
Source Type: ${prov.source_type} (confidence: ${prov.confidence_weight})
Authority: ${prov.authority_level}

${s._content}
`;
        })
        .join('\n\n');

      // Build previous artifacts context
      const previousArtifacts = artifacts
        .filter(a => a.phase_id !== phaseId)
        .map(a => `--- Artifact: ${a.name} (v${a.version}) ---\n${JSON.stringify(a._content, null, 2)}`)
        .join('\n\n');

      const userContent = phaseId === 'synthesis' || phaseId === 'decision'
        ? `Process these artifacts and documents:\n\n${previousArtifacts}\n\nOriginal Documents:\n${documentContents}`
        : `Process these documents:\n\n${documentContents}${previousArtifacts ? `\n\nPrevious context:\n${previousArtifacts}` : ''}`;

      // Call API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: run.engine.model,
          max_tokens: run.engine.max_tokens,
          system: run.prompt_refs.system_prompt,
          messages: [{ role: 'user', content: userContent }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const resultText = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      // Parse result
      let parsedResult;
      const isMarkdown = phaseId === 'synthesis' || phaseId === 'decision';

      if (isMarkdown) {
        parsedResult = resultText;
      } else {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response from model');
        }
      }

      // Create artifacts
      const phaseArtifactNames = PACK_PHASES.find(p => p.phase_id === phaseId)?.expected_artifacts || [];
      const createdArtifacts = [];

      for (let i = 0; i < phaseArtifactNames.length; i++) {
        const artifactName = phaseArtifactNames[i];
        let content;

        // Extract content for this artifact
        if (phaseArtifactNames.length === 1) {
          content = parsedResult;
        } else if (phaseId === 'extraction') {
          content = i === 0
            ? {
                verifiableFacts: parsedResult.verifiableFacts,
                assumptions: parsedResult.assumptions,
                claimsRequiringProof: parsedResult.claimsRequiringProof,
                missingInformation: parsedResult.missingInformation
              }
            : {
                contradictions: parsedResult.contradictions || [],
                mergedFacts: parsedResult.verifiableFacts || []
              };
        } else if (phaseId === 'reality') {
          content = i === 0 ? parsedResult.actorImpactMatrix : parsedResult.irreversibleDecisions;
        } else if (phaseId === 'leverage') {
          content = i === 0 ? parsedResult.missingProofSurfaces : parsedResult.proofCollapseMap;
        }

        // Find parent artifact (previous version)
        const parentArtifact = await getLatestArtifact(pack.pack_id, artifactName);

        // Create artifact
        const artifact = await createArtifact({
          pack_id: pack.pack_id,
          name: artifactName,
          phase_id: phaseId,
          version: parentArtifact ? parentArtifact.version + 1 : 1,
          produced_by_run_id: run.run_id,
          content,
          content_type: getContentType(artifactName),
          prompt_hash: run.hashes.prompt_hash,
          inputs_hash: run.hashes.inputs_hash,
          parent_artifact: parentArtifact
        });

        // Compute trust summary
        artifact.trust_summary = computeTrustSummary(sources);

        await saveArtifact(artifact);
        createdArtifacts.push(artifact);
      }

      // Complete run
      const completedRun = await completeRun(run, createdArtifacts.map(a => a.artifact_id));
      await saveRun(completedRun);

      // Update state
      setRuns(prev => ({
        ...prev,
        [phaseId]: [...(prev[phaseId] || []), completedRun]
      }));

      setArtifacts(prev => [...prev, ...createdArtifacts]);

      addLog(`Phase complete. Created: ${phaseArtifactNames.join(', ')}`, 'success');

      if (createdArtifacts[0]?.hashes?.content_hash) {
        addLog(`Hash: ${createdArtifacts[0].hashes.content_hash.slice(0, 16)}...`, 'info');
      }

      if (createdArtifacts[0]?.lineage?.delta) {
        addLog(`Delta: ${createdArtifacts[0].lineage.delta.summary}`, 'info');
      }

      // Auto-advance to next phase
      if (!isRerun) {
        const nextPhase = getNextPhase(phaseId);
        if (nextPhase) {
          const nextIndex = PACK_PHASES.findIndex(p => p.phase_id === nextPhase.phase_id);
          setCurrentPhase(nextIndex);
        }
      }

    } catch (err) {
      console.error('Phase processing error:', err);
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear all data
  const handleClearAll = async () => {
    if (!confirm('Clear all data? This cannot be undone.')) return;

    await clearDatabase();
    window.location.reload();
  };

  // Export pack
  const handleExportPack = async () => {
    if (!pack) return;

    try {
      addLog('Exporting pack...', 'info');
      await exportPackAsZip(pack.pack_id);
      addLog('Pack exported successfully', 'success');
    } catch (err) {
      addLog(`Export error: ${err.message}`, 'error');
    }
  };

  if (!pack) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-amber-400" />
          <p className="text-slate-400">Initializing v0.2...</p>
        </div>
      </div>
    );
  }

  const currentPhaseId = PACK_PHASES[currentPhase]?.phase_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              Founder Research Engine
            </h1>
          </div>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Forensic reconstruction of reality. Not research—proof surface discovery.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>v0.2.0</span>
            <span>•</span>
            <span>Pack: {pack.pack_id.slice(0, 20)}...</span>
            {apiKey && (
              <>
                <span>•</span>
                <span className="text-emerald-500">API Key Set</span>
              </>
            )}
          </div>
        </div>

        {/* API Key Input */}
        {(showApiKeyInput || !apiKey) && (
          <div className="p-4 bg-amber-900/20 border border-amber-700 rounded-xl space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-amber-300">Anthropic API Key Required</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-ant-api..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveApiKey(e.target.value);
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      saveApiKey(input.value);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase Progress */}
        <div className="flex items-center justify-between gap-1 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          {PACK_PHASES.map((phase, idx) => {
            const Icon = phase.icon || Shield;
            const isComplete = isPhaseComplete(phase.phase_id, artifacts);
            const isCurrent = idx === currentPhase;
            const phaseRuns = runs[phase.phase_id] || [];

            return (
              <React.Fragment key={phase.phase_id}>
                <button
                  onClick={() => setExpandedPhase(expandedPhase === phase.phase_id ? null : phase.phase_id)}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${isCurrent ? 'bg-slate-800 ring-2 ring-amber-500/50' :
                      isComplete ? 'bg-slate-800/50' : 'opacity-50'
                    }`}
                  title={phase.skip_consequence}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                    {isComplete ? <CheckCircle className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-medium hidden md:block">{phase.name}</span>
                  {phaseRuns.length > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {phaseRuns.length}
                    </span>
                  )}
                </button>
                {idx < PACK_PHASES.length - 1 && (
                  <ChevronRight className={`w-4 h-4 ${isComplete ? 'text-amber-500' : 'text-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Sources Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Sources</h2>
              <span className="text-xs text-slate-500 ml-auto">{sources.length} sources</span>
            </div>

            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-amber-600 transition-colors cursor-pointer bg-slate-900/30">
              <Upload className="w-8 h-8 text-slate-500" />
              <span className="text-sm text-slate-400">Drop files or click to upload</span>
              <input type="file" multiple onChange={handleFileUpload} className="hidden" accept=".txt,.md,.json" />
            </label>

            <div className="space-y-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or paste content..."
                className="w-full h-24 p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                onClick={addTextDocument}
                disabled={!textInput.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Text
              </button>
            </div>

            {sources.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sources.map(source => (
                  <div key={source.source_id} className="p-2 bg-slate-800/50 rounded-lg text-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{source.filename}</p>
                        <p className="text-xs text-slate-500">
                          {source.provenance.source_type} • confidence: {source.provenance.confidence_weight}
                        </p>
                      </div>
                      <button onClick={() => removeSource(source.source_id)} className="text-slate-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <select
                      value={source.provenance.source_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        updateSourceProvenance(source.source_id, {
                          source_type: newType,
                          authority_level: getDefaultAuthorityLevel(newType),
                          confidence_weight: getDefaultConfidenceWeight(newType)
                        });
                      }}
                      className="w-full text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:outline-none"
                    >
                      {Object.values(SOURCE_TYPES).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Processing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Processing</h2>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Phase:</span>
                <span className="font-medium text-amber-300">{PACK_PHASES[currentPhase]?.name}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => processPhase(currentPhaseId)}
                  disabled={isProcessing || sources.length === 0 || !apiKey}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Play className="w-5 h-5" /> Run Phase</>
                  )}
                </button>

                {isPhaseComplete(currentPhaseId, artifacts) && (
                  <button
                    onClick={() => processPhase(currentPhaseId, true)}
                    disabled={isProcessing || !apiKey}
                    className="flex items-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-all disabled:opacity-50"
                    title="Re-run this phase"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  onClick={handleExportPack}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Package className="w-3 h-3" /> Export Pack
                </button>
                <button
                  onClick={() => setShowVerifier(true)}
                  className="flex-1 px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Shield className="w-3 h-3" /> Verify Pack
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {processingLog.length > 0 && (
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 max-h-32 overflow-y-auto">
                <div className="space-y-1 text-xs font-mono">
                  {processingLog.slice(-10).map((log, idx) => (
                    <div key={idx} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                      <span className="text-slate-600">{log.timestamp}</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold">Artifacts</h2>
                <span className="text-xs text-slate-500">({artifacts.length} total)</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {artifacts.slice(-6).reverse().map(artifact => (
                <div key={artifact.artifact_id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-amber-300 truncate">{artifact.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        v{artifact.version} • {artifact.phase_id}
                      </p>
                      {artifact.lineage?.delta && (
                        <p className="text-xs text-cyan-400 mt-1">
                          Δ {artifact.lineage.delta.summary}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => downloadArtifact(artifact)}
                      className="text-slate-500 hover:text-slate-300"
                      title="Download artifact"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="w-3 h-3 text-slate-500" />
                    <span className="font-mono text-slate-500 truncate" title={artifact.hashes.content_hash}>
                      {artifact.hashes.content_hash.slice(0, 12)}...
                    </span>
                  </div>

                  {artifact.trust_summary && (
                    <div className="text-xs text-slate-500">
                      Confidence: {artifact.trust_summary.confidence_score} • {artifact.trust_summary.dominant_sources.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methodology */}
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800/50 text-xs text-slate-500 space-y-2">
          <p className="font-medium text-slate-400">v0.2 Improvements:</p>
          <div className="grid md:grid-cols-3 gap-2">
            <div>→ Provenance tracking with confidence weights</div>
            <div>→ Iteration support with delta computation</div>
            <div>→ BLAKE3 hashing for all artifacts</div>
            <div>→ Run metadata with reproducibility</div>
            <div>→ Trust summaries on all outputs</div>
            <div>→ Full pack export as signed ZIP</div>
          </div>
        </div>

      </div>

      {/* Pack Verifier Modal */}
      {showVerifier && (
        <PackVerifier onClose={() => setShowVerifier(false)} />
      )}
    </div>
  );
}
