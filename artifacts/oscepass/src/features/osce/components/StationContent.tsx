import type { OsceBlock, OsceInteractionPart, OsceMarkingDomain, OsceQuestionAnswer, OsceStationContent, OsceTiming } from '@workspace/api-client-react';
import { Blocks, Rich } from './Rich';
import { Section } from './Section';

export interface OpenAllSignal { open: boolean; tick: number }

const has = (blocks: OsceBlock[] | undefined): blocks is OsceBlock[] => Array.isArray(blocks) && blocks.length > 0;

function Interaction({ parts, openAll }: { parts: OsceInteractionPart[]; openAll?: OpenAllSignal }) {
  return (
    <>
      {parts.map((part, i) => (
        <Section key={i} title={`Part ${i + 1}. ${part.title}`} openAll={openAll}>
          {part.lines.map((line, j) =>
            line.kind === 'callout' ? (
              <p key={j} className="osce-callout" role="note"><Rich text={line.text} /></p>
            ) : (
              <p key={j} className={`osce-line is-${line.role ?? 'patient'}`}><strong>{line.speaker}:</strong> <Rich text={line.text} /></p>
            ),
          )}
        </Section>
      ))}
    </>
  );
}

function Questions({ items, openAll }: { items: OsceQuestionAnswer[]; openAll?: OpenAllSignal }) {
  return (
    <>
      {items.map((q, i) => (
        <Section key={i} title={`${i + 1}. ${q.question}`} openAll={openAll}><Blocks blocks={q.answer} /></Section>
      ))}
    </>
  );
}

function MarkScheme({ domains, content, totalMarks }: { domains: OsceMarkingDomain[]; content: OsceStationContent; totalMarks: number }) {
  const withDescriptors = domains.some((d) => d.descriptor);
  return (
    <Section title={`Examiner mark scheme (${totalMarks} marks)`}>
      <div className="osce-scroll" tabIndex={0} role="region" aria-label="Mark scheme, scrolls sideways on small screens">
        <table className="osce-table">
          <thead><tr><th scope="col">Domain</th>{withDescriptors && <th scope="col">Expected behaviour</th>}<th scope="col">Marks</th></tr></thead>
          <tbody>{domains.map((d) => <tr key={d.id}><th scope="row">{d.domain}</th>{withDescriptors && <td>{d.descriptor}</td>}<td>{d.maxMarks}</td></tr>)}</tbody>
        </table>
      </div>
      {has(content.globalRatingGuide) && <><h3>Global rating</h3><Blocks blocks={content.globalRatingGuide} /></>}
      {has(content.commonErrors) && <><h3>Common errors</h3><Blocks blocks={content.commonErrors} /></>}
    </Section>
  );
}

/** Candidate instructions are shown in every mode and view. */
export function CandidateInstructions({ content }: { content: OsceStationContent }) {
  return <Section title="Candidate instructions" defaultOpen><Blocks blocks={content.candidateInstructions} /></Section>;
}

/** Learning mode: everything a learner needs to study the station. */
export function LearningSections({ content, domains, totalMarks, openAll }: { content: OsceStationContent; domains: OsceMarkingDomain[]; totalMarks: number; openAll?: OpenAllSignal }) {
  return (
    <>
      <Section title="Aim and learning outcomes" defaultOpen openAll={openAll}><Blocks blocks={content.aim} /></Section>
      {content.actorBriefs.map((brief, i) => <Section key={i} title={brief.title} openAll={openAll}><Blocks blocks={brief.blocks} /></Section>)}
      {content.modelInteraction.length > 0 && <Section title="Model history-taking interaction" openAll={openAll}><Interaction parts={content.modelInteraction} openAll={openAll} /></Section>}
      <MarkScheme domains={domains} content={content} totalMarks={totalMarks} />
      {content.examinerQuestions.length > 0 && <Section title="Examiner questions (tap each for the model answer)" openAll={openAll}><Questions items={content.examinerQuestions} openAll={openAll} /></Section>}
      {has(content.teachingPoints) && <Section title="Teaching points" openAll={openAll}><Blocks blocks={content.teachingPoints} /></Section>}
      {has(content.resources) && <Section title="Resources for learners" openAll={openAll}><Blocks blocks={content.resources} /></Section>}
    </>
  );
}

/** Exam mode, candidate view: only what a candidate may see. */
export function CandidateExamSections({ content, timing }: { content: OsceStationContent; timing: OsceTiming }) {
  if (!has(content.examinerQuestionPrompts)) return null;
  return <Section title={`Examiner questions (${Math.round(timing.examinerSeconds / 60)} minutes)`} defaultOpen><Blocks blocks={content.examinerQuestionPrompts} /></Section>;
}

/** Exam mode, examiner view (the marking sheet itself is rendered by the page). */
export function ExaminerSections({ content }: { content: OsceStationContent }) {
  return (
    <>
      {has(content.examinerExpectations) && <Section title="What the examiner expects"><Blocks blocks={content.examinerExpectations} /></Section>}
      {has(content.ifThisHappens) && <Section title="If this happens, react like this"><Blocks blocks={content.ifThisHappens} /></Section>}
      {has(content.plainLanguage) && <Section title="Plain-language words to use"><Blocks blocks={content.plainLanguage} /></Section>}
      {has(content.patientQuestions) && <Section title="Answering patient and relative questions"><Blocks blocks={content.patientQuestions} /></Section>}
      {content.examinerQuestions.length > 0 && <Section title="Examiner questions with model answers"><Questions items={content.examinerQuestions} /></Section>}
      {has(content.examinerAnswerTips) && <Section title="How to answer the examiner"><Blocks blocks={content.examinerAnswerTips} /></Section>}
      {has(content.redFlags) && <Section title="Red flags for examiners"><Blocks blocks={content.redFlags} /></Section>}
    </>
  );
}
