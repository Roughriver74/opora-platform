import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmissionHistory extends Document {
  _id: string;
  submissionId: mongoose.Types.ObjectId;
  changedBy?: mongoose.Types.ObjectId; // Кто изменил (необязательно для системных админов)
  changeType: 'status_change' | 'priority_change' | 'assignment' | 'data_update' | 'note_added' | 'tag_added' | 'tag_removed';
  
  // Данные изменения
  oldValue?: any;
  newValue?: any;
  fieldName?: string; // Какое поле изменилось
  
  // Описание и комментарии
  description: string; // Автоматическое описание изменения
  comment?: string; // Комментарий пользователя
  
  // Метаданные
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

const SubmissionHistorySchema = new Schema<ISubmissionHistory>({
  submissionId: {
    type: Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false // Делаем необязательным для системных админов
  },
  changeType: {
    type: String,
    enum: ['status_change', 'priority_change', 'assignment', 'data_update', 'note_added', 'tag_added', 'tag_removed'],
    required: true
  },
  oldValue: {
    type: Schema.Types.Mixed
  },
  newValue: {
    type: Schema.Types.Mixed
  },
  fieldName: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  comment: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: { createdAt: 'changedAt', updatedAt: false }
});

// Индексы
SubmissionHistorySchema.index({ submissionId: 1, changedAt: -1 });
SubmissionHistorySchema.index({ changedBy: 1 });
SubmissionHistorySchema.index({ changeType: 1 });

// Статический метод для создания записи истории
export const addSubmissionChange = async (
  submissionId: string,
  changedBy: string,
  changeType: string,
  description: string,
  oldValue?: any,
  newValue?: any,
  fieldName?: string,
  comment?: string,
  req?: any
) => {
  // Обрабатываем случай с админской авторизацией
  let changedByObjectId;
  
  if (changedBy === 'super_admin' || changedBy === 'admin') {
    // Для системных админов создаем специальный ObjectId или используем null
    changedByObjectId = null; // Можно также использовать специальный ObjectId
  } else if (mongoose.Types.ObjectId.isValid(changedBy)) {
    changedByObjectId = changedBy;
  } else {
    // Если не валидный ObjectId и не системный админ, пропускаем создание записи
    console.warn(`Невалидный changedBy: ${changedBy}, пропускаем создание записи истории`);
    return null;
  }

  const historyRecord = new (mongoose.model<ISubmissionHistory>('SubmissionHistory'))({
    submissionId,
    changedBy: changedByObjectId,
    changeType,
    description,
    oldValue,
    newValue,
    fieldName,
    comment,
    ipAddress: req?.ip,
    userAgent: req?.get('User-Agent')
  });
  
  return await historyRecord.save();
};

export default mongoose.model<ISubmissionHistory>('SubmissionHistory', SubmissionHistorySchema); 