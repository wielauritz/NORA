import React from 'react';
import Modal from './Modal';
import { CalendarAPI } from '../services/api';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionUuid?: string;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, subscriptionUuid }) => {
  const subscriptionURL = subscriptionUuid ? CalendarAPI.getSubscriptionURL(subscriptionUuid) : '';
  const webcalURL = subscriptionURL.replace('https://', 'webcal://').replace('http://', 'webcal://');

  const handleCopy = () => {
    if (subscriptionURL) {
      navigator.clipboard.writeText(subscriptionURL);
      alert('URL kopiert!');
    }
  };

  if (!subscriptionUuid) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="📅 Kalender-Abonnement"
        subtitle="Integriere deinen NORA-Stundenplan in deine Kalender-App"
      >
        <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-600">
          Subscription UUID nicht gefunden. Bitte kontaktiere den Support.
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📅 Kalender-Abonnement"
      subtitle="Integriere deinen NORA-Stundenplan in deine Kalender-App"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* What's included */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Was ist enthalten?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Alle Stundenplan-Events (Timetables)</li>
            <li>✓ Deine eigenen Stunden (Custom Hours)</li>
            <li>✓ Anstehende Klausuren</li>
            <li>✓ Automatische Synchronisierung</li>
          </ul>
        </div>

        {/* Automatic Import Section */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Automatisch importieren (empfohlen)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Ein Klick und dein Kalender wird automatisch abonniert und synchronisiert sich regelmäßig.
          </p>
          <a
            href={webcalURL}
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Jetzt abonnieren
          </a>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Funktioniert mit Apple Kalender, Outlook und den meisten Kalender-Apps
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">ODER</span>
          </div>
        </div>

        {/* Manual Import Section */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">Manueller Import</h3>

          {/* URL Box */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abonnement-URL:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={subscriptionURL}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={handleCopy}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
              >
                Kopieren
              </button>
            </div>
          </div>

          {/* Instructions for different apps */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Anleitungen für verschiedene Apps:</h4>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium mb-1">📱 Apple Kalender (iPhone/Mac):</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-2 text-xs">
                  <li>Kalender-App öffnen → "Kalender" → "Abonnement hinzufügen"</li>
                  <li>URL einfügen und bestätigen</li>
                </ol>
              </div>
              <div>
                <p className="font-medium mb-1">📆 Google Calendar:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-2 text-xs">
                  <li>Google Calendar öffnen → Einstellungen</li>
                  <li>"Kalender hinzufügen" → "Per URL"</li>
                  <li>URL einfügen</li>
                </ol>
              </div>
              <div>
                <p className="font-medium mb-1">💻 Outlook:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-2 text-xs">
                  <li>Outlook öffnen → "Kalender hinzufügen"</li>
                  <li>"Aus dem Internet" auswählen</li>
                  <li>URL einfügen</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Download ICS option */}
          <div className="mt-4">
            <button
              onClick={() => window.open(subscriptionURL, '_blank')}
              className="w-full px-6 py-3 bg-gradient-to-r from-accent/80 to-orange-500/80 hover:from-accent hover:to-orange-500 text-white rounded-xl font-medium transition-all hover:shadow-md flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              ICS-Datei herunterladen
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CalendarModal;
