'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from '../ui/Button';
import { Form, Input, FormContainer } from '../ui/Form';

export default function Login() {
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Login successful! Redirecting to dashboard...');
      } else {
        console.error('Login failed:', data);
        toast.error('An error occurred during login. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-blue-300/20 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-blue-100/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-blue-200/25 rounded-full blur-xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">EHR Dashboard</h1>
          <p className="text-blue-600/80 text-sm">Secure Healthcare Management System</p>
        </div>

        {/* Login form */}
        <FormContainer>
          <Form onSubmit={handleSubmit}>
            <Input
              id="username"
              name="username"
              type="text"
              label="Username"
              placeholder="Enter your username"
              defaultValue="fhir_pmOYS"
              required
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              defaultValue="NmrxdT7I34"
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full rounded-lg"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form>

          {/* Footer info */}
          <div className="mt-6 pt-6 border-t border-blue-100">
            <p className="text-xs text-blue-600/70 text-center">
              HIPAA Compliant • Secure Authentication • ModMed Integration
            </p>
          </div>
        </FormContainer>

        {/* Additional info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-blue-600/60">
            Having trouble? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}
