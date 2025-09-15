'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import apiClient from '@/lib/axiosInstance';

// TypeScript interfaces for patient data
interface PatientTelecom {
  system: string;
  value: string;
  use?: string;
  rank?: string;
}

interface PatientAddress {
  use?: string;
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface PatientData {
  id: string;
  resourceType: string;
  raw: any; // Raw FHIR data for editing
  formatted: {
    identifier: string;
    name: {
      family: string;
      given: string[];
      full: string;
    };
    gender: string;
    birthDate: string;
    active: boolean;
    deceased: boolean;
    maritalStatus: string;
    lastUpdated: string;
    telecom: PatientTelecom[];
    address: PatientAddress[];
    ethnicity: string;
  };
}

interface PatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  mode: 'view' | 'edit';
  onPatientUpdated?: (updatedPatient: PatientData) => void;
}

export default function PatientsModal({
  isOpen,
  onClose,
  patientId,
  mode: initialMode,
  onPatientUpdated,
}: PatientsModalProps) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState({
    telecom: [] as PatientTelecom[],
    name: { family: '', given: [''] },
    gender: '',
    birthDate: '',
    active: true,
    maritalStatus: '',
  });

  // Fetch patient data when modal opens
  useEffect(() => {
    if (isOpen && patientId) {
      fetchPatientData();
    }
  }, [isOpen, patientId]);

  // Reset mode when modal opens
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  const fetchPatientData = async () => {
    if (!patientId) return;

    setLoading(true);
    try {
      // Use fetch to call internal Next.js API route
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient data');
      }

      const data: PatientData = await response.json();
      setPatient(data);
      
      // Initialize form data with current patient data
      setFormData({
        telecom: data.formatted.telecom || [],
        name: {
          family: data.formatted.name.family,
          given: data.formatted.name.given,
        },
        gender: data.formatted.gender,
        birthDate: data.formatted.birthDate,
        active: data.formatted.active,
        maritalStatus: data.formatted.maritalStatus,
      });
    } catch (error: unknown) {
      console.error('Error fetching patient:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load patient: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!patient) return;

    setSaving(true);
    try {
      // Create updated FHIR resource based on form data
      const updatedPatient = {
        ...patient.raw,
        telecom: formData.telecom,
        name: [
          {
            family: formData.name.family,
            given: formData.name.given,
          },
        ],
        gender: formData.gender,
        birthDate: formData.birthDate,
        active: formData.active,
        maritalStatus: {
          ...patient.raw.maritalStatus,
          text: formData.maritalStatus,
        },
      };

      // Use fetch to call internal Next.js API route
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPatient),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }

      const result = await response.json();
      toast.success('Patient updated successfully!');
      
      // Update local state with the new data
      setPatient(result.patient);
      setMode('view');
      
      // Notify parent component of the update
      if (onPatientUpdated) {
        onPatientUpdated(result.patient);
      }
    } catch (error: unknown) {
      console.error('Error updating patient:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update patient: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (patient) {
      // Reset form data to original values
      setFormData({
        telecom: patient.formatted.telecom || [],
        name: {
          family: patient.formatted.name.family,
          given: patient.formatted.name.given,
        },
        gender: patient.formatted.gender,
        birthDate: patient.formatted.birthDate,
        active: patient.formatted.active,
        maritalStatus: patient.formatted.maritalStatus,
      });
    }
    setMode('view');
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'Unknown') return dateString;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male':
        return '♂️';
      case 'female':
        return '♀️';
      default:
        return '👤';
    }
  };

  const addTelecomEntry = () => {
    setFormData(prev => ({
      ...prev,
      telecom: [...prev.telecom, { system: 'phone', value: '', use: 'home' }],
    }));
  };

  const removeTelecomEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      telecom: prev.telecom.filter((_, i) => i !== index),
    }));
  };

  const updateTelecomEntry = (index: number, field: keyof PatientTelecom, value: string) => {
    setFormData(prev => ({
      ...prev,
      telecom: prev.telecom.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addGivenName = () => {
    setFormData(prev => ({
      ...prev,
      name: {
        ...prev.name,
        given: [...prev.name.given, ''],
      },
    }));
  };

  const removeGivenName = (index: number) => {
    setFormData(prev => ({
      ...prev,
      name: {
        ...prev.name,
        given: prev.name.given.filter((_, i) => i !== index),
      },
    }));
  };

  const updateGivenName = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      name: {
        ...prev.name,
        given: prev.name.given.map((name, i) => (i === index ? value : name)),
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-100 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {mode === 'edit' ? 'Edit Patient' : 'Patient Details'}
              </h2>
              <p className="text-blue-100 mt-1">
                {patient ? `ID: ${patient.formatted.identifier}` : 'Loading...'}
              </p>
            </div>
            <div className="flex gap-2">
              {mode === 'view' && patient && (
                <Button
                  onClick={() => setMode('edit')}
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  Edit Patient
                </Button>
              )}
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-blue-600">Loading patient data...</p>
              </div>
            </div>
          ) : patient ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-blue-50/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Family Name
                    </label>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={formData.name.family}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          name: { ...prev.name, family: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-blue-600"
                      />
                    ) : (
                      <p className="text-blue-900 font-medium">{patient.formatted.name.family}</p>
                    )}
                  </div>

                  {/* Given Names */}
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Given Names
                    </label>
                    {mode === 'edit' ? (
                      <div className="space-y-2">
                        {formData.name.given.map((name, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => updateGivenName(index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-blue-600"
                              placeholder={`Given name ${index + 1}`}
                            />
                            {formData.name.given.length > 1 && (
                              <Button
                                onClick={() => removeGivenName(index)}
                                variant="outline"
                                size="sm"
                                className="px-2 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          onClick={addGivenName}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          + Add Given Name
                        </Button>
                      </div>
                    ) : (
                      <p className="text-blue-900 font-medium">
                        {patient.formatted.name.given.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Gender
                    </label>
                    {mode === 'edit' ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-blue-600"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    ) : (
                      <p className="text-blue-900 font-medium flex items-center">
                        <span className="mr-2">{getGenderIcon(patient.formatted.gender)}</span>
                        {patient.formatted.gender}
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Birth Date
                    </label>
                    {mode === 'edit' ? (
                      <input
                        type="date"
                        value={formData.birthDate !== 'Unknown' ? formData.birthDate : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-blue-600"
                      />
                    ) : (
                      <p className="text-blue-900 font-medium">{formatDate(patient.formatted.birthDate)}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Status
                    </label>
                    {mode === 'edit' ? (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                            className="mr-2 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          Active
                        </label>
                      </div>
                    ) : (
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        patient.formatted.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {patient.formatted.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Marital Status
                    </label>
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={formData.maritalStatus}
                        onChange={(e) => setFormData(prev => ({ ...prev, maritalStatus: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-blue-600"
                        placeholder="Enter marital status"
                      />
                    ) : (
                      <p className="text-blue-900 font-medium">{patient.formatted.maritalStatus}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-green-50/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <span className="mr-2">📞</span>
                  Contact Information
                </h3>
                {mode === 'edit' ? (
                  <div className="space-y-4">
                    {formData.telecom.map((contact, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <select
                            value={contact.system}
                            onChange={(e) => updateTelecomEntry(index, 'system', e.target.value)}
                            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-blue-600"
                          >
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="fax">Fax</option>
                          </select>
                          <input
                            type="text"
                            value={contact.value}
                            onChange={(e) => updateTelecomEntry(index, 'value', e.target.value)}
                            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-blue-600"
                            placeholder="Contact value"
                          />
                          <select
                            value={contact.use || ''}
                            onChange={(e) => updateTelecomEntry(index, 'use', e.target.value)}
                            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-blue-600"
                          >
                            <option value="">Select use</option>
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="mobile">Mobile</option>
                          </select>
                          <input
                            type="text"
                            value={contact.rank || ''}
                            onChange={(e) => updateTelecomEntry(index, 'rank', e.target.value)}
                            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-blue-600"
                            placeholder="Rank"
                          />
                        </div>
                        <Button
                          onClick={() => removeTelecomEntry(index)}
                          variant="outline"
                          size="sm"
                          className="px-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={addTelecomEntry}
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      + Add Contact
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patient.formatted.telecom.length > 0 ? (
                      patient.formatted.telecom.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-200">
                          <div>
                            <span className="font-medium text-green-900 capitalize">{contact.system}</span>
                            {contact.use && (
                              <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                                {contact.use}
                              </span>
                            )}
                          </div>
                          <div className="text-green-800 font-medium">{contact.value}</div>
                          {contact.rank && (
                            <div className="text-sm text-green-600">Rank: {contact.rank}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-green-600 italic">No contact information available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="bg-purple-50/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                  <span className="mr-2">📋</span>
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Patient ID
                    </label>
                    <p className="text-purple-900 font-medium">{patient.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Identifier
                    </label>
                    <p className="text-purple-900 font-medium">{patient.formatted.identifier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Ethnicity
                    </label>
                    <p className="text-purple-900 font-medium">{patient.formatted.ethnicity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Last Updated
                    </label>
                    <p className="text-purple-900 font-medium">{formatDate(patient.formatted.lastUpdated)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      Deceased
                    </label>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      patient.formatted.deceased 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {patient.formatted.deceased ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Failed to load patient data</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {patient && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            {mode === 'edit' ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
