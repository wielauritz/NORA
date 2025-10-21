import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UserAPI, SearchAPI } from '../services/api';

interface NavbarProps {
  activePage?: 'dashboard' | 'stundenplan' | 'raumplan';
}

const Navbar: React.FC<NavbarProps> = ({ activePage = '' }) => {
  const history = useHistory();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const user = await UserAPI.getProfile();
      setUserInitials(user.initials || 'NA');
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInitials('NA');
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  const logout = () => {
    if (window.confirm('Möchtest du dich wirklich abmelden?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      history.push('/login');
    }
  };

  const navigate = (path: string) => {
    history.push(path);
    if (mobileMenuOpen) {
      toggleMobileMenu();
    }
  };

  const isActive = (page: string) => {
    return location.pathname.includes(page);
  };

  const handleSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await SearchAPI.search(query);
      setSearchResults(results.results || results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    handleSearch(value);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  return (
    <>
    <nav className="glass-effect shadow-lg sticky top-0 z-[60]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center space-x-3">
            <a onClick={() => navigate('/dashboard')} className="hover:cursor-pointer">
              <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" className="h-10" />
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <a
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 rounded-lg ${
                isActive('dashboard')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              } transition-colors cursor-pointer`}
            >
              Dashboard
            </a>
            <a
              onClick={() => navigate('/stundenplan')}
              className={`px-4 py-2 rounded-lg ${
                isActive('stundenplan')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              } transition-colors cursor-pointer`}
            >
              Stundenplan
            </a>
            <a
              onClick={() => navigate('/raumplan')}
              className={`px-4 py-2 rounded-lg ${
                isActive('raumplan')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              } transition-colors cursor-pointer`}
            >
              Raumplan
            </a>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search */}
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Suche (Strg+K)"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold">
                {userInitials}
              </div>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={logout}
                title="Logout"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <svg
                className={`w-6 h-6 text-gray-600 ${mobileMenuOpen ? 'hidden' : 'block'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`w-6 h-6 text-gray-600 ${mobileMenuOpen ? 'block' : 'hidden'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-gray-200`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <a
            onClick={() => navigate('/dashboard')}
            className={`block px-3 py-2 rounded-lg ${
              isActive('dashboard')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
          >
            Dashboard
          </a>
          <a
            onClick={() => navigate('/stundenplan')}
            className={`block px-3 py-2 rounded-lg ${
              isActive('stundenplan')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
          >
            Stundenplan
          </a>
          <a
            onClick={() => navigate('/raumplan')}
            className={`block px-3 py-2 rounded-lg ${
              isActive('raumplan')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
          >
            Raumplan
          </a>
        </div>

        {/* Mobile User Section */}
        <div className="border-t border-gray-200 px-2 py-3 space-y-2">
          <button
            onClick={() => {
              setShowSearch(true);
              toggleMobileMenu();
            }}
            className="w-full flex items-center px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Suche
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Abmelden
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[70] flex items-start justify-center pt-20 px-4"
          style={{ height: '100dvh' }}
          onClick={() => {
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  placeholder="Suche nach Kursen, Räumen, Zenturien..."
                  className="flex-1 text-lg border-none focus:outline-none focus:ring-0"
                  autoFocus
                />
                <kbd
                  className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  ESC
                </kbd>
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto min-h-[200px]">
              {searching ? (
                <div className="p-8 text-center">
                  <div className="spinner mx-auto"></div>
                  <p className="text-gray-500 mt-4">Suche läuft...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <div className="font-medium text-gray-900">{result.title || result.name}</div>
                      {result.subtitle && <div className="text-sm text-gray-600">{result.subtitle}</div>}
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="p-8 text-center text-gray-500">
                  Keine Ergebnisse gefunden
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Gib mindestens 2 Zeichen ein, um zu suchen
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    </>
  );
};

export default Navbar;
