import mongoose, { Schema, Document, Model } from 'mongoose';

export type FileType = 'resume' | 'cover_letter' | 'document' | 'attachment';

export interface IFile extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileType: FileType;
  uploadedBy: mongoose.Types.ObjectId;
  relatedOrder?: mongoose.Types.ObjectId;
  uploadDate: Date;
  isActive: boolean;
  url?: string;
  storageProvider: 'local' | 'aws' | 'cloudinary';
  metadata?: {
    description?: string;
    tags?: string[];
    version?: number;
  };
}

const FileSchema = new Schema<IFile>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true, min: 0 },
  fileType: { 
    type: String, 
    enum: ['resume', 'cover_letter', 'document', 'attachment'], 
    required: true 
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relatedOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
  uploadDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  url: { type: String },
  storageProvider: { 
    type: String, 
    enum: ['local', 'aws', 'cloudinary'], 
    default: 'local' 
  },
  metadata: {
    description: { type: String, maxlength: 500 },
    tags: [{ type: String, trim: true }],
    version: { type: Number, default: 1, min: 1 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ relatedOrder: 1 });
FileSchema.index({ fileType: 1 });
FileSchema.index({ isActive: 1 });
FileSchema.index({ uploadDate: -1 });

// Virtual for file URL
FileSchema.virtual('downloadUrl').get(function() {
  if (this.url) return this.url;
  return `/api/files/${this._id}/download`;
});

export const File: Model<IFile> = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);