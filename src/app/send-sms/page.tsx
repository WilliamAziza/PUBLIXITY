'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  MessageSquare, 
  Phone, 
  Upload, 
  Users, 
  Send,
  AlertCircle, 
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  phone: string;
  group: string;
}

export default function SendSMS() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [filterGroup, setFilterGroup] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
      
      const uniqueGroups = [...new Set(data.contacts?.map((c: Contact) => c.group).filter(Boolean))];
      setGroups(uniqueGroups as string[]);
      
      // Select all contacts by default
      setSelectedContactIds(data.contacts?.map((c: Contact) => c._id) || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processUploadedData(results.data);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        processUploadedData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processUploadedData = async (data: any[]) => {
    const newContacts = data.map((row: any) => {
      const name = row.name || row.Name || row.contact || row.Contact || row['Full Name'] || '';
      const phone = row.phone || row.Phone || row.number || row.Number || row.mobile || row.Mobile || '';
      return {
        name: String(name).trim(),
        phone: String(phone).replace(/\D/g, ''),
      };
    }).filter((c: any) => c.phone.length >= 10);

    if (newContacts.length === 0) {
      setError('No valid contacts found in the file');
      return;
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: newContacts, group: 'Quick Upload' }),
      });

      if (res.ok) {
        setSuccess(`Successfully added ${newContacts.length} contacts`);
        fetchData();
      }
    } catch (err) {
      setError('Failed to upload contacts');
    }
  };

  const toggleSelectAll = () => {
    const filtered = filterGroup === 'all' 
      ? contacts 
      : contacts.filter(c => c.group === filterGroup);
    
    if (selectedContactIds.length === filtered.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filtered.map(c => c._id));
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filteredContacts = filterGroup === 'all'
    ? contacts
    : contacts.filter(c => c.group === filterGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedContactIds.length === 0) {
      setError('Please select at least one contact');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');
    setProgress({ current: 0, total: selectedContactIds.length, sent: 0, failed: 0 });

    const selectedContacts = contacts.filter(c => selectedContactIds.includes(c._id));
    const phoneNumbers = selectedContacts.map(c => c.phone);
    const names = selectedContacts.map(c => c.name);

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phoneNumbers,
          names,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`SMS sent successfully to ${data.sentCount} recipients. ${data.failedCount} failed.`);
        setMessage('');
      } else {
        setError(data.message || 'Failed to send SMS');
      }
    } catch (err) {
      setError('An error occurred while sending SMS');
    } finally {
      setSending(false);
      setProgress({ current: 0, total: 0, sent: 0, failed: 0 });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black pt-16">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Send Bulk SMS
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Compose and send messages to your contacts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Compose Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here... Use {name} for personalization"
                  className="w-full h-40 p-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-600 dark:text-white resize-none"
                  required
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Use <code className="bg-zinc-100 dark:bg-zinc-700 px-1 rounded">{'{name}'}</code> to personalize with contact names
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>{selectedContactIds.length}</strong> contacts selected
                </p>
              </div>

              {sending && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Sending messages...
                    </span>
                    <span className="text-sm text-green-700 dark:text-green-300">
                      {progress.sent}/{progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={sending || selectedContactIds.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Bulk SMS
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contacts Selection */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Contacts
              </h2>
              
              <div className="flex items-center gap-2">
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-3 py-1 text-sm border border-zinc-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
                >
                  <option value="all">All Groups</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="sms-file-upload"
              />
              <label
                htmlFor="sms-file-upload"
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload More Contacts
              </label>
            </div>

            <div className="flex items-center gap-2 mb-4 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <input
                type="checkbox"
                checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-zinc-300"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Select All ({filteredContacts.length})
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {filteredContacts.length > 0 ? (
                <table className="w-full">
                  <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-zinc-300"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {filteredContacts.map((contact) => (
                      <tr key={contact._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(contact._id)}
                            onChange={() => toggleContact(contact._id)}
                            className="w-4 h-4 rounded border-zinc-300"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{contact.name || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white font-mono">{contact.phone}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                            {contact.group}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No contacts found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

