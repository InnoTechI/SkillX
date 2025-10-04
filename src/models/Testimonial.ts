import mongoose, { Document, Schema } from 'mongoose';

export interface ITestimonial extends Document {
  name: string;
  role: string;
  company?: string;
  content: string;
  rating: number;
  avatar?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>({
  name: { type: String, required: true },
  role: { type: String, required: true },
  company: { type: String },
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

TestimonialSchema.index({ isActive: 1, order: 1 });

export const Testimonial = (mongoose.models.Testimonial as mongoose.Model<ITestimonial>) || 
  mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);