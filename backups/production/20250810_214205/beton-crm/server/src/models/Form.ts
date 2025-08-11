import mongoose, { Schema, Document } from 'mongoose';
import { IFormField } from './FormField';

export interface IForm extends Document {
  name: string;
  title: string;
  description: string;
  isActive: boolean;
  fields: mongoose.Types.ObjectId[] | IFormField[];
  bitrixDealCategory?: string;
  successMessage: string;
}

const FormSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    fields: [{
      type: Schema.Types.ObjectId,
      ref: 'FormField'
    }],
    bitrixDealCategory: { type: String },
    successMessage: { type: String, default: 'Спасибо! Ваша заявка успешно отправлена.' }
  },
  { timestamps: true }
);

export default mongoose.model<IForm>('Form', FormSchema);
