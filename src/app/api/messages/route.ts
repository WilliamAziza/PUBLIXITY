import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import mongoose from 'mongoose';

// GET - Fetch message history for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    const messages = await Message.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST - Save a new message record
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { message, totalRecipients, successCount, failedCount, status, recipients } = await request.json();
    
    if (!message || !totalRecipients) {
      return NextResponse.json({ message: 'Message and recipients are required' }, { status: 400 });
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    
    const newMessage = await Message.create({
      userId,
      message,
      totalRecipients,
      successCount,
      failedCount,
      status,
      recipients,
    });

    return NextResponse.json({ 
      message: 'Message saved successfully',
      messageId: newMessage._id 
    });
  } catch (error: any) {
    console.error('Error saving message:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

