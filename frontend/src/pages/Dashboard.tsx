import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CustomHourModal from '../components/CustomHourModal';
import ExamModal from '../components/ExamModal';
import FriendModal from '../components/FriendModal';
import CalendarModal from '../components/CalendarModal';
import ZenturieSelectionModal from '../components/ZenturieSelectionModal';
import { UserAPI, ScheduleAPI, ExamsAPI, FriendsAPI } from '../services/api';

interface User {
  first_name: string;
  last_name: string;
  initials: string;
  subscription_uuid?: string;
  zenturie?: string;
}

interface ScheduleEvent {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  professor?: string;
}

interface Exam {
  id: number;
  course_name: string;
  exam_date: string;
  room?: string;
}

interface Friend {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  initials: string;
  zenturie?: string;
}

const Dashboard: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<User | null>(null);
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCustomHourModal, setShowCustomHourModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showZenturieModal, setShowZenturieModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const todayDate = new Date();
      const today = todayDate.toISOString().split('T')[0];

      const [userData, scheduleData, examsData, friendsData] = await Promise.all([
        UserAPI.getProfile(),
        ScheduleAPI.getEvents(today),
        ExamsAPI.getUpcomingExams(),
        FriendsAPI.getFriends(),
      ]);

      setUser(userData);

      // Check if user has Zenturie assigned
      if (!userData || !userData.zenturie) {
        console.log('⚠️ User has no Zenturie assigned, showing selection modal');
        setShowZenturieModal(true);
        setLoading(false);
        return; // Stop here, page will reload after Zenturie is selected
      }

      // Safely handle schedule data - API might return null
      let events = [];
      if (scheduleData) {
        if (scheduleData.events && Array.isArray(scheduleData.events)) {
          events = scheduleData.events;
        } else if (Array.isArray(scheduleData)) {
          events = scheduleData;
        }
      }
      const todaysEvents = events.filter((event: any) =>
        event.start_time?.startsWith(today)
      );
      setTodayEvents(todaysEvents);

      // Safely handle exams data
      if (examsData && examsData.exams && Array.isArray(examsData.exams)) {
        setUpcomingExams(examsData.exams);
      } else if (Array.isArray(examsData)) {
        setUpcomingExams(examsData);
      } else {
        setUpcomingExams([]);
      }

      // Safely handle friends data
      if (friendsData && friendsData.friends && Array.isArray(friendsData.friends)) {
        setFriends(friendsData.friends);
      } else if (Array.isArray(friendsData)) {
        setFriends(friendsData);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setTodayEvents([]);
      setUpcomingExams([]);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const viewFriendSchedule = (zenturie?: string) => {
    if (!zenturie) return;
    history.push(`/stundenplan?zenturie=${zenturie}`);
  };

  const removeFriend = async (friendUserId: number, friendName: string) => {
    if (!window.confirm(`Möchtest du ${friendName} wirklich aus deiner Freundesliste entfernen?`)) {
      return;
    }

    try {
      await FriendsAPI.removeFriend(friendUserId);
      await loadDashboardData();
    } catch (error: any) {
      alert(error.message || 'Fehler beim Entfernen des Freundes');
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    };
    return today.toLocaleDateString('de-DE', dateOptions);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Navbar activePage="dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Willkommen zurück, <span className="gradient-text">{user?.first_name || 'User'}</span> 👋
          </h1>
          <p className="text-gray-600">
            {user ? (
              user.zenturie
                ? `Hier ist deine Übersicht für heute, ${getTodayDateString()} • Zenturie: ${user.zenturie}`
                : `Hier ist deine Übersicht für heute, ${getTodayDateString()}`
            ) : 'Hier ist deine Übersicht für heute'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

          {/* Stat Card 1 - Termine heute */}
          <div className="glass-effect rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{todayEvents.length}</h3>
            <p className="text-sm text-gray-600">Termine heute</p>
          </div>

          {/* Stat Card 2 - Kurse heute */}
          <div className="glass-effect rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{todayEvents.length}</h3>
            <p className="text-sm text-gray-600">Kurse heute</p>
          </div>

          {/* Stat Card 3 - Klausuren bald */}
          <div className="glass-effect rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-accent/10 rounded-xl">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{upcomingExams.length}</h3>
            <p className="text-sm text-gray-600">Klausuren bald</p>
          </div>

          {/* Stat Card 4 - Freunde */}
          <div className="glass-effect rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{friends.length}</h3>
            <p className="text-sm text-gray-600">Freunde</p>
          </div>

        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Heutiger Stundenplan */}
            <div className="glass-effect rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Heutiger Stundenplan</h2>
                <a onClick={() => history.push('/stundenplan')} className="text-primary hover:text-secondary text-sm font-medium transition-colors cursor-pointer">
                  Alle anzeigen →
                </a>
              </div>
              
              <div className="space-y-4">
                {todayEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Keine Termine heute
                  </div>
                ) : (
                  todayEvents.map((event, index) => (
                    <div key={event.id} className={`flex items-start space-x-4 p-4 ${index === 0 ? 'bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-primary' : 'bg-gray-50 border-l-4 border-gray-300'} rounded-xl`}>
                      <div className="text-center flex-shrink-0">
                        <div className="text-sm font-medium text-gray-600">{formatTime(event.start_time)}</div>
                        <div className="text-xs text-gray-400">90 min</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {event.location && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                              {event.location}
                            </span>
                          )}
                          {event.professor && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                              </svg>
                              {event.professor}
                            </span>
                          )}
                        </div>
                      </div>
                      {index === 0 && (
                        <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">Aktiv</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Anstehende Klausuren */}
            <div className="glass-effect rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Anstehende Klausuren</h2>
              </div>

              <div className="space-y-4">
                {upcomingExams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Keine anstehenden Klausuren
                  </div>
                ) : (
                  upcomingExams.slice(0, 3).map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-4 bg-orange-50 border-l-4 border-accent rounded-xl">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-accent/20 rounded-lg">
                          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{exam.course_name}</h4>
                          <p className="text-sm text-gray-600">{formatDate(exam.exam_date)}</p>
                          {exam.room && <p className="text-xs text-gray-500 mt-1">Raum: {exam.room}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Schnellaktionen */}
            <div className="glass-effect rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Schnellaktionen</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setShowCustomHourModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <span className="flex items-center text-primary font-medium">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Stunde hinzufügen
                  </span>
                </button>
                <button
                  onClick={() => setShowExamModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-accent/5 hover:bg-accent/10 rounded-xl transition-colors"
                >
                  <span className="flex items-center text-accent font-medium">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Klausur hinzufügen
                  </span>
                </button>
                <button
                  onClick={() => setShowFriendModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-secondary/5 hover:bg-secondary/10 rounded-xl transition-colors"
                >
                  <span className="flex items-center text-secondary font-medium">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                    Freund hinzufügen
                  </span>
                </button>
                <button
                  onClick={() => setShowCalendarModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
                >
                  <span className="flex items-center text-green-700 font-medium">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Kalender-Abo
                  </span>
                </button>
              </div>
            </div>

            {/* Freunde */}
            <div className="glass-effect rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Freunde</h2>
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Keine Freunde hinzugefügt
                  </div>
                ) : (
                  friends.slice(0, 5).map((friend) => (
                    <div key={friend.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                        {friend.initials}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{friend.first_name} {friend.last_name}</p>
                        <p className="text-xs text-gray-500">{friend.zenturie || 'Keine Zenturie'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewFriendSchedule(friend.zenturie)}
                          className="text-primary hover:text-secondary transition-colors p-1"
                          title="Stundenplan anzeigen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => removeFriend(friend.user_id, `${friend.first_name} ${friend.last_name}`)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          title="Freund entfernen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Modals */}
      <CustomHourModal
        isOpen={showCustomHourModal}
        onClose={() => setShowCustomHourModal(false)}
        onSuccess={loadDashboardData}
      />
      <ExamModal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        onSuccess={loadDashboardData}
      />
      <FriendModal
        isOpen={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onSuccess={loadDashboardData}
      />
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        subscriptionUuid={user?.subscription_uuid}
      />
      <ZenturieSelectionModal
        isOpen={showZenturieModal}
      />
    </div>
  );
};

export default Dashboard;
