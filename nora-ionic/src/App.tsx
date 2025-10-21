import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* Tailwind CSS + Custom Styles ONLY - No Ionic CSS */
import './index.css';

/* Pages */
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stundenplan from './pages/Stundenplan';
import Raumplan from './pages/Raumplan';
import PasswordReset from './pages/PasswordReset';
import PasswordResetConfirm from './pages/PasswordResetConfirm';
import EmailVerification from './pages/EmailVerification';

setupIonicReact();

const App: React.FC = () => {
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public Routes */}
          <Route exact path="/login" component={Login} />
          <Route exact path="/password-reset" component={PasswordReset} />
          <Route exact path="/reset-confirm/:uuid" component={PasswordResetConfirm} />
          <Route exact path="/verify" component={EmailVerification} />

          {/* Protected Routes */}
          <Route exact path="/dashboard">
            {isAuthenticated() ? <Dashboard /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/stundenplan">
            {isAuthenticated() ? <Stundenplan /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/raumplan">
            {isAuthenticated() ? <Raumplan /> : <Redirect to="/login" />}
          </Route>

          {/* Default Route */}
          <Route exact path="/">
            <Redirect to={isAuthenticated() ? "/dashboard" : "/login"} />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
