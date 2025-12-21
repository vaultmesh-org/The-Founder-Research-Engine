import { Shield, Target, Users, Lock, Brain, Zap } from 'lucide-react';

export const PHASES = [
  {
    id: 'intake',
    name: 'Containment',
    icon: Shield,
    color: 'from-slate-600 to-slate-800',
    description: 'Stop the bleeding. Create boundaries.',
    warning: 'If you skip this phase, you will process noise as signal.'
  },
  {
    id: 'extraction',
    name: 'Ground Truth',
    icon: Target,
    color: 'from-amber-600 to-amber-800',
    description: 'Separate fact from narrative.',
    warning: 'If you skip this phase, you will build on assumptions.'
  },
  {
    id: 'reality',
    name: 'Reality Check',
    icon: Users,
    color: 'from-emerald-600 to-emerald-800',
    description: 'Map accountability.',
    warning: 'If you skip this phase, you will miss who is actually liable.'
  },
  {
    id: 'leverage',
    name: 'VaultMesh Leverage',
    icon: Lock,
    color: 'from-violet-600 to-violet-800',
    description: 'Find proof surfaces.',
    warning: 'If you skip this phase, you will hallucinate leverage.'
  },
  {
    id: 'synthesis',
    name: 'Synthesis',
    icon: Brain,
    color: 'from-cyan-600 to-cyan-800',
    description: 'Structure → Understanding.',
    warning: 'If you skip this phase, you will have data without meaning.'
  },
  {
    id: 'decision',
    name: 'Decision',
    icon: Zap,
    color: 'from-rose-600 to-rose-800',
    description: 'Four lists only.',
    warning: 'If you skip this phase, you will never actually decide.'
  }
];

export const ARTIFACT_OUTPUTS = {
  intake: ['DOCUMENT_INDEX.json'],
  extraction: ['FACTS_ASSUMPTIONS_SPLIT.json', 'TRUTH_GRAPH.json'],
  reality: ['ACTOR_IMPACT_MATRIX.md', 'IRREVERSIBLE_DECISIONS.md'],
  leverage: ['MISSING_PROOF_SURFACES.md', 'PROOF_COLLAPSE_MAP.md'],
  synthesis: ['FOUNDER_RESEARCH_REPORT.md'],
  decision: ['FOUNDER_DECISIONS.md']
};

export const TRUST_LEVELS = [
  { value: 'authoritative', label: 'Authoritative', color: 'emerald', description: 'Regulatory, legal, contractual' },
  { value: 'internal', label: 'Internal', color: 'blue', description: 'Company-generated, engineering specs' },
  { value: 'third-party', label: 'Third-Party', color: 'amber', description: 'External reports, vendor docs' },
  { value: 'speculative', label: 'Speculative', color: 'red', description: 'Marketing, projections, assumptions' }
];
