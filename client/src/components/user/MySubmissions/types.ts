import { Submission, SubmissionFilters } from '../../../services/submissionService';

export interface MySubmissionsState {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  total: number;
  filters: SubmissionFilters;
}

export interface BitrixStage {
  id: string;
  name: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface SubmissionDetailsDialogProps {
  open: boolean;
  submission: Submission | null;
  onClose: () => void;
  onStatusChange: (submissionId: string, newStatus: string) => void;
  bitrixStages: BitrixStage[];
  formFields: any[];
  statusComment: string;
  onStatusCommentChange: (comment: string) => void;
}

export interface SubmissionsTableProps {
  submissions: Submission[];
  bitrixStages: BitrixStage[];
  onEditSubmission: (submission: Submission) => void;
  onStatusChange: (submissionId: string, newStatus: string) => void;
  page: number;
  rowsPerPage: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface SubmissionsFiltersProps {
  filters: SubmissionFilters;
  onFilterChange: (newFilters: Partial<SubmissionFilters>) => void;
  bitrixStages: BitrixStage[];
  users: User[];
  isAdmin: boolean;
} 