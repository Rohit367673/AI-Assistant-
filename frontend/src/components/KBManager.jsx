import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import API from '../utils/api';

export default function KBManager() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await API.get('/kb/documents');
      if (response.data.success) {
        setDocuments(response.data.documents);
      }
    } catch (err) {
      console.error('Fetch docs error:', err);
      setError('Failed to fetch knowledge base documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await API.post('/kb/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setSuccessMsg(response.data.message);
        fetchDocuments();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
      // Reset input element value
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This will remove all associated index chunks.`)) return;

    try {
      const response = await API.delete(`/kb/documents/${encodeURIComponent(fileName)}`);
      if (response.data.success) {
        setSuccessMsg(`Document "${fileName}" deleted.`);
        fetchDocuments();
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gradient">Knowledge Base Management</h3>
        <p className="text-sm text-gray-400">
          Upload PDF, DOCX, or text files containing FAQ, treatment guidelines, consultation fees, and doctor profiles. The AI assistant will reference these documents to answer queries.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Upload Box Area */}
      <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-indigo-500/40 hover:bg-white/2 transition-all relative">
        <input 
          type="file" 
          accept=".pdf,.docx,.txt"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
            {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>
          <div>
            <span className="font-semibold text-white">Click or drag files here to upload</span>
            <p className="text-xs text-gray-500 mt-1">Supports PDF, DOCX, or TXT (Max 5MB)</p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Uploaded Documents</h4>
        {loading ? (
          <div className="flex justify-center py-6 text-gray-500 text-sm gap-2 items-center"><Loader2 className="w-4 h-4 animate-spin"/> Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-400 text-sm">
            No documents uploaded yet. Upload clinic rules to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 rounded-lg bg-indigo-500/15 text-indigo-400 flex-shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-sm font-semibold text-white truncate" title={doc.fileName}>{doc.fileName}</h5>
                    <p className="text-xs text-gray-400 mt-0.5">{doc.chunkCount} search index chunks</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDoc(doc.fileName)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex-shrink-0"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
