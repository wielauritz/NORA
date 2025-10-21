import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { ExamsAPI, RoomAPI, CoursesAPI } from '../services/api';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Course {
  module_number: string;
  name: string;
}

interface Room {
  room_number: string;
  room_name?: string;
}

const ExamModal: React.FC<ExamModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [moduleNumber, setModuleNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [room, setRoom] = useState('');

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredModules, setFilteredModules] = useState<Course[]>([]);
  const [filteredNames, setFilteredNames] = useState<Course[]>([]);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const moduleInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCourses();
      loadRooms();
    }
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moduleDropdownRef.current &&
        !moduleDropdownRef.current.contains(event.target as Node) &&
        !moduleInputRef.current?.contains(event.target as Node)
      ) {
        setShowModuleDropdown(false);
      }
      if (
        nameDropdownRef.current &&
        !nameDropdownRef.current.contains(event.target as Node) &&
        !nameInputRef.current?.contains(event.target as Node)
      ) {
        setShowNameDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCourses = async () => {
    try {
      const courses = await CoursesAPI.getAllCourses();
      setAllCourses(courses || []);
    } catch (err) {
      console.error('Error loading courses:', err);
      setAllCourses([]);
    }
  };

  const loadRooms = async () => {
    try {
      const allRooms = await RoomAPI.getAllRooms();
      setRooms(allRooms || []);
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  const handleModuleInputChange = (value: string) => {
    setModuleNumber(value);
    const searchTerm = value.toLowerCase();
    const filtered = allCourses.filter(course =>
      course.module_number.toLowerCase().includes(searchTerm)
    );
    setFilteredModules(filtered);
    setShowModuleDropdown(true);
  };

  const handleNameInputChange = (value: string) => {
    setCourseName(value);
    const searchTerm = value.toLowerCase();
    const filtered = allCourses.filter(course =>
      course.name.toLowerCase().includes(searchTerm)
    );
    setFilteredNames(filtered);
    setShowNameDropdown(true);
  };

  const selectCourse = (course: Course) => {
    setModuleNumber(course.module_number);
    setCourseName(course.name);
    setShowModuleDropdown(false);
    setShowNameDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!moduleNumber || !courseName || !date || !time || !duration) {
      setError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = `${date}T${time}:00`;

      // Use module_number as the course identifier
      await ExamsAPI.addExam(
        moduleNumber,
        startDateTime,
        parseInt(duration),
        room || undefined
      );

      onSuccess();
      onClose();

      // Reset form
      setModuleNumber('');
      setCourseName('');
      setDate('');
      setTime('');
      setDuration('');
      setRoom('');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Hinzufügen der Klausur');
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
      title="Klausur hinzufügen"
      subtitle="Trage eine anstehende Klausur ein"
      maxWidth="max-w-2xl"
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
        {/* Course Selection with Searchable Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module Number Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modulnummer *
            </label>
            <div className="relative">
              <input
                ref={moduleInputRef}
                type="text"
                required
                value={moduleNumber}
                onChange={(e) => handleModuleInputChange(e.target.value)}
                onFocus={() => {
                  setFilteredModules(allCourses);
                  setShowModuleDropdown(true);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="z.B. I231, A205"
                autoComplete="off"
              />
              {showModuleDropdown && filteredModules.length > 0 && (
                <div
                  ref={moduleDropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredModules.map((course, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectCourse(course)}
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors text-sm"
                    >
                      <div className="font-medium text-gray-900">{course.module_number}</div>
                      <div className="text-xs text-gray-600">{course.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Course Name Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kursname *
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                required
                value={courseName}
                onChange={(e) => handleNameInputChange(e.target.value)}
                onFocus={() => {
                  setFilteredNames(allCourses);
                  setShowNameDropdown(true);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="z.B. Algorithmen"
                autoComplete="off"
              />
              {showNameDropdown && filteredNames.length > 0 && (
                <div
                  ref={nameDropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredNames.map((course, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectCourse(course)}
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors text-sm"
                    >
                      <div className="font-medium text-gray-900">{course.name}</div>
                      <div className="text-xs text-gray-600">{course.module_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datum *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Uhrzeit *</label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dauer *</label>
          <select
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Dauer auswählen...</option>
            <option value="30">30 Minuten</option>
            <option value="45">45 Minuten</option>
            <option value="60">60 Minuten</option>
            <option value="90">90 Minuten</option>
            <option value="120">120 Minuten</option>
          </select>
        </div>

        {/* Room (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Raum (optional)</label>
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Raum auswählen...</option>
            {rooms.map((room) => (
              <option key={room.room_number} value={room.room_number}>
                {room.room_number}{room.room_name ? ` - ${room.room_name}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Wird hinzugefügt...' : 'Klausur hinzufügen'}
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

export default ExamModal;
