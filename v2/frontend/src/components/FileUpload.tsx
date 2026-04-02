import { ChangeEvent, DragEvent, useState } from 'react';
import { RawTransaction } from '../../../shared/types';

interface FileUploadProps {
  currentFileName: string;
  onFileLoad: (transactions: RawTransaction[], fileName: string) => void;
}

function worksheetToJson<T>(worksheet: import('@protobi/exceljs').Worksheet): T[] {
  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value);
  });

  const results: T[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber]) {
        obj[headers[colNumber]] = cell.value;
      }
    });
    results.push(obj as T);
  });
  return results;
}

function FileUpload({ currentFileName, onFileLoad }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.xlsx$/i)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const ExcelJS = await import('@protobi/exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(e.target?.result as ArrayBuffer);
      const worksheet = workbook.worksheets[0];
      const transactions = worksheetToJson<RawTransaction>(worksheet);
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
