interface PdfViewerProps {
  dataUrl: string;
}

export function PdfViewer({ dataUrl }: PdfViewerProps) {
  return (
    <div className="pdf-viewer">
      <iframe
        src={dataUrl}
        title="PDF Document"
        className="pdf-iframe"
      />
    </div>
  );
}
