import { ChangeEvent, DragEvent, useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { RawTransaction } from '../../../shared/types';

interface FileUploadProps {
  currentFileName: string;
  onFileLoad: (transactions: RawTransaction[], fileName: string) => void;
}

function FileUpload({ currentFileName, onFileLoad }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.xlsx$/i)) {
      return;
    }

    const sheets = await readXlsxFile(file);
    const rows = sheets[0].data;
    const headers = rows[0] as (string | null)[];
    const transactions = rows.slice(1).map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        if (header !== null) {
          obj[header] = row[i];
        }
      });
      return obj as unknown as RawTransaction;
    });

    onFileLoad(transactions, file.name);
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
        accept=".xlsx"
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
      <p className="upload-helper-text">Supports .xlsx files</p>
    </div>
  );
}

export default FileUpload;
