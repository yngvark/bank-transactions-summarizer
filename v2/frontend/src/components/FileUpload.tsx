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
      <label htmlFor="fileInput" className="file-upload-label">
        <span>Upload Excel File</span>
      </label>
      <span className="drop-hint">or drop file here</span>
      <div className="current-file-display">
        <span className="file-icon">📄</span>
        <span className="file-name">{currentFileName}</span>
      </div>
    </div>
  );
}

export default FileUpload;
