import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';

const PasswordResetConfirm: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const history = useHistory();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (password !== confirmPassword) {
      setMessage('Die Passwörter stimmen nicht überein');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Passwort muss mindestens 6 Zeichen lang sein');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch('/v1/reset-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: uuid,
          new_password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Success! Show message and redirect
        setMessage(data.message || 'Passwort erfolgreich geändert! Du wirst weitergeleitet...');
        setMessageType('success');

        // Redirect to dashboard with auth hash
        if (data.redirect_url) {
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 800);
        } else {
          // Fallback: redirect to login
          setTimeout(() => {
            history.push('/login');
          }, 1500);
        }
      } else {
        setMessage(data.detail || 'Fehler beim Zurücksetzen des Passworts');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Netzwerkfehler. Bitte versuche es erneut');
      setMessageType('error');
    }
  };

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '450px',
        width: '100%'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <img
            src="https://cdn.nora-nak.de/img/logo.png"
            alt="NORA"
            style={{
              height: '40px',
              display: 'block',
              margin: '0 auto 32px'
            }}
          />
          <h1 style={{
            color: '#003a79',
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            Passwort zurücksetzen
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Bitte gib dein neues Passwort ein
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            backgroundColor: messageType === 'success' ? '#d1fae5' : '#fee2e2',
            color: messageType === 'success' ? '#065f46' : '#991b1b',
            border: messageType === 'success' ? '1px solid #6ee7b7' : '1px solid #fca5a5'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px'
              }}
            >
              Neues Passwort
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#3cd2ff';
                e.target.style.boxShadow = '0 0 0 3px rgba(60, 210, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '6px'
            }}>
              Mindestens 6 Zeichen
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: 'block',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px'
              }}
            >
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#3cd2ff';
                e.target.style.boxShadow = '0 0 0 3px rgba(60, 210, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #3cd2ff 0%, #003a79 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Passwort zurücksetzen
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;
