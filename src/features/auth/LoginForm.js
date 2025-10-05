import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/UI';
import { useNotification } from '../../contexts';
import { isValidEmail } from '../../utils/helpers';
import { FaGoogle } from 'react-icons/fa';
import './AuthForm.scss';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValidEmail(formData.email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (!formData.password) {
      showError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      showSuccess('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showSuccess('Signed in successfully!');
      navigate('/dashboard');
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="auth-form">
      <Card.Header>
        <Card.Title>Welcome Back</Card.Title>
        <Card.Subtitle>Sign in to your account</Card.Subtitle>
      </Card.Header>

      <Card.Body>
        <form onSubmit={handleSubmit} className="auth-form__form">
          <Input.Email
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <Input.Password
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="auth-form__submit"
          >
            Sign In
          </Button>
        </form>

        <div className="auth-form__divider">
          <span>or</span>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          icon={<FaGoogle />}
          className="auth-form__google"
        >
          Continue with Google
        </Button>
      </Card.Body>
    </Card>
  );
};

export default LoginForm;