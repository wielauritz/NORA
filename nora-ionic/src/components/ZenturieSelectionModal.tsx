import React, { useState, useEffect } from 'react';
import { UserAPI } from '../services/api';

interface ZenturieSelectionModalProps {
  isOpen: boolean;
}

interface Zenturie {
  zenturie: string;
  year?: number;
}

const ZenturieSelectionModal: React.FC<ZenturieSelectionModalProps> = ({ isOpen }) => {
  const [zenturien, setZenturien] = useState<Zenturie[]>([]);
  const [selectedZenturie, setSelectedZenturie] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadZenturien();
    }
  }, [isOpen]);

  const loadZenturien = async () => {
    try {
      const data = await UserAPI.getAllZenturien();
      setZenturien(data || []);
    } catch (err) {
      console.error('Error loading Zenturien:', err);
      setError('Fehler beim Laden der Zenturien');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedZenturie) {
      setError('Bitte wähle eine Zenturie aus.');
      return;
    }

    setSubmitting(true);
    try {
      await UserAPI.setZenturie(selectedZenturie);

      // Reload page to update everything
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern der Zenturie');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 relative" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen bei NORA!</h2>
          <p className="text-gray-600">Bitte wähle deine Zenturie aus, um deinen Stundenplan zu sehen.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div className="flex-1">{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Zenturie Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zenturie *
            </label>
            <select
              required
              value={selectedZenturie}
              onChange={(e) => setSelectedZenturie(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Zenturie auswählen...</option>
              {zenturien.map((z) => (
                <option key={z.zenturie} value={z.zenturie}>
                  {z.zenturie}{z.year ? ` (Jahrgang ${z.year})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div className="text-sm text-blue-800">
                <p>Deine Zenturie bestimmt, welche Kurse und Termine du in deinem Stundenplan siehst.</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ZenturieSelectionModal;
