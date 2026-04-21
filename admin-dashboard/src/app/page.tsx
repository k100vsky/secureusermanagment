"use client";

import { useState, useEffect } from 'react';

interface Identifier {
  type: string;
  value: string;
}

interface Identity {
  id: string;
  createdAt: string;
  identifiers: Identifier[];
  decryptedData: any[];
}

export default function AdminDashboard() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In a real VPN scenario, this would be your API's internal address
  // For local testing, we use localhost:3000
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    async function fetchIdentities() {
      try {
        const response = await fetch(`${API_BASE}/api/v1/admin/identities`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setIdentities(data);
      } catch (err) {
        setError('Could not connect to Identity API. Are you on the VPN?');
      } finally {
        setLoading(false);
      }
    }

    fetchIdentities();
  }, [API_BASE]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-blue-400">Identity Builder Dashboard</h1>
        <p className="text-gray-400">Admin Only - Secure VPN Tunnel Active</p>
      </header>

      {loading && <p>Loading identities...</p>}
      {error && <p className="text-red-500 bg-red-900/20 p-4 rounded-lg">{error}</p>}

      <div className="grid gap-6">
        {identities.map((identity) => (
          <div key={identity.id} className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest">Identity ID</h2>
                <p className="text-lg font-semibold">{identity.id}</p>
              </div>
              <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">Active</span>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-blue-300 font-semibold mb-2">Resolved Identifiers</h3>
                <ul className="space-y-2">
                  {identity.identifiers.map((iden, i) => (
                    <li key={i} className="flex items-center gap-2 bg-gray-900/50 p-2 rounded border border-gray-700">
                      <span className="text-xs text-gray-500 font-bold uppercase">{iden.type}:</span>
                      <span className="text-sm font-mono">{iden.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-green-300 font-semibold mb-2">Decrypted PII Data</h3>
                <div className="space-y-2">
                  {identity.decryptedData.map((data, i) => (
                    <pre key={i} className="bg-black/40 p-3 rounded text-xs font-mono border border-green-900/30 text-green-400">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
