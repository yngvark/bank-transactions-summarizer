import { ChangeEvent } from 'react';
import { RawTransaction } from '../../../shared/types';

interface FileUploadProps {
  currentFileName: string;
  onFileLoad: (transactions: RawTransaction[], fileName: string) => void;
}

function FileUpload({ currentFileName, onFileLoad }: FileUploadProps) {
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="file-upload-section">
      <input
        type="file"
        id="fileInput"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      <div className="current-file-display">
        <span className="file-icon">📁</span>
        <span className="file-name">{currentFileName}</span>
      </div>
    </div>
  );
}

export default FileUpload;
