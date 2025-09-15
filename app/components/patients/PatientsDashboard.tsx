'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import DataTable, { TableColumn } from 'react-data-table-component';
import Button from '../ui/Button';
import PatientsModal from './PatientsModal';

interface Patient {
  id: string;
  fullUrl: string;
  identifier: string;
  name: {
    family: string;
    given: string[];
    full: string;
  };
  gender: string;
  birthDate: string;
  active: boolean;
  maritalStatus: string;
  lastUpdated: string;
}

interface PatientData {
  total: number;
  patients: Patient[];
  links: {
    self?: string;
    next?: string;
    prev?: string;
  };
  pagination: {
    currentPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function PatientsDashboard() {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  // Custom styles for react-data-table-component
  const customStyles = {
    header: {
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px 16px 0 0',
        border: '1px solid rgb(191, 219, 254)',
        borderBottom: 'none',
        minHeight: '60px',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e3a8a',
      },
    },
    headRow: {
      style: {
        backgroundColor: '#2563eb',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '600',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        borderRadius: '0',
      },
    },
    headCells: {
      style: {
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: '600',
        paddingLeft: '24px',
        paddingRight: '24px',
      },
    },
    rows: {
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        '&:nth-of-type(odd)': {
          backgroundColor: 'rgba(239, 246, 255, 0.3)',
        },
        '&:hover': {
          backgroundColor: 'rgba(239, 246, 255, 0.5)',
          transition: 'background-color 0.2s ease',
        },
        fontSize: '14px',
        color: '#1e3a8a',
        minHeight: '60px',
      },
    },
    cells: {
      style: {
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingTop: '12px',
        paddingBottom: '12px',
      },
    },
    pagination: {
      style: {
        backgroundColor: 'rgba(239, 246, 255, 0.5)',
        borderTop: '1px solid rgb(191, 219, 254)',
        borderRadius: '0 0 16px 16px',
        color: '#2563eb',
        fontSize: '14px',
      },
      pageButtonsStyle: {
        borderRadius: '8px',
        height: '36px',
        width: '36px',
        padding: '8px',
        margin: '2px',
        color: '#2563eb',
        fill: '#2563eb',
        backgroundColor: 'transparent',
        '&:disabled': {
          cursor: 'unset',
          color: '#9ca3af',
          fill: '#9ca3af',
        },
        '&:hover:not(:disabled)': {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          fill: '#ffffff',
        },
        '&:focus': {
          outline: 'none',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          fill: '#ffffff',
        },
      },
    },
  };

  const fetchPatients = async (page: number = 1) => {
    try {
      setLoadingPage(true);
      const response = await fetch(`/api/patients?page=${page}&count=20`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patients');
      }

      const data = await response.json();
      setPatientData(data);
      setCurrentPage(page);
    }catch (error: unknown) {
      console.error('Error fetching patients:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load patients: ${message}`);
    } finally {
      setLoading(false);
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleNextPage = () => {
    if (patientData?.pagination.hasNext) {
      fetchPatients(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (patientData?.pagination.hasPrev) {
      fetchPatients(currentPage - 1);
    }
  };

  const handleRefresh = () => {
    fetchPatients(currentPage);
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

  // Modal handlers
  const openModal = (patientId: string, mode: 'view' | 'edit' = 'view') => {
    setSelectedPatientId(patientId);
    setModalMode(mode);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPatientId(null);
    setModalMode('view');
  };

  const handlePatientUpdated = () => {
    // Refresh the patient list when a patient is updated
    fetchPatients(currentPage);
    toast.success('Patient list refreshed with updated data');
  };

  // Define columns for react-data-table-component
  const columns: TableColumn<Patient>[] = useMemo(() => [
    {
      name: 'ID',
      selector: (row) => row.identifier,
      sortable: true,
      width: '140px',
      cell: (row) => (
        <div>
          <div className="text-sm font-medium text-blue-900">{row.identifier}</div>
          <div className="text-xs text-blue-600">ID: {row.id}</div>
        </div>
      ),
    },
    {
      name: 'Patient Name',
      selector: (row) => row.name.full,
      sortable: true,
      width: '200px',
      cell: (row) => (
        <div>
          <div className="text-sm font-medium text-blue-900">{row.name.full}</div>
          <div className="text-xs text-blue-600">
            {row.name.given.join(', ')} {row.name.family}
          </div>
        </div>
      ),
    },
    {
      name: 'Gender',
      selector: (row) => row.gender,
      sortable: true,
      width: '160px',
      cell: (row) => (
        <div className="flex items-center">
          <span className="mr-2">{getGenderIcon(row.gender)}</span>
          <span className="text-sm text-blue-900 capitalize">{row.gender}</span>
        </div>
      ),
    },
    {
      name: 'Birth Date',
      selector: (row) => row.birthDate,
      sortable: true,
      width: '190px',
      cell: (row) => (
        <span className="text-sm text-blue-900">{formatDate(row.birthDate)}</span>
      ),
    },
    {
      name: 'Status',
      selector: (row) => row.active,
      sortable: true,
      width: '130px',
      cell: (row) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      name: 'Marital Status',
      selector: (row) => row.maritalStatus,
      sortable: true,
      width: '200px',
      cell: (row) => (
        <span className="text-sm text-blue-900">{row.maritalStatus}</span>
      ),
    },
    {
      name: 'Last Updated',
      selector: (row) => row.lastUpdated,
      sortable: true,
      width: '200px',
      cell: (row) => (
        <span className="text-sm text-blue-900">{formatDate(row.lastUpdated)}</span>
      ),
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            onClick={() => openModal(row.id, 'view')}
            variant="outline"
            size="sm"
            className="px-2 py-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            View
          </Button>
          <Button
            onClick={() => openModal(row.id, 'edit')}
            variant="outline"
            size="sm"
            className="px-2 py-1 text-xs text-green-600 border-green-200 hover:bg-green-50"
          >
            Edit
          </Button>
        </div>
      ),
      ignoreRowClick: true,
      allowoverflow: true,
      button: "true",
      width: '120px',
    },
  ], []);

  // Filter patients based on search text
  const filteredPatients = useMemo(() => {
    if (!patientData?.patients) return [];
    
    if (!searchText) return patientData.patients;
    
    return patientData.patients.filter(patient =>
      patient.name.full.toLowerCase().includes(searchText.toLowerCase()) ||
      patient.identifier.toLowerCase().includes(searchText.toLowerCase()) ||
      patient.gender.toLowerCase().includes(searchText.toLowerCase()) ||
      patient.maritalStatus.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [patientData?.patients, searchText]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 text-lg">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 mb-2">Patients Dashboard</h1>
              <p className="text-blue-600/80">
                Total Patients: {patientData?.total || 0} | 
                Page {currentPage} | 
                Showing {filteredPatients.length} of {patientData?.patients.length || 0} patients
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 pl-10 text-blue-900 bg-blue-50/50 border border-blue-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <Button 
                onClick={handleRefresh} 
                loading={loadingPage}
                variant="primary"
                className="rounded-lg whitespace-nowrap"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Patients Data Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredPatients}
            pagination
            paginationPerPage={20}
            paginationRowsPerPageOptions={[10, 20, 50, 100]}
            progressPending={loading || loadingPage}
            progressComponent={
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-blue-600">Loading patients...</p>
                </div>
              </div>
            }
            noDataComponent={
              <div className="p-12 text-center">
                <div className="text-blue-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">
                  {searchText ? 'No Matching Patients Found' : 'No Patients Found'}
                </h3>
                <p className="text-blue-600/80">
                  {searchText 
                    ? `No patients match "${searchText}". Try adjusting your search terms.`
                    : 'There are no patients available at the moment.'
                  }
                </p>
                {searchText && (
                  <Button
                    onClick={() => setSearchText('')}
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-lg"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            }
            customStyles={customStyles}
            highlightOnHover
            pointerOnHover
            responsive
            striped
            dense={false}
            title="Patient Records"
            subHeader={false}
            onRowClicked={(row) => openModal(row.id, 'view')}
          />
        </div>

        {/* Server-side Pagination Controls */}
        {patientData && (patientData.pagination.hasNext || patientData.pagination.hasPrev) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-600">
                Server Page {currentPage} | Total: {patientData.total} patients
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handlePrevPage}
                  disabled={!patientData.pagination.hasPrev || loadingPage}
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                >
                  ← Previous Page
                </Button>
                <Button
                  onClick={handleNextPage}
                  disabled={!patientData.pagination.hasNext || loadingPage}
                  variant="primary"
                  size="sm"
                  className="rounded-lg"
                  loading={loadingPage}
                >
                  Next Page →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Patient Modal */}
      <PatientsModal
        isOpen={modalOpen}
        onClose={closeModal}
        patientId={selectedPatientId}
        mode={modalMode}
        onPatientUpdated={handlePatientUpdated}
      />
    </div>
  );
}
