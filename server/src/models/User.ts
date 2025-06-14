import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface User extends Document {
  email: string;
  password: string;
  role: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
  phone?: string;
  bitrix_id?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  fullName: string; // виртуальное поле
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  bitrix_id: {
    type: String,
    unique: true,
    sparse: true // позволяет несколько null значений
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Индексы для оптимизации поиска
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Метод для сравнения паролей
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Виртуальное поле для полного имени
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Настройка JSON сериализации
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password; // Убираем пароль из JSON ответа
    return ret;
  }
});

export default mongoose.model<User>('User', UserSchema); 