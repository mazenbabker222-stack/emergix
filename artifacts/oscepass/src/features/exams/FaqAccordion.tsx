import type { Faq } from '@workspace/api-client-react';
import { Prose } from '@/components/shared/Prose';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/**
 * Radix Accordion: each question is a button inside a heading, with aria-expanded/aria-controls,
 * Enter/Space to toggle and Up/Down/Home/End to move between questions.
 */
export function FaqAccordion({ faqs, defaultOpenFirst = false }: { faqs: Faq[]; defaultOpenFirst?: boolean }) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpenFirst ? faqs[0]?.id : undefined} className="faq-list">
      {faqs.map((faq) => (
        <AccordionItem key={faq.id} value={faq.id} className="faq-item">
          <AccordionTrigger className="faq-question">{faq.question}</AccordionTrigger>
          <AccordionContent><Prose text={faq.answer} className="faq-answer" /></AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
