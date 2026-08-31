import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  User,
  Search,
  Eye,
  DollarSign,
  Pill,
  FlaskConical,
  Stethoscope,
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'backend/database';
import { db } from '../backend/config';
import { toast } from 'react-toastify';

const MedicalDocuments = () => {
  const { user, userProfile } = useUser();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const toDate = (v) => {
    if (!v) return null;
    if (v?.toDate) return v.toDate();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (date) => {
    const d = toDate(date);
    if (!d) return '—';
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    loadAllDocuments();
  }, [userProfile]);

  const loadAllDocuments = async () => {
    const patientId = userProfile?.id || userProfile?.uid || user?.uid;
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch prescriptions, invoices, and diagnostics (lab tests) in parallel
      const [prescriptions, invoices, labTests] = await Promise.all([
        fetchPrescriptions(patientId),
        fetchInvoices(patientId),
        fetchLabTests(patientId),
      ]);

      // Normalize into a unified document list
      const allDocs = [
        ...prescriptions.map(p => ({
          id: p.id,
          type: 'prescription',
          title: p.medicationName || p.medication_name || 'Prescription',
          subtitle: `${p.dosage || ''} ${p.frequency ? '• ' + p.frequency : ''}`.trim(),
          doctorName: p.doctorName || p.doctor_name || 'Doctor',
          date: p.createdAt || p.created_at || p.startDate || p.start_date,
          status: p.status || 'active',
          details: p.instructions || p.notes || '',
          source: p.source || null,
        })),
        ...invoices.map(inv => ({
          id: inv.id,
          type: 'invoice',
          title: `Invoice ${inv.invoiceNumber || inv.invoice_number || ''}`.trim(),
          subtitle: inv.description || 'Medical service',
          doctorName: 'Billing Department',
          date: inv.issueDate || inv.issue_date || inv.createdAt || inv.created_at,
          status: inv.status || 'pending',
          amount: inv.totalAmount || inv.total_amount || inv.amount || 0,
          currency: inv.currency || 'NGN',
          details: '',
        })),
        ...labTests.map(lt => ({
          id: lt.id,
          type: 'lab_test',
          title: lt.testName || lt.test_name || 'Lab Test',
          subtitle: lt.testType || lt.test_type || 'Laboratory',
          doctorName: lt.orderedBy || lt.ordered_by || 'Doctor',
          date: lt.orderedDate || lt.ordered_date || lt.createdAt || lt.created_at,
          status: lt.status || 'pending',
          results: lt.results || null,
          details: lt.notes || '',
        })),
      ];

      // Sort by date descending
      allDocs.sort((a, b) => {
        const ad = toDate(a.date);
        const bd = toDate(b.date);
        const av = ad ? ad.getTime() : 0;
        const bv = bd ? bd.getTime() : 0;
        return bv - av;
      });

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading medical documents:', error);
      toast.error('Failed to load medical documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async (patientId) => {
    try {
      const q = query(
        collection(db, 'prescriptions'),
        where('clientId', '==', patientId)
      );
      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          startDate: data.startDate?.toDate?.() || data.startDate,
        });
      });
      return results;
    } catch (e) {
      console.warn('Failed to fetch prescriptions:', e);
      return [];
    }
  };

  const fetchInvoices = async (patientId) => {
    try {
      const q = query(
        collection(db, 'invoices'),
        where('clientId', '==', patientId)
      );
      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          ...data,
          issueDate: data.issueDate?.toDate?.() || data.issueDate,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        });
      });
      return results;
    } catch (e) {
      console.warn('Failed to fetch invoices:', e);
      return [];
    }
  };

  const fetchLabTests = async (patientId) => {
    try {
      const q = query(
        collection(db, 'diagnostics'),
        where('clientId', '==', patientId)
      );
      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          ...data,
          orderedDate: data.orderedDate?.toDate?.() || data.orderedDate,
          completedAt: data.completedAt?.toDate?.() || data.completedAt,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        });
      });
      return results;
    } catch (e) {
      console.warn('Failed to fetch lab tests:', e);
      return [];
    }
  };

  // Stats
  const stats = useMemo(() => {
    const prescriptions = documents.filter(d => d.type === 'prescription');
    const invoices = documents.filter(d => d.type === 'invoice');
    const labTests = documents.filter(d => d.type === 'lab_test');
    const now = new Date();
    const thisMonth = documents.filter(d => {
      const dt = toDate(d.date);
      return dt && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;
    return { total: documents.length, prescriptions: prescriptions.length, invoices: invoices.length, labTests: labTests.length, thisMonth };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchTerm ||
        (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.doctorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (filterType === 'prescriptions') matchesFilter = doc.type === 'prescription';
      else if (filterType === 'invoices') matchesFilter = doc.type === 'invoice';
      else if (filterType === 'lab_tests') matchesFilter = doc.type === 'lab_test';
      else if (filterType === 'recent') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dt = toDate(doc.date);
        matchesFilter = dt && dt > thirtyDaysAgo;
      }

      return matchesSearch && matchesFilter;
    });
  }, [documents, searchTerm, filterType]);

  const getDocIcon = (type) => {
    switch (type) {
      case 'prescription': return Pill;
      case 'invoice': return DollarSign;
      case 'lab_test': return FlaskConical;
      default: return FileText;
    }
  };

  const getDocIconColor = (type) => {
    switch (type) {
      case 'prescription': return { bg: 'bg-green-100', text: 'text-green-600' };
      case 'invoice': return { bg: 'bg-yellow-100', text: 'text-yellow-600' };
      case 'lab_test': return { bg: 'bg-purple-100', text: 'text-purple-600' };
      default: return { bg: 'bg-blue-100', text: 'text-blue-600' };
    }
  };

  const getDocTypeLabel = (type) => {
    switch (type) {
      case 'prescription': return 'Prescription';
      case 'invoice': return 'Invoice';
      case 'lab_test': return 'Lab Test';
      default: return 'Document';
    }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (['active', 'paid', 'completed', 'done'].includes(s)) return 'text-green-600';
    if (['pending', 'scheduled', 'processing'].includes(s)) return 'text-yellow-600';
    if (['cancelled', 'overdue', 'rejected'].includes(s)) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatCurrency = (amount, currency) => {
    if (!amount && amount !== 0) return '—';
    const sym = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : '';
    return `${sym}${Number(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medical Documents</h1>
        <p className="text-gray-600">Your prescriptions, invoices, and lab test results</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total</p>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Pill className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Prescriptions</p>
              <p className="text-xl font-semibold text-gray-900">{stats.prescriptions}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Invoices</p>
              <p className="text-xl font-semibold text-gray-900">{stats.invoices}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FlaskConical className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Lab Tests</p>
              <p className="text-xl font-semibold text-gray-900">{stats.labTests}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">This Month</p>
              <p className="text-xl font-semibold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, doctor, or description..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Documents</option>
              <option value="prescriptions">Prescriptions</option>
              <option value="invoices">Invoices</option>
              <option value="lab_tests">Lab Tests</option>
              <option value="recent">Recent (30 days)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Documents</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all'
                ? 'No documents match your search criteria'
                : 'Your prescriptions, invoices, and lab tests will appear here'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => {
            const Icon = getDocIcon(doc.type);
            const colors = getDocIconColor(doc.type);
            return (
              <div key={`${doc.type}-${doc.id}`} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`h-12 w-12 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {getDocTypeLabel(doc.type)}
                        </span>
                        {doc.source === 'patient' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Self-reported
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{doc.subtitle}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {doc.doctorName}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(doc.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {/* Status / Amount */}
                    <div className="text-right">
                      {doc.type === 'invoice' ? (
                        <>
                          <p className="font-semibold text-gray-900">{formatCurrency(doc.amount, doc.currency)}</p>
                          <p className={`text-xs font-medium ${getStatusColor(doc.status)}`}>{doc.status}</p>
                        </>
                      ) : (
                        <p className={`text-xs font-medium ${getStatusColor(doc.status)}`}>{doc.status}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toast.info(`View ${getDocTypeLabel(doc.type)} — coming soon`)}
                        className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      {doc.type === 'invoice' && (
                        <button
                          onClick={() => toast.info('Invoice download — coming soon')}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(doc.details || doc.results) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {doc.details && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {doc.details}
                      </p>
                    )}
                    {doc.results && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Results:</span> {doc.results}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MedicalDocuments;
