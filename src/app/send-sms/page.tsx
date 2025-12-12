'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MessageSquare, Phone, Upload, Users, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import Papa from 'papaparse';

export default function SendSMS() {
  const [message, setMessage] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedContacts, setUploadedContacts] = useState<string[]>([]);
  const [savedContacts, setSavedContacts] = useState<{name: string, numbers: string[]}[]>([]);
  const [templates, setTemplates] = useState<{name: string, message: string}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const validatePhoneNumber = (phone: string) => {
    try {
      return isValidPhoneNumber(phone, 'US'); // Assuming US numbers, can be made configurable
    } catch {
      return false;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results: any) => {
          const numbers: string[] = [];
          results.data.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach(cell => {
                if (typeof cell === 'string' && cell.trim()) {
                  const cleaned = cell.replace(/\D/g, '');
                  if (cleaned.length >= 10) {
                    numbers.push(cleaned);
                  }
                }
              });
            }
          });
          setUploadedContacts(numbers);
          setPhoneNumbers(numbers.join(', '));
        },
        header: false,
      });
    }
  };

  const saveContactList = () => {
    const name = prompt('Enter a name for this contact list:');
    if (name && uploadedContacts.length > 0) {
      setSavedContacts(prev => [...prev, { name, numbers: uploadedContacts }]);
      localStorage.setItem('publixity_contacts', JSON.stringify([...savedContacts, { name, numbers: uploadedContacts }]));
    }
  };

  const loadContactList = (numbers: string[]) => {
    setPhoneNumbers(numbers.join(', '));
  };

  const saveTemplate = () => {
    const name = prompt('Enter a name for this template:');
    if (name && message.trim()) {
      setTemplates(prev => [...prev, { name, message }]);
      localStorage.setItem('publixity_templates', JSON.stringify([...templates, { name, message }]));
    }
  };

  const loadTemplate = (templateMessage: string) => {
    setMessage(templateMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const numbers = phoneNumbers.split(',').map(num => num.trim()).filter(num => num);
    const invalidNumbers = numbers.filter(num => !validatePhoneNumber(num));

    if (invalidNumbers.length > 0) {
      setError(`Invalid phone numbers: ${invalidNumbers.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          phoneNumbers: numbers,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`SMS sent successfully to ${data.sentCount} numbers`);
        setMessage('');
        setPhoneNumbers('');
        setUploadedContacts([]);
      } else {
        setError(data.error || 'Failed to send SMS');
      }
    } catch (err) {
      setError('An error occurred while sending SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black pt-16">
      <main className="w-full max-w-2xl p-8 bg-white dark:bg-black rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Send Bulk SMS
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
            Reach your audience instantly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="message" className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <MessageSquare className="w-4 h-4" />
              SMS Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your SMS message here..."
              className="w-full h-32 p-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-50"
              required
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveTemplate}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save as Template
              </button>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  const template = templates.find(t => t.name === e.target.value);
                  if (template) loadTemplate(template.message);
                  setSelectedTemplate(e.target.value);
                }}
                className="px-3 py-1 text-sm border border-zinc-300 rounded dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-50"
              >
                <option value="">Load Template</option>
                {templates.map((template, index) => (
                  <option key={index} value={template.name}>{template.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="phoneNumbers" className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              <Phone className="w-4 h-4" />
              Phone Numbers (comma-separated)
            </label>
            <textarea
              id="phoneNumbers"
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
              placeholder="e.g., +1234567890, +0987654321, +1122334455"
              className="w-full h-24 p-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-50"
              required
            />
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </label>
            <button
              type="button"
              onClick={saveContactList}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save Contacts
            </button>
          </div>

          {savedContacts.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Users className="w-4 h-4" />
                Saved Contact Lists
              </label>
              <div className="flex flex-wrap gap-2">
                {savedContacts.map((contact, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => loadContactList(contact.numbers)}
                    className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    {contact.name} ({contact.numbers.length})
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Bulk SMS'}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Success</span>
            </div>
            <p className="mt-1">{success}</p>
          </div>
        )}
      </main>
    </div>
  );
}
