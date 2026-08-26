import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  Users,
  UserPlus,
  Table,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/config';
import { createClient } from '../api/patientsAPI';

/**
 * BulkImportModal
 *
 * A simple bulk-import flow for Clients and Caregivers.
 * - Accepts CSV files only (simple parsing, no external deps)
 * - Provides downloadable sample templates
 * - Shows a preview table before importing
 * - Imports row-by-row using existing API endpoints:
 *     Clients    → createClient()  (patientsAPI.js → /api/data/clients)
 *     Caregivers → POST /auth/create-staff
 * - Reports per-row success/failure
 *
 * CSV parsing policy (intentionally simple):
 *   1. Split by newlines (handles \r\n and \n)
 *   2. Split fields by comma
 *   3. Strip surrounding double-quotes from fields
 *   4. First row = headers (matched case-insensitively)
 *   5. Empty rows are skipped
 *   6. Extra columns are ignored; missing columns default to ''
 */

// ---- Field definitions ----

const CLIENT_FIELDS = [
  { key: 'name',          label: 'Full Name',           required: true,  sample: 'John Doe' },
  { key: 'phone',         label: 'Phone',               required: true,  sample: '+2348012345678' },
  { key: 'email',         label: 'Email',               required: false, sample: 'john@example.com' },
  { key: 'dateOfBirth',   label: 'Date of Birth',       required: false, sample: '1980-01-15' },
  { key: 'gender',        label: 'Gender',              required: false, sample: 'male' },
  { key: 'address',       label: 'Address',             required: false, sample: '123 Main St' },
  { key: 'city',          label: 'City',                required: false, sample: 'Lagos' },
  { key: 'emergencyContactName',  label: 'Emergency Contact Name',  required: false, sample: 'Jane Doe' },
  { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', required: false, sample: '+2348098765432' },
  { key: 'careLevel',     label: 'Care Level',          required: false, sample: 'basic' },
  { key: 'bloodType',     label: 'Blood Type',          required: false, sample: 'O+' },
  { key: 'notes',         label: 'Notes',               required: false, sample: '' },
];

const CAREGIVER_FIELDS = [
  { key: 'firstName',     label: 'First Name',          required: true,  sample: 'John' },
  { key: 'lastName',      label: 'Last Name',           required: false, sample: 'Doe' },
  { key: 'email',         label: 'Email',               required: true,  sample: 'john@example.com' },
  { key: 'phone',         label: 'Phone',               required: true,  sample: '+2348012345678' },
  { key: 'password',      label: 'Password',            required: true,  sample: 'password123' },
  { key: 'role',          label: 'Role',                required: false, sample: 'caregiver' },
  { key: 'department',    label: 'Department',          required: false, sample: 'Healthcare' },
];

// ---- CSV helpers (simple, no external deps) ----

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => {
    // Simple split: respect double-quoted fields containing commas
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'; i++; // escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || '').trim();
    });
    return obj;
  });

  return { headers, rows };
}

function buildSampleCSV(fields) {
  const headerLine = fields.map((f) => f.label).join(',');
  const sampleLine = fields.map((f) => f.sample).join(',');
  return `${headerLine}\n${sampleLine}\n`;
}

function downloadFile(filename, content, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Map CSV row (by header label) to the field keys expected by the API
function mapRow(row, fields) {
  const mapped = {};
  fields.forEach((f) => {
    // Try exact match, then case-insensitive match
    let val = row[f.label];
    if (val === undefined) {
      const key = Object.keys(row).find(
        (k) => k.toLowerCase() === f.label.toLowerCase()
      );
      val = key ? row[key] : '';
    }
    mapped[f.key] = (val || '').trim();
  });
  return mapped;
}

function validateRow(mapped, fields) {
  const errors = [];
  fields.forEach((f) => {
    if (f.required && !mapped[f.key]) {
      errors.push(`${f.label} is required`);
    }
  });
  if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    errors.push('Invalid email format');
  }
  return errors;
}

// ---- Component ----

const BulkImportModal = ({ isOpen, onClose, type, institutionId, onImportComplete }) => {
  const [step, setStep] = useState('upload'); // upload → preview → importing → done
  const [parsedRows, setParsedRows] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fields = type === 'caregiver' ? CAREGIVER_FIELDS : CLIENT_FIELDS;
  const typeName = type === 'caregiver' ? 'Caregiver' : 'Client';
  const sampleFilename = type === 'caregiver' ? 'caregivers_sample.csv' : 'clients_sample.csv';

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file. Download the sample template for the correct format.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { headers, rows } = parseCSV(ev.target.result);
        if (rows.length === 0) {
          setError('CSV file is empty or has no data rows.');
          return;
        }
        // Map and validate
        const mapped = rows.map((row) => {
          const m = mapRow(row, fields);
          const errs = validateRow(m, fields);
          return { data: m, errors: errs };
        });
        setParsedRows(mapped);
        setStep('preview');
      } catch (err) {
        setError(`Failed to parse CSV: ${err.message}`);
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  }, [fields]);

  const handleDownloadSample = () => {
    downloadFile(sampleFilename, buildSampleCSV(fields));
  };

  const handleImport = async () => {
    setStep('importing');
    const importResults = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (row.errors.length > 0) {
        importResults.push({ row: i + 1, status: 'skipped', message: row.errors.join('; ') });
        continue;
      }
      try {
        if (type === 'caregiver') {
          // Use /auth/create-staff endpoint
          const response = await api.post('/auth/create-staff', {
            email: row.data.email,
            password: row.data.password,
            first_name: row.data.firstName,
            last_name: row.data.lastName || '',
            phone: row.data.phone,
            user_type: row.data.role || 'caregiver',
            institution_id: institutionId,
            department: row.data.department || 'Healthcare',
          });
          importResults.push({ row: i + 1, status: 'success', message: `Created: ${row.data.email}` });
        } else {
          // Use createClient from patientsAPI
          const clientData = {
            ...row.data,
            name: row.data.name,
            phone: row.data.phone,
            institutionId,
            status: 'active',
          };
          await createClient(clientData, { id: 'bulk-import' });
          importResults.push({ row: i + 1, status: 'success', message: `Created: ${row.data.name}` });
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Unknown error';
        importResults.push({ row: i + 1, status: 'error', message: msg });
      }
    }

    setResults(importResults);
    setStep('done');
    if (onImportComplete) onImportComplete();
  };

  const reset = () => {
    setStep('upload');
    setParsedRows([]);
    setResults([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] my-4 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            {type === 'caregiver' ? (
            <Users className="h-6 w-6 text-white" />
            ) : (
            <UserPlus className="h-6 w-6 text-white" />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">Bulk Import {typeName}s</h2>
              <p className="text-blue-100 text-sm">Upload a CSV file to add multiple {typeName.toLowerCase()}s at once</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Download sample */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 text-sm">Step 1: Download Sample Template</h3>
                    <p className="text-blue-700 text-sm mt-1">
                      Download the CSV template to see the required columns and format. Fill it in with your {typeName.toLowerCase()} data.
                    </p>
                    <button
                      onClick={handleDownloadSample}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Download className="h-4 w-4" />
                      Download {typeName} Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 text-sm">Step 2: Upload Your CSV File</h3>
                <p className="text-gray-500 text-sm mt-1 mb-4">Click to browse or drag a CSV file here</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  <FileText className="h-5 w-5" />
                  Choose CSV File
                </button>
                {error && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>

              {/* Field reference */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  CSV Column Reference
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Column Name</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Required?</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f) => (
                        <tr key={f.key} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">{f.label}</td>
                          <td className="py-2 px-3">
                            {f.required ? (
                              <span className="text-red-600 font-medium">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-500 font-mono text-xs">{f.sample}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Preview: {parsedRows.length} {typeName.toLowerCase()}s to import
                </h3>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">
                  Choose different file
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">#</th>
                      {fields.map((f) => (
                        <th key={f.key} className="text-left py-2 px-3 font-medium text-gray-700 whitespace-nowrap">
                          {f.label}
                        </th>
                      ))}
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                        {fields.map((f) => (
                          <td key={f.key} className="py-2 px-3 text-gray-900 whitespace-nowrap max-w-[200px] truncate">
                            {row.data[f.key] || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="py-2 px-3">
                          {row.errors.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                              <AlertCircle className="h-3 w-3" />
                              {row.errors.length} error(s)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation errors detail */}
              {parsedRows.some((r) => r.errors.length > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 text-sm mb-2">Rows with errors (will be skipped):</h4>
                  <ul className="space-y-1 text-sm text-yellow-800">
                    {parsedRows
                      .map((r, i) => ({ ...r, index: i + 1 }))
                      .filter((r) => r.errors.length > 0)
                      .map((r) => (
                        <li key={r.index}>
                          Row {r.index}: {r.errors.join(', ')}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500">
                  {parsedRows.filter((r) => r.errors.length === 0).length} valid rows will be imported.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    Import {parsedRows.filter((r) => r.errors.length === 0).length} {typeName}s
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <h3 className="font-semibold text-gray-900">Importing {typeName}s...</h3>
              <p className="text-gray-500 text-sm mt-1">Please wait while we process each row.</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Import Complete</h3>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{successCount}</div>
                    <div className="text-sm text-gray-500">Success</div>
                  </div>
                  {errorCount > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                      <div className="text-sm text-gray-500">Errors</div>
                    </div>
                  )}
                  {skippedCount > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{skippedCount}</div>
                      <div className="text-sm text-gray-500">Skipped</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Row</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-2 px-3 text-gray-400">{r.row}</td>
                        <td className="py-2 px-3">
                          {r.status === 'success' && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" /> Success
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-3 w-3" /> Error
                            </span>
                          )}
                          {r.status === 'skipped' && (
                            <span className="inline-flex items-center gap-1 text-yellow-600">
                              <AlertCircle className="h-3 w-3" /> Skipped
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
