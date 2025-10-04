import mongoose, { Document, Schema } from 'mongoose';

interface ICareerPath extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  icon?: string;
  category?: string;
  jobCount?: number;
  averageSalary?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CareerPathSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  icon: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: 'technology'
  },
  jobCount: {
    type: Number,
    default: 0
  },
  averageSalary: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

CareerPathSchema.index({ name: 1 });
CareerPathSchema.index({ category: 1 });
CareerPathSchema.index({ isActive: 1 });

export const CareerPath = mongoose.models.CareerPath || mongoose.model<ICareerPath>('CareerPath', CareerPathSchema);
export type { ICareerPath };