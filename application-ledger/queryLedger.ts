import { loadApplicationLedger } from './store.js';
import type {
  ApplicationAttemptRecord,
  ApplicationSuccessRecord,
  ClarificationItemRecord,
  FailureRecord
} from './types.js';

export type LedgerQueryKind = 'attempts' | 'successes' | 'failures' | 'clarifications';

export async function queryLedger(kind: LedgerQueryKind, storePath?: string): Promise<
  ApplicationAttemptRecord[] | ApplicationSuccessRecord[] | FailureRecord[] | ClarificationItemRecord[]
> {
  const ledger = await loadApplicationLedger(storePath);

  switch (kind) {
    case 'attempts':
      return ledger.attempts;
    case 'successes':
      return ledger.successes;
    case 'failures':
      return ledger.failures;
    case 'clarifications':
      return ledger.clarifications;
  }
}
