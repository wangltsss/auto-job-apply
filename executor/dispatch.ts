import type { AnswerPlanItem } from '../playwright/schemas/answerPlanTypes.js';

export function getHandlerName(answerType: AnswerPlanItem['answer_type']):
  | 'applyScalar'
  | 'applyOption'
  | 'applyMultiSelect'
  | 'applyFileAction'
  | 'applySkip' {
  switch (answerType) {
    case 'scalar':
      return 'applyScalar';
    case 'option':
      return 'applyOption';
    case 'multi_select':
      return 'applyMultiSelect';
    case 'file_action':
      return 'applyFileAction';
    case 'skip':
      return 'applySkip';
  }
}
