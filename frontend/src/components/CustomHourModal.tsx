import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { CustomHoursAPI, RoomAPI } from '../services/api';

interface CustomHourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Room {
  room_number: string;
  room_name?: string;
}

const CustomHourModal: React.FC<CustomHourModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    locationType: 'room' as 'room' | 'custom',
    room: '',
    customLocation: '',
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (formData.date && formData.startTime && formData.endTime) {
      loadFreeRooms();
    }
  }, [formData.date, formData.startTime, formData.endTime]);

  const loadFreeRooms = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) return;

    setLoadingRooms(true);
    try {
      const startDateTime = `${formData.date}T${formData.startTime}:00`;
      const endDateTime = `${formData.date}T${formData.endTime}:00`;

      const response = await RoomAPI.getFreeRooms(startDateTime, endDateTime);
      setRooms(response.free_rooms || []);
    } catch (err) {
      console.error('Error loading free rooms:', err);
      // Fallback to all rooms
      try {
        const allRooms = await RoomAPI.getAllRooms();
        setRooms(allRooms || []);
      } catch (err2) {
        console.error('Error loading all rooms:', err2);
        setRooms([]);
      }
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      setError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    if (formData.locationType === 'room' && !formData.room) {
      setError('Bitte wähle einen Raum aus.');
      return;
    }

    if (formData.locationType === 'custom' && !formData.customLocation) {
      setError('Bitte gib einen eigenen Ort an.');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = `${formData.date}T${formData.startTime}:00`;
      const endDateTime = `${formData.date}T${formData.endTime}:00`;

      await CustomHoursAPI.createCustomHour(
        formData.title,
        formData.description || null,
        startDateTime,
        endDateTime,
        formData.locationType === 'room' ? formData.room : null,
        formData.locationType === 'custom' ? formData.customLocation : null
      );

      onSuccess();
      onClose();

      // Reset form
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        locationType: 'room',
        room: '',
        customLocation: '',
      });
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen der Stunde');
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
      title="Eigene Stunde hinzufügen"
      subtitle="Erstelle einen benutzerdefinierten Termin"
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
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="z.B. Lernen, Meeting, Projektarbeit"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Zusätzliche Informationen..."
          />
        </div>

        {/* Date and Times */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datum *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Startzeit *</label>
            <input
              type="time"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Endzeit *</label>
            <input
              type="time"
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ort-Typ *</label>
          <div className="flex space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={formData.locationType === 'room'}
                onChange={() => setFormData({ ...formData, locationType: 'room', customLocation: '' })}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Raum auswählen</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={formData.locationType === 'custom'}
                onChange={() => setFormData({ ...formData, locationType: 'custom', room: '' })}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700">Eigener Ort</span>
            </label>
          </div>
        </div>

        {/* Room Selection */}
        {formData.locationType === 'room' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Raum</label>
            <select
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              disabled={!formData.date || !formData.startTime || !formData.endTime || loadingRooms}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {!formData.date || !formData.startTime || !formData.endTime ? (
                <option value="">Bitte zuerst Datum und Zeiten auswählen...</option>
              ) : loadingRooms ? (
                <option value="">Lädt Räume...</option>
              ) : rooms.length === 0 ? (
                <option value="">Keine freien Räume verfügbar</option>
              ) : (
                <>
                  <option value="">Raum auswählen...</option>
                  {rooms.map((room) => (
                    <option key={room.room_number} value={room.room_number}>
                      {room.room_number}{room.room_name ? ` - ${room.room_name}` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            {formData.date && formData.startTime && formData.endTime && (
              <p className="text-xs text-gray-500 mt-1">💡 Wähle zuerst Datum, Start- und Endzeit aus</p>
            )}
          </div>
        )}

        {/* Custom Location */}
        {formData.locationType === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Eigener Ort</label>
            <input
              type="text"
              value={formData.customLocation}
              onChange={(e) => setFormData({ ...formData, customLocation: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="z.B. Stadtbibliothek, Zuhause, Café"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Wird erstellt...' : 'Erstellen'}
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

export default CustomHourModal;
