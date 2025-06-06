import mongoose, { Schema, Document } from 'mongoose';

export interface IFormField extends Document {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  bitrixFieldId: string;
  bitrixFieldType: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
  dynamicSource?: {
    enabled: boolean;
    source: string; // например 'catalog' для номенклатуры товаров
    filter?: Record<string, any>;
  };
  order: number;
}

const FormFieldSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true }, // text, dropdown, number, date и т.д.
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    bitrixFieldId: { type: String, required: false },
    bitrixFieldType: { type: String, required: false },
    options: [
      {
        value: { type: String, required: true },
        label: { type: String, required: true },
      },
    ],
    dynamicSource: {
      enabled: { type: Boolean, default: false },
      source: { type: String },
      filter: { type: Schema.Types.Mixed },
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IFormField>('FormField', FormFieldSchema);
