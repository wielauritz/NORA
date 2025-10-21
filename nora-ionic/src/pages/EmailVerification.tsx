import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AuthAPI } from '../services/api';

const EmailVerification: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uuid = params.get('uuid');

    if (!uuid) {
      setStatus('error');
      setMessage('Ungültiger Verifikations-Link');
      return;
    }

    verifyEmail(uuid);
  }, [location]);

  const verifyEmail = async (uuid: string) => {
    try {
      await AuthAPI.verifyEmail(uuid);
      setStatus('success');
      setMessage('E-Mail erfolgreich bestätigt!');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        history.push('/login');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Verifizierung fehlgeschlagen');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
      {/* Verification Container */}
      <div className="w-full max-w-md">

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-secondary mb-2">E-Mail Verifizierung</h1>
          <p className="text-gray-600 text-sm">Einen Moment bitte...</p>
        </div>

        {/* Status Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Loading State */}
          {status === 'verifying' && (
            <div className="text-center space-y-4">
              <div className="spinner mx-auto"></div>
              <p className="text-sm text-gray-600">Verifizierung wird durchgeführt</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center space-y-4 success-message">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary">{message}</h3>
              <p className="text-sm text-gray-600">
                Du wirst automatisch zum Login weitergeleitet...
              </p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary">Fehler</h3>
              <p className="text-sm text-gray-600">{message}</p>
              <a
                onClick={() => history.push('/login')}
                className="inline-block text-primary hover:text-secondary transition-colors font-medium text-sm mt-4 cursor-pointer"
              >
                Zum Login
              </a>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-gray-400 text-xs">
          &copy; 2025 NORA Dashboard
        </p>

      </div>
    </div>
  );
};

export default EmailVerification;
