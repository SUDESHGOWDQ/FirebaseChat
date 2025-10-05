import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/UI';
import { useNotification } from '../../contexts';
import { isValidEmail } from '../../utils/helpers';
import { FaGoogle } from 'react-icons/fa';
import './AuthForm.scss';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      showError('Please enter your display name');
      return false;
    }

    if (!isValidEmail(formData.email)) {
      showError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      await updateProfile(userCredential.user, {
        displayName: formData.displayName
      });

      showSuccess('Account created successfully!');
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
      showSuccess('Account created successfully!');
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
        <Card.Title>Create Account</Card.Title>
        <Card.Subtitle>Join our chat community</Card.Subtitle>
      </Card.Header>

      <Card.Body>
        <form onSubmit={handleSubmit} className="auth-form__form">
          <Input
            name="displayName"
            label="Display Name"
            value={formData.displayName}
            onChange={handleChange}
            placeholder="Enter your display name"
            required
          />

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

          <Input.Password
            name="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            required
          />

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="auth-form__submit"
          >
            Create Account
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

export default RegisterForm;