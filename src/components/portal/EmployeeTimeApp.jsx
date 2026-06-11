import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

function FileIcon() {
  return (
    <svg className="emp-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="emp-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="emp-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function MonitorIcon({ large = false }) {
  return (
    <svg className={large ? "emp-icon-svg emp-icon-svg--monitor" : "emp-icon-svg"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  );
}

const parseDateToSafeLocal = (value) => {
  if (!value) return null;
  const cleanValue = String(value).trim().split(" ")[0];
  const parts = cleanValue.split("/");
  if (parts.length !== 3) return null;

  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const year = Number.parseInt(parts[2], 10);

  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, 0, 0, 0);
};

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const initialMetrics = {
  original: 0,
  adjusted: 0,
  total: 0,
  employees: 0,
};

const EMPLOYEE_TIME_UI = {
  es: {
    locale: "es-AR",
    startLog: "Iniciando reconversion operativa",
    readError: "Error al leer el archivo.",
    emptyFile: "El archivo CSV esta vacio.",
    missingColumns: "Columnas Fecha Inicio/Fin no detectadas.",
    loadOk: "Base de datos cargada correctamente.",
    complete: "Expansion completada",
    unknownError: "Error desconocido durante el procesamiento.",
    exporting: "Exportando XLSX con formato dd/mm/yyyy...",
    exported: "Descarga finalizada correctamente.",
    stats: {
      original: "Registro leidos",
      adjusted: "Registros a ajustar",
      employees: "Empleados totales"
    },
    clientPrefix: "consultor.",
    stepperAria: "Estado del proceso",
    logsAria: "Logs de procesamiento",
    backToApps: "Volver a aplicaciones",
    title: "Subir Dataset de Empleados",
    subtitle: "Cargue y procese los registros de asistencia y ausencias de sus empleados",
    steps: {
      uploaded: "Subido",
      processing: "Procesando",
      ready: "Listo"
    },
    upload: {
      processing: "Procesando archivo...",
      loadedPrefix: "Archivo cargado:",
      empty: "Arrastra y suelta tu archivo aqui o haz clic para cargarlo",
      button: "Seleccionar archivo",
      processingButton: "Procesando..."
    },
    waiting: {
      active: "Monitoreo activo",
      idle: "Esperando dataset..."
    },
    systemReady: "Sistema operativo ready",
    logPanel: {
      title: "Terminal de monitoreo",
      download: "Descargar Excel"
    }
  },
  en: {
    locale: "en-US",
    startLog: "Starting operational conversion",
    readError: "Error reading the file.",
    emptyFile: "The CSV file is empty.",
    missingColumns: "Fecha Inicio/Fin columns were not found.",
    loadOk: "Database loaded successfully.",
    complete: "Expansion completed",
    unknownError: "Unknown processing error.",
    exporting: "Exporting XLSX with dd/mm/yyyy format...",
    exported: "Download completed successfully.",
    stats: {
      original: "Read records",
      adjusted: "Records to adjust",
      employees: "Total employees"
    },
    clientPrefix: "consultant.",
    stepperAria: "Process status",
    logsAria: "Processing logs",
    backToApps: "Back to applications",
    title: "Upload Employee Dataset",
    subtitle: "Upload and process attendance and absence records for your employees",
    steps: {
      uploaded: "Uploaded",
      processing: "Processing",
      ready: "Ready"
    },
    upload: {
      processing: "Processing file...",
      loadedPrefix: "Loaded file:",
      empty: "Drag and drop your file here or click to upload it",
      button: "Select file",
      processingButton: "Processing..."
    },
    waiting: {
      active: "Monitoring active",
      idle: "Waiting for dataset..."
    },
    systemReady: "Operating system ready",
    logPanel: {
      title: "Monitoring terminal",
      download: "Download Excel"
    }
  }
};

export default function EmployeeTimeApp({ userEmail = "", locale = "es" }) {
  const ui = EMPLOYEE_TIME_UI[locale] ?? EMPLOYEE_TIME_UI.es;
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const logEndRef = useRef(null);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString(ui.locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs]);

  const runProcess = async (selectedFile) => {
    setIsProcessing(true);
    setProcessedData(null);
    setLogs([]);
    setMetrics(initialMetrics);
    setProgress(10);
    addLog(`${ui.startLog}: ${selectedFile.name}`);

    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result ?? "");
        reader.onerror = () => reject(new Error(ui.readError));
        reader.readAsText(selectedFile, "UTF-8");
      });

      const lines = String(text).split(/\r?\n/);
      if (!lines.length || !lines[0]?.trim()) {
        throw new Error(ui.emptyFile);
      }

      const headers = lines[0]
        .split(",")
        .map((header) => header.replace(/^"|"$/g, "").trim());

      if (!headers.includes("Fecha Inicio") || !headers.includes("Fecha Fin")) {
        throw new Error(ui.missingColumns);
      }

      setProgress(40);
      addLog(ui.loadOk);

      const rows = [];
      for (let index = 1; index < lines.length; index += 1) {
        if (!lines[index].trim()) continue;

        const rowData = [];
        const matches = lines[index].matchAll(/(?:^|,)(?:"([^"]*)"|([^,]*))/g);
        for (const match of matches) {
          rowData.push(match[1] || match[2] || "");
        }

        const rowObject = {};
        headers.forEach((header, headerIndex) => {
          rowObject[header] = rowData[headerIndex];
        });
        rows.push(rowObject);
      }

      const expanded = [];
      let adjustedCount = 0;
      const employeeSet = new Set();

      rows.forEach((row) => {
        const start = parseDateToSafeLocal(row["Fecha Inicio"]);
        const end = parseDateToSafeLocal(row["Fecha Fin"]);

        if (row["ID de usuario"]) {
          employeeSet.add(row["ID de usuario"]);
        }

        if (!start || !end) {
          const cleanStart = row["Fecha Inicio"] ? String(row["Fecha Inicio"]).trim().split(" ")[0] : "";
          expanded.push({ ...row, "Fecha del Registro": cleanStart });
          return;
        }

        if (row["Fecha Inicio"] !== row["Fecha Fin"]) {
          adjustedCount += 1;
        }

        const current = new Date(start);
        while (current.getTime() <= end.getTime()) {
          expanded.push({ ...row, "Fecha del Registro": formatDate(current) });
          current.setDate(current.getDate() + 1);
          if (expanded.length > 500000) {
            break;
          }
        }
      });

      setProgress(90);
      setMetrics({
        original: rows.length,
        adjusted: adjustedCount,
        total: expanded.length,
        employees: employeeSet.size,
      });
      setProcessedData({ headers: [...headers, "Fecha del Registro"], data: expanded });
      addLog(`${ui.complete}: ${expanded.length} registros.`, "success");
      setProgress(100);
    } catch (error) {
      const message = error instanceof Error ? error.message : ui.unknownError;
      addLog(`ERROR: ${message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  };

  const handleSelectedFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    void runProcess(selectedFile);
  };

  const handleInputChange = (event) => {
    const selectedFile = event.target.files?.[0];
    handleSelectedFile(selectedFile);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const selectedFile = event.dataTransfer.files?.[0];
    handleSelectedFile(selectedFile);
  };

  const download = () => {
    if (!processedData) return;

    addLog(ui.exporting, "info");
    const dateColumnName = "Fecha del Registro";
    const dateColumnIndex = processedData.headers.indexOf(dateColumnName);
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const aoa = [
      processedData.headers,
      ...processedData.data.map((row) =>
        processedData.headers.map((header, index) => {
          const value = row[header];
          if (index === dateColumnIndex && value) {
            const date = parseDateToSafeLocal(value);
            if (date) {
              const utcTime = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
              return (utcTime - excelEpoch.getTime()) / (24 * 60 * 60 * 1000);
            }
          }
          return value == null ? "" : String(value);
        })
      ),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    if (dateColumnIndex !== -1 && worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
        const cellRef = XLSX.utils.encode_cell({ c: dateColumnIndex, r: row });
        if (worksheet[cellRef]) {
          worksheet[cellRef].t = "n";
          worksheet[cellRef].z = "dd/mm/yyyy";
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconversion_Technized");
    XLSX.writeFile(workbook, `REFACT_DIARIO_${Date.now()}.xlsx`);
    addLog(ui.exported, "success");
  };

  const currentStep = useMemo(() => {
    if (processedData) return 3;
    if (isProcessing || file) return 2;
    return 1;
  }, [file, isProcessing, processedData]);

  const stepState = (stepNumber) => {
    if (stepNumber < currentStep) return "active";
    if (stepNumber === currentStep) return currentStep === 3 ? "active" : "current";
    return "pending";
  };

  const stats = [
    { key: "original", label: ui.stats.original, value: metrics.original, icon: <FileIcon /> },
    { key: "adjusted", label: ui.stats.adjusted, value: metrics.adjusted, icon: <WarningIcon /> },
    { key: "employees", label: ui.stats.employees, value: metrics.employees, icon: <UserIcon /> },
  ];

  const uploadLabel = isProcessing
    ? ui.upload.processing
    : file
      ? `${ui.upload.loadedPrefix} ${file.name}`
      : ui.upload.empty;

  return (
    <main className="emp-page">
      <header className="emp-topbar">
        <a className="emp-brand-box" href="/consultant/tools" aria-label={ui.backToApps}>
          <div className="emp-crumb" aria-hidden="true">←</div>
          <div className="emp-brand-name">{ui.backToApps}</div>
        </a>

        <div className="emp-client-mail">
          {ui.clientPrefix}<b>{userEmail || "demo@technized.com"}</b>
        </div>
      </header>

      <section className="emp-hero">
        <h1>{ui.title}</h1>
        <p className="emp-subtitle">{ui.subtitle}</p>
      </section>

      <section className="emp-panel emp-stepper" aria-label={ui.stepperAria}>
        <div className={`emp-step ${stepState(1)}`}>
          <div className="emp-step-dot">1</div>
          <div className="emp-step-label">{ui.steps.uploaded}</div>
          <div className="emp-step-line"></div>
        </div>

        <div className={`emp-step ${stepState(2)}`}>
          <div className="emp-step-dot">2</div>
          <div className="emp-step-label">{ui.steps.processing}</div>
          <div className="emp-step-line"></div>
        </div>

        <div className={`emp-step ${stepState(3)}`}>
          <div className="emp-step-dot">3</div>
          <div className="emp-step-label">{ui.steps.ready}</div>
        </div>
      </section>

      <section className="emp-panel emp-upload-card">
        <div
          className={`emp-dropzone ${isDragging ? "is-dragging" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleInputChange} hidden />
          <div className="emp-upload-icon" aria-hidden="true"></div>
          <div className="emp-upload-text">{uploadLabel}</div>
          <button className="emp-btn" type="button" onClick={(event) => {
            event.stopPropagation();
            fileInputRef.current?.click();
          }} disabled={isProcessing}>
            {isProcessing ? ui.upload.processingButton : ui.upload.button}
            <span className="emp-arrow">›</span>
          </button>
        </div>
      </section>

      <section className="emp-stats">
        {stats.map((stat) => (
          <article className="emp-stat" key={stat.key}>
            <div className="emp-stat-icon">{stat.icon}</div>
            <div>
              <span className="emp-stat-value">{stat.value}</span>
              <span className="emp-stat-label">{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="emp-panel emp-bottom">
        <div className="emp-waiting-card">
        <div className="emp-monitor-icon"><MonitorIcon large /></div>
          <div className="emp-waiting-text">{logs.length ? ui.waiting.active : ui.waiting.idle}</div>
        </div>

        <div className="emp-system-area">
          <div className="emp-system-title">{ui.systemReady}</div>
          <div className="emp-system-badge">{ui.systemReady}</div>
        </div>
      </section>

      {logs.length > 0 && (
        <section className="emp-log-panel" aria-label={ui.logsAria}>
          <div className="emp-log-head">
            <span>{ui.logPanel.title}</span>
            <span>{progress}%</span>
          </div>
          <div className="emp-log-body">
            {logs.map((log, index) => (
              <div className={`emp-log-row emp-log-row--${log.type}`} key={`${log.timestamp}-${index}`}>
                <span className="emp-log-time">[{log.timestamp}]</span>
                <span>{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef}></div>
          </div>
          {processedData && (
            <div className="emp-log-actions">
              <button className="emp-btn emp-btn--secondary" type="button" onClick={download}>
                {ui.logPanel.download}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
