import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  status: 'pending' | 'completed' | 'failed';
  recipients: {
    phone: string;
    name?: string;
    status: 'sent' | 'failed' | 'pending';
    sentAt?: Date;
    error?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
    },
    totalRecipients: {
      type: Number,
      required: true,
      default: 0,
    },
    successCount: {
      type: Number,
      required: true,
      default: 0,
    },
    failedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    recipients: [
      {
        phone: { type: String, required: true },
        name: { type: String, default: '' },
        status: {
          type: String,
          enum: ['sent', 'failed', 'pending'],
          default: 'pending',
        },
        sentAt: { type: Date },
        error: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
MessageSchema.index({ userId: 1, createdAt: -1 });

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;

