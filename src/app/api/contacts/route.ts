import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Contact from '@/models/Contact';
import mongoose from 'mongoose';

// GET - Fetch all contacts for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    const contacts = await Contact.find({ userId }).sort({ createdAt: -1 });

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST - Add new contacts
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { contacts, group } = await request.json();
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ message: 'No contacts provided' }, { status: 400 });
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    
    // Prepare contacts for insertion
    const contactsToInsert = contacts.map((contact: { name: string; phone: string }) => ({
      userId,
      name: contact.name || '',
      phone: contact.phone,
      group: group || 'Default',
    }));

    // Insert contacts (upsert to avoid duplicates)
    for (const contact of contactsToInsert) {
      await Contact.findOneAndUpdate(
        { userId, phone: contact.phone },
        { $set: contact },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ 
      message: `Successfully added ${contactsToInsert.length} contacts`,
      count: contactsToInsert.length 
    });
  } catch (error: any) {
    console.error('Error adding contacts:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE - Delete a contact
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json({ message: 'Contact ID required' }, { status: 400 });
    }

    await dbConnect();
    
    const userId = new mongoose.Types.ObjectId((session.user as any).id);
    
    await Contact.findOneAndDelete({ _id: contactId, userId });

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

