import mongoose, { Document, Schema } from 'mongoose';

export interface IPartner extends Document {
  name: string;
  logo: string;
  website?: string;
  category: 'startup' | 'enterprise' | 'educational' | 'government';
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>({
  name: { type: String, required: true },
  logo: { type: String, required: true },
  website: { type: String },
  category: { 
    type: String, 
    enum: ['startup', 'enterprise', 'educational', 'government'],
    required: true 
  },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

PartnerSchema.index({ isActive: 1, category: 1, order: 1 });

export const Partner = (mongoose.models.Partner as mongoose.Model<IPartner>) || 
  mongoose.model<IPartner>('Partner', PartnerSchema);