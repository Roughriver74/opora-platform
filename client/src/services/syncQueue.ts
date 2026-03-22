// Sync queue for offline actions — processes pending operations when back online

import { offlineDb } from './offlineDb';
import { visitService } from './visitService';
import SubmissionService from './submissionService';

export interface QueuedAction {
  id?: number;
  type:
    | 'create_visit'
    | 'update_visit'
    | 'update_visit_status'
    | 'delete_visit'
    | 'create_submission';
  payload: any;
  createdAt: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

const MAX_RETRIES = 3;

async function enqueue(
  action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries' | 'status'>,
): Promise<void> {
  const record: QueuedAction = {
    ...action,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };
  // id is autoIncrement — do not set it so IDB assigns one
  await offlineDb.put('syncQueue', record);
}

function getPending(): Promise<QueuedAction[]> {
  return offlineDb.getAll<QueuedAction>('syncQueue').then((all) =>
    all.filter((a) => a.status === 'pending' || a.status === 'failed'),
  );
}

async function dispatchAction(action: QueuedAction): Promise<void> {
  const { type, payload } = action;

  switch (type) {
    case 'create_visit':
      await visitService.createVisit(payload);
      break;

    case 'update_visit': {
      const { id, ...data } = payload;
      await visitService.updateVisit(id, data);
      break;
    }

    case 'update_visit_status':
      await visitService.updateStatus(payload.id, payload.status);
      break;

    case 'delete_visit':
      await visitService.deleteVisit(payload.id);
      break;

    case 'create_submission':
      await SubmissionService.submitForm(payload.formId, payload.data, payload.options);
      break;

    default:
      throw new Error(`[syncQueue] Unknown action type: ${type}`);
  }
}

async function processQueue(): Promise<{ success: number; failed: number }> {
  const pending = await getPending();

  let success = 0;
  let failed = 0;

  for (const action of pending) {
    // Mark as syncing
    await offlineDb.put('syncQueue', { ...action, status: 'syncing' });

    try {
      await dispatchAction(action);

      // Remove from queue on success
      if (action.id !== undefined) {
        await offlineDb.delete('syncQueue', action.id);
      }
      success += 1;
    } catch (err) {
      const retries = action.retries + 1;
      const status: QueuedAction['status'] = retries >= MAX_RETRIES ? 'failed' : 'pending';

      await offlineDb.put('syncQueue', {
        ...action,
        retries,
        status,
      });

      console.warn(`[syncQueue] Action ${action.type} failed (attempt ${retries}):`, err);
      failed += 1;
    }
  }

  return { success, failed };
}

async function getCount(): Promise<number> {
  return offlineDb.count('syncQueue');
}

async function clearCompleted(): Promise<void> {
  const all = await offlineDb.getAll<QueuedAction>('syncQueue');
  // Remove only records that were successfully processed (should already be gone),
  // but also clean up truly "failed" ones that exceeded retries if caller wants housekeeping.
  // Here we remove anything in 'failed' status beyond MAX_RETRIES as "completed with error".
  const toDelete = all.filter((a) => a.status === 'failed' && a.retries >= MAX_RETRIES);
  for (const record of toDelete) {
    if (record.id !== undefined) {
      await offlineDb.delete('syncQueue', record.id);
    }
  }
}

export const syncQueue = {
  enqueue,
  getPending,
  processQueue,
  getCount,
  clearCompleted,
};
