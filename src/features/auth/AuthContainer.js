import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import './AuthForm.scss';

const AuthContainer = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="auth-container">
      <div className="auth-container__content">
        <div className="auth-container__header">
          <h1>ChatApp</h1>
          <p>Connect with friends instantly</p>
        </div>

        {isLogin ? <LoginForm /> : <RegisterForm />}

        <div className="auth-container__toggle">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button onClick={toggleMode}>Sign up</button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={toggleMode}>Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;