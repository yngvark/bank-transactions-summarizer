import { ChangeEvent, DragEvent, useState } from 'react';
import { RawTransaction } from '../../../shared/types';

interface FileUploadProps {
  currentFileName: string;
  onFileLoad: (transactions: RawTransaction[], fileName: string) => void;
}

function FileUpload({ currentFileName, onFileLoad }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);

      // Import xlsx dynamically
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const transactions = XLSX.utils.sheet_to_json<RawTransaction>(worksheet);

      onFileLoad(transactions, file.name);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  return (
    <div
      className={`file-upload-section ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="fileInput"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      <svg className="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <label htmlFor="fileInput" className="file-upload-label">
        <span>Upload Excel File</span>
      </label>
      <span className="drop-hint">or drop file here</span>
      <div className="current-file-display">
        <span className="file-icon">📄</span>
        <span className="file-name">{currentFileName}</span>
      </div>
      <p className="upload-helper-text">Supports .xlsx and .xls files</p>
    </div>
  );
}

export default FileUpload;
