import mongoose, { Document, Schema } from 'mongoose';

export interface IFeature extends Document {
  title: string;
  description: string;
  icon: string;
  category: 'career' | 'skill' | 'networking' | 'mentorship';
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureSchema = new Schema<IFeature>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['career', 'skill', 'networking', 'mentorship'],
    required: true 
  },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

FeatureSchema.index({ isActive: 1, category: 1, order: 1 });

export const Feature = (mongoose.models.Feature as mongoose.Model<IFeature>) || 
  mongoose.model<IFeature>('Feature', FeatureSchema);