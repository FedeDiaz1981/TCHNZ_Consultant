import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

function ArrowLeftIcon() {
  return (
    <svg className="rec-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5"></path>
      <path d="m12 19-7-7 7-7"></path>
    </svg>
  );
}

function DnaIcon() {
  return (
    <svg className="rec-icon-svg rec-icon-svg--hero" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 15c6.667 0 13.333-6 20-6"></path>
      <path d="M9 22c6-6 6-12 0-20"></path>
      <path d="M15 22c-6-6-6-12 0-20"></path>
      <path d="M2 9c6.667 0 13.333 6 20 6"></path>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="rec-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 1.7l-.12.81a2 2 0 0 1-1.51 1.65l-.79.2a2 2 0 0 1-1.94-.5l-.6-.6a2 2 0 0 0-2.83 0l-.31.31a2 2 0 0 0 0 2.83l.6.6a2 2 0 0 1 .5 1.94l-.2.79a2 2 0 0 1-1.65 1.51l-.81.12a2 2 0 0 0-1.7 2v.44a2 2 0 0 0 1.7 2l.81.12a2 2 0 0 1 1.65 1.51l.2.79a2 2 0 0 1-.5 1.94l-.6.6a2 2 0 0 0 0 2.83l.31.31a2 2 0 0 0 2.83 0l.6-.6a2 2 0 0 1 1.94-.5l.79.2a2 2 0 0 1 1.51 1.65l.12.81a2 2 0 0 0 2 1.7h.44a2 2 0 0 0 2-1.7l.12-.81a2 2 0 0 1 1.51-1.65l.79-.2a2 2 0 0 1 1.94.5l.6.6a2 2 0 0 0 2.83 0l.31-.31a2 2 0 0 0 0-2.83l-.6-.6a2 2 0 0 1-.5-1.94l.2-.79a2 2 0 0 1 1.65-1.51l.81-.12a2 2 0 0 0 1.7-2v-.44a2 2 0 0 0-1.7-2l-.81-.12a2 2 0 0 1-1.65-1.51l-.2-.79a2 2 0 0 1 .5-1.94l.6-.6a2 2 0 0 0 0-2.83l-.31-.31a2 2 0 0 0-2.83 0l-.6.6a2 2 0 0 1-1.94.5l-.79-.2a2 2 0 0 1-1.51-1.65l-.12-.81a2 2 0 0 0-2-1.7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="rec-icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z"></path>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="rec-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2v6h-6"></path>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
      <path d="M3 22v-6h6"></path>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="rec-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="rec-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    </svg>
  );
}

const initialMetrics = {
  inputRows: 0,
  employees: 0,
  merged: 0,
  total: 0,
  complete: 0,
  incomplete: 0,
};

const RECONVERSION_UI = {
  es: {
    startRead: "Iniciando lectura del archivo",
    emptyFile: "El archivo esta vacio.",
    readComplete: "Lectura del archivo completada.",
    grouped: "Se agruparon",
    processDone: "Proceso completado con",
    unknownError: "Error desconocido durante el procesamiento.",
    reportDone: "Reporte exportado correctamente.",
    statusWaiting: "Esperando archivo",
    statusLoaded: "Archivo cargado",
    statusProcessing: "Procesando",
    statusReady: "Listo para descargar",
    statusError: "Error de proceso",
    metrics: {
      inputRows: "Filas input",
      employees: "Empleados",
      merged: "Fix noche",
      total: "Total final",
      complete: "Correctos",
      incomplete: "Incorrectos",
    },
    backToApps: "Volver a aplicaciones",
    kicker: "Control horario",
    title: "Reconversion Fichadas",
    subtitle:
      "Procese archivos de fichadas, unifique jornadas y genere un reporte final listo para auditoria operativa.",
    controlPanel: "Panel de control",
    processButton: "Procesar",
    processingButton: "Procesando...",
    manual: "Manual de usuario",
    logTitle: "Bitacora del proceso",
    logEmpty: "Esperando acciones del operador...",
    metricsKicker: "Metricas de validacion",
    metricsTitle: "Resumen operativo",
    footerPrimary: "Procesamiento local seguro",
    footerSecondary: "Estructura V13 - 3 hojas",
    ready: "Sistema operativo ready",
    download: "Descargar reporte",
    infoNightMerge: "INFO: Fusion turno noche aplicada",
    missingArrival: "Falta Llegada",
    missingDeparture: "Falta Salida",
    errorPrefix: "ERROR",
  },
  en: {
    startRead: "Starting file read",
    emptyFile: "The file is empty.",
    readComplete: "File read completed.",
    grouped: "Grouped",
    processDone: "Process completed with",
    unknownError: "Unknown processing error.",
    reportDone: "Report exported successfully.",
    statusWaiting: "Waiting for file",
    statusLoaded: "File loaded",
    statusProcessing: "Processing",
    statusReady: "Ready to download",
    statusError: "Process error",
    metrics: {
      inputRows: "Input rows",
      employees: "Employees",
      merged: "Night fix",
      total: "Final total",
      complete: "Correct",
      incomplete: "Incorrect",
    },
    backToApps: "Back to applications",
    kicker: "Time control",
    title: "Time Clock Conversion",
    subtitle:
      "Process time clock files, merge shifts and generate a final report ready for operational auditing.",
    controlPanel: "Control panel",
    processButton: "Process",
    processingButton: "Processing...",
    manual: "User manual",
    logTitle: "Process log",
    logEmpty: "Waiting for operator actions...",
    metricsKicker: "Validation metrics",
    metricsTitle: "Operational summary",
    footerPrimary: "Secure local processing",
    footerSecondary: "V13 structure - 3 sheets",
    ready: "Operating system ready",
    download: "Download report",
    infoNightMerge: "INFO: Night shift merge applied",
    missingArrival: "Missing check-in",
    missingDeparture: "Missing check-out",
    errorPrefix: "ERROR",
  },
};

const pad = (n) => String(n).padStart(2, "0");

const timestamp = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const nowStamp = () => {
  const d = new Date();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
};

const superClean = (v) => (v == null ? "" : String(v).toLowerCase().replace(/[^a-z0-9]/g, ""));

const normalizeText = (v) =>
  v == null
    ? ""
    : String(v)
        .replace(/^\uFEFF/, "")
        .replace(/[\u00A0\u202F\u2009]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const normalizeId = (v) => {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  const match = normalizeText(v).match(/^(\d+)/);
  return match ? match[1] : normalizeText(v);
};

const parseDateString = (value) => {
  if (!value) return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return { y: parsed.y, m: parsed.m, d: parsed.d };
  }
  const clean = normalizeText(value);
  const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) {
    return { y: Number(match[3]), m: Number(match[2]), d: Number(match[1]) };
  }
  return null;
};

const parseTimeSeconds = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const frac = value % 1;
    return Math.round(frac * 86400);
  }
  const clean = normalizeText(value).toLowerCase();
  const match = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  let hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = match[3] ? Number(match[3]) : 0;
  if (clean.includes("pm") && hh < 12) hh += 12;
  return hh * 3600 + mm * 60 + ss;
};

const dateKey = (parts) => `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
const dateScore = (parts) => parts.y * 10000 + parts.m * 100 + parts.d;

const isNextDay = (p1, p2) => {
  const t1 = Date.UTC(p1.y, p1.m - 1, p1.d);
  const t2 = Date.UTC(p2.y, p2.m - 1, p2.d);
  return Math.abs(t2 - t1 - 86400000) < 1000;
};

const classifyEvent = (raw) => {
  const key = superClean(raw);
  if (!key) return null;
  if (key.includes("inicio") || key.includes("entrada") || key.includes("llegada")) return "IN";
  if (key.includes("fin") || key.includes("salida") || key.includes("partida")) return "OUT";
  return null;
};

export default function ReconversionApp({ userEmail = "", locale = "es" }) {
  const ui = RECONVERSION_UI[locale] ?? RECONVERSION_UI.es;
  const fallbackEmail =
    locale === "en" ? "consultant.demo@technized.com" : "consultor.demo@technized.com";
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ kind: "neutral", text: ui.statusWaiting });
  const [processedData, setProcessedData] = useState(null);
  const [currentTime, setCurrentTime] = useState(timestamp());
  const fileInputRef = useRef(null);
  const logEndRef = useRef(null);

  const addLog = (message, type = "info") => {
    setLogs((prev) => [...prev, { time: timestamp(), message, type }]);
  };

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(timestamp()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs]);

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setStatus({ kind: "neutral", text: ui.statusLoaded });
    addLog(`${ui.statusLoaded}: ${selectedFile.name}`);
  };

  const resetApp = () => {
    setFile(null);
    setLogs([]);
    setIsProcessing(false);
    setMetrics(initialMetrics);
    setProgress(0);
    setProcessedData(null);
    setStatus({ kind: "neutral", text: ui.statusWaiting });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setLogs([]);
    setMetrics(initialMetrics);
    setProgress(10);
    setProcessedData(null);
    setStatus({ kind: "neutral", text: ui.statusProcessing });
    addLog(`${ui.startRead} ${file.name}`);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const inputSheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        header: 1,
        defval: "",
      });

      if (!inputSheet.length) {
        throw new Error(ui.emptyFile);
      }

      addLog(ui.readComplete);
      setProgress(35);

      const headersClean = inputSheet[0].map((header) => superClean(normalizeText(header)));
      const findCol = (keys) => {
        for (const key of keys) {
          const index = headersClean.findIndex((header) => header.includes(key));
          if (index >= 0) return index;
        }
        return -1;
      };

      let idxId = findCol(["idusuario", "legajo"]);
      if (idxId < 0) idxId = 0;
      let idxName = findCol(["nombre"]);
      if (idxName < 0) idxName = 2;
      let idxTipo = findCol(["tipodeevento", "evento"]);
      if (idxTipo < 0) idxTipo = 6;

      const FIXED_DATE_COL = 9;
      const FIXED_TIME_COL = 10;
      const rows = inputSheet.slice(1);
      const groups = new Map();
      const employees = new Set();
      const errLog = [["ID Usuario", "Fecha", "Detalle"]];

      rows.forEach((row) => {
        const type = classifyEvent(row[idxTipo]);
        if (!type) return;

        const id = normalizeId(row[idxId]);
        if (!id) return;

        const dateParts = parseDateString(row[FIXED_DATE_COL]);
        if (!dateParts) return;

        const secs = parseTimeSeconds(row[FIXED_TIME_COL]);
        if (secs == null) return;

        if (row[idxName]) {
          employees.add(row[idxName]);
        }

        const key = `${id}|${dateKey(dateParts)}`;
        if (!groups.has(key)) {
          groups.set(key, {
            id,
            dateParts,
            baseData: [0, 1, 2, 3, 4, 5, 6, 7].map((idx) => row[idx] || ""),
            inSec: null,
            outSec: null,
            merged: false,
          });
        }

        const group = groups.get(key);
        if (type === "IN") {
          if (group.inSec === null || secs < group.inSec) group.inSec = secs;
        } else if (group.outSec === null || secs > group.outSec) {
          group.outSec = secs;
        }
      });

      setProgress(60);
      addLog(`${ui.grouped} ${groups.size} jornadas operativas.`);

      let list = Array.from(groups.values()).sort((a, b) =>
        a.id !== b.id ? (a.id < b.id ? -1 : 1) : dateScore(a.dateParts) - dateScore(b.dateParts)
      );

      let mergedCount = 0;
      for (let index = 0; index < list.length - 1; index += 1) {
        const current = list[index];
        const next = list[index + 1];
        if (current.id !== next.id || !isNextDay(current.dateParts, next.dateParts)) continue;

        if (
          current.inSec != null &&
          current.outSec == null &&
          next.outSec != null &&
          next.inSec == null
        ) {
          const duration = 86400 - current.inSec + next.outSec;
          if (duration / 3600 > 20) continue;
          current.outSec = next.outSec;
          next.merged = true;
          mergedCount += 1;
          errLog.push([current.id, dateKey(current.dateParts), ui.infoNightMerge]);
        }
      }

      list = list.filter((group) => !group.merged);
      setProgress(82);

      const outputData = [[
        "ID Usuario",
        "Legajo",
        "Nombre",
        "Cargo",
        "Funcion",
        "Disciplina",
        "Reporta a",
        "Ubicacion",
        "Fecha",
        "Llegada",
        "Salida",
        "Inconsistencia",
      ]];

      let incompleteCount = 0;
      for (const group of list) {
        const errors = [];
        if (group.inSec == null) errors.push(ui.missingArrival);
        if (group.outSec == null) errors.push(ui.missingDeparture);

        if (errors.length > 0) {
          incompleteCount += 1;
          errLog.push([group.id, dateKey(group.dateParts), `${ui.errorPrefix}: ${errors.join(", ")}`]);
        }

        outputData.push([
          ...group.baseData,
          {
            v: new Date(Date.UTC(group.dateParts.y, group.dateParts.m - 1, group.dateParts.d, 12)),
            t: "d",
            z: "dd/mm/yyyy",
          },
          group.inSec == null ? "" : { v: group.inSec / 86400, t: "n", z: "hh:mm:ss" },
          group.outSec == null ? "" : { v: group.outSec / 86400, t: "n", z: "hh:mm:ss" },
          errors.join(", "),
        ]);
      }

      const nextMetrics = {
        inputRows: rows.length,
        employees: employees.size,
        merged: mergedCount,
        total: list.length,
        complete: list.length - incompleteCount,
        incomplete: incompleteCount,
      };

      setMetrics(nextMetrics);
      setProcessedData({
        sourceName: file.name,
        inputSheet,
        outputData,
        errLog,
      });

      setProgress(100);
      setStatus({ kind: "ok", text: ui.statusReady });
      addLog(`${ui.processDone} ${nextMetrics.total} registros finales.`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : ui.unknownError;
      setStatus({ kind: "bad", text: ui.statusError });
      addLog(`${ui.errorPrefix}: ${message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReport = () => {
    if (!processedData) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(processedData.outputData), "Refact");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(processedData.inputSheet), "Original");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(processedData.errLog), "Errors & Info");
    XLSX.writeFile(
      workbook,
      `Refact_V13_${processedData.sourceName.split(".")[0]}_${nowStamp()}.xlsx`
    );
    addLog(ui.reportDone, "success");
  };

  const statusClass = useMemo(() => {
    if (status.kind === "ok") return "ok";
    if (status.kind === "bad") return "bad";
    return "";
  }, [status.kind]);

  const canProcess = Boolean(file) && !isProcessing;

  const metricCards = [
    { key: "inputRows", label: ui.metrics.inputRows, value: metrics.inputRows },
    { key: "employees", label: ui.metrics.employees, value: metrics.employees },
    { key: "merged", label: ui.metrics.merged, value: metrics.merged },
    { key: "total", label: ui.metrics.total, value: metrics.total },
    { key: "complete", label: ui.metrics.complete, value: metrics.complete, tone: "success" },
    { key: "incomplete", label: ui.metrics.incomplete, value: metrics.incomplete, tone: "danger" },
  ];

  return (
    <main className="rec-page">
      <header className="rec-topbar">
        <a className="rec-back-button" href="/consultant/tools">
          <ArrowLeftIcon />
          <span>{ui.backToApps}</span>
        </a>

        <div className="rec-client-mail">{userEmail || fallbackEmail}</div>
      </header>

      <section className="rec-hero">
        <div className="rec-hero-copy">
          <div className="rec-hero-title-row">
            <DnaIcon />
            <div>
              <p className="rec-kicker">{ui.kicker}</p>
              <h1>{ui.title}</h1>
            </div>
          </div>
          <p className="rec-subtitle">{ui.subtitle}</p>
        </div>

        <div className="rec-status-pill">
          <span className={`dot ${statusClass}`}></span>
          <span>{status.text}</span>
        </div>
      </section>

      <section className="rec-grid">
        <div className="rec-column rec-column--left">
          <article className="rec-card rec-card--control">
            <div className="rec-card-head">
              <SettingsIcon />
              <h2>{ui.controlPanel}</h2>
            </div>

            <div className="rec-control-stack">
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xlsm,.xls,.csv"
                className="rec-file-input"
                onChange={(event) => {
                  handleFileSelection(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />

              <div className="rec-button-row">
                <button
                  id="run"
                  type="button"
                  className="rec-btn rec-btn--primary"
                  disabled={!canProcess}
                  onClick={() => {
                    void processFile();
                  }}
                >
                  <PlayIcon />
                  <span>{isProcessing ? ui.processingButton : ui.processButton}</span>
                </button>

                <button
                  id="reset"
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  onClick={resetApp}
                >
                  <RefreshIcon />
                </button>
              </div>

              <a href="/consultant/tools/manual-usuario" className="rec-btn rec-btn--manual">
                <BookIcon />
                <span>{ui.manual}</span>
              </a>
            </div>
          </article>

          <article className="rec-card rec-card--log">
            <div className="rec-card-head">
              <ClipboardIcon />
              <h2>{ui.logTitle}</h2>
            </div>

            <div className="rec-log-panel" id="log" aria-live="polite" role="status">
              {logs.length === 0 ? (
                <div className="rec-log-empty">{ui.logEmpty}</div>
              ) : (
                logs.map((entry, index) => (
                  <div className={`rec-log-row rec-log-row--${entry.type}`} key={`${entry.time}-${index}`}>
                    <span className="rec-log-time">[{entry.time}]</span>
                    <span>{entry.message}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef}></div>
            </div>
          </article>
        </div>

        <div className="rec-column rec-column--right">
          <article className="rec-card rec-card--metrics">
            <div className="rec-metrics-head">
              <div>
                <p className="rec-metrics-kicker">{ui.metricsKicker}</p>
                <h2>{ui.metricsTitle}</h2>
              </div>
              <div className="rec-time" id="time">
                {currentTime}
              </div>
            </div>

            <div className="rec-progress-track">
              <div id="barFill" className="rec-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="rec-metrics-grid">
              {metricCards.map((item) => (
                <div
                  className={`rec-metric-card${item.tone ? ` is-${item.tone}` : ""}`}
                  key={item.key}
                >
                  <span className="rec-metric-label">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rec-card rec-card--footer">
            <div className="rec-footer-copy">
              <span>{ui.footerPrimary}</span>
              <span className="rec-divider"></span>
              <span>{ui.footerSecondary}</span>
            </div>

            <div className="rec-footer-actions">
              <div className="rec-ready-pill">{ui.ready}</div>
              <button
                type="button"
                className="rec-btn rec-btn--download"
                onClick={downloadReport}
                disabled={!processedData}
              >
                {ui.download}
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
