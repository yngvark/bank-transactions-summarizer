interface LoadedFilePillProps {
  fileName: string;
  count: number;
}

function LoadedFilePill({ fileName, count }: LoadedFilePillProps) {
  return (
    <div className="loaded-file-pill" data-testid="loaded-file-pill">
      <span aria-hidden>📄</span>
      <span className="loaded-file-pill-name">{fileName}</span>
      <span className="loaded-file-pill-count">· {count.toLocaleString()} tx</span>
    </div>
  );
}

export default LoadedFilePill;
