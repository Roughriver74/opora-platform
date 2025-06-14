import { FormField, FieldType } from '../../../types';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  sourceLabel: string;
  targetLabel: string;
  fieldType: FieldType;
  compatible: boolean;
}

export interface SectionMapping {
  sourceSection: string;
  targetSection: string;
  mappings: FieldMapping[];
}

export interface CopyOperation {
  fromSection: string;
  toSection: string;
  mappings: FieldMapping[];
  values: Record<string, any>;
}

export interface CopyPreview {
  operation: CopyOperation;
  changes: Array<{
    fieldName: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
    isOverwrite: boolean;
  }>;
}

export interface LinkedFieldsConfig {
  enabledSections: string[];
  defaultMappings: Record<string, string[]>; // section -> compatible sections
  fieldMappings: Record<string, string>; // sourceFieldName -> targetFieldName
} 