export interface Station { slug: string; title: string; category: string; detail: string; image: string }

export const stations: Station[] = [
  { slug: 'stroke-and-tia', title: 'Stroke and TIA', category: 'Stroke & vascular', detail: 'Focused history taking, examiner guidance and timed practice.', image: '/brand/t1.jpg' },
  { slug: 'subarachnoid-haemorrhage', title: 'Subarachnoid haemorrhage', category: 'Stroke & vascular', detail: 'Explore a sudden severe headache and examiner expectations.', image: '/brand/t2.jpg' },
  { slug: 'cauda-equina', title: 'Cauda equina syndrome', category: 'Weakness & spinal', detail: 'A sensitive red-flag history with a clear emergency plan.', image: '/brand/t3.jpg' },
  { slug: 'first-seizure', title: 'First seizure', category: 'Seizures', detail: 'Explore a first seizure, witness history and immediate priorities.', image: '/brand/t4.jpg' },
  { slug: 'meningitis', title: 'Meningitis', category: 'CNS infection', detail: 'Practise a focused history in a time-critical presentation.', image: '/brand/t5.jpg' },
];

export const topicGroups: { name: string; topics: string[]; ready?: { title: string; slug: string }[] }[] = [
  { name: 'Stroke and vascular', topics: ['Stroke and TIA', 'Subarachnoid haemorrhage', 'Intracerebral haemorrhage', 'Cerebral venous sinus thrombosis', 'Carotid and vertebral artery dissection'], ready: [{ title: 'Stroke and TIA', slug: 'stroke-and-tia' }, { title: 'Subarachnoid haemorrhage', slug: 'subarachnoid-haemorrhage' }] },
  { name: 'Headache', topics: ['Thunderclap headache', 'Migraine and cluster headache', 'Giant cell arteritis', 'Idiopathic intracranial hypertension', 'Tension headache and red flags'] },
  { name: 'Seizures', topics: ['First seizure', 'Status epilepticus', 'Febrile seizure', 'Non-epileptic attacks', 'Eclampsia'], ready: [{ title: 'First seizure', slug: 'first-seizure' }] },
  { name: 'CNS infection', topics: ['Meningitis', 'Encephalitis', 'Brain abscess'], ready: [{ title: 'Meningitis', slug: 'meningitis' }] },
  { name: 'Collapse and altered consciousness', topics: ['Syncope versus seizure', 'Coma and reduced GCS', 'Delirium', 'Wernicke’s encephalopathy', 'Hypoglycaemia as a mimic'] },
  { name: 'Weakness and spinal', topics: ['Cord compression', 'Cauda equina syndrome', 'Guillain-Barré syndrome', 'Myasthenia gravis crisis', 'Multiple sclerosis relapse', 'Bell’s palsy'], ready: [{ title: 'Cauda equina syndrome', slug: 'cauda-equina' }] },
  { name: 'Dizziness', topics: ['BPPV', 'Vestibular neuritis', 'Posterior circulation stroke (HINTS)'] },
  { name: 'Head injury and raised pressure', topics: ['Head injury (GCS, CT head criteria)', 'Raised intracranial pressure', 'Subdural and extradural haematoma'] },
  { name: 'Skills often examined', topics: ['Neurological examination (cranial nerves, limbs, gait)', 'GCS and pupils', 'Fundoscopy', 'Lumbar puncture', 'Reading a CT head'] },
];

/** Static station pages served from public/neurology (to be migrated to the DB in phase 06). */
export const stationFiles: Record<string, { title: string; file: string }> = {
  'stroke-and-tia': { title: 'Stroke and TIA', file: 'stroke-and-tia.html' },
  'subarachnoid-haemorrhage': { title: 'Subarachnoid haemorrhage', file: 'subarachnoid-haemorrhage.html' },
  'cauda-equina': { title: 'Cauda equina syndrome', file: 'cauda-equina.html' },
  'first-seizure': { title: 'First seizure', file: 'first-seizure.html' },
  meningitis: { title: 'Meningitis', file: 'meningitis.html' },
};
