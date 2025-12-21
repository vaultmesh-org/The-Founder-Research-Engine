import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Upload, CheckCircle, AlertTriangle, Zap, ChevronRight, ChevronDown,
  Loader2, Hash, FileJson, ClipboardList, X, Plus, Play, Download,
  RefreshCw, AlertCircle, Info, Shield
} from 'lucide-react';
import { PHASES, ARTIFACT_OUTPUTS, TRUST_LEVELS } from '../constants/phases';
import { PHASE_PROMPTS, PROMPT_VERSION } from '../constants/prompts';
import { hashContent, signArtifact } from '../utils/crypto';

export default function FounderResearchEngine() {
  const [documents, setDocuments] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [artifacts, setArtifacts] = useState({});
  const [artifactHistory, setArtifactHistory] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [processingLog, setProcessingLog] = useState([]);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load API key from localStorage
  useEffect(() => {
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

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map((file, idx) => ({
      id: `doc_${Date.now()}_${idx}`,
      name: file.name,
      type: file.type,
      size: file.size,
      content: null,
      status: 'pending',
      trustLevel: 'internal', // Default trust level
      uploadedAt: new Date().toISOString()
    }));

    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocuments(prev => prev.map(doc =>
          doc.id === newDocs[idx].id
            ? { ...doc, content: event.target.result, status: 'ready' }
            : doc
        ));
        addLog(`Loaded: ${file.name}`, 'success');
      };
      reader.onerror = () => {
        addLog(`Failed to load: ${file.name}`, 'error');
      };
      reader.readAsText(file);
    });

    setDocuments(prev => [...prev, ...newDocs]);
  }, []);

  const addTextDocument = () => {
    if (!textInput.trim()) return;
    const doc = {
      id: `doc_${Date.now()}`,
      name: `Manual Input ${documents.length + 1}`,
      type: 'text/plain',
      size: textInput.length,
      content: textInput,
      status: 'ready',
      trustLevel: 'internal',
      uploadedAt: new Date().toISOString()
    };
    setDocuments(prev => [...prev, doc]);
    addLog(`Added manual document: ${doc.name}`, 'success');
    setTextInput('');
  };

  const removeDocument = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    addLog(`Removed document`, 'info');
  };

  const updateDocumentTrust = (id, trustLevel) => {
    setDocuments(prev => prev.map(d =>
      d.id === id ? { ...d, trustLevel } : d
    ));
    addLog(`Updated trust level for document`, 'info');
  };

  const getIterationNumber = (phaseId) => {
    const history = artifactHistory[phaseId] || [];
    return history.length + 1;
  };

  const processPhase = async (phaseId, isRerun = false) => {
    if (!apiKey) {
      setError('Please set your Anthropic API key first');
      setShowApiKeyInput(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    const iterationNum = getIterationNumber(phaseId);
    addLog(`${isRerun ? 'Re-running' : 'Starting'} Phase: ${PHASES.find(p => p.id === phaseId).name} (iteration ${iterationNum})`, 'info');

    const readyDocs = documents.filter(d => d.status === 'ready' && d.content);
    if (readyDocs.length === 0) {
      setError('No documents ready for processing');
      setIsProcessing(false);
      return;
    }

    // Build document context with trust metadata
    const documentContents = readyDocs
      .map(d => {
        const trust = TRUST_LEVELS.find(t => t.value === d.trustLevel);
        return `--- Document: ${d.name} ---
Trust Level: ${trust?.label || 'Unknown'} (${trust?.description || ''})
Uploaded: ${new Date(d.uploadedAt).toLocaleString()}

${d.content}
`;
      })
      .join('\n\n');

    const previousArtifacts = Object.entries(artifacts)
      .map(([key, value]) => `--- Previous Artifact: ${key} ---\n${JSON.stringify(value.content, null, 2)}`)
      .join('\n\n');

    const systemPrompt = PHASE_PROMPTS[phaseId];
    const userContent = phaseId === 'synthesis' || phaseId === 'decision'
      ? `Process these artifacts and documents:\n\n${previousArtifacts}\n\nOriginal Documents:\n${documentContents}`
      : `Process these documents:\n\n${documentContents}${previousArtifacts ? `\n\nPrevious context:\n${previousArtifacts}` : ''}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
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

      let parsedResult;
      if (phaseId === 'synthesis' || phaseId === 'decision') {
        parsedResult = resultText;
      } else {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response from model');
        }
      }

      // Generate artifact metadata and signatures
      const artifactNames = ARTIFACT_OUTPUTS[phaseId];
      const newArtifacts = {};

      for (const name of artifactNames) {
        let content;
        if (artifactNames.length === 1) {
          content = parsedResult;
        } else if (phaseId === 'extraction') {
          content = name === 'FACTS_ASSUMPTIONS_SPLIT.json'
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
          content = name === 'ACTOR_IMPACT_MATRIX.md'
            ? parsedResult.actorImpactMatrix
            : parsedResult.irreversibleDecisions;
        } else if (phaseId === 'leverage') {
          content = name === 'MISSING_PROOF_SURFACES.md'
            ? parsedResult.missingProofSurfaces
            : parsedResult.proofCollapseMap;
        }

        // Sign the artifact
        const signature = await signArtifact(name, content, {
          phaseId,
          promptVersion: PROMPT_VERSION,
          iterationNumber: iterationNum,
          documentCount: readyDocs.length,
          trustDistribution: readyDocs.reduce((acc, d) => {
            acc[d.trustLevel] = (acc[d.trustLevel] || 0) + 1;
            return acc;
          }, {})
        });

        newArtifacts[name] = {
          content,
          signature,
          createdAt: signature.timestamp
        };
      }

      // Update artifacts and history
      setArtifacts(prev => ({ ...prev, ...newArtifacts }));
      setArtifactHistory(prev => ({
        ...prev,
        [phaseId]: [...(prev[phaseId] || []), {
          iteration: iterationNum,
          timestamp: new Date().toISOString(),
          artifacts: newArtifacts
        }]
      }));

      addLog(`Phase complete. Generated: ${artifactNames.join(', ')}`, 'success');
      addLog(`Artifacts signed with hash: ${Object.values(newArtifacts)[0].signature.contentHash.slice(0, 16)}...`, 'info');

      if (!isRerun) {
        const phaseIndex = PHASES.findIndex(p => p.id === phaseId);
        if (phaseIndex < PHASES.length - 1) {
          setCurrentPhase(phaseIndex + 1);
        }
      }

    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const rerunPhase = (phaseId) => {
    processPhase(phaseId, true);
  };

  const downloadArtifact = (name, artifact) => {
    const content = artifact.content;
    const signature = artifact.signature;

    // Create artifact package with signature
    const artifactPackage = {
      artifact: name,
      content,
      signature,
      exported: new Date().toISOString()
    };

    const blob = new Blob([
      JSON.stringify(artifactPackage, null, 2)
    ], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.signed.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllArtifacts = () => {
    Object.entries(artifacts).forEach(([name, artifact]) => {
      downloadArtifact(name, artifact);
    });
  };

  const clearAllData = () => {
    if (confirm('Clear all documents, artifacts, and logs? This cannot be undone.')) {
      setDocuments([]);
      setArtifacts({});
      setArtifactHistory({});
      setProcessingLog([]);
      setCurrentPhase(0);
      setError(null);
      addLog('All data cleared', 'info');
    }
  };

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
            <span>v0.1.0</span>
            <span>•</span>
            <span>Prompt v{PROMPT_VERSION}</span>
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
          {PHASES.map((phase, idx) => {
            const Icon = phase.icon;
            const isComplete = idx < currentPhase || artifacts[ARTIFACT_OUTPUTS[phase.id][0]];
            const isCurrent = idx === currentPhase;
            const history = artifactHistory[phase.id] || [];

            return (
              <React.Fragment key={phase.id}>
                <button
                  onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${isCurrent ? 'bg-slate-800 ring-2 ring-amber-500/50' :
                      isComplete ? 'bg-slate-800/50' : 'opacity-50'
                    }`}
                  title={phase.warning}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center`}>
                    {isComplete ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-medium hidden md:block">{phase.name}</span>
                  {history.length > 1 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {history.length}
                    </span>
                  )}
                </button>
                {idx < PHASES.length - 1 && (
                  <ChevronRight className={`w-4 h-4 ${idx < currentPhase ? 'text-amber-500' : 'text-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Expanded Phase Info */}
        {expandedPhase && (
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-amber-300">
                {PHASES.find(p => p.id === expandedPhase)?.name}
              </h3>
              <button onClick={() => setExpandedPhase(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-400">
              {PHASES.find(p => p.id === expandedPhase)?.description}
            </p>
            <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-800/50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                {PHASES.find(p => p.id === expandedPhase)?.warning}
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Outputs: {ARTIFACT_OUTPUTS[expandedPhase].join(', ')}
            </div>
            {artifactHistory[expandedPhase]?.length > 0 && (
              <div className="text-xs text-slate-500">
                Iterations: {artifactHistory[expandedPhase].length}
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">

          {/* Document Intake */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Document Intake</h2>
              <span className="text-xs text-slate-500 ml-auto">{documents.length} documents</span>
            </div>

            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-amber-600 transition-colors cursor-pointer bg-slate-900/30">
              <Upload className="w-8 h-8 text-slate-500" />
              <span className="text-sm text-slate-400">Drop files or click to upload</span>
              <input type="file" multiple onChange={handleFileUpload} className="hidden" accept=".txt,.md,.json,.csv,.pdf" />
            </label>

            <div className="space-y-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or paste document content directly..."
                className="w-full h-24 p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                onClick={addTextDocument}
                disabled={!textInput.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Text Document
              </button>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {documents.map(doc => {
                  const trust = TRUST_LEVELS.find(t => t.value === doc.trustLevel);
                  return (
                    <div key={doc.id} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg text-sm">
                      <FileJson className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="truncate font-medium">{doc.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={doc.trustLevel}
                            onChange={(e) => updateDocumentTrust(doc.id, e.target.value)}
                            className={`text-xs px-2 py-0.5 rounded bg-${trust?.color}-900/50 text-${trust?.color}-300 border border-${trust?.color}-700/50 focus:outline-none`}
                            title={trust?.description}
                          >
                            {TRUST_LEVELS.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <span className={`text-xs px-2 py-0.5 rounded ${doc.status === 'ready' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'
                            }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeDocument(doc.id)} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Processing Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Processing</h2>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Phase:</span>
                <span className="font-medium text-amber-300">{PHASES[currentPhase].name}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => processPhase(PHASES[currentPhase].id)}
                  disabled={isProcessing || documents.filter(d => d.status === 'ready').length === 0 || !apiKey}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Play className="w-5 h-5" /> Run Phase</>
                  )}
                </button>

                {artifacts[ARTIFACT_OUTPUTS[PHASES[currentPhase].id][0]] && (
                  <button
                    onClick={() => rerunPhase(PHASES[currentPhase].id)}
                    disabled={isProcessing || !apiKey}
                    className="flex items-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Re-run this phase with current documents"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {apiKey ? 'Update API Key' : 'Set API Key'}
                </button>
                <button
                  onClick={clearAllData}
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

            {/* Processing Log */}
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

        {/* Generated Artifacts */}
        {Object.keys(artifacts).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold">Generated Artifacts</h2>
                <span className="text-xs text-slate-500">({Object.keys(artifacts).length} files)</span>
              </div>
              <button
                onClick={downloadAllArtifacts}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Download All
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(artifacts).map(([name, artifact]) => {
                const content = artifact.content;
                const sig = artifact.signature;
                return (
                  <div key={name} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-amber-300 truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Hash className="w-3 h-3" />
                          <span className="font-mono truncate" title={sig.contentHash}>
                            {sig.contentHash.slice(0, 12)}...
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Iteration {sig.metadata.iterationNumber} • {new Date(sig.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadArtifact(name, artifact)}
                        className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                        title="Download signed artifact"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-xs font-mono text-slate-400 bg-slate-950/50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {typeof content === 'string' ? content.slice(0, 500) : JSON.stringify(content, null, 2).slice(0, 500)}
                        {(typeof content === 'string' ? content.length : JSON.stringify(content).length) > 500 && '...'}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Methodology Reference */}
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800/50 text-xs text-slate-500 space-y-2">
          <p className="font-medium text-slate-400">Founder Method Principles:</p>
          <div className="grid md:grid-cols-3 gap-2">
            <div>→ Never read everything linearly</div>
            <div>→ Force structure before understanding</div>
            <div>→ Reality is defined by accountability</div>
            <div>→ Post-incident reality defines pre-incident value</div>
            <div>→ Complexity kills adoption</div>
            <div>→ Insight emerges from structure</div>
          </div>
        </div>

      </div>
    </div>
  );
}
