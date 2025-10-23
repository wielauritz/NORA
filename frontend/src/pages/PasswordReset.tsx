import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AuthAPI } from '../services/api';

const PasswordReset: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await AuthAPI.resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error:', err);
      // Even on error, show success for security reasons
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
      {/* Reset Container */}
      <div className="w-full max-w-md">

        {/* Back Button */}
        <a
          onClick={() => history.push('/login')}
          className="inline-flex items-center text-gray-600 hover:text-secondary mb-6 transition-colors text-sm cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Zurück zum Login
        </a>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-secondary mb-2">Passwort zurücksetzen</h1>
          <p className="text-gray-600 text-sm">Wir senden dir einen Reset-Link per E-Mail</p>
        </div>

        {/* Reset Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Form View */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* E-Mail Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-focus block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all bg-white"
                  placeholder="vorname.nachname@nordakademie.de"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-hover w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-medium disabled:opacity-60"
              >
                {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
              </button>

            </form>
          )}

          {/* Success Message */}
          {success && (
            <div className="success-message">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-secondary">E-Mail gesendet</h3>
                <p className="text-sm text-gray-600">
                  Falls ein Account mit der E-Mail <strong>{email}</strong> existiert, haben wir dir einen Reset-Link gesendet.
                </p>
                <p className="text-xs text-gray-500">
                  Bitte prüfe auch deinen Spam-Ordner
                </p>
                <a
                  onClick={() => history.push('/login')}
                  className="inline-block text-primary hover:text-secondary transition-colors font-medium text-sm mt-4 cursor-pointer"
                >
                  Zurück zum Login
                </a>
              </div>
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

export default PasswordReset;
