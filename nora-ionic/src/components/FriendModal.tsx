import React, { useState } from 'react';
import Modal from './Modal';
import { FriendsAPI } from '../services/api';

interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FriendModal: React.FC<FriendModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }

    if (!email.endsWith('@nordakademie.de')) {
      setError('Nur @nordakademie.de E-Mail-Adressen sind erlaubt.');
      return;
    }

    setSubmitting(true);
    try {
      await FriendsAPI.addFriend(email);

      onSuccess();
      onClose();
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Hinzufügen des Freundes');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setError('');
      }}
      title="Freund hinzufügen"
      subtitle="Füge einen Kommilitonen zu deiner Freundesliste hinzu"
      maxWidth="max-w-md"
    >
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail-Adresse *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="vorname.nachname@nordakademie.de"
          />
          <p className="text-xs text-gray-500 mt-1">Die @nordakademie.de E-Mail-Adresse deines Kommilitonen</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Freunde-Funktion</p>
              <p>Sobald du einen Freund hinzugefügt hast, kannst du dessen Stundenplan (nur offizielle Kurse) einsehen.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Wird hinzugefügt...' : 'Hinzufügen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FriendModal;
