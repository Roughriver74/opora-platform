import mongoose, { Document } from 'mongoose';

export interface AdminToken extends Document {
  token: string;
  createdAt: Date;
}

const AdminTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d' // Токен истекает через 7 дней
  }
});

export default mongoose.model<AdminToken>('AdminToken', AdminTokenSchema);
