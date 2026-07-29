"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
};

export function FileDropzone({ accept, file, onFile, disabled = false }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function choose(files: FileList | null) {
    const nextFile = files?.[0];
    if (nextFile) onFile(nextFile);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => choose(event.target.files)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files);
        }}
        className={cn(
          "group relative flex min-h-48 w-full flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none",
          dragging
            ? "border-accent bg-blue-50"
            : file
              ? "border-accent/50 bg-blue-50/60"
              : "border-line-strong bg-section/40 hover:border-ink-3 hover:bg-section",
          disabled && "cursor-wait opacity-60"
        )}
      >
        <span
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-white transition-colors",
            dragging || file ? "border-accent/25 text-accent" : "border-line text-ink-3 group-hover:text-ink"
          )}
        >
          {file ? <FileSpreadsheet className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
        </span>
        {file ? (
          <>
            <span className="max-w-full truncate text-sm font-medium text-ink">{file.name}</span>
            <span className="mt-1 text-xs text-ink-3">
              {(file.size / 1024).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kB · Klicka för att byta
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-ink">
              {dragging ? "Släpp filen här" : "Dra in din portföljfil"}
            </span>
            <span className="mt-1 text-xs text-ink-3">eller klicka för att välja · CSV, XLS eller XLSX</span>
          </>
        )}
      </button>
      {file && (
        <button
          type="button"
          onClick={() => {
            onFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-neg"
        >
          <X className="h-3.5 w-3.5" />
          Ta bort fil
        </button>
      )}
    </div>
  );
}
