import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'client' | 'admin' | 'super_admin';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  profileImage?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date | null;
  loginAttempts: number;
  lockUntil?: Date | null;
  passwordChangedAt: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    timezone: string;
    language: string;
  };
  metadata?: {
    registrationIP?: string;
    lastLoginIP?: string;
    userAgent?: string;
    referralSource?: string;
  };
  fullName: string;
  isLocked: boolean;
  comparePassword(candidate: string): Promise<boolean>;
  changedPasswordAfter(iat: number): boolean;
  incLoginAttempts(): Promise<any>;
  resetLoginAttempts(): Promise<any>;
}

interface IUserModel extends Model<IUser> {
  findByCredentials(email: string, password: string): Promise<IUser>;
  createAdmin(data: Partial<IUser>): Promise<IUser>;
}

const UserSchema = new Schema<IUser, IUserModel>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  role: { type: String, enum: ['client', 'admin', 'super_admin'], default: 'client', required: true },
  phone: { type: String, trim: true, match: /^\+?[\d\s\-\(\)]+$/ },
  profileImage: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  passwordChangedAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' }
  },
  metadata: {
    registrationIP: String,
    lastLoginIP: String,
    userAgent: String,
    referralSource: String
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.pre('save', async function (next) {
  const user = this as IUser;
  if (!user.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  user.password = await bcrypt.hash(user.password, saltRounds);
  user.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, (this as any).password);
};

UserSchema.methods.changedPasswordAfter = function (iat: number) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return iat < changedTimestamp;
  }
  return false;
};

UserSchema.methods.incLoginAttempts = async function () {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
  const lockTime = parseInt(process.env.LOCK_TIME || String(2 * 60 * 60 * 1000), 10);

  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({ $unset: { lockUntil: 1 }, $set: { loginAttempts: 1 } });
  }
  const updates: any = { $inc: { loginAttempts: 1 } };
  if ((this.loginAttempts + 1) >= maxAttempts && !(this as any).isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
  }
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $unset: { loginAttempts: 1, lockUntil: 1 } });
};

UserSchema.statics.findByCredentials = async function (email: string, password: string) {
  const user = await this.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
  if (!user) throw new Error('Invalid email or password');
  if ((user as any).isLocked) throw new Error('Account is temporarily locked due to too many failed login attempts');
  const isMatch = await (user as IUser).comparePassword(password);
  if (!isMatch) {
    await (user as IUser).incLoginAttempts();
    throw new Error('Invalid email or password');
  }
  if (user.loginAttempts > 0) await (user as IUser).resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save();
  return user as IUser;
};

UserSchema.statics.createAdmin = async function (data: Partial<IUser>) {
  const admin = new this({ ...data, role: 'admin', isEmailVerified: true, isActive: true });
  return admin.save();
};

export const User: IUserModel = (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>('User', UserSchema);
