import { Project, OperatorRecord, Shift, Status, DayWork } from "../types";

// Configuration for connecting multiple Google Sheets
// The sheet must be "Anyone with link can view" 
// URL format: https://docs.google.com/spreadsheets/d/[SHEET_ID]/gviz/tq?tqx=out:csv

export const PROJECTS: Project[] = [
  {
    id: "bpn-kab-malang",
    name: "BPN Kabupaten Malang",
    location: "Jawa Timur",
    targetTotal: 150000,
    sheetIds: [
      "https://docs.google.com/spreadsheets/d/1uF4vxj5h2phnSWtyAnrBjcAkXjdeW1vX9ehgtxp44i8/edit?usp=sharing"
    ],
    salaryConfig: {
      priceBT: 1500,
      priceSU: 1000
    }
  }
];

export interface FetchResult {
  data: OperatorRecord[];
  statuses: { id: string; ok: boolean; message: string }[];
}

export function extractSheetIdAndGid(urlOrId: string): { id: string; gid: string | null; sheetName: string | null } {
  const idMatch = urlOrId.match(/\/d\/(.*?)(\/|$)/);
  const id = idMatch ? idMatch[1] : urlOrId;
  
  const gidMatch = urlOrId.match(/[?#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  const sheetMatch = urlOrId.match(/[?#&]sheet=([^&#]*)/);
  const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1]) : null;

  return { id, gid, sheetName };
}

export function normalizeDateString(dateStr: string): string {
  let cleaned = dateStr.trim();
  
  if (cleaned.includes(",")) {
    cleaned = cleaned.split(",")[1].trim();
  }
  
  cleaned = cleaned.toUpperCase();

  const parts = cleaned.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parts[2];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthStr = months[month - 1] || `${month}`;
    cleaned = `${day} ${monthStr} ${year}`;
  }

  // Normalize Indonesian Month Names
  cleaned = cleaned.replace(/\bJANUARI\b/g, "JANUARY");
  cleaned = cleaned.replace(/\bFEBRUARI\b/g, "FEBRUARY");
  cleaned = cleaned.replace(/\bMARET\b/g, "MARCH");
  cleaned = cleaned.replace(/\bMEI\b/g, "MAY");
  cleaned = cleaned.replace(/\bJUNI\b/g, "JUNE");
  cleaned = cleaned.replace(/\bJULI\b/g, "JULY");
  cleaned = cleaned.replace(/\bAGUSTUS\b/g, "AUGUST");
  cleaned = cleaned.replace(/\bOKTOBER\b/g, "OCTOBER");
  cleaned = cleaned.replace(/\bDESEMBER\b/g, "DECEMBER");

  // Format to standard 3-letter abbreviation to align keys
  cleaned = cleaned.replace(/\bJANUARY\b/g, "JAN");
  cleaned = cleaned.replace(/\bFEBRUARY\b/g, "FEB");
  cleaned = cleaned.replace(/\bMARCH\b/g, "MAR");
  cleaned = cleaned.replace(/\bAPRIL\b/g, "APR");
  cleaned = cleaned.replace(/\bMAY\b/g, "MAY");
  cleaned = cleaned.replace(/\bJUNE\b/g, "JUN");
  cleaned = cleaned.replace(/\bJULY\b/g, "JUL");
  cleaned = cleaned.replace(/\bAUGUST\b/g, "AUG");
  cleaned = cleaned.replace(/\bSEPTEMBER\b/g, "SEP");
  cleaned = cleaned.replace(/\bOCTOBER\b/g, "OCT");
  cleaned = cleaned.replace(/\bNOVEMBER\b/g, "NOV");
  cleaned = cleaned.replace(/\bDECEMBER\b/g, "DEC");

  return cleaned;
}

export async function discoverWorkbookTabs(sheetUrl: string): Promise<{ name: string; gid: string }[]> {
  try {
    const { id } = extractSheetIdAndGid(sheetUrl);
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${id}/edit`);
    if (!response.ok) return [];
    const html = await response.text();
    const tabs: { name: string; gid: string }[] = [];
    const jsonRegex = /\[\d+,0,\\?"(\d+)\\?",\[\{\\?"1\\?":\[\[0,0,\\?"([^\\"]+)\\?"/g;
    let match;
    while ((match = jsonRegex.exec(html)) !== null) {
      const [_, gid, name] = match;
      if (!tabs.some(t => t.gid === gid)) {
        tabs.push({ gid, name: decodeURIComponent(name) });
      }
    }
    return tabs;
  } catch (error) {
    console.error("Error discovering tabs:", error);
    return [];
  }
}

export async function fetchAllSheetsData(sheetIds: string[]): Promise<FetchResult> {
  if (!sheetIds || sheetIds.length === 0) return { data: [], statuses: [] };
  
  const fetchConfigs: { url: string; originalUrl: string; sheetName: string | null }[] = [];
  const statusMessages: { id: string; ok: boolean; message: string }[] = [];

  for (const url of sheetIds) {
    const { id, gid, sheetName } = extractSheetIdAndGid(url);
    
    if (!gid && !sheetName) {
      // General workbook: let's auto-discover all sheets/tabs!
      const tabs = await discoverWorkbookTabs(url);
      
      if (tabs.length > 0) {
        tabs.forEach(tab => {
          const upperName = tab.name.toUpperCase().trim();
          // Skip setup, setting, master or irrelevant layout sheets
          if (
            upperName === "SETTING" || 
            upperName === "SETTINGS" || 
            upperName === "MASTER OPERATOR" || 
            upperName === "MASTER OPERATORS" || 
            upperName === "MASTER" || 
            upperName === "DASHBOARD" || 
            upperName === "DASHBOARDS" || 
            upperName === "REKAP" || 
            upperName === "LAPORAN" || 
            upperName === "SUMMARY" || 
            upperName === "DATABASE" || 
            upperName.includes("TEMPL") || 
            upperName.includes("CHART") || 
            upperName.includes("GUIDE") || 
            upperName.includes("BANTUAN") || 
            upperName.includes("LOG") || 
            upperName.includes("PROVINSI") || 
            upperName.includes("JAWA TIMUR") || 
            upperName.includes("KANWIL")
          ) {
            return;
          }
          
          fetchConfigs.push({
            url: `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${tab.gid}`,
            originalUrl: url,
            sheetName: tab.name
          });
        });
      } else {
        // Fallback if discovery script was blocked or failed
        fetchConfigs.push({
          url: `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=ABSENSI`,
          originalUrl: url,
          sheetName: "ABSENSI"
        });
        fetchConfigs.push({
          url: `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`,
          originalUrl: url,
          sheetName: null
        });
      }
    } else {
      let fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
      if (sheetName) fetchUrl += `&sheet=${encodeURIComponent(sheetName)}`;
      else if (gid) fetchUrl += `&gid=${gid}`;
      
      fetchConfigs.push({ url: fetchUrl, originalUrl: url, sheetName: sheetName });
    }
  }

  // Deduplicate requests
  const seenUrls = new Set<string>();
  const uniqueConfigs = fetchConfigs.filter(config => {
    if (seenUrls.has(config.url)) return false;
    seenUrls.add(config.url);
    return true;
  });

  const results = await Promise.all(uniqueConfigs.map(async (config) => {
    try {
      const response = await fetch(config.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const csvData = await response.text();
      
      if (csvData.trim().startsWith('<!DOCTYPE html>') || csvData.toLowerCase().includes("<html")) {
        return { data: [], status: { id: config.sheetName || "Excel", ok: false, message: "Akses Ditolak/Private" } };
      }

      const operatorsFound = parseCSV(csvData);
      
      return {
        data: operatorsFound,
        status: { 
          id: config.sheetName || "Excel", 
          ok: true, 
          message: `Berhasil Sinkron! Terbaca ${operatorsFound.length} Personil.` 
        }
      };
    } catch (error) {
      return {
        data: [],
        status: { id: config.sheetName || "Excel", ok: false, message: error instanceof Error ? error.message : "Error" }
      };
    }
  }));

  const allData = results.flatMap(r => r.data);
  const allStatuses = results.map(r => r.status).filter(s => s.ok || results.length === 1);

  // Merge data gracefully, prioritizing detailed logs while keeping shift/status from recap
  const merged: Record<string, OperatorRecord> = {};
  
  allData.forEach(op => {
    const key = op.name.toUpperCase().trim();
    if (!merged[key]) {
      merged[key] = op;
    } else {
      const isNewDetail = op.id.startsWith("op-raw") || op.id.startsWith("op-log");
      const isExistingDetail = merged[key].id.startsWith("op-raw") || merged[key].id.startsWith("op-log");

      if (isNewDetail && !isExistingDetail) {
        // We have detail (current op) vs recap (existing merged)
        // Keep recap as base, but enrich with detail workData.
        // Since detail contains actual per-row verification logs, it is 100% accurate. 
        // Overwrite the recap's values for these days to prevent recap totals (such as calculated weighted indexes like 8.6) from corrupting actual counts.
        const recapOp = merged[key];
        const detailOp = op;
        
        detailOp.workData.forEach(detailDay => {
          const idx = recapOp.workData.findIndex(d => d.date === detailDay.date);
          if (idx === -1) {
            recapOp.workData.push(detailDay);
          } else {
            recapOp.workData[idx].bt = detailDay.bt;
            recapOp.workData[idx].su = detailDay.su;
            recapOp.workData[idx].isPresent = recapOp.workData[idx].isPresent || detailDay.isPresent;
          }
        });
        if (detailOp.shift !== Shift.NONE) recapOp.shift = detailOp.shift;
      } else if (!isNewDetail && isExistingDetail) {
        // We have recap (current op) vs detail (existing merged)
        // Keep detail as base, but merge recap workData into it.
        // Since detail has the precise per-row log counts, we must NOT let the recap totals override or corrupt them.
        const recapOp = op;
        const detailOp = merged[key];
        
        recapOp.workData.forEach(recapDay => {
          const idx = detailOp.workData.findIndex(d => d.date === recapDay.date);
          if (idx === -1) {
            detailOp.workData.push(recapDay);
          } else {
            // Do not override! Keep detail's actual counts.
          }
        });
        
        if (recapOp.shift !== Shift.NONE) detailOp.shift = recapOp.shift;
        if (recapOp.status !== Status.ACTIVE) detailOp.status = recapOp.status;
      } else {
        // Identical types merge
        const existingWork = merged[key].workData;
        op.workData.forEach(newDay => {
          const idx = existingWork.findIndex(d => d.date === newDay.date);
          if (idx === -1) {
            existingWork.push(newDay);
          } else {
            existingWork[idx].bt = Math.max(existingWork[idx].bt, newDay.bt);
            existingWork[idx].su = Math.max(existingWork[idx].su, newDay.su);
            existingWork[idx].isPresent = existingWork[idx].isPresent || newDay.isPresent;
          }
        });
      }
    }
  });

  return { data: Object.values(merged), statuses: allStatuses };
}

function parseCSV(csv: string): OperatorRecord[] {
  if (!csv || csv.trim() === "") return [];

  if (csv.toLowerCase().includes("<html") || csv.toLowerCase().includes("<!doctype")) {
    console.error("Diterima format HTML, bukan CSV. Periksa izin akses Sheet.");
    return [];
  }

  const delimiters = [",", ";", "\t"];
  let lines: string[][] = [];
  let bestScore = 0;

  for (const delim of delimiters) {
    const regex = new RegExp(`${delim === "\t" ? "\t" : delim}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
    const currentLines = csv.split(/\r?\n/).filter(l => l.trim() !== "").map(line => {
      return line.split(regex).map(cell => {
        let cleaned = cell.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.substring(1, cleaned.length - 1).trim();
        }
        return cleaned.replace(/""/g, '"');
      });
    });

    const sample = currentLines.slice(0, 20);
    const maxColsInSample = sample.length > 0 ? Math.max(...sample.map(r => r.length)) : 0;
    
    if (maxColsInSample > bestScore) {
      bestScore = maxColsInSample;
      lines = currentLines;
    }
  }

  if (lines.length === 0) return [];

  const firstFewLines = lines.slice(0, 20).map(r => r.join(' ')).join(' ').toUpperCase();
  
  if (firstFewLines.includes("LAPORAN OPERATOR") || firstFewLines.includes("LAPORAN VERIFIKASI")) {
    return parseActivityLogCSV(lines);
  }

  return parseRecapCSV(lines);
}

function isValidDate(str: string): boolean {
  if (!str) return false;
  const cleaned = str.trim().toLowerCase();
  if (
    cleaned === "" || 
    cleaned === "-" || 
    cleaned === "0" || 
    cleaned === "belum" || 
    cleaned.includes("belum") || 
    cleaned.includes("tidak") || 
    cleaned.includes("none")
  ) {
    return false;
  }
  return /[0-9]/.test(cleaned);
}

function parseActivityLogCSV(lines: string[][]): OperatorRecord[] {
  let operatorName = "UNKNOWN";
  
  for (const row of lines.slice(0, 10)) {
    const joined = row.join(' ');
    const upperJoined = joined.toUpperCase();
    const targetToken = "LAPORAN OPERATOR:";
    if (upperJoined.includes(targetToken)) {
      const idx = upperJoined.indexOf(targetToken);
      let afterToken = joined.substring(idx + targetToken.length).trim();
      const bpnIdx = afterToken.toUpperCase().indexOf("BPN");
      if (bpnIdx !== -1) {
        afterToken = afterToken.substring(0, bpnIdx).trim();
      }
      const commaIdx = afterToken.indexOf(",");
      if (commaIdx !== -1) {
        afterToken = afterToken.substring(0, commaIdx).trim();
      }
      const tabIdx = afterToken.indexOf("\t");
      if (tabIdx !== -1) {
        afterToken = afterToken.substring(0, tabIdx).trim();
      }
      operatorName = afterToken.split(/\s{2,}/)[0].trim();
      break;
    }
  }

  // Look for verified columns row-by-row (BT, SU) and dynamic Date columns (TANGGAL PENGERJAAN)
  let headerRowIndex = -1;
  let btIdx = -1;
  let suIdx = -1;
  let dateIdx = -1;
  let tanggalVerifBTIdx = -1;
  let tanggalVerifSUIdx = -1;

  // 1. Find the main sheet header row containing BT/SU status columns
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const row = lines[i].map(c => c.toUpperCase().trim());
    
    const bIndex = row.findIndex(c => c === "BT" || c === "STATUS BT" || c === "STATUS_BT" || c.endsWith(" STATUS BT") || c.startsWith("STATUS BT"));
    const sIndex = row.findIndex((c, idx) => 
      idx !== bIndex && 
      (c === "SU" || c === "STATUS SU" || c === "STATUS_SU" || c.startsWith("STATUS SU") || c.endsWith(" STATUS SU")) &&
      !c.includes("JENIS") && !c.includes("NO") && !c.includes("TAHUN")
    );

    if (bIndex !== -1 && sIndex !== -1) {
      headerRowIndex = i;
      btIdx = bIndex;
      suIdx = sIndex;
      break;
    }
  }

  // 2. Scan all header candidate rows (from row 0 to headerRowIndex + 2) to search for Verif dates & Work Date
  if (headerRowIndex !== -1) {
    for (let i = 0; i < Math.min(lines.length, headerRowIndex + 3); i++) {
      const row = lines[i].map(c => c.toUpperCase().trim());

      const tvbtIndex = row.findIndex(c => 
        c === "TANGGAL VERIFIKASI BT" || 
        c.includes("VERIFIKASI BT") || 
        c.includes("VERIF BT") || 
        (c.includes("TANGGAL") && c.includes("BT") && !c.includes("STATUS"))
      );
      if (tvbtIndex !== -1 && tanggalVerifBTIdx === -1) {
        tanggalVerifBTIdx = tvbtIndex;
      }

      const tvsuIndex = row.findIndex(c => 
        c === "TANGGAL VERIFIKASI SU" || 
        c.includes("VERIFIKASI SU") || 
        c.includes("VERIF SU") || 
        (c.includes("TANGGAL") && c.includes("SU") && !c.includes("STATUS"))
      );
      if (tvsuIndex !== -1 && tanggalVerifSUIdx === -1) {
        tanggalVerifSUIdx = tvsuIndex;
      }

      let dIndex = row.findIndex(c => c === "TANGGAL PENGERJAAN" || c.includes("PENGERJAAN"));
      if (dIndex === -1) {
        dIndex = row.findIndex(c => c === "TANGGAL" || c === "TANGGAL ");
      }
      if (dIndex === -1) {
        dIndex = row.findIndex(c => c.includes("TANGGAL") && !c.includes("UPDATE") && !c.includes("VERIFIKASI") && !c.includes("VERIF"));
      }
      if (dIndex !== -1 && dateIdx === -1) {
        dateIdx = dIndex;
      }
    }
  }

  if (headerRowIndex !== -1) {
    const dailyAggregation: Record<string, { bt: number; su: number }> = {};
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length === 0) continue;
      
      let isBT = btIdx !== -1 && (row[btIdx] || "").toLowerCase().includes("verifikasi");
      let isSU = suIdx !== -1 && (row[suIdx] || "").toLowerCase().includes("verifikasi");
      
      if (!isBT && !isSU) continue;

      let btDateStr = "";
      if (isBT) {
        if (tanggalVerifBTIdx !== -1) {
          const rawDate = (row[tanggalVerifBTIdx] || "").trim();
          if (isValidDate(rawDate)) {
            btDateStr = rawDate;
          } else {
            isBT = false;
          }
        }
      }

      let suDateStr = "";
      if (isSU) {
        if (tanggalVerifSUIdx !== -1) {
          const rawDate = (row[tanggalVerifSUIdx] || "").trim();
          if (isValidDate(rawDate)) {
            suDateStr = rawDate;
          } else {
            isSU = false;
          }
        }
      }

      if (!isBT && !isSU) continue;

      let fallbackDateStr = "UNKNOWN";
      if (dateIdx !== -1 && row[dateIdx] && (row[dateIdx] || "").trim() !== "") {
        fallbackDateStr = (row[dateIdx] || "").trim();
      } else {
        const dMatch = row.find(c => c && c.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/));
        if (dMatch) fallbackDateStr = dMatch.trim();
      }

      if (isBT) {
        const dStr = btDateStr || fallbackDateStr;
        const normalizedDate = normalizeDateString(dStr);
        if (!dailyAggregation[normalizedDate]) dailyAggregation[normalizedDate] = { bt: 0, su: 0 };
        dailyAggregation[normalizedDate].bt += 1;
      }

      if (isSU) {
        const dStr = suDateStr || fallbackDateStr;
        const normalizedDate = normalizeDateString(dStr);
        if (!dailyAggregation[normalizedDate]) dailyAggregation[normalizedDate] = { bt: 0, su: 0 };
        dailyAggregation[normalizedDate].su += 1;
      }
    }

    const workData: DayWork[] = Object.entries(dailyAggregation).map(([date, counts]) => ({
      date: date === "UNKNOWN" ? "Tanpa Tanggal" : date,
      bt: counts.bt,
      su: counts.su,
      isPresent: true
    }));

    if (workData.length > 0 && operatorName !== "UNKNOWN") {
      return [{
        id: `op-raw-${operatorName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: operatorName,
        jabatan: "OPERATOR",
        shift: Shift.NONE,
        status: Status.ACTIVE,
        workData,
        targetPerDay: 150
      }];
    }
  }

  // Backup fallback: Use summary table search if raw columns weren't matched
  let summaryHeaderIdx = -1;
  let summaryTanggalIdx = -1;
  let summaryTotalIdx = -1;
  
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const row = lines[i].map(c => c.toUpperCase().trim());
    const tIdx = row.indexOf("TANGGAL");
    const totalIdx = row.indexOf("TOTAL");
    
    if (tIdx !== -1 && totalIdx !== -1 && totalIdx > tIdx) {
      summaryHeaderIdx = i;
      summaryTanggalIdx = tIdx;
      summaryTotalIdx = totalIdx;
      break;
    }
  }

  if (summaryHeaderIdx !== -1) {
    const workData: DayWork[] = [];
    for (let i = summaryHeaderIdx + 1; i < lines.length; i++) {
      const row = lines[i];
      const dateStr = (row[summaryTanggalIdx] || "").trim();
      const totalStr = (row[summaryTotalIdx] || "").trim();
      
      if (!dateStr || dateStr === "" || dateStr === "0") continue;
      
      let count = 0;
      const isDateString = totalStr.includes("/") || totalStr.includes("-") || totalStr.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      if (totalStr && !isDateString) {
        count = parseFloat(totalStr.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
      }
      if (count === 0 && (row[summaryTanggalIdx+1] === "" || !row[summaryTanggalIdx+1])) continue;

      const normalizedDate = normalizeDateString(dateStr);

      workData.push({
        date: normalizedDate,
        bt: count, 
        su: count,
        isPresent: count > 0 || (totalStr !== "" && totalStr !== "0" && totalStr !== "-" && !isDateString)
      });
    }
    
    if (workData.length > 0 && operatorName !== "UNKNOWN") {
      return [{
        id: `op-log-${operatorName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: operatorName,
        jabatan: "OPERATOR",
        shift: Shift.NONE,
        status: Status.ACTIVE,
        workData,
        targetPerDay: 150
      }];
    }
  }

  return [];
}

function parseRecapCSV(lines: string[][]): OperatorRecord[] {
  // Check if this sheet is actually a land right database/master sheet instead of an operator attendance/recap sheet.
  // Land right master sheets contain very specific column names like KANTAH, TIPE HAK, NIB, etc.
  let isLandRightMaster = false;
  let landRightColCount = 0;
  const landRightKeywords = ["KANTAH", "KANWIL", "TIPE HAK", "PEMEGANG HAK", "NIB", "NOMOR HAK", "NOMOR SU/GD", "USER VERIFIKASI"];
  
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const row = (lines[i] || []).map(c => (c || "").trim().toUpperCase());
    for (const kw of landRightKeywords) {
      if (row.some(cell => cell === kw || cell.includes(kw))) {
        landRightColCount++;
      }
    }
    if (landRightColCount >= 2) {
      isLandRightMaster = true;
      break;
    }
  }

  if (isLandRightMaster) {
    console.log("[dataService] Skipping sheet because it is identified as a Land Right Master database (contains land keywords).");
    return [];
  }

  let headerRowIndex = -1;
  let opColIdx = -1;

  // Extract month/year from Row 1 or 2 titles
  let monthContext = "";
  let monthsFound: { month: string; year: string }[] = [];

  // Helper to generate full list of months chronologically between two months
  function getMonthsRange(startMonthStr: string, startYearStr: string, endMonthStr: string, endYearStr: string): { month: string; year: string }[] {
    const stdMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const mStart = stdMonths.indexOf(normalizeDateString(startMonthStr));
    const mEnd = stdMonths.indexOf(normalizeDateString(endMonthStr));
    const yStart = parseInt(startYearStr);
    const yEnd = parseInt(endYearStr);

    if (mStart === -1 || mEnd === -1 || isNaN(yStart) || isNaN(yEnd)) {
      return [];
    }

    const range: { month: string; year: string }[] = [];
    let currMonth = mStart;
    let currYear = yStart;

    while (currYear < yEnd || (currYear === yEnd && currMonth <= mEnd)) {
      range.push({
        month: stdMonths[currMonth],
        year: currYear.toString()
      });
      currMonth++;
      if (currMonth > 11) {
        currMonth = 0;
        currYear++;
      }
    }

    return range;
  }

  for (let i = 0; i < 3; i++) {
    const rowContent = (lines[i] || []).join(" ").toUpperCase();
    const mMatches = Array.from(rowContent.matchAll(/(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARY|FEBRUARY|MARCH|MAY|JUNE|JULY|AUGUST|OCTOBER|DECEMBER|JAN|FEB|MAR|APR|MAI|JUN|JUL|AGU|AUG|SEP|OKT|OCT|NOV|DES|DEC)\s+(\d{4})/gi));
    if (mMatches.length > 0) {
      if (mMatches.length >= 2) {
        const startM = mMatches[0][1];
        const startY = mMatches[0][2];
        const endM = mMatches[mMatches.length - 1][1];
        const endY = mMatches[mMatches.length - 1][2];
        const range = getMonthsRange(startM, startY, endM, endY);
        if (range.length > 0) {
          monthsFound = range;
        } else {
          monthsFound = mMatches.map(m => ({ month: normalizeDateString(m[1]), year: m[2] }));
        }
      } else {
        monthsFound = mMatches.map(m => ({ month: normalizeDateString(m[1]), year: m[2] }));
      }
      monthContext = mMatches[0][1] + " " + mMatches[0][2];
      break;
    }
  }

  // 1. Search for headers with high flexibility, prioritizing explicit name terms over generic operator roles
  for (let i = 0; i < Math.min(lines.length, 60); i++) {
    const row = lines[i].map(c => (c || "").trim().toUpperCase());
    
    // Priority A: Direct and explicit name columns to avoid matching operator IDs
    let foundIdx = row.findIndex(c => 
      c === "NAMA" || 
      c === "NAMA OPERATOR" || 
      c === "NAMA PERSONIL" || 
      c === "NAMA_OPERATOR" ||
      c === "PERSONIL" ||
      c === "NAMA LENGKAP" ||
      c === "NAMA_LENGKAP" ||
      c === "OPERATOR NAME" ||
      c === "OPERATOR_NAME"
    );
    
    // Priority B: Fallback to general operator column if explicit name column doesn't exist
    if (foundIdx === -1) {
      foundIdx = row.findIndex(c => 
        c === "OPERATOR" || 
        c.includes("NAMA ") ||
        c.includes(" OPERATOR")
      );
    }
    
    if (foundIdx !== -1) {
      headerRowIndex = i;
      opColIdx = foundIdx;
      break;
    }
  }
  
  const isBPN = lines.slice(0, 10).some(row => row.some(cell => cell.toUpperCase().includes("BPN")));


  // 2. Fallback: Scan columns 0-3 for a column that contains mostly names (longer strings, no punctuation, non-numeric)
  if (headerRowIndex === -1 || opColIdx === -1) {
    for (let c = 0; c <= Math.min(10, (lines[0]?.length || 0) - 1); c++) {
      let namePotential = 0;
      let firstDataRow = -1;

      for (let r = 0; r < Math.min(lines.length, 20); r++) {
        const val = (lines[r][c] || "").trim();
        // A name is usually > 3 chars, not a number, doesn't contain common header/path symbols
        if (val.length > 3 && isNaN(Number(val)) && !val.includes("/") && !val.includes(":") && !val.includes("202")) {
          namePotential++;
          if (firstDataRow === -1) firstDataRow = r;
        }
      }

      // If we find 3+ names in a column, it's likely our name column
      if (namePotential >= 3) {
        opColIdx = c;
        headerRowIndex = Math.max(0, firstDataRow - 1);
        break;
      }
    }
  }

  // 3. Final Resort: Assume Column B if we still have nothing
  if (headerRowIndex === -1 || opColIdx === -1) {
    headerRowIndex = 2; 
    opColIdx = 1;      
  }

  // 4. Dynamic Verification: If the matched column contains mostly numeric IDs (e.g. "201", "217"),
  // but there is another column containing actual text names (e.g. "WISNU"), swap to the text name column.
  if (headerRowIndex !== -1 && opColIdx !== -1) {
    let numericCount = 0;
    let totalNonEmpty = 0;
    const startRow = headerRowIndex + 1;
    const endRow = Math.min(lines.length, headerRowIndex + 25);
    
    for (let r = startRow; r < endRow; r++) {
      const val = (lines[r][opColIdx] || "").trim();
      if (val !== "" && val !== "0") {
        totalNonEmpty++;
        if (!isNaN(Number(val))) {
          numericCount++;
        }
      }
    }
    
    if (totalNonEmpty > 0 && (numericCount / totalNonEmpty) > 0.5) {
      let bestTextCol = -1;
      let maxTextPotential = 0;
      
      for (let c = 0; c < Math.min(10, (lines[headerRowIndex]?.length || 0)); c++) {
        if (c === opColIdx) continue;
        
        let textPotential = 0;
        for (let r = startRow; r < endRow; r++) {
          const val = (lines[r][c] || "").trim();
          if (val.length > 2 && isNaN(Number(val)) && !val.includes("/") && !val.includes(":") && !val.includes("202")) {
            textPotential++;
          }
        }
        
        if (textPotential > maxTextPotential) {
          maxTextPotential = textPotential;
          bestTextCol = c;
        }
      }
      
      if (bestTextCol !== -1 && maxTextPotential >= 3) {
        console.log(`[dataService] Column index ${opColIdx} contains mostly numeric values. Automatically swapped name column to column index ${bestTextCol} which contains actual text names.`);
        opColIdx = bestTextCol;
      }
    }
  }

  const headers = lines[headerRowIndex] || [];
  const normalizedHeaders: string[] = [];
  let currentMonthIndex = 0;
  let prevDayNum = -1;
  const validDailyCols = new Set<number>();

  for (let col = 0; col < headers.length; col++) {
    const rawLabel = (headers[col] || "").trim();
    if (!rawLabel) {
      normalizedHeaders.push("");
      continue;
    }

    const rawLabelUpper = rawLabel.toUpperCase();
    const dayNumVal = parseInt(rawLabel);
    const isDayNumber = /^\d+$/.test(rawLabel) && dayNumVal >= 1 && dayNumVal <= 32;

    const hasDateDelims = rawLabel.includes("/") || rawLabel.includes("-");
    const hasDateWords = rawLabelUpper.includes("JAN") || rawLabelUpper.includes("FEB") || rawLabelUpper.includes("MAR") || rawLabelUpper.includes("APR") || rawLabelUpper.includes("MEI") || rawLabelUpper.includes("MAY") || rawLabelUpper.includes("JUN") || rawLabelUpper.includes("JUL") || rawLabelUpper.includes("AGU") || rawLabelUpper.includes("AUG") || rawLabelUpper.includes("SEP") || rawLabelUpper.includes("OKT") || rawLabelUpper.includes("OCT") || rawLabelUpper.includes("NOV") || rawLabelUpper.includes("DES") || rawLabelUpper.includes("DEC");
    const cleanDigits = rawLabel.replace(/[^0-9]/g, "");
    const isDateString = (hasDateDelims && cleanDigits.length >= 4) || (hasDateWords && cleanDigits.length >= 1);

    const isDailyCol = isDayNumber || isDateString;

    const dayNumMatch = rawLabel.match(/^\d+$/);
    if (dayNumMatch && monthsFound.length > 0) {
      const dayNum = parseInt(rawLabel);
      
      // If day number decreases (e.g. from 31 to 1), it means we rolled over to the next month!
      if (prevDayNum !== -1 && dayNum < prevDayNum) {
        if (currentMonthIndex < monthsFound.length - 1) {
          currentMonthIndex++;
        }
      }
      prevDayNum = dayNum;

      const activeMonthYear = monthsFound[currentMonthIndex];
      const label = `${dayNum} ${activeMonthYear.month} ${activeMonthYear.year}`;
      normalizedHeaders.push(normalizeDateString(label));
      validDailyCols.add(col);
    } else {
      normalizedHeaders.push(rawLabel);
      if (isDailyCol) {
        validDailyCols.add(col);
      }
    }
  }

  const operators: OperatorRecord[] = [];
  
  // Track if we've seen any numbers to avoid empty results
  let foundAnyData = false;

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row || row.length <= opColIdx) continue;

    let name = (row[opColIdx] || "").trim();
    const upperName = name.toUpperCase();

    // Footers detection
    if (upperName === "TOTAL" || upperName === "JUMLAH" || upperName.includes("MENGETAHUI") || upperName.includes("DIBUAT OLEH")) break;
    
    // Skip numbers or small codes in the name column, or any names that are completely numeric/pure numbers
    const isNumericName = /^\d+$/.test(name) || !isNaN(Number(name));
    if (name === "" || name === "0" || isNumericName) continue;
    // Skip repeated headers
    if (upperName === "NAMA" || upperName === "OPERATOR") continue;

    // Skip rows that are clearly metadata, regional names, or office names (not operator/person names)
    const upperNameClean = upperName.replace(/[^A-Z\s]/g, "").trim();
    const isBlacklisted = [
      "JAWA TIMUR",
      "KANWIL",
      "KANTAH",
      "WILAYAH",
      "KECAMATAN",
      "KELURAHAN",
      "DESA",
      "KABUPATEN",
      "BPN",
      "PROVINSI",
      "KOTA",
      "KEMENTERIAN",
      "AGRARIA",
      "PERTANAHAN"
    ].some(term => upperNameClean === term || upperNameClean.includes(term));
    
    if (isBlacklisted) continue;

    let shift = Shift.NONE;
    let status = Status.ACTIVE;

    if (upperName.includes("(SIANG)")) {
      shift = Shift.SIANG;
      name = name.replace(/\(SIANG\)/gi, "").trim();
    } else if (upperName.includes("(MALAM)") || upperName.includes("(MLM)")) {
      shift = Shift.MALAM;
      name = name.replace(/\(MALAM\)|\(MLM\)/gi, "").trim();
    }

    if (upperName.includes("(OUT)")) {
      status = Status.OUT;
      name = name.replace(/\(OUT\)/gi, "").trim();
    }

    const workData: DayWork[] = [];
    // Only look for data in columns after the name
    const dateStartCol = opColIdx + 1;

    for (let col = dateStartCol; col < row.length; col++) {
      const cellVal = (row[col] || "").trim();
      const h = (headers[col] || "").trim().toUpperCase();
      if (!h || h === "TOTAL" || h === "JUMLAH" || h === "KETERANGAN") break;

      // Only parse if this column is marked as a valid daily/date column
      if (!validDailyCols.has(col)) {
        continue;
      }

      const cleanVal = cellVal.replace(/[^0-9,.]/g, '').replace(/,/g, '.');
      const count = isNaN(parseFloat(cleanVal)) ? 0 : parseFloat(cleanVal);
      
      if (count > 0) foundAnyData = true;

      let label = normalizedHeaders[col];
      if (!label) {
        label = `${col - dateStartCol + 1}`;
      }

      const btVal = count;
      const suVal = count;

      workData.push({
        date: label,
        bt: btVal,
        su: suVal,
        isPresent: count > 0 || (cellVal !== "" && cellVal !== "-" && cellVal !== "0")
      });

    }

    const isNameNumeric = /^\d+$/.test(name) || !isNaN(Number(name));
    if (name.length > 2 && !isNameNumeric) {
      operators.push({
        id: `op-${i}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: name,
        jabatan: "OPERATOR",
        shift,
        status,
        workData,
        targetPerDay: 150
      });
    }
  }

  // If we found names but no positive numbers, it might be the wrong format - but we still return names
  return operators;
}
