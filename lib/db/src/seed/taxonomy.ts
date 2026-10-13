export const SEED_DIFFICULTY = [
  { slug: "easy", name: "Easy", rank: 1 },
  { slug: "medium", name: "Medium", rank: 2 },
  { slug: "hard", name: "Hard", rank: 3 },
] as const;

export const SEED_TOPICS: { slug: string; name: string; subs: { slug: string; name: string }[] }[] = [
  { slug: "cardiovascular", name: "Cardiovascular", subs: [{ slug: "cv-rhythm", name: "Rhythm and ECG" }, { slug: "cv-acs-hf", name: "Acute coronary syndrome and heart failure" }] },
  { slug: "respiratory", name: "Respiratory", subs: [{ slug: "resp-obstructive", name: "Obstructive airway disease" }, { slug: "resp-acute", name: "Acute respiratory emergencies" }] },
  { slug: "neurology", name: "Neurology", subs: [{ slug: "neuro-vascular-seizure", name: "Stroke and seizures" }, { slug: "neuro-head-icp", name: "Head injury and raised ICP" }] },
  { slug: "gi-renal-metabolic", name: "Gastrointestinal, renal and metabolic", subs: [{ slug: "gi-emergencies", name: "Gastrointestinal emergencies" }, { slug: "renal-metabolic", name: "Renal, electrolyte and metabolic" }] },
  { slug: "pharm-tox", name: "Pharmacology and toxicology", subs: [{ slug: "pharm-analgesia", name: "Analgesia and anaesthesia" }, { slug: "tox-antidotes", name: "Poisoning and antidotes" }] },
  { slug: "trauma-environment", name: "Trauma, resuscitation and environment", subs: [{ slug: "trauma-resus", name: "Resuscitation and trauma" }, { slug: "environmental", name: "Burns and environmental emergencies" }] },
];
