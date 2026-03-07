'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Users, 
  Trash2, 
  Download, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  phone: string;
  group: string;
}

export default function Contacts() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchContacts();
    }
  }, [status, router]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
      
      // Extract unique groups
      const uniqueGroups = [...new Set(data.contacts?.map((c: Contact) => c.group).filter(Boolean) || ['Default'])];
      setGroups(uniqueGroups as string[]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processContacts(results.data);
        },
        error: (error) => {
          setMessage({ type: 'error', text: `CSV Error: ${error.message}` });
          setUploading(false);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          await processContacts(jsonData);
        } catch (error: any) {
          setMessage({ type: 'error', text: `Excel Error: ${error.message}` });
          setUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setMessage({ type: 'error', text: 'Please upload a CSV or Excel file' });
      setUploading(false);
    }
  };

  const processContacts = async (data: any[]) => {
    const contacts = data.map((row: any) => {
      // Handle different column names
      const name = row.name || row.Name || row.contact || row.Contact || row['Full Name'] || '';
      const phone = row.phone || row.Phone || row.number || row.Number || row.mobile || row.Mobile || row.tel || row.telephone || '';
      
      return {
        name: String(name).trim(),
        phone: String(phone).replace(/\D/g, ''), // Remove non-digits
      };
    }).filter((c: any) => c.phone.length >= 10); // Filter invalid phones

    if (contacts.length === 0) {
      setMessage({ type: 'error', text: 'No valid contacts found in the file' });
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, group: 'Imported' }),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Successfully imported ${contacts.length} contacts` });
        fetchContacts();
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to import contacts' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const res = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Contact deleted successfully' });
        fetchContacts();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete contact' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
  };

  const deleteSelectedContacts = async () => {
    if (selectedContacts.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) return;

    try {
      for (const id of selectedContacts) {
        await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      }
      setMessage({ type: 'success', text: 'Contacts deleted successfully' });
      setSelectedContacts([]);
      fetchContacts();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
  };

  const exportContacts = () => {
    const ws = XLSX.utils.json_to_sheet(contacts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'contacts.xlsx');
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c._id));
    }
  };

  const toggleSelectContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm);
    const matchesGroup = filterGroup === 'all' || contact.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage Contacts
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload and manage your contact lists
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upload Contacts
          </h2>
          <div className="flex flex-wrap gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload CSV/Excel
            </label>
            <button
              onClick={exportContacts}
              disabled={contacts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Contacts
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Supported formats: CSV, Excel (.xlsx, .xls). File should contain columns for name and phone number.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-white focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Groups</option>
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            {selectedContacts.length > 0 && (
              <button
                onClick={deleteSelectedContacts}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedContacts.length})
              </button>
            )}
          </div>
        </div>

        {/* Contacts List */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {filteredContacts.length} Contacts
            </h2>
          </div>
          
          {filteredContacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-zinc-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Group</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {filteredContacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact._id)}
                          onChange={() => toggleSelectContact(contact._id)}
                          className="w-4 h-4 rounded border-zinc-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{contact.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">{contact.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {contact.group}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteContact(contact._id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterGroup !== 'all' 
                  ? 'No contacts match your search criteria' 
                  : 'No contacts yet. Upload a CSV or Excel file to get started.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

