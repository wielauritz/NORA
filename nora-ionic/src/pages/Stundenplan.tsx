import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import CustomHourModal from '../components/CustomHourModal';
import ExamModal from '../components/ExamModal';
import { ScheduleAPI, CustomHoursAPI, ExamsAPI } from '../services/api';

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  professor?: string;
  event_type: string;
  description?: string;
  custom_hour_id?: number;
}

type ViewMode = 'week' | 'month' | 'year';

const Stundenplan: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const friendZenturie = queryParams.get('zenturie');

  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showWeekends, setShowWeekends] = useState(() => {
    return localStorage.getItem('showWeekends') === 'true';
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCustomHourModal, setShowCustomHourModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);

  const weekDayNames = showWeekends
    ? ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
    : ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

  const hours = Array.from({length: 24}, (_, i) => i); // 0:00 - 23:00

  useEffect(() => {
    loadEvents();
  }, [currentDate, viewMode]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      if (viewMode === 'week') {
        // Load events for the entire week
        const weekStart = getWeekStart(currentDate);
        const promises = [];

        for (let i = 0; i < (showWeekends ? 7 : 5); i++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + i);
          const dateStr = day.toISOString().split('T')[0];
          // Load friend schedule if zenturie is provided, otherwise load own schedule
          if (friendZenturie) {
            promises.push(ScheduleAPI.getFriendSchedule(friendZenturie, dateStr));
          } else {
            promises.push(ScheduleAPI.getEvents(dateStr));
          }
        }

        const results = await Promise.all(promises);
        const allEvents = results.flatMap(data => {
          if (!data) return [];
          if (data.events && Array.isArray(data.events)) return data.events;
          if (Array.isArray(data)) return data;
          return [];
        });
        setEvents(allEvents);
      } else if (viewMode === 'month') {
        // Load events for the entire month
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const promises = [];

        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (friendZenturie) {
            promises.push(ScheduleAPI.getFriendSchedule(friendZenturie, dateStr));
          } else {
            promises.push(ScheduleAPI.getEvents(dateStr));
          }
        }

        const results = await Promise.all(promises);
        const allEvents = results.flatMap(data => {
          if (!data) return [];
          if (data.events && Array.isArray(data.events)) return data.events;
          if (Array.isArray(data)) return data;
          return [];
        });
        setEvents(allEvents);
      } else {
        // For year view, load current date only
        const dateStr = currentDate.toISOString().split('T')[0];
        const data = friendZenturie
          ? await ScheduleAPI.getFriendSchedule(friendZenturie, dateStr)
          : await ScheduleAPI.getEvents(dateStr);
        if (!data) {
          setEvents([]);
        } else if (data.events && Array.isArray(data.events)) {
          setEvents(data.events);
        } else if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDays = () => {
    const week = [];
    const startOfWeek = getWeekStart(currentDate);

    const daysCount = showWeekends ? 7 : 5;
    for (let i = 0; i < daysCount; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getEventPosition = (event: Event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const topPx = startHour * 60;
    const heightPx = Math.max(duration * 60, 30);

    return {
      top: topPx + 'px',
      height: heightPx + 'px',
    };
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.start_time?.startsWith(dateStr));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const previousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setFullYear(currentDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else {
      newDate.setFullYear(currentDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleWeekendToggle = () => {
    const newValue = !showWeekends;
    setShowWeekends(newValue);
    localStorage.setItem('showWeekends', newValue.toString());
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !selectedEvent.custom_hour_id) return;

    try {
      await CustomHoursAPI.deleteCustomHour(selectedEvent.custom_hour_id);
      setShowEventModal(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (error: any) {
      alert('Fehler beim Löschen: ' + error.message);
    }
  };

  const getCurrentTimeIndicator = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const topPx = currentHour * 60;
    return topPx;
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

    // Add empty days for alignment
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventCountForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.start_time?.startsWith(dateStr)).length;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPeriodLabel = () => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `KW ${getWeekNumber(currentDate)} • ${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (viewMode === 'month') {
      return currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    } else {
      return currentDate.getFullYear().toString();
    }
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const weekDates = getWeekDays();

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Navbar activePage="stundenplan" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header with View Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Stundenplan
              {friendZenturie && (
                <span className="text-xl font-normal text-primary ml-3">
                  • {friendZenturie}
                </span>
              )}
            </h1>
            <p className="text-gray-600">{getPeriodLabel()}</p>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-white rounded-lg shadow p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  viewMode === 'week'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Woche
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  viewMode === 'month'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Monat
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  viewMode === 'year'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Jahr
              </button>
            </div>

            {/* Weekend Toggle (only in week view) */}
            {viewMode === 'week' && (
              <label className="flex items-center space-x-2 bg-white rounded-lg shadow px-4 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeekends}
                  onChange={handleWeekendToggle}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Wochenende</span>
              </label>
            )}

            {/* Navigation */}
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow p-1">
              <button onClick={previousPeriod} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <button onClick={goToToday} className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Heute
              </button>
              <button onClick={nextPeriod} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomHourModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center space-x-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Stunde</span>
              </button>
              <button
                onClick={() => setShowExamModal(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center space-x-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span>Klausur</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Week View */}
            {viewMode === 'week' && (
              <div className="glass-effect rounded-2xl overflow-hidden calendar-container" style={{ '--days-visible': showWeekends ? 7 : 5 } as any}>
                {/* Calendar Header */}
                <div className="calendar-header">
                  <div className="calendar-time-label">Zeit</div>
                  {weekDates.map((date, idx) => (
                    <div key={idx} className={`calendar-day-header ${isToday(date) ? 'today' : ''}`}>
                      <div className="calendar-day-name">{weekDayNames[idx]}</div>
                      <div className="calendar-day-date">{date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="calendar-grid">
                  {/* Time Column */}
                  <div className="calendar-time-column">
                    {hours.map(hour => (
                      <div key={hour} className="calendar-time-slot">
                        {hour}:00
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {weekDates.map((date, dayIdx) => {
                    const dayEvents = getEventsForDay(date);
                    return (
                      <div key={dayIdx} className="calendar-day-column">
                        {/* Hour lines */}
                        {hours.map(hour => (
                          <React.Fragment key={hour}>
                            <div className="calendar-hour-line" style={{ top: `${hour * 60}px` }} />
                            <div className="calendar-half-hour-line" style={{ top: `${hour * 60 + 30}px` }} />
                          </React.Fragment>
                        ))}

                        {/* Events */}
                        {dayEvents.map(event => {
                          const position = getEventPosition(event);
                          return (
                            <div
                              key={event.id}
                              className={`calendar-event ${event.event_type}`}
                              style={position}
                              onClick={() => handleEventClick(event)}
                            >
                              <div className="calendar-event-title">{event.title}</div>
                              <div className="calendar-event-time">
                                {formatTime(event.start_time)} - {formatTime(event.end_time)}
                              </div>
                              {event.location && (
                                <div className="calendar-event-location">{event.location}</div>
                              )}
                            </div>
                          );
                        })}

                        {/* Current time indicator (only for today) */}
                        {isToday(date) && (
                          <div className="current-time-indicator" style={{ top: `${getCurrentTimeIndicator()}px` }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Month View */}
            {viewMode === 'month' && (
              <div className="glass-effect rounded-2xl p-6">
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                    <div key={day} className="text-center font-semibold text-gray-700 text-sm py-2">
                      {day}
                    </div>
                  ))}

                  {/* Days */}
                  {getMonthDays().map((date, idx) => (
                    <div
                      key={idx}
                      className={`min-h-[100px] p-2 rounded-lg border ${
                        date === null
                          ? 'bg-gray-50 border-gray-100'
                          : isToday(date)
                          ? 'bg-gradient-to-br from-primary/10 to-secondary/10 border-primary'
                          : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                      onClick={() => date && setCurrentDate(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-semibold mb-1 ${isToday(date) ? 'text-primary' : 'text-gray-700'}`}>
                            {date.getDate()}
                          </div>
                          {getEventCountForDay(date) > 0 && (
                            <div className="text-xs text-gray-600">
                              {getEventCountForDay(date)} {getEventCountForDay(date) === 1 ? 'Termin' : 'Termine'}
                            </div>
                          )}
                          <div className="mt-1 space-y-1">
                            {getEventsForDay(date).slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                className={`text-xs px-2 py-1 rounded truncate ${
                                  event.event_type === 'timetable' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {getEventCountForDay(date) > 3 && (
                              <div className="text-xs text-gray-500 px-2">+{getEventCountForDay(date) - 3} mehr</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Year View */}
            {viewMode === 'year' && (
              <div className="glass-effect rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = new Date(currentDate.getFullYear(), i, 1);
                    return (
                      <div
                        key={i}
                        className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary cursor-pointer transition-colors"
                        onClick={() => {
                          setCurrentDate(monthDate);
                          setViewMode('month');
                        }}
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {monthDate.toLocaleDateString('de-DE', { month: 'long' })}
                        </h3>
                        <div className="grid grid-cols-7 gap-1">
                          {['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((d, idx) => (
                            <div key={idx} className="text-xs text-gray-500 text-center">{d}</div>
                          ))}
                          {(() => {
                            const firstDay = new Date(currentDate.getFullYear(), i, 1);
                            const lastDay = new Date(currentDate.getFullYear(), i + 1, 0);
                            const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                            const days = [];

                            for (let j = 0; j < startDay; j++) {
                              days.push(<div key={`empty-${j}`} className="text-xs text-center"></div>);
                            }

                            for (let j = 1; j <= lastDay.getDate(); j++) {
                              const dayDate = new Date(currentDate.getFullYear(), i, j);
                              const isCurrentDay = isToday(dayDate);
                              days.push(
                                <div
                                  key={j}
                                  className={`text-xs text-center p-1 rounded ${
                                    isCurrentDay ? 'bg-primary text-white font-bold' : 'text-gray-700'
                                  }`}
                                >
                                  {j}
                                </div>
                              );
                            }

                            return days;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          title={selectedEvent.title}
        >
          <div className="space-y-4">
            <div className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${
              selectedEvent.event_type === 'timetable' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
            }`}>
              {selectedEvent.event_type === 'timetable' ? 'Vorlesung' : 'Eigene Stunde'}
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Zeit</div>
                  <div className="text-gray-600">
                    {formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}
                  </div>
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Raum</div>
                    <div className="text-gray-600">{selectedEvent.location}</div>
                  </div>
                </div>
              )}

              {selectedEvent.professor && (
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Dozent</div>
                    <div className="text-gray-600">{selectedEvent.professor}</div>
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/>
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Beschreibung</div>
                    <div className="text-gray-600">{selectedEvent.description}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {selectedEvent.event_type === 'custom' && selectedEvent.custom_hour_id && (
                <button
                  onClick={handleDeleteEvent}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Löschen
                </button>
              )}
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Modal Components */}
      <CustomHourModal
        isOpen={showCustomHourModal}
        onClose={() => setShowCustomHourModal(false)}
        onSuccess={loadEvents}
      />
      <ExamModal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        onSuccess={loadEvents}
      />

    </div>
  );
};

export default Stundenplan;
