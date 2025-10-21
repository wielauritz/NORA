import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AuthAPI } from '../services/api';

const Login: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await AuthAPI.login(email, password);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user || { mail: email }));
        // Use window.location to force a full page reload so auth check works
        window.location.href = '/dashboard';
      } else {
        // New user created, verification email sent
        setVerificationEmail(email);
        setShowVerification(true);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Anmeldung fehlgeschlagen';

      if (errorMessage.includes('verifiziert') || errorMessage.includes('verified')) {
        // Email not verified
        setVerificationEmail(email);
        setShowVerification(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setResendMessage('');
    try {
      await AuthAPI.resendVerificationEmail(verificationEmail);
      setResendMessage('Verifizierungs-E-Mail wurde erneut gesendet. Bitte überprüfe dein Postfach.');
    } catch (err: any) {
      setResendMessage('Fehler beim Senden der E-Mail: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setResending(false);
    }
  };

  const backToLogin = () => {
    setShowVerification(false);
    setVerificationEmail('');
    setResendMessage('');
    setError('');
  };

  if (showVerification) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" className="h-20 mx-auto mb-4" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center space-y-4 fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary">E-Mail-Verifizierung erforderlich</h3>
              <p className="text-sm text-gray-600">
                Deine E-Mail-Adresse muss verifiziert werden.<br/>
                Bitte überprüfe dein Postfach (<strong>{verificationEmail}</strong>) und klicke auf den Verifizierungslink.
              </p>
              <p className="text-xs text-gray-500">
                Keine E-Mail erhalten?
              </p>

              {resendMessage && (
                <div className={`p-3 rounded-lg text-sm ${resendMessage.includes('Fehler') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                  {resendMessage}
                </div>
              )}

              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="btn-hover bg-gradient-to-r from-primary to-secondary text-white py-2 px-6 rounded-lg font-medium disabled:opacity-60"
              >
                {resending ? 'Wird gesendet...' : 'Verifizierungs-E-Mail erneut senden'}
              </button>
              <div className="pt-4">
                <a onClick={backToLogin} className="text-sm text-primary hover:text-secondary transition-colors cursor-pointer">
                  Zurück zum Login
                </a>
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-gray-400 text-xs">
            &copy; 2025 NORA Dashboard
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
      {/* Login Container */}
      <div className="w-full max-w-md">

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" className="h-20 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Melde dich an oder erstelle einen Account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

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

            {/* Passwort Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Passwort
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-focus block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all bg-white"
                placeholder="Mindestens 6 Zeichen"
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <a
                onClick={() => history.push('/password-reset')}
                className="text-sm font-medium text-primary hover:text-secondary transition-colors cursor-pointer"
              >
                Passwort vergessen?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-hover w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-medium disabled:opacity-60"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>

            {/* Info Text */}
            <p className="text-xs text-center text-gray-500 mt-4">
              Neuer Account? Wird automatisch bei erster Anmeldung erstellt
            </p>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-gray-400 text-xs">
          &copy; 2025 NORA Dashboard
        </p>

      </div>
    </div>
  );
};

export default Login;
