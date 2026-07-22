/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Search, 
  Activity,
  ArrowUpRight,
  UserCheck,
  UserX,
  Database,
  Briefcase,
  Wallet,
  Calendar,
  ChevronDown,
  RefreshCw,
  Building2,
  FileText,
  Plus,
  Menu,
  X,
  LogOut,
  LogIn,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

import { PROJECTS as INITIAL_PROJECTS, fetchAllSheetsData, extractSheetIdAndGid, discoverWorkbookTabs } from './services/dataService';
import { Shift, Status, OperatorRecord, Project, KMUser, KMDatabaseBackup, UserRole } from './types';
import { ProjectModal } from './components/ProjectModal';
import { OperatorModal } from './components/OperatorModal';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { databaseService, DEFAULT_USERS } from './lib/databaseService';
import { isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from './lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseNormalizedDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const parts = dateStr.trim().split(" ");
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthStr = parts[1].toUpperCase();
    let year = parseInt(parts[2]);
    if (year < 100) {
      year += 2000;
    }
    
    const monthMap: Record<string, number> = {
      JAN: 0, JANUARI: 0, JANUARY: 0,
      FEB: 1, FEBRUARI: 1, FEBRUARY: 1,
      MAR: 2, MARET: 2, MARCH: 2,
      APR: 3, APRIL: 3,
      MEI: 4, MAI: 4, MAY: 4,
      JUN: 5, JUNI: 5, JUNE: 5,
      JUL: 6, JULI: 6, JULY: 6,
      AGU: 7, AUG: 7, AGUSTUS: 7, AUGUST: 7,
      SEP: 8, SEPTEMBER: 8,
      OKT: 9, OCT: 9, OKTOBER: 9, OCTOBER: 9,
      NOV: 10, NOP: 10, NOVEMBER: 10,
      DES: 11, DEC: 11, DESEMBER: 11, DECEMBER: 11
    };
    
    const month = monthMap[monthStr];
    if (month !== undefined && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  return new Date(0);
}

const COLORS = ['#28B8A6', '#10B981', '#F59E0B', '#EF4444'];

export default function App() {
  const [kmUser, setKmUser] = useState<KMUser | null>(() => {
    const saved = localStorage.getItem('km_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<KMUser[]>(() => {
    const saved = localStorage.getItem('km_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const handleLogout = () => {
    setKmUser(null);
    localStorage.removeItem('km_auth_user');
  };

  const handleLoginSuccess = (usr: KMUser) => {
    setKmUser(usr);
    localStorage.setItem('km_auth_user', JSON.stringify(usr));
  };

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'personnel' | 'finance'>('overview');
  const [allOperatorsData, setAllOperatorsData] = useState<Record<string, OperatorRecord[]>>({});
  const [allSyncStatuses, setAllSyncStatuses] = useState<Record<string, { id: string; ok: boolean; message: string }[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | 'ALL'>('ALL');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<OperatorRecord | null>(null);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({});
  const [personnelTab, setPersonnelTab] = useState<'matrix' | 'list'>('matrix');
  
  // Synchronize Users database
  useEffect(() => {
    const initUsers = async () => {
      const u = await databaseService.fetchUsers();
      setUsers(u);
      
      // Also keep current active session synced with current profile details (passwords, projects)
      if (kmUser) {
        const currentProfile = u.find(x => x.username === kmUser.username);
        if (currentProfile) {
          setKmUser(currentProfile);
          localStorage.setItem('km_auth_user', JSON.stringify(currentProfile));
        }
      }
    };
    initUsers();
  }, [kmUser?.username]);

  // Handle saving and deleting users
  const handleSaveUser = async (newUser: KMUser) => {
    await databaseService.saveUser(newUser);
    const u = await databaseService.fetchUsers();
    setUsers(u);
  };

  const handleDeleteUser = async (usernameToDelete: string) => {
    await databaseService.deleteUser(usernameToDelete);
    const u = await databaseService.fetchUsers();
    setUsers(u);
  };

  // Synchronize custom targets
  useEffect(() => {
    const initTargets = async () => {
      const targetsMap = await databaseService.fetchCustomTargets();
      setCustomTargets(targetsMap);
    };
    initTargets();
  }, []);

  const handleSaveOperatorTarget = async (opId: string, newTarget: number) => {
    await databaseService.saveOperatorTarget(opId, newTarget);
    const targetsMap = await databaseService.fetchCustomTargets();
    setCustomTargets(targetsMap);
  };

  // Synchronize projects
  useEffect(() => {
    const initProjects = async () => {
      const projectsData = await databaseService.fetchProjects(INITIAL_PROJECTS);
      setAllProjects(projectsData);
    };
    initProjects();
  }, []);

  // Sync activeProject reference when allProjects list updates
  useEffect(() => {
    if (activeProject) {
      const current = allProjects.find(p => p.id === activeProject.id);
      if (current) {
        setActiveProject(current);
      } else {
        setActiveProject(null);
      }
    }
  }, [allProjects]);

  // Lock project selection and restrict views depending on user permissions
  useEffect(() => {
    if (kmUser && kmUser.projectId) {
      const match = allProjects.find(p => p.id === kmUser.projectId);
      if (match) {
        setActiveProject(match);
      }
      if (kmUser.role === 'bpn' && currentView === 'finance') {
        setCurrentView('overview');
      }
    }
  }, [kmUser, allProjects, currentView]);

  // Export database backup to JSON file
  const handleExportDatabase = () => {
    const backup: KMDatabaseBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: allProjects,
      operatorTargets: customTargets,
      users: users
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `km_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export operational financing recapitulation for active project to XLSX
  const handleExportToExcel = () => {
    if (!activeProject) return;

    // AOA Data structure
    const data: any[][] = [];

    // Title
    data.push(["REKAPITULASI PEMBIAYAAN OPERASIONAL"]);
    data.push([`PROYEK: ${activeProject.name.toUpperCase()}`]);
    data.push([]); // Empty spacing

    // Project Info Column Layout
    data.push(["Detail Proyek"]);
    data.push(["Nama Proyek", activeProject.name]);
    data.push(["Lokasi", activeProject.location]);
    data.push(["Tarif Buku Tanah (BT)", activeProject.salaryConfig.priceBT]);
    data.push(["Tarif Surat Ukur (SU)", activeProject.salaryConfig.priceSU]);
    data.push(["Tanggal Cetak", new Date().toLocaleDateString("id-ID", { dateStyle: 'long' })]);
    data.push([]); // Empty spacing

    // Table Header
    data.push([
      "No",
      "Nama Personil",
      "Jabatan",
      "Shift",
      "Status",
      "Volume BT (Berkas)",
      "Volume SU (Berkas)",
      "Total Volume (Berkas)",
      "Biaya BT (IDR)",
      "Biaya SU (IDR)",
      "Total Gaji (IDR)"
    ]);

    let totalBTAll = 0;
    let totalSUAll = 0;
    let totalBTPriceAll = 0;
    let totalSUPriceAll = 0;
    let totalSalaryAll = 0;

    // Rows for each operator
    operators.forEach((op, idx) => {
      const opBT = op.workData.reduce((acc, d) => acc + d.bt, 0);
      const opSU = op.workData.reduce((acc, d) => acc + d.su, 0);
      const btPay = opBT * (activeProject.salaryConfig.priceBT || 0);
      const suPay = opSU * (activeProject.salaryConfig.priceSU || 0);
      const total = btPay + suPay;

      totalBTAll += opBT;
      totalSUAll += opSU;
      totalBTPriceAll += btPay;
      totalSUPriceAll += suPay;
      totalSalaryAll += total;

      data.push([
        idx + 1,
        op.name,
        op.jabatan,
        op.shift,
        op.status === 'ACTIVE' ? 'Aktif' : 'Keluar',
        opBT,
        opSU,
        opBT + opSU,
        btPay,
        suPay,
        total
      ]);
    });

    // Total Row
    data.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      totalBTAll,
      totalSUAll,
      totalBTAll + totalSUAll,
      totalBTPriceAll,
      totalSUPriceAll,
      totalSalaryAll
    ]);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-fit column widths
    const colWidths = [
      { wch: 6 },   // No
      { wch: 25 },  // Nama Personil
      { wch: 15 },  // Jabatan
      { wch: 12 },  // Shift
      { wch: 10 },  // Status
      { wch: 20 },  // Volume BT (Berkas)
      { wch: 20 },  // Volume SU (Berkas)
      { wch: 22 },  // Total Volume (Berkas)
      { wch: 18 },  // Biaya BT (IDR)
      { wch: 18 },  // Biaya SU (IDR)
      { wch: 20 }   // Total Gaji (IDR)
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Rekap Pembiayaan Ops");

    // File name: Rekap_Pembiayaan_ProyekName_YYYY-MM-DD.xlsx
    const cleanProjName = activeProject.name.replace(/[^a-zA-Z0-9]/g, '_');
    const today = new Date().toISOString().split('T')[0];
    const fileName = `Rekap_Pembiayaan_Ops_${cleanProjName}_${today}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  // Export format Lampiran H Laporan Akhir based on Google Sheets logs for active project to XLSX
  const handleExportLampiranH = async () => {
    if (!activeProject) return;
    setIsLoading(true);
    try {
      const rowsData: any[] = [];
      const emptyVal = "-";

      // Loop and fetch raw spreadsheets to find actual verified rows
      for (const url of activeProject.sheetIds) {
        try {
          const { id, gid } = extractSheetIdAndGid(url);
          let fetchUrls = [`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`];
          if (gid) {
            fetchUrls = [`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`];
          } else {
            const tabs = await discoverWorkbookTabs(url);
            if (tabs.length > 0) {
              fetchUrls = tabs.map(tab => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${tab.gid}`);
            }
          }

          for (const fetchUrl of fetchUrls) {
            const res = await fetch(fetchUrl);
            if (!res.ok) continue;
            const csvText = await res.text();
            if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.toLowerCase().includes("<html")) continue;

            const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "").map(line => {
              return line.split(/,(?=(?:[^"]*"){2})*[^"]*$/).map(cell => {
                let cleaned = cell.trim();
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                  cleaned = cleaned.substring(1, cleaned.length - 1).trim();
                }
                return cleaned.replace(/""/g, '"');
              });
            });

            let headerIdx = -1;
            const colIndices: any = {};
            
            for (let i = 0; i < Math.min(lines.length, 30); i++) {
              const row = lines[i].map(c => c.toUpperCase().trim());
              const hasBT = row.some(c => c === "BT" || c.includes("STATUS BT") || c.startsWith("STATUS BT"));
              const hasSU = row.some(c => c === "SU" || c.includes("STATUS SU") || c.startsWith("STATUS SU"));
              
              if (hasBT || hasSU) {
                headerIdx = i;
                row.forEach((colName, colIdx) => {
                  if (colName.includes("KECAMATAN")) colIndices.kecamatan = colIdx;
                  if (colName.includes("DESA") || colName.includes("KELURAHAN")) colIndices.desa = colIdx;
                  if (colName.includes("TIPE HAK") || colName.includes("JENIS HAK")) colIndices.tipeHak = colIdx;
                  if (colName.includes("TIPE SU") || colName.includes("JENIS SU") || colName.includes("TIPE_SU")) colIndices.tipeSU = colIdx;
                  if (colName.includes("PEMEGANG HAK") || colName.includes("NAMA PEMILIK")) colIndices.pemegangHak = colIdx;
                  if (colName.includes("NIB")) colIndices.nib = colIdx;
                  if (colName.includes("LUAS")) colIndices.luas = colIdx;
                  if (colName.includes("NOMOR HAK") || colName.includes("NO HAK") || colName.includes("NOHAK")) colIndices.noHak = colIdx;
                  if (colName.includes("NOMOR SU") || colName.includes("NO SU") || colName.includes("NOSU")) colIndices.noSU = colIdx;
                  if (colName.includes("TANGGAL VERIFIKASI BT") || colName.includes("VERIFIKASI BT") || colName.includes("VERIF_BT") || colName.includes("TGL VERIF BT")) colIndices.tglBT = colIdx;
                  if (colName.includes("TANGGAL VERIFIKASI SU") || colName.includes("VERIFIKASI SU") || colName.includes("VERIF_SU") || colName.includes("TGL VERIF SU")) colIndices.tglSU = colIdx;
                  if (colName.includes("USER") || colName.includes("PETUGAS") || colName.includes("OPERATOR")) colIndices.user = colIdx;
                  if (colName === "BT" || colName.includes("STATUS BT")) colIndices.btStatus = colIdx;
                  if (colName === "SU" || colName.includes("STATUS SU")) colIndices.suStatus = colIdx;
                });
                break;
              }
            }

            if (headerIdx !== -1) {
              for (let r = headerIdx + 1; r < lines.length; r++) {
                const row = lines[r];
                if (!row || row.length === 0) continue;

                const btState = colIndices.btStatus !== undefined ? (row[colIndices.btStatus] || "").toLowerCase() : "";
                const suState = colIndices.suStatus !== undefined ? (row[colIndices.suStatus] || "").toLowerCase() : "";

                const checkVerif = (v: string): boolean => {
                  return (v.includes("verifikasi") || v.includes("verif")) && !v.includes("belum") && !v.includes("tidak");
                };
                const isBTVerified = checkVerif(btState);
                const isSUVerified = checkVerif(suState);

                if (!isBTVerified && !isSUVerified) continue;

                rowsData.push({
                  kanwil: `Kanwil BPN Provinsi ${activeProject.location}`,
                  kantah: activeProject.name,
                  kecamatan: colIndices.kecamatan !== undefined ? (row[colIndices.kecamatan] || emptyVal) : emptyVal,
                  desa: colIndices.desa !== undefined ? (row[colIndices.desa] || emptyVal) : emptyVal,
                  tipeHak: colIndices.tipeHak !== undefined ? (row[colIndices.tipeHak] || emptyVal) : emptyVal,
                  tipeSU: colIndices.tipeSU !== undefined ? (row[colIndices.tipeSU] || emptyVal) : emptyVal,
                  pemegangHak: colIndices.pemegangHak !== undefined ? (row[colIndices.pemegangHak] || emptyVal) : emptyVal,
                  nib: colIndices.nib !== undefined ? (row[colIndices.nib] || emptyVal) : emptyVal,
                  luas: colIndices.luas !== undefined ? (row[colIndices.luas] || emptyVal) : emptyVal,
                  noHak: colIndices.noHak !== undefined ? (row[colIndices.noHak] || emptyVal) : emptyVal,
                  noSU: colIndices.noSU !== undefined ? (row[colIndices.noSU] || emptyVal) : emptyVal,
                  tglBT: colIndices.tglBT !== undefined && isBTVerified ? (row[colIndices.tglBT] || emptyVal) : emptyVal,
                  tglSU: colIndices.tglSU !== undefined && isSUVerified ? (row[colIndices.tglSU] || emptyVal) : emptyVal,
                  user: colIndices.user !== undefined ? (row[colIndices.user] || emptyVal) : (kmUser?.name || "Petugas KM")
                });
              }
            }
          }
        } catch (e) {
          console.warn("Failed individual sheet parsing in export:", e);
        }
      }

      const excelData: any[][] = [];

      // AOA format mapping the precise attachment layout
      excelData.push(["LAMPIRAN H LAPORAN AKHIR KEGIATAN VERIFIKASI BUKU TANAH DAN SURAT UKUR ELEKTRONIK"]);
      excelData.push(["LAPORAN AKHIR KEGIATAN VERIFIKASI BUKU TANAH DAN SURAT UKUR ELEKTRONIK"]);
      excelData.push([`Kantor Pertanahan: ${activeProject.name}`]);
      excelData.push([]);

      const reportDate = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });
      excelData.push([`Tanggal Laporan: ${reportDate}`]);
      excelData.push([]);

      excelData.push(["I. DATA BUKU TANAH DAN SURAT UKUR"]);
      excelData.push([]);

      excelData.push([
        "No",
        "Kanwil",
        "Kantah",
        "Kecamatan",
        "Desa/Kelurahan",
        "Tipe Hak",
        "Tipe SU/GD",
        "Pemegang Hak",
        "NIB",
        "Luas",
        "Nomor Hak (Lengkap)",
        "Nomor SU/GD",
        "Tanggal Verifikasi BT",
        "Tanggal Verifikasi SU",
        "User Verifikasi"
      ]);

      let btVerifiedCount = 0;
      let suVerifiedCount = 0;

      if (rowsData.length > 0) {
        rowsData.forEach((row, idx) => {
          if (row.tglBT !== emptyVal) btVerifiedCount++;
          if (row.tglSU !== emptyVal) suVerifiedCount++;
          
          excelData.push([
            idx + 1,
            row.kanwil,
            row.kantah,
            row.kecamatan,
            row.desa,
            row.tipeHak,
            row.tipeSU,
            row.pemegangHak,
            row.nib,
            row.luas,
            row.noHak,
            row.noSU,
            row.tglBT,
            row.tglSU,
            row.user
          ]);
        });
      } else {
        // Fallback row if no data present
        excelData.push([
          1,
          `Kanwil BPN Provinsi ${activeProject.location}`,
          activeProject.name,
          "[Kecamatan]",
          "[Desa/Kelurahan]",
          "[Tipe Hak]",
          "[Tipe SU]",
          "[Pemegang Hak]",
          "[NIB]",
          "[Luas]",
          "[Nomor Hak]",
          "[Nomor SU]",
          reportDate,
          reportDate,
          kmUser ? kmUser.name : "Petugas KM"
        ]);
        btVerifiedCount = 1;
        suVerifiedCount = 1;
      }

      excelData.push([]);
      excelData.push(["III. KESIMPULAN"]);
      excelData.push([`4. Jumlah total Buku Tanah yang telah diverifikasi: ${btVerifiedCount} berkas`]);
      excelData.push([`5. Jumlah total Surat Ukur/Gambar Denah yang telah diverifikasi: ${suVerifiedCount} berkas`]);
      excelData.push(["6. Catatan tambahan (jika ada): -"]);
      excelData.push([]);
      excelData.push([]);

      // Signatures Layout matching the user's report image
      excelData.push([
        "",
        "Penanggung Jawab Kegiatan",
        "", "", "", "", "", "", "", "",
        "Petugas Verifikasi"
      ]);
      excelData.push([
        "",
        "(PPK Kantah):",
        "", "", "", "", "", "", "", "",
        "(CV. Kartawijaya Mandiri):"
      ]);
      excelData.push([]);
      excelData.push([]);
      excelData.push([
        "",
        "Tanda Tangan: [ _____________________ ]",
        "", "", "", "", "", "", "", "",
        "Tanda Tangan: [ _____________________ ]"
      ]);
      excelData.push([
        "",
        "Nama: _________________________________",
        "", "", "", "", "", "", "", "",
        `Nama: ${kmUser ? kmUser.name : "_________________________"}`
      ]);
      excelData.push([
        "",
        "Jabatan: PPK Kantor Pertanahan",
        "", "", "", "", "", "", "", "",
        "Jabatan: Leader Verifikasi"
      ]);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 6 },   // No
        { wch: 25 },  // Kanwil
        { wch: 25 },  // Kantah
        { wch: 16 },  // Kecamatan
        { wch: 16 },  // Desa/Kelurahan
        { wch: 12 },  // Tipe Hak
        { wch: 12 },  // Tipe SU
        { wch: 20 },  // Pemegang Hak
        { wch: 15 },  // NIB
        { wch: 10 },  // Luas
        { wch: 22 },  // Nomor Hak
        { wch: 16 },  // Nomor SU
        { wch: 20 },  // Tgl BT
        { wch: 20 },  // Tgl SU
        { wch: 16 }   // User Verifikasi
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Lampiran H");

      const cleanProjName = activeProject.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Lampiran_H_${cleanProjName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Failed to generate Lampiran H:", err);
      alert("Pencetakan Lampiran H Gagal: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Import database backup from JSON file
  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content) as KMDatabaseBackup;

        if (!backupData.projects || !backupData.users) {
          alert("Format file database cadangan (.json) tidak valid!");
          return;
        }

        if (!window.confirm("Apakah Anda yakin ingin mengimpor database cadangan ini? Data proyek, target personil, dan akun akan dipulihkan.")) {
          return;
        }

        setIsLoading(true);

        // 1. Sync custom targets
        if (backupData.operatorTargets) {
          for (const [opId, targetVal] of Object.entries(backupData.operatorTargets)) {
            try {
              await databaseService.saveOperatorTarget(opId, targetVal);
            } catch (err) {
              console.warn(`Failed syncing targets to Database during import: ${opId}`, err);
            }
          }
          setCustomTargets(backupData.operatorTargets);
        }

        // 2. Sync projects
        for (const proj of backupData.projects) {
          try {
            await databaseService.saveProject(proj);
          } catch (err) {
            console.warn(`Failed syncing project to Database: ${proj.id}`, err);
          }
        }
        setAllProjects(backupData.projects);

        // 3. Sync users
        for (const usr of backupData.users) {
          try {
            await databaseService.saveUser(usr);
          } catch (err) {
            console.warn(`Failed syncing user ${usr.username} to Database:`, err);
          }
        }
        setUsers(backupData.users);
        localStorage.setItem("km_users", JSON.stringify(backupData.users));

        alert("Database Berhasil Diimpor! Proyek, target, dan akun berhasil disinkronkan.");
        loadData();
      } catch (err) {
        console.error("Import failed:", err);
        alert("Gagal memproses file impor. Pastikan file JSON merupakan format cadangan KM-Dash yang benar.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };


  // Sync Data for ALL projects
  const loadData = async () => {
    setIsLoading(true);
    const newData: Record<string, OperatorRecord[]> = {};
    const newStatuses: Record<string, { id: string; ok: boolean; message: string }[] > = {};

    await Promise.all(allProjects.map(async (project) => {
      try {
        const { data, statuses } = await fetchAllSheetsData(project.sheetIds);
        newData[project.id] = data;
        newStatuses[project.id] = statuses;
      } catch (err) {
        console.error(`Error loading project ${project.name}:`, err);
        newData[project.id] = [];
        newStatuses[project.id] = [{ id: 'error', ok: false, message: 'Gagal memuat data' }];
      }
    }));

    setAllOperatorsData(newData);
    setAllSyncStatuses(newStatuses);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [allProjects]);

  const operators = useMemo(() => {
    const rawOps = activeProject 
      ? (allOperatorsData[activeProject.id] || []) 
      : Object.values(allOperatorsData).flat();

    return rawOps.map(op => {
      let projectForOp = activeProject;
      if (!projectForOp) {
        const projectId = Object.keys(allOperatorsData).find(pId => 
          (allOperatorsData[pId] || []).some(o => o.id === op.id)
        );
        projectForOp = allProjects.find(p => p.id === projectId) || null;
      }

      const standardTarget = projectForOp?.targetPerDayOperator !== undefined 
        ? projectForOp.targetPerDayOperator 
        : 150;
        
      const customTarget = customTargets[op.id] !== undefined 
        ? customTargets[op.id] 
        : standardTarget;

      return {
        ...op,
        targetPerDay: customTarget
      };
    });
  }, [activeProject, allOperatorsData, allProjects, customTargets]);

  const syncStatuses = activeProject ? (allSyncStatuses[activeProject.id] || []) : [];

  const getStats = (ops: OperatorRecord[], project: Project | null) => {
    const active = ops.filter(o => o.status === Status.ACTIVE);
    let totalBT = 0;
    let totalSU = 0;
    let totalPresence = 0;

    ops.forEach(op => {
      op.workData.forEach(d => {
        totalBT += d.bt;
        totalSU += d.su;
        if (d.isPresent) totalPresence++;
      });
    });

    totalBT = Number(totalBT.toFixed(1));
    totalSU = Number(totalSU.toFixed(1));

    const totalVerified = Number((totalBT * 0.6 + totalSU * 0.4).toFixed(1));
    const projectBudget = project ? (totalBT * project.salaryConfig.priceBT) + (totalSU * project.salaryConfig.priceSU) : 0;
    const completionRate = project ? (totalVerified / project.targetTotal) * 100 : 0;
    const avgPresence = ops.length > 0 ? (totalPresence / (ops.length * 30)) * 100 : 0;

    return { 
      totalWorkers: ops.length, 
      activeCount: active.length, 
      totalBT, 
      totalSU, 
      totalVerified, 
      projectBudget, 
      completionRate, 
      avgPresence 
    };
  };

  const projectStats = useMemo(() => {
    if (!activeProject) return null;
    return getStats(operators, activeProject);
  }, [operators, activeProject]);

  const globalStats = useMemo(() => {
    const allOps = Object.values(allOperatorsData).flat() as OperatorRecord[];
    let totalTarget = allProjects.reduce((acc, p) => acc + p.targetTotal, 0);
    
    // For global budget, we need to sum up individual project budgets correctly
    let totalBudget = 0;
    allProjects.forEach(p => {
      const ops = allOperatorsData[p.id] || [];
      let pBT = 0;
      let pSU = 0;
      ops.forEach(o => {
        o.workData.forEach(d => { pBT += d.bt; pSU += d.su; });
      });
      totalBudget += (pBT * p.salaryConfig.priceBT) + (pSU * p.salaryConfig.priceSU);
    });

    const stats = getStats(allOps, null);
    return { ...stats, totalTarget, totalBudget, completionRate: (stats.totalVerified / (totalTarget || 1)) * 100 };
  }, [allOperatorsData, allProjects]);

  const activeStats = activeProject ? projectStats : globalStats;

  const chartData = useMemo(() => {
    const targetOps = activeProject ? operators : Object.values(allOperatorsData).flat() as OperatorRecord[];
    if (targetOps.length === 0) return [];
    
    const dateMap: Record<string, { bt: number; su: number; total: number }> = {};
    
    targetOps.forEach(op => {
      op.workData.forEach(d => {
        if (d.date && d.date !== "Tanpa Tanggal" && d.date !== "UNKNOWN") {
          if (!dateMap[d.date]) {
            dateMap[d.date] = { bt: 0, su: 0, total: 0 };
          }
          dateMap[d.date].bt += d.bt;
          dateMap[d.date].su += d.su;
          dateMap[d.date].total += (d.bt * 0.6 + d.su * 0.4);
        }
      });
    });

    const parsedData = Object.keys(dateMap).map(date => ({
      date,
      bt: Number(dateMap[date].bt.toFixed(1)),
      su: Number(dateMap[date].su.toFixed(1)),
      total: Number(dateMap[date].total.toFixed(1))
    }));

    parsedData.sort((a, b) => {
      return parseNormalizedDate(a.date).getTime() - parseNormalizedDate(b.date).getTime();
    });

    return parsedData;
  }, [operators, allOperatorsData, activeProject]);

  const filteredOperators = useMemo(() => {
    return operators.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           op.jabatan.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShift = selectedShift === 'ALL' || op.shift === selectedShift;
      return matchesSearch && matchesShift;
    });
  }, [searchTerm, selectedShift, operators]);

  const uniqueDates = useMemo(() => {
    const datesSet = new Set<string>();
    operators.forEach(op => {
      op.workData.forEach(d => {
        if (d.date && d.date !== "Tanpa Tanggal" && d.date !== "UNKNOWN") {
          datesSet.add(d.date);
        }
      });
    });
    const parsedDatesArray = Array.from(datesSet);

    if (parsedDatesArray.length === 0) return [];

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    parsedDatesArray.forEach(dateStr => {
      const parsed = parseNormalizedDate(dateStr);
      if (parsed.getTime() > 0) {
        if (!minDate || parsed < minDate) minDate = parsed;
        if (!maxDate || parsed > maxDate) maxDate = parsed;
      }
    });

    if (activeProject) {
      if (activeProject.startDate) {
        const parts = activeProject.startDate.split("-");
        if (parts.length === 3) {
          minDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }
      if (activeProject.endDate) {
        const parts = activeProject.endDate.split("-");
        if (parts.length === 3) {
          maxDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }
    }

    if (!minDate || !maxDate) {
      parsedDatesArray.sort((a, b) => parseNormalizedDate(a).getTime() - parseNormalizedDate(b).getTime());
      return parsedDatesArray;
    }

    const consecutiveDates: string[] = [];
    const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DES"];
    
    const current = new Date(minDate.getTime());
    current.setHours(12, 0, 0, 0);
    const end = new Date(maxDate.getTime());
    end.setHours(12, 0, 0, 0);

    while (current <= end) {
      const day = current.getDate();
      const monthStr = months[current.getMonth()];
      const year = current.getFullYear();
      consecutiveDates.push(`${day} ${monthStr} ${year}`);
      current.setDate(current.getDate() + 1);
    }

    return consecutiveDates;
  }, [operators, activeProject]);

  const workByDate = useMemo(() => {
    const map: Record<string, Record<string, typeof operators[0]['workData'][0]>> = {};
    operators.forEach(op => {
      map[op.id] = {};
      op.workData.forEach(d => {
        map[op.id][d.date] = d;
      });
    });
    return map;
  }, [operators]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handleSaveProject = async (project: Project) => {
    try {
      await databaseService.saveProject(project);
      const projectsData = await databaseService.fetchProjects(INITIAL_PROJECTS);
      setAllProjects(projectsData);
      setIsProjectModalOpen(false);
      setProjectToEdit(null);
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Hapus proyek ini secara permanen?')) return;
    try {
      await databaseService.deleteProject(id);
      const projectsData = await databaseService.fetchProjects(INITIAL_PROJECTS);
      setAllProjects(projectsData);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const openAddModal = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };

  const openOperatorDetail = (op: OperatorRecord) => {
    setSelectedOperator(op);
    setIsOperatorModalOpen(true);
  };

  const visibleProjects = useMemo(() => {
    if (kmUser && kmUser.projectId) {
      return allProjects.filter(p => p.id === kmUser.projectId);
    }
    return allProjects;
  }, [allProjects, kmUser]);

  const Navigation = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", !mobile && "p-8")}>
      <div className="flex items-center gap-3 mb-10">
        <div className="w-16 h-16 flex items-center justify-center">
          <img src="/logo-kwm.png" alt="KWM Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <span className="text-xl font-black tracking-tight leading-none block">KM DASH</span>
          <span className="text-[10px] font-bold text-[#28B8A6] tracking-widest uppercase">Kartawijaya Mandiri</span>
        </div>
      </div>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Menu Utama</p>
      <nav className="space-y-1 px-2">
        {[
          { id: 'overview', label: 'Monitor Proyek', icon: Activity },
          kmUser && kmUser.role !== 'bpn' && { id: 'personnel', label: 'Absensi & Kinerja', icon: Users },
          kmUser && kmUser.role !== 'bpn' && { id: 'finance', label: 'Rekap Gaji', icon: Wallet },
        ].filter(Boolean).map((item: any) => (
          <button 
            key={item.id}
            onClick={() => {
              setCurrentView(item.id as any);
              if (mobile) setIsMobileMenuOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group outline-none",
              currentView === item.id 
                ? "bg-[#28B8A6] text-white shadow-lg shadow-[#28B8A6]/30" 
                : "text-gray-500 hover:bg-[#28B8A6]/5 hover:text-[#28B8A6]"
            )}
          >
            <item.icon size={18} className={cn(currentView === item.id ? "text-white" : "text-gray-400 group-hover:text-[#28B8A6]")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-12">
        <div className="flex items-center justify-between px-4 mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daftar Proyek</p>
          {(kmUser?.role === 'super_admin' || kmUser?.role === 'admin') && (
            <button 
              onClick={openAddModal}
              className="p-1.5 hover:bg-[#28B8A6]/10 text-[#28B8A6] rounded-lg transition-colors group"
              title="Tambah Proyek"
            >
              <Plus size={14} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
        
        {!kmUser?.projectId && (
          <div className="px-2 mb-2">
            <button 
              onClick={() => {
                setActiveProject(null);
                if (mobile) setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border outline-none",
                activeProject === null 
                  ? "border-[#28B8A6] bg-[#28B8A6] text-white shadow-md shadow-[#28B8A6]/20" 
                  : "border-gray-100 text-gray-600 hover:border-[#28B8A6]"
              )}
            >
              <Database size={16} />
              Global Dashboard
            </button>
          </div>
        )}

        <div className="space-y-2 px-2 max-h-[220px] overflow-y-auto custom-scrollbar">
          {visibleProjects.map(p => (
            <div key={p.id} className="group relative">
              <button 
                onClick={() => {
                  setActiveProject(p);
                  if (mobile) setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all border outline-none pr-10",
                  activeProject?.id === p.id 
                    ? "border-[#28B8A6]/30 bg-[#28B8A6]/10 text-[#28B8A6]" 
                    : "border-transparent text-gray-500 hover:border-gray-200"
                )}
              >
                {p.name}
              </button>
              {(kmUser?.role === 'super_admin' || kmUser?.role === 'admin') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(p);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#28B8A6] opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-white border-transparent hover:border-gray-100 border"
                >
                  <div className="w-1 h-1 bg-current rounded-full mb-0.5" />
                  <div className="w-1 h-1 bg-current rounded-full mb-0.5" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 md:p-0 space-y-4">
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <RefreshCw size={12} className={cn("text-[#28B8A6]", isLoading && "animate-spin")} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sheet Sync</span>
              </div>
              <span className={cn(
                "w-2 h-2 rounded-full",
                activeProject ? (allSyncStatuses[activeProject.id]?.every(s => s.ok) ? "bg-emerald-500" : "bg-red-500") : "bg-blue-500"
              )} />
            </div>
            
            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              {activeProject ? (allSyncStatuses[activeProject.id]?.length > 0 ? allSyncStatuses[activeProject.id].map((s, idx) => (
                <div key={idx} className="flex flex-col gap-0.5 border-b border-gray-100 last:border-0 pb-1.5 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 font-mono truncate max-w-[120px]">ID: {s.id}</span>
                    <span className={cn("text-[8px] font-bold uppercase", s.ok ? "text-emerald-600" : "text-red-500")}>
                      {s.ok ? "OK" : "ERR"}
                    </span>
                  </div>
                  <p className="text-[9px] font-semibold text-gray-605 leading-tight">{s.message}</p>
                </div>
              )) : (
                <p className="text-[9px] font-semibold text-gray-400 italic">Menunggu sinkronisasi...</p>
              )) : (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Status Semua Proyek:</p>
                  {visibleProjects.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-[9px] font-medium truncate max-w-[100px]">{p.name}</span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", allSyncStatuses[p.id]?.every(s => s.ok) ? "bg-emerald-500" : "bg-red-500")} />
                    </div>
                  ))}
                </div>
              )}
            </div>
         </div>

         {/* Backup and restore section for admins only */}
         {(kmUser?.role === 'super_admin' || kmUser?.role === 'admin') && (
           <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
             <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block leading-none">Cadangan Database</span>
             <div className="grid grid-cols-2 gap-2 text-center">
               <button 
                 onClick={handleExportDatabase}
                 className="bg-white hover:bg-gray-55 border border-gray-200 py-2 rounded-lg text-[9px] font-black uppercase text-gray-650 transition-colors shadow-sm outline-none"
                 title="Ekspor Database ke File JSON"
               >
                 Ekspor DB
               </button>
               <label 
                 className="bg-white hover:bg-gray-55 border border-gray-200 py-2 rounded-lg text-[9px] font-black uppercase text-gray-650 transition-colors cursor-pointer text-center shadow-sm block leading-normal select-none"
                 title="Impor Database dari File JSON"
               >
                 Impor DB
                 <input 
                   type="file" 
                   accept=".json" 
                   onChange={handleImportDatabase}
                   className="hidden" 
                 />
               </label>
             </div>
           </div>
         )}

         {/* Supabase Connection Status */}
         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-1.5 mb-4">
           <div className="flex items-center gap-1.5 min-w-0">
             <Database size={11} className={isSupabaseConfigured ? "text-[#28B8A6]" : "text-amber-500"} />
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Database</span>
           </div>
           <span className={cn(
             "text-[8px] font-black uppercase px-2 py-0.5 rounded-md shrink-0",
             isSupabaseConfigured 
               ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
               : "bg-amber-50 text-amber-700 border border-amber-200"
           )}>
             {isSupabaseConfigured ? "Supabase" : "Lokal"}
           </span>
         </div>

         {/* User session display */}
         {kmUser && (
           <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-3">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-[#28B8A6]/10 text-[#28B8A6] rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0">
                 {kmUser.name.charAt(0)}
               </div>
               <div className="min-w-0">
                 <p className="text-[10px] font-black text-gray-950 tracking-tight leading-none truncate mb-1">
                   {kmUser.name}
                 </p>
                 <span className="text-[8px] font-black uppercase bg-[#28B8A6]/15 text-[#28B8A6] px-1.5 py-0.5 rounded-md tracking-wider">
                   {kmUser.role === 'super_admin' ? 'Super Admin' :
                    kmUser.role === 'admin' ? 'Admin' :
                    kmUser.role === 'leader' ? 'Leader' : 'BPN Viewer'}
                 </span>
               </div>
             </div>

             {(kmUser.role === 'super_admin' || kmUser.role === 'admin') && (
               <button
                 onClick={() => setIsUserManagementOpen(true)}
                 className="w-full flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-[#28B8A6]/40 hover:bg-[#28B8A6]/5 py-2 rounded-lg text-[9px] font-black uppercase text-gray-600 hover:text-[#28B8A6] transition-all"
               >
                 <Shield size={11} /> Kelola Akun
               </button>
             )}

             <button 
               onClick={handleLogout}
               className="w-full text-center py-2 text-[9px] font-black text-red-500 border border-red-100 bg-red-50 hover:bg-red-100/40 rounded-lg uppercase flex items-center justify-center gap-1.5 transition-colors"
             >
               <LogOut size={11} /> Logout
             </button>
           </div>
         )}
      </div>
    </div>
  );


  const activeSelectedOperator = useMemo(() => {
    if (!selectedOperator) return null;
    return operators.find(o => o.id === selectedOperator.id) || selectedOperator;
  }, [selectedOperator, operators]);

  if (kmUser === null) {
    return <LoginScreen users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-[#000000] flex font-sans relative">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-40 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 flex items-center justify-center">
            <img src="/logo-kwm.png" alt="KWM Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black tracking-tight text-lg">KM DASH</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <Menu size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-[80%] max-w-xs bg-white p-6 shadow-2xl overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
              <Navigation mobile />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-[#E2E8F0] bg-white flex-col sticky top-0 h-screen shadow-[4px_0_24px_rgba(0,0,0,0.01)] shrink-0 overflow-y-auto custom-scrollbar">
        <Navigation />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 pt-24 lg:pt-10 max-w-full overflow-x-hidden space-y-8">
        <ProjectModal 
          isOpen={isProjectModalOpen} 
          onClose={() => setIsProjectModalOpen(false)} 
          onSave={handleSaveProject} 
          onDelete={handleDeleteProject}
          project={projectToEdit}
        />
        <OperatorModal 
          isOpen={isOperatorModalOpen}
          onClose={() => setIsOperatorModalOpen(false)}
          operator={activeSelectedOperator}
          onSaveTarget={kmUser && kmUser.role !== 'bpn' ? handleSaveOperatorTarget : undefined}
        />
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          users={users}
          projects={allProjects}
          currentUser={kmUser}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
        />
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#28B8A6] mb-1">
              <Briefcase size={16} />
              <span className="text-xs font-bold tracking-widest uppercase">{activeProject ? activeProject.location : 'TOTAL OPERASIONAL'}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 group">
              {activeProject ? activeProject.name : 'Global Management'} 
              <span className="text-[#28B8A6] opacity-20 group-hover:opacity-100 transition-opacity ml-2">#</span>
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm italic">
              {activeProject ? `Project Dashboard: ${currentView.toUpperCase()}` : 'Konsolidasi Seluruh Proyek KM'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={loadData}
               className="bg-white border border-gray-200 p-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-gray-600"
               title="Refresh Data"
             >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
             </button>
             {kmUser && kmUser.role !== 'bpn' ? (
               <div className="bg-[#28B8A6] text-white px-6 py-3 rounded-2xl shadow-xl shadow-[#28B8A6]/20 flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
                  <Wallet size={20} />
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">{activeProject ? 'Budget Terpakai' : 'Total Budget'}</p>
                    <p className="text-lg font-bold font-mono leading-none">{formatCurrency(activeStats?.projectBudget || (activeStats as any)?.totalBudget || 0)}</p>
                  </div>
               </div>
             ) : (
               <div className="bg-emerald-55 border border-emerald-250 text-[#155e75] px-6 py-3 rounded-2xl flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
                  <Activity size={20} className="text-emerald-600 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1 text-[#22c55e]">Status Sesi</p>
                    <p className="text-xs font-black leading-none text-emerald-800 tracking-wider">TERKONEKSI OK</p>
                  </div>
               </div>
             )}
          </div>
        </header>

        {/* Highlight Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              label: 'Total Berkas', 
              value: (activeStats?.totalVerified || 0).toLocaleString(), 
              icon: TrendingUp, 
              sub: `Target: ${(activeProject ? activeProject.targetTotal : (activeStats as any)?.totalTarget || 0).toLocaleString()}`, 
              color: 'bg-[#28B8A6]/5', 
              iconColor: 'text-[#28B8A6]' 
            },
            { 
              label: 'Buku Tanah (BT)', 
              value: (activeStats?.totalBT || 0).toLocaleString(), 
              icon: FileText, 
              sub: activeProject 
                ? (kmUser?.role === 'bpn' ? 'Buku Tanah Terverifikasi' : `Tarif: Rp ${activeProject.salaryConfig.priceBT}/berkas`) 
                : `${allProjects.length} Proyek Aktif`, 
              color: 'bg-blue-50', 
              iconColor: 'text-blue-600' 
            },
            { 
              label: 'Surat Ukur (SU)', 
              value: (activeStats?.totalSU || 0).toLocaleString(), 
              icon: FileText, 
              sub: activeProject 
                ? (kmUser?.role === 'bpn' ? 'Surat Ukur Terverifikasi' : `Tarif: Rp ${activeProject.salaryConfig.priceSU}/berkas`) 
                : `Monitoring Real-time`, 
              color: 'bg-emerald-50', 
              iconColor: 'text-emerald-600' 
            },
            { 
              label: 'Rata-rata Presensi', 
              value: `${(activeStats?.avgPresence || 0).toFixed(1)}%`, 
              icon: Calendar, 
              sub: `${activeStats?.activeCount || 0} Personil Aktif`, 
              color: 'bg-rose-50', 
              iconColor: 'text-rose-600' 
            }
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={stat.label} 
              className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-start gap-5 relative overflow-hidden group"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", stat.color)}>
                <stat.icon size={26} className={stat.iconColor} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black tracking-tight text-gray-900 leading-none mb-2">{stat.value}</h3>
                <p className="text-[11px] font-semibold text-gray-500 italic opacity-80">{stat.sub}</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <stat.icon size={80} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Dashboard Interaction */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className={cn(currentView === 'overview' ? "xl:col-span-8" : "xl:col-span-12", "bg-white border border-gray-100 p-6 md:p-8 rounded-3xl shadow-sm overflow-hidden")}>
            
            {currentView === 'overview' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight mb-1">Kurva Pencapaian Harian</h2>
                    <p className="text-xs text-gray-400 font-medium">Monitoring volume berkas (BT vs SU) per tanggal pelaporan</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-blue-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>BUKU TANAH (BT)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>SURAT UKUR (SU)</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-[250px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F8FAFC" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} 
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bt" 
                    stroke="#3B82F6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorBT)"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3, stroke: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="su" 
                    stroke="#10B981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorSU)"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 3, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            </>
            )}

            {currentView === 'personnel' && kmUser?.role !== 'bpn' && (
              <div className="space-y-6">
                 {/* Title and Search Row */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-gray-900">Monitoring Personil & Kinerja</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Data Real-time & Kalender Kerja Pasca-Verifikasi</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Cari Operator..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all w-full md:w-64 font-medium"
                      />
                    </div>
                 </div>

                 {/* Tab Subviews Selection */}
                 <div className="flex bg-gray-100/70 p-1.5 rounded-2xl w-fit gap-1">
                    <button
                      onClick={() => setPersonnelTab('matrix')}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200",
                        personnelTab === 'matrix'
                          ? "bg-[#28B8A6] text-white shadow-md shadow-[#28B8A6]/20"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                      )}
                    >
                      Matriks Absensi & Kinerja Harian
                    </button>
                    <button
                      onClick={() => setPersonnelTab('list')}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200",
                        personnelTab === 'list'
                          ? "bg-[#28B8A6] text-white shadow-md shadow-[#28B8A6]/20"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                      )}
                    >
                      Ringkasan Personil
                    </button>
                 </div>

                 {/* Condensed Matrix View */}
                 {personnelTab === 'matrix' ? (
                   <div className="space-y-4">
                     {uniqueDates.length === 0 ? (
                       <div className="text-center py-20 border border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                         <Calendar size={48} className="mx-auto text-gray-300 mb-3 animate-pulse" />
                         <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Data Absensi & Kinerja sedang dimuat...</p>
                         <p className="text-xs text-gray-400 mt-1">Harap tunggu sementara kami menyinkronkan data dari sheet Anda.</p>
                       </div>
                     ) : (
                       <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                         <div className="overflow-x-auto max-w-full select-none custom-scrollbar">
                           <table className="w-full border-collapse text-center">
                             <thead>
                               {/* Top Month Header Banner style */}
                               <tr className="bg-gray-50/30 border-b border-gray-100">
                                 <th className="sticky left-0 bg-[#fbfcfd] z-20 px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                                   OPERATOR / TANGGAL
                                 </th>
                                 {uniqueDates.map((date) => {
                                   const day = date.split(" ")[0];
                                   const monthName = date.split(" ").slice(1).join(" ");
                                   return (
                                     <th 
                                       key={date} 
                                       title={date}
                                       className="px-2 py-4 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 min-w-[48px] hover:bg-gray-100/50 cursor-pointer text-center"
                                     >
                                       <div className="text-xs font-black text-gray-700 leading-none">{day}</div>
                                       <div className="text-[7px] text-gray-400 font-bold tracking-tight mt-0.5 opacity-80 leading-none">{date.split(" ")[1]}</div>
                                     </th>
                                   );
                                 })}
                                 <th className="px-6 py-4 text-[10px] font-black text-[#28B8A6] uppercase tracking-widest min-w-[100px] border-l border-gray-100">
                                   TOTAL VOL
                                 </th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50 font-mono">
                               {filteredOperators.map((op) => {
                                 let rowTotal = 0;
                                 return (
                                   <tr 
                                     key={op.id} 
                                     onClick={() => openOperatorDetail(op)}
                                     className="group hover:bg-[#28B8A6]/5 transition-all cursor-pointer"
                                   >
                                     {/* Operator Sticky Name Column */}
                                     <td className="sticky left-0 bg-white group-hover:bg-[#f5fbfb] py-3.5 px-6 text-left border-r border-gray-100 z-10 font-bold min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.015)] transition-colors">
                                       <div>
                                         <p className="text-sm font-black text-gray-950 group-hover:text-[#28B8A6] truncate">{op.name}</p>
                                         <div className="flex items-center gap-2 mt-0.5">
                                           <span className={cn(
                                             "px-1.5 py-0.5 rounded-[4px] text-[7px] font-black tracking-tighter leading-none uppercase",
                                             op.status === Status.ACTIVE ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                                           )}>
                                             {op.status === Status.ACTIVE ? 'AKTIF' : 'OFF'}
                                           </span>
                                           <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest opacity-80">
                                             {op.shift}
                                           </span>
                                         </div>
                                       </div>
                                     </td>

                                     {/* Daily volumes mapped from lookups */}
                                     {uniqueDates.map((date) => {
                                       const dayData = workByDate[op.id]?.[date];
                                       const volume = dayData ? Number((dayData.bt * 0.6 + dayData.su * 0.4).toFixed(1)) : 0;
                                       rowTotal += volume;

                                       return (
                                         <td 
                                           key={date} 
                                           title={`${op.name} • ${date} • ${volume} Berkas`}
                                           className={cn(
                                             "py-3.5 px-2 text-xs border-r border-gray-50 min-w-[48px] transition-all",
                                             volume > 0 
                                               ? "bg-emerald-50/70 text-emerald-700 font-extrabold" 
                                               : "text-gray-300 font-semibold bg-gray-50/10"
                                           )}
                                         >
                                           {volume}
                                         </td>
                                       );
                                      })}

                                     {/* Row total column */}
                                     <td className="py-3.5 px-6 font-bold text-gray-900 text-sm align-middle min-w-[100px] border-l border-gray-100">
                                       <span className="inline-block px-3 py-1 bg-gray-50 border border-gray-150 rounded-xl font-bold font-mono group-hover:bg-white transition-colors">
                                         {rowTotal}
                                       </span>
                                     </td>
                                   </tr>
                                 );
                               })}

                               {/* Column sum footer matching spreadsheet row totals */}
                               <tr className="bg-gray-50/50 border-t-2 border-gray-100 font-bold">
                                 <td className="sticky left-0 bg-[#fbfcfd] py-4 px-6 text-left font-black text-gray-700 text-xs tracking-wider z-10 border-r border-gray-100 min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.015)]">
                                   TOTAL KINERJA
                                 </td>
                                 {uniqueDates.map((date) => {
                                   const colTotal = Number(filteredOperators.reduce((sum, op) => {
                                     const dayData = workByDate[op.id]?.[date];
                                     return sum + (dayData ? (dayData.bt * 0.6 + dayData.su * 0.4) : 0);
                                   }, 0).toFixed(1));

                                   return (
                                     <td 
                                       key={date}
                                       title={`TOTAL • ${date} • ${colTotal} Berkas`}
                                       className={cn(
                                         "py-4 px-2 text-xs font-black border-r border-gray-100 min-w-[48px]",
                                         colTotal > 0 ? "text-emerald-800 bg-emerald-50/20" : "text-gray-400"
                                       )}
                                     >
                                       {colTotal}
                                     </td>
                                   );
                                 })}
                                 {/* Grand Total Footer */}
                                 <td className="py-4 px-6 text-sm font-black text-emerald-800 bg-emerald-50/80 min-w-[100px] border-l border-gray-100">
                                   <span className="inline-block px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-xl shadow-sm">
                                     {Number(filteredOperators.reduce((total, op) => {
                                       return total + op.workData.reduce((sum, d) => sum + (d.bt * 0.6 + d.su * 0.4), 0);
                                     }, 0).toFixed(1))}
                                   </span>
                                 </td>
                               </tr>
                             </tbody>
                           </table>
                         </div>
                       </div>
                     )}
                   </div>
                 ) : (
                   /* Standard Summary List View */
                   <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-100 italic">
                              <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none border-r border-gray-50">Operator</th>
                              <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none border-r border-gray-50 text-center">Status</th>
                              <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none border-r border-gray-50">Grup / Shift</th>
                              <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none border-r border-gray-50 text-center">Produktivitas</th>
                              <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right leading-none">Kehadiran</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 uppercase font-mono">
                            {filteredOperators.map((op) => {
                              const daysPresent = op.workData.filter(d => d.isPresent).length;
                              const totalDays = op.workData.length;
                              const attRate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 0;
                              
                              return (
                                <tr 
                                  key={op.id} 
                                  onClick={() => openOperatorDetail(op)}
                                  className="group hover:bg-[#28B8A6]/5 transition-colors cursor-pointer"
                                >
                                  <td className="py-5 px-6 font-mono border-r border-gray-50">
                                      <p className="text-sm font-black text-gray-900 group-hover:text-[#28B8A6]">{op.name}</p>
                                      <p className="text-[9px] font-bold text-gray-400 mt-0.5">ID: {op.id.slice(0, 8)}...</p>
                                  </td>
                                  <td className="py-5 px-6 text-center border-r border-gray-50">
                                     <span className={cn(
                                       "px-2 py-0.5 rounded text-[9px] font-black tracking-tighter leading-none inline-block",
                                       op.status === Status.ACTIVE ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                                     )}>
                                       {op.status === Status.ACTIVE ? 'AKTIF' : 'OFF'}
                                     </span>
                                  </td>
                                  <td className="py-5 px-6 border-r border-gray-50">
                                    <p className="text-xs font-bold text-gray-650">{op.jabatan}</p>
                                    <p className="text-[10px] font-black text-gray-400 opacity-60 italic mt-0.5">{op.shift}</p>
                                  </td>
                                  <td className="py-5 px-6 text-center border-r border-gray-50">
                                     <div className="flex items-center justify-center gap-4">
                                        <div className="text-center">
                                          <p className="text-xs font-black text-blue-600">
                                            {op.workData.reduce((acc, d) => acc + d.bt, 0)}
                                          </p>
                                          <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mt-0.5">BT</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs font-black text-emerald-600">
                                            {op.workData.reduce((acc, d) => acc + d.su, 0)}
                                          </p>
                                          <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mt-0.5">SU</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-5 px-6 text-right">
                                     <p className="text-xs font-black text-gray-900 tracking-tighter">{attRate.toFixed(0)}%</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {currentView === 'finance' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Rekapitulasi Pembiayaan Ops</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Kalkulasi Gaji Berdasarkan Produksi Berkas</p>
                    </div>
                    {activeProject && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleExportToExcel}
                          className="flex items-center justify-center gap-2 bg-[#28B8A6] hover:bg-teal-600 text-white font-black uppercase text-[11px] tracking-widest px-5 py-3 rounded-2xl shadow-lg shadow-[#28B8A6]/20 transition-all hover:scale-[1.02] cursor-pointer"
                          title="Ekspor Rekapitulasi Pembiayaan ke Excel (.xlsx)"
                        >
                          <FileSpreadsheet size={16} />
                          Cetak XLSX
                        </button>
                      </div>
                    )}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 italic font-mono">
                          <th className="pb-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Personil</th>
                          <th className="pb-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing (BT)</th>
                          <th className="pb-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing (SU)</th>
                          <th className="pb-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-mono">
                        {(activeProject ? operators : []).map((op) => {
                          const opBT = Number(op.workData.reduce((acc, d) => acc + d.bt, 0).toFixed(1));
                          const opSU = Number(op.workData.reduce((acc, d) => acc + d.su, 0).toFixed(1));
                          const btPay = opBT * (activeProject?.salaryConfig.priceBT || 0);
                          const suPay = opSU * (activeProject?.salaryConfig.priceSU || 0);
                          const total = btPay + suPay;
                          
                          return (
                            <tr 
                              key={op.id} 
                              onClick={() => openOperatorDetail(op)}
                              className="group hover:bg-[#28B8A6]/5 transition-colors cursor-pointer"
                            >
                              <td className="py-5 px-4">
                                <p className="text-sm font-black text-gray-900 group-hover:text-[#28B8A6] transition-colors tracking-tighter">{op.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">VOL: {Number((opBT + opSU).toFixed(1))}</p>
                              </td>
                              <td className="py-5 px-4">
                                <p className="text-[11px] font-black text-blue-500">{formatCurrency(btPay)}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase underline decoration-dotted">{opBT} Verifikasi</p>
                              </td>
                              <td className="py-5 px-4">
                                <p className="text-[11px] font-black text-emerald-500">{formatCurrency(suPay)}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase underline decoration-dotted">{opSU} Verifikasi</p>
                              </td>
                              <td className="py-5 px-4 text-right">
                                <div className="inline-block bg-gray-900 text-white px-4 py-2 rounded-xl shadow-lg shadow-gray-200">
                                  <p className="text-xs font-black">{formatCurrency(total)}</p>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {(!activeProject) && (
                          <tr>
                            <td colSpan={5} className="py-20 text-center">
                               <div className="flex flex-col items-center gap-3">
                                  <Wallet size={40} className="text-gray-200" />
                                  <div>
                                    <p className="text-sm font-black text-gray-400 uppercase italic tracking-widest">Hanya Tersedia di Dashboard Proyek Spesifik</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1">Gunakan tab Monitoring Proyek untuk melihat konsolidasi global</p>
                                  </div>
                               </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>

        {currentView === 'overview' && (
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-[#28B8A6] p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-[#28B8A6]/20 flex-1 relative overflow-hidden group">
               <div className="relative z-10">
                 <h2 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-6 font-mono">Progres Pencapaian</h2>
                 <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-black mb-3 uppercase tracking-[0.15em]">
                         <span>Realisasi Target</span>
                         <span>{(activeStats?.completionRate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${activeStats?.completionRate || 0}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)] relative z-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                       <div>
                         <p className="text-[10px] font-black opacity-60 uppercase mb-1">Target</p>
                         <p className="text-xl font-black">{(activeProject ? activeProject.targetTotal : (activeStats as any)?.totalTarget || 0).toLocaleString()}</p>
                       </div>
                       <div>
                         <p className="text-[10px] font-black opacity-60 uppercase mb-1">Capaian</p>
                         <p className="text-xl font-black">{(activeStats?.totalVerified || 0).toLocaleString()}</p>
                       </div>
                    </div>
                 </div>
               </div>
               <div className="absolute bottom-0 right-0 p-4 translate-x-1/4 translate-y-1/4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <CheckCircle2 size={300} />
               </div>
            </div>

            <div className="bg-white border border-gray-100 p-6 md:p-8 rounded-3xl shadow-sm">
               <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 font-mono tracking-tighter italic">Workforce Split</h2>
               <div className="h-[180px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={[
                         { name: 'BT Production', value: activeStats?.totalBT || 0 },
                         { name: 'SU Production', value: activeStats?.totalSU || 0 }
                       ]}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={8}
                       dataKey="value"
                       stroke="none"
                     >
                       <Cell fill="#3B82F6" />
                       <Cell fill="#10B981" />
                     </Pie>
                     <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
               <div className="flex flex-col gap-3 mt-6">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Buku Tanah</span>
                    </div>
                    <span className="text-xs font-black text-gray-900">{(activeStats?.totalBT || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Surat Ukur</span>
                    </div>
                    <span className="text-xs font-black text-gray-900">{(activeStats?.totalSU || 0).toLocaleString()}</span>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Ledger */}
      {currentView === 'overview' && kmUser?.role !== 'bpn' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-black tracking-tight text-gray-800">{activeProject ? 'Ledger Personil PT. KM' : 'Top Performer Global'}</h2>
              <p className="text-sm text-gray-400 mt-1">
                Daftar operator {activeProject ? `untuk project ${activeProject.name}` : `untuk project BPN`}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#28B8A6] transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama personil..." 
                  className="bg-white border border-gray-200 rounded-2xl px-5 py-3 pl-12 text-xs font-semibold focus:ring-4 focus:ring-[#28B8A6]/10 transition-all w-full lg:w-80 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                className="bg-white border border-gray-200 rounded-2xl px-6 py-3 text-xs text-gray-600 font-bold focus:ring-4 focus:ring-[#28B8A6]/10 transition-all cursor-pointer shadow-sm uppercase tracking-widest"
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as any)}
              >
                <option value="ALL">Semua Shift</option>
                <option value={Shift.SIANG}>Shift Siang</option>
                <option value={Shift.MALAM}>Shift Malam</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-50/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-6 col-header">Identitas</th>
                    <th className="px-8 py-6 col-header">Jabatan</th>
                    <th className="px-8 py-6 col-header">Status & Shift</th>
                    <th className="px-8 py-6 col-header text-right">Rekap (BT/SU)</th>
                    {kmUser && kmUser.role !== 'bpn' && (
                      <th className="px-8 py-6 col-header text-right">Estimasi Gaji</th>
                    )}
                    <th className="px-8 py-6 col-header">Performa (14 Hari)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOperators.map((op, i) => {
                    const opBT = Number(op.workData.reduce((acc, d) => acc + d.bt, 0).toFixed(1));
                    const opSU = Number(op.workData.reduce((acc, d) => acc + d.su, 0).toFixed(1));
                    const opSalary = activeProject 
                      ? (opBT * activeProject.salaryConfig.priceBT) + (opSU * activeProject.salaryConfig.priceSU)
                      : 0;

                    return (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        key={op.id} 
                        onClick={() => openOperatorDetail(op)}
                        className="hover:bg-[#28B8A6]/5 transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-[#28B8A6]/10 flex items-center justify-center text-[#28B8A6] font-black text-sm uppercase group-hover:rotate-6 transition-transform">
                              {op.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-sm text-gray-900 group-hover:text-[#28B8A6] transition-colors uppercase tracking-tight">{op.name}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {op.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "text-[10px] font-black tracking-widest px-3 py-1.5 rounded-lg border uppercase",
                            op.jabatan === "LEADER" ? "bg-[#28B8A6] text-white border-[#28B8A6]" :
                            op.jabatan === "QC" ? "bg-amber-100 text-amber-700 border-amber-200" :
                            "bg-gray-100 text-gray-500 border-gray-200"
                          )}>
                            {op.jabatan}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex flex-col gap-1.5">
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", op.status === Status.ACTIVE ? "bg-emerald-500 shadow-[0_0_8px_#10B981]" : "bg-gray-300")} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                    {op.status === Status.ACTIVE ? "Operational" : "Archived"}
                                  </span>
                               </div>
                               <div className="text-[9px] font-black text-[#28B8A6]/50 uppercase tracking-widest pl-4">
                                 {op.shift}
                               </div>
                            </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="text-sm font-black text-gray-900 leading-none mb-1">{(opBT * 0.6 + opSU * 0.4).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</div>
                          <div className="text-[10px] font-bold text-gray-400 capitalize">{opBT} BT • {opSU} SU</div>
                        </td>
                        {kmUser && kmUser.role !== 'bpn' && (
                          <td className="px-8 py-6 text-right">
                            <div className="text-sm font-mono font-black text-[#28B8A6]">{formatCurrency(opSalary)}</div>
                          </td>
                        )}
                        <td className="px-8 py-6">
                          <div className="flex gap-1 h-8 items-end w-36 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                            {op.workData.slice(-14).map((d, idx) => {
                              const vol = Number((d.bt * 0.6 + d.su * 0.4).toFixed(1));
                              return (
                                <div 
                                  key={idx}
                                  className={cn(
                                    "flex-1 rounded-t-lg transition-all duration-300",
                                    vol > op.targetPerDay ? "bg-emerald-500" : 
                                    vol > 0 ? "bg-[#28B8A6]" : "bg-gray-200"
                                  )}
                                  style={{ 
                                    height: vol > 0 ? `${Math.min(100, (vol / (op.targetPerDay * 1.5)) * 100)}%` : '15%'
                                  }}
                                />
                              );
                            })}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredOperators.length === 0 && (
              <div className="p-24 text-center flex flex-col items-center gap-6 text-gray-400">
                <Search size={50} className="opacity-10" />
                <p className="italic font-bold text-sm tracking-tight">Tidak ada personil yang sesuai dengan kriteria filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend / Quick Help */}
        <div className="bg-gray-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
           <div className="relative z-10 max-w-2xl text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-4 italic">KM OPERATIONAL GUIDELINES</h3>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed mb-6 font-serif">
                Dashboard ini tersinkronisasi langsung dengan {activeProject ? activeProject.sheetIds.length : allProjects.length} Google Sheet yang dikelola oleh masing-masing Leader Proyek di lapangan. Data pembiayaan dihitung secara otomatis berdasarkan volume verifikasi berkas.
              </p>
              {activeProject && kmUser && kmUser.role !== 'bpn' && (
                <div className="flex justify-center md:justify-start gap-8">
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#28B8A6] mb-2">Buku Tanah (BT)</p>
                      <p className="text-base md:text-lg font-mono font-bold">{formatCurrency(activeProject.salaryConfig.priceBT)} / berkas</p>
                  </div>
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Surat Ukur (SU)</p>
                      <p className="text-base md:text-lg font-mono font-bold">{formatCurrency(activeProject.salaryConfig.priceSU)} / berkas</p>
                  </div>
                </div>
              )}
           </div>
           
           <div className="relative z-10 text-center md:text-right">
              <div className="inline-block p-6 border-2 border-white/5 rounded-3xl bg-white/5 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Build Identifier</p>
                <p className="text-xl font-black font-mono tracking-tighter">KM-BPN-VERVAL</p>
                <p className="text-[10px] opacity-40 mt-2">STABLE RELEASE</p>
              </div>
           </div>

           <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Building2 size={400} />
           </div>
        </div>
      </main>
    </div>
  );
}

