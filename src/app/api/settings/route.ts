import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      twilioSid: user.twilioSid || '',
      twilioAuthToken: user.twilioAuthToken || '',
      twilioPhoneNumber: user.twilioPhoneNumber || '',
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { twilioSid, twilioAuthToken, twilioPhoneNumber } = await request.json();
    
    if (!twilioSid || !twilioAuthToken || !twilioPhoneNumber) {
      return NextResponse.json(
        { message: 'All Twilio fields are required' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    
    await User.findByIdAndUpdate(userId, {
      twilioSid,
      twilioAuthToken,
      twilioPhoneNumber,
    });

    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

