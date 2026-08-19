export interface TemplateContext {
  learner?: string;
  learnerEmail?: string;
  training?: string;
  dueDate?: string;
  daysRemaining?: string;
  progress?: string;
  company?: string;
  trainingUrl?: string;
  managerName?: string;
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{learner\}\}/g, ctx.learner ?? '')
    .replace(/\{\{learnerEmail\}\}/g, ctx.learnerEmail ?? '')
    .replace(/\{\{training\}\}/g, ctx.training ?? '')
    .replace(/\{\{dueDate\}\}/g, ctx.dueDate ?? '')
    .replace(/\{\{daysRemaining\}\}/g, ctx.daysRemaining ?? '')
    .replace(/\{\{progress\}\}/g, ctx.progress ?? '')
    .replace(/\{\{company\}\}/g, ctx.company ?? '')
    .replace(/\{\{trainingUrl\}\}/g, ctx.trainingUrl ?? '')
    .replace(/\{\{managerName\}\}/g, ctx.managerName ?? '');
}
