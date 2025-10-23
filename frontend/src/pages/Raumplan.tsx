import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { RoomAPI, ScheduleAPI } from '../services/api';

interface Room {
  id: number;
  room_number: string;
  building: string;
  floor: string;
  room_name?: string;
  capacity?: number;
}

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  professor?: string;
  event_type: string;
}

interface RoomOccupancy {
  room_number: string;
  start_time: string;
  end_time: string;
  course_name: string;
}

const Raumplan: React.FC = () => {
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [roomOccupancyData, setRoomOccupancyData] = useState<Map<string, RoomOccupancy[]>>(new Map());
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [currentView, setCurrentView] = useState<'list' | 'map'>('list');
  const [selectedMapBuilding, setSelectedMapBuilding] = useState('XX');
  const [selectedFloor, setSelectedFloor] = useState('0');
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    initRaumplan();
  }, []);

  const initRaumplan = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAllRooms(),
        loadTodayEvents()
      ]);
    } catch (error) {
      console.error('Error initializing Raumplan:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllRooms = async () => {
    try {
      const rooms = await RoomAPI.getAllRooms();
      setAllRooms(rooms || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      setAllRooms([]);
    }
  };

  const loadTodayEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await ScheduleAPI.getEvents(today);

      if (!data) {
        setTodayEvents([]);
      } else if (data.events && Array.isArray(data.events)) {
        setTodayEvents(data.events);
      } else if (Array.isArray(data)) {
        setTodayEvents(data);
      } else {
        setTodayEvents([]);
      }
    } catch (error) {
      console.error('Error loading today events:', error);
      setTodayEvents([]);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoomStatus = (roomNumber: string) => {
    const now = new Date();

    // Check if this room is in today's events
    const myRoom = todayEvents.find(event =>
      event.location === roomNumber && event.event_type === 'timetable'
    );

    if (myRoom) {
      const startTime = new Date(myRoom.start_time);
      const endTime = new Date(myRoom.end_time);

      if (now >= startTime && now <= endTime) {
        return {
          status: 'mine' as const,
          timeInfo: `bis ${formatTime(endTime.toISOString())}`
        };
      }
    }

    // Check against room occupancies
    const occupancy = roomOccupancyData.get(roomNumber);
    if (occupancy) {
      for (const event of occupancy) {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);

        if (now >= startTime && now <= endTime) {
          return {
            status: 'occupied' as const,
            timeInfo: `bis ${formatTime(endTime.toISOString())}`
          };
        }
      }

      const futureOccupancies = occupancy
        .filter(event => new Date(event.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      if (futureOccupancies.length > 0) {
        const nextEvent = futureOccupancies[0];
        const startTime = new Date(nextEvent.start_time);
        return {
          status: 'available' as const,
          timeInfo: `frei bis ${formatTime(startTime.toISOString())}`
        };
      }
    }

    return {
      status: 'available' as const,
      timeInfo: 'den ganzen Tag frei'
    };
  };

  const getMyRoomsToday = () => {
    return todayEvents.filter(event =>
      event.event_type === 'timetable' && event.location
    );
  };

  const getFilteredRooms = () => {
    if (selectedBuilding === 'all') {
      return allRooms;
    }
    return allRooms.filter(room => room.building === selectedBuilding);
  };

  const groupRoomsByBuilding = () => {
    const grouped: { [key: string]: Room[] } = {};
    const filtered = getFilteredRooms();

    filtered.forEach(room => {
      const key = selectedBuilding === 'all' ? room.building : room.floor;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(room);
    });

    return grouped;
  };

  const getCurrentTimeInfo = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    const upcomingEvents = todayEvents
      .filter(event => new Date(event.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const nextEvent = upcomingEvents[0];

    return { timeStr, nextEvent };
  };

  const switchView = (view: 'list' | 'map') => {
    setCurrentView(view);
    if (view === 'map') {
      setSelectedMapBuilding('XX');
      setSelectedFloor('0');
    }
  };

  const handleBuildingSelect = (building: string) => {
    setSelectedMapBuilding(building);
    setSelectedFloor('0');
  };

  const getFloorPlanUrl = () => {
    if (selectedMapBuilding === 'XX') {
      return 'https://cdn.nora-nak.de/floorplans/XX.png';
    }
    return `https://cdn.nora-nak.de/floorplans/${selectedMapBuilding}${selectedFloor}.png`;
  };

  const getRoomsByFloor = () => {
    if (selectedMapBuilding === 'XX') return [];

    return allRooms.filter(room => {
      return room.building === selectedMapBuilding && room.floor === selectedFloor;
    });
  };

  const showRoomDetails = (roomNumber: string) => {
    const room = allRooms.find(r => r.room_number === roomNumber);
    const event = todayEvents.find(e => e.location === roomNumber);

    setSelectedRoom({
      ...room,
      currentEvent: event,
      status: getRoomStatus(roomNumber)
    });
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
  };

  const { timeStr, nextEvent } = getCurrentTimeInfo();
  const myRoomsToday = getMyRoomsToday();
  const groupedRooms = groupRoomsByBuilding();

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Navbar activePage="raumplan" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Raumplan</h1>
            <p className="text-gray-600">Finde deine Unterrichtsräume</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <div className="flex bg-white rounded-lg shadow p-1 gap-1">
              <button
                onClick={() => switchView('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  currentView === 'list'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
                <span className="text-sm">Liste</span>
              </button>
              <button
                onClick={() => switchView('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  currentView === 'map'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
                <span className="text-sm">Karte</span>
              </button>
            </div>
          </div>
        </div>

        {/* Current Time & Location Info */}
        <div className="glass-effect rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Aktuell: {timeStr} Uhr</h3>
                {nextEvent && nextEvent.location ? (
                  <p className="text-sm text-gray-600">
                    Dein nächster Kurs beginnt in {Math.round((new Date(nextEvent.start_time).getTime() - new Date().getTime()) / 60000)} Minuten
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">Keine weiteren Kurse heute</p>
                )}
              </div>
            </div>
            {nextEvent && nextEvent.location && (
              <div
                className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl cursor-pointer"
                onClick={() => showRoomDetails(nextEvent.location!)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span className="font-semibold">Nächster Raum: {nextEvent.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Building Filters (only in list view) */}
        {currentView === 'list' && (
          <div className="glass-effect rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-3 overflow-x-auto">
              {['all', 'A', 'B', 'C', 'D', 'F', 'H'].map(building => (
                <button
                  key={building}
                  onClick={() => setSelectedBuilding(building)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedBuilding === building
                      ? 'active bg-gradient-to-r from-primary to-secondary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {building === 'all' ? 'Alle Gebäude' : `Gebäude ${building}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Map View */}
        {currentView === 'map' && (
          <div className="glass-effect rounded-2xl p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Raumplan</h2>

              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gebäude</label>
                  <select
                    value={selectedMapBuilding}
                    onChange={(e) => handleBuildingSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white appearance-none cursor-pointer pr-10"
                  >
                    <option value="XX">Übersicht (Campus)</option>
                    <option value="A">Gebäude A</option>
                    <option value="B">Gebäude B</option>
                    <option value="C">Gebäude C</option>
                    <option value="D">Gebäude D</option>
                    <option value="F">Gebäude F</option>
                    <option value="H">Gebäude H</option>
                  </select>
                </div>

                {selectedMapBuilding !== 'XX' && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stockwerk</label>
                    <select
                      value={selectedFloor}
                      onChange={(e) => setSelectedFloor(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white appearance-none cursor-pointer pr-10"
                    >
                      <option value="0">Erdgeschoss</option>
                      {selectedMapBuilding !== 'B' && (
                        <option value="1">1. Stock</option>
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="relative rounded-xl p-4 md:p-8 overflow-x-auto bg-gradient-to-br from-blue-50 via-white to-primary/5">
              <div className="relative min-w-[800px]">
                <img
                  src={getFloorPlanUrl()}
                  alt="Raumplan"
                  className="w-full rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23f3f4f6" width="800" height="600"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%236b7280" font-size="20"%3EKein Raumplan verfügbar%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>

              {getRoomsByFloor().length > 0 && (
                <div className="mt-4 bg-white rounded-lg p-4 shadow-lg">
                  <h3 className="font-bold text-gray-900 mb-3">Räume auf diesem Stockwerk</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {getRoomsByFloor().map(room => {
                      const status = getRoomStatus(room.room_number);
                      return (
                        <button
                          key={room.id}
                          onClick={() => showRoomDetails(room.room_number)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            status.status === 'mine'
                              ? 'bg-gradient-to-r from-primary to-secondary text-white'
                              : status.status === 'occupied'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {room.room_number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div className="text-sm text-blue-800">
                  <strong>Tipp:</strong> Klicke auf einen Raum, um Details zur Belegung und Ausstattung anzuzeigen. Deine heutigen Räume sind blau markiert.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <>
            {/* My Rooms Today */}
            <div className="glass-effect rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Deine Räume heute</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {myRoomsToday.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    <p>Keine Räume für heute gefunden</p>
                  </div>
                ) : (
                  myRoomsToday.map((event) => {
                    const startTime = new Date(event.start_time);
                    const endTime = new Date(event.end_time);
                    const timeStr = `${formatTime(startTime.toISOString())} - ${formatTime(endTime.toISOString())}`;
                    const building = event.location?.charAt(0) || '';
                    const floor = event.location?.charAt(1) || '';

                    return (
                      <div
                        key={event.id}
                        className="room-card room-mine rounded-xl p-4 text-white cursor-pointer"
                        onClick={() => showRoomDetails(event.location!)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-2xl font-bold">{event.location}</div>
                          <div className="p-2 bg-white/20 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            {timeStr}
                          </div>
                          <div className="font-semibold">{event.title}</div>
                          <div className="opacity-90">Gebäude {building}, {floor}. Stock</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* All Rooms */}
            <div className="glass-effect rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Alle Räume</h2>

              {Object.keys(groupedRooms).length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  <p className="text-gray-600">Keine Räume gefunden</p>
                </div>
              ) : (
                Object.keys(groupedRooms).sort().map((key) => {
                  const rooms = groupedRooms[key];
                  const groupName = selectedBuilding === 'all' ? `Gebäude ${key}` :
                    key === '0' ? 'Erdgeschoss' : `${key}. Etage`;

                  const colorClasses: {[key: string]: string} = {
                    'A': 'bg-blue-100 text-blue-600',
                    'B': 'bg-green-100 text-green-600',
                    'C': 'bg-purple-100 text-purple-600',
                    'D': 'bg-orange-100 text-orange-600',
                    'F': 'bg-pink-100 text-pink-600',
                    'H': 'bg-indigo-100 text-indigo-600',
                  };

                  return (
                    <div key={key} className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        {selectedBuilding === 'all' && (
                          <span className={`w-8 h-8 ${colorClasses[key] || 'bg-gray-100 text-gray-600'} rounded-lg flex items-center justify-center mr-3 font-bold`}>
                            {key}
                          </span>
                        )}
                        {groupName}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {rooms.map((room) => {
                          const status = getRoomStatus(room.room_number);
                          const statusClass = status.status === 'mine' ? 'room-mine' :
                            status.status === 'occupied' ? 'room-occupied' : 'room-available';

                          return (
                            <div
                              key={room.id}
                              className={`room-card ${statusClass} rounded-xl p-4 text-white cursor-pointer`}
                              onClick={() => showRoomDetails(room.room_number)}
                            >
                              <div className="text-xl font-bold mb-1">{room.room_number}</div>
                              <div className="text-xs opacity-90">
                                {status.status === 'mine' ? 'Dein Kurs' :
                                 status.status === 'occupied' ? 'Belegt' : 'Verfügbar'}
                              </div>
                              <div className="text-xs opacity-75 mt-2">{status.timeInfo}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="glass-effect rounded-2xl p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Legende</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 room-mine rounded-lg"></div>
              <div>
                <div className="font-medium text-gray-900">Deine Räume</div>
                <div className="text-sm text-gray-600">Kurse, die du besuchst</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 room-available rounded-lg"></div>
              <div>
                <div className="font-medium text-gray-900">Verfügbar</div>
                <div className="text-sm text-gray-600">Aktuell frei</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 room-occupied rounded-lg"></div>
              <div>
                <div className="font-medium text-gray-900">Belegt</div>
                <div className="text-sm text-gray-600">Derzeit in Benutzung</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={closeRoomModal}
        >
          <div
            className="glass-effect rounded-3xl w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeRoomModal}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <div className="mb-6">
              <div className={`inline-block px-4 py-1 rounded-full text-sm font-medium mb-3 ${
                selectedRoom.status.status === 'mine' ? 'bg-gradient-to-r from-primary to-secondary text-white' :
                selectedRoom.status.status === 'occupied' ? 'bg-gradient-to-r from-red-400 to-red-600 text-white' :
                'bg-gradient-to-r from-green-400 to-green-600 text-white'
              }`}>
                {selectedRoom.status.status === 'mine' ? 'Dein Kurs' :
                 selectedRoom.status.status === 'occupied' ? 'Belegt' : 'Verfügbar'}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Raum {selectedRoom.room_number}</h2>
              <p className="text-gray-600">Gebäude {selectedRoom.building} • {selectedRoom.floor}. Stock</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Kapazität</div>
                    <div className="font-semibold text-gray-900">{selectedRoom.capacity || 'N/A'} Personen</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Raumtyp</div>
                    <div className="font-semibold text-gray-900">{selectedRoom.room_name || 'Standardraum'}</div>
                  </div>
                </div>
              </div>
            </div>

            {selectedRoom.currentEvent && (
              <div className={`rounded-xl p-4 mb-6 border ${
                selectedRoom.status.status === 'mine' ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium mb-1">Aktuell</div>
                    <div className="text-lg font-bold">{selectedRoom.currentEvent.title}</div>
                    <div className="text-sm opacity-75">
                      {formatTime(selectedRoom.currentEvent.start_time)} - {formatTime(selectedRoom.currentEvent.end_time)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Navigation starten</span>
              </button>
              <button
                onClick={closeRoomModal}
                className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Schließen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Raumplan;
