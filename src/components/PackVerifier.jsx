/**
 * Pack Verifier Component
 *
 * Provides UI for verifying pack integrity:
 * - File drop zone for ZIP
 * - Verification button
 * - Results display with per-file checks, root match, overall status
 */

import React, { useState, useCallback } from 'react';
import {
  Shield, Upload, CheckCircle, XCircle, AlertTriangle,
  FileText, Hash, Loader2, Download
} from 'lucide-react';
import { verifyPackFromZip, generateVerifyReport } from '../utils/verify.js';

export default function PackVerifier({ onClose }) {
  const [file, setFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer?.files[0] || e.target?.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
    } else {
      setError('Please drop a .zip file');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVerify = async () => {
    if (!file) return;

    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const verifyResult = await verifyPackFromZip(arrayBuffer);
      setResult(verifyResult);
    } catch (err) {
      setError(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;

    const report = generateVerifyReport(result);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VERIFY_REPORT_${result.pack_id || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Pack Verification</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <FileText className="w-5 h-5" />
                <span>{file.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">Drop a research pack ZIP file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to select</p>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleDrop}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={!file || isVerifying}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              file && !isVerifying
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Verify Pack Integrity
              </>
            )}
          </button>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={`p-4 rounded-lg ${
                result.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {result.valid ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <span className={`text-lg font-semibold ${
                    result.valid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.valid ? 'Pack Verified' : 'Verification Failed'}
                  </span>
                </div>
                {result.pack_id && (
                  <p className="text-sm text-gray-600 mt-1">Pack ID: {result.pack_id}</p>
                )}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-800">{result.files_checked}</p>
                  <p className="text-sm text-gray-500">Files Checked</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{result.files_matched}</p>
                  <p className="text-sm text-gray-500">Files Matched</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${
                  result.root_match ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center justify-center">
                    {result.root_match ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Merkle Root</p>
                </div>
              </div>

              {/* Merkle Root Details */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Merkle Root</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Expected (ROOT.txt):</p>
                  <p className="text-xs font-mono bg-white p-1 rounded break-all">
                    {result.root_expected || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Computed:</p>
                  <p className="text-xs font-mono bg-white p-1 rounded break-all">
                    {result.root_computed || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-2">Errors:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700 mb-2">Warnings:</p>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {result.warnings.map((warn, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Toggle Details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showDetails ? 'Hide file details' : 'Show file details'}
              </button>

              {/* File Details */}
              {showDetails && (
                <div className="bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">File</th>
                        <th className="pb-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.file_checks.map((check, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1 font-mono truncate max-w-xs" title={check.path}>
                            {check.path}
                          </td>
                          <td className="py-1 text-center">
                            {check.match ? (
                              <CheckCircle className="w-4 h-4 text-green-500 inline" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Download Report */}
              <button
                onClick={downloadReport}
                className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Verification Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
