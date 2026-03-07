import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Twilio from 'twilio';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import mongoose from 'mongoose';

// Simple in-memory rate limiter (resets every minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // messages per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// POST - Send bulk SMS
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { message, phoneNumbers, names } = await request.json();
    
    if (!message || !phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json({ message: 'Message and phone numbers are required' }, { status: 400 });
    }

    await dbConnect();
    
    const userId = (session.user as any).id;
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { message: 'Rate limit exceeded. Please wait a minute before sending more messages.' },
        { status: 429 }
      );
    }

    // Get user's Twilio credentials
    const user = await User.findById(userId);
    
    if (!user || !user.twilioSid || !user.twilioAuthToken || !user.twilioPhoneNumber) {
      return NextResponse.json(
        { message: 'Twilio credentials not configured. Please set up your Twilio account in settings.' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const client = Twilio(user.twilioSid, user.twilioAuthToken);
    
    // Prepare recipients
    const recipients = phoneNumbers.map((phone: string, index: number) => ({
      phone,
      name: names?.[index] || '',
      status: 'pending' as const,
    }));

    // Create message record
    const newMessage = await Message.create({
      userId: new mongoose.Types.ObjectId(userId),
      message,
      totalRecipients: phoneNumbers.length,
      successCount: 0,
      failedCount: 0,
      status: 'pending',
      recipients,
    });

    // Send SMS to each recipient
    let successCount = 0;
    let failedCount = 0;
    const updatedRecipients = [];

    for (let i = 0; i < phoneNumbers.length; i++) {
      try {
        // Personalize message if name exists
        let personalizedMessage = message;
        if (names?.[i]) {
          personalizedMessage = message.replace(/\{name\}/gi, names[i]);
        }

        // Send SMS via Twilio
        await client.messages.create({
          body: personalizedMessage,
          from: user.twilioPhoneNumber,
          to: phoneNumbers[i],
        });

        updatedRecipients.push({
          phone: phoneNumbers[i],
          name: names?.[i] || '',
          status: 'sent',
          sentAt: new Date(),
          error: '',
        });
        successCount++;
      } catch (error: any) {
        updatedRecipients.push({
          phone: phoneNumbers[i],
          name: names?.[i] || '',
          status: 'failed',
          error: error.message || 'Failed to send',
        });
        failedCount++;
      }

      // Rate limit delay between messages
      if (i < phoneNumbers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update message record with results
    await Message.findByIdAndUpdate(newMessage._id, {
      successCount,
      failedCount,
      status: failedCount === phoneNumbers.length ? 'failed' : 'completed',
      recipients: updatedRecipients,
    });

    return NextResponse.json({
      message: 'Bulk SMS sent successfully',
      sentCount: successCount,
      failedCount,
      total: phoneNumbers.length,
      messageId: newMessage._id,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

