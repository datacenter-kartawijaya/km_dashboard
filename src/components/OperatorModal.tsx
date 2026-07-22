import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  TrendingUp, 
  Award, 
  Activity,
  ArrowUpRight,
  User,
  Clock,
  Target,
  Wallet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { OperatorRecord, Status } from '../types';

interface OperatorModalProps {
  operator: OperatorRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTarget?: (operatorId: string, newTarget: number) => void;
}

export function OperatorModal({ operator, isOpen, onClose, onSaveTarget }: OperatorModalProps) {
  const [tempTarget, setTempTarget] = useState(operator?.targetPerDay || 150);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      setTempTarget(operator.targetPerDay);
    }
  }, [operator]);

  if (!operator) return null;

  const totalBT = Number(operator.workData.reduce((acc, d) => acc + d.bt, 0).toFixed(1));
  const totalSU = Number(operator.workData.reduce((acc, d) => acc + d.su, 0).toFixed(1));
  const totalProduction = Number((totalBT * 0.6 + totalSU * 0.4).toFixed(1));
  const daysPresent = operator.workData.filter(d => d.isPresent).length;
  const totalDays = operator.workData.length;
  const attendanceRate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 0;
  
  const avgProduction = totalDays > 0 ? totalProduction / totalDays : 0;
  const bestDay = Number(Math.max(...operator.workData.map(d => d.bt * 0.6 + d.su * 0.4), 0).toFixed(1));

  const chartData = operator.workData.map(d => ({
    ...d,
    bt: Number((d.bt * 0.6).toFixed(1)),
    su: Number((d.su * 0.4).toFixed(1))
  }));

  // Hit Rate dan Konsistensi berdasarkan target harian yg ditentukan leader
  const activeDays = operator.workData.filter(d => d.isPresent);
  const daysMeetingTarget = activeDays.filter(d => (d.bt * 0.6 + d.su * 0.4) >= operator.targetPerDay).length;
  const targetHitRate = activeDays.length > 0 ? Math.round((daysMeetingTarget / activeDays.length) * 100) : 0;

  let consistencyScore = "Rendah (Low)";
  if (targetHitRate >= 80) {
    consistencyScore = "Tinggi (High)";
  } else if (targetHitRate >= 50) {
    consistencyScore = "Sedang (Medium)";
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Sidebar info */}
            <div className="w-full md:w-80 bg-gray-50 p-8 border-r border-gray-100 flex flex-col items-center text-center overflow-y-auto">
              <div className="w-24 h-24 bg-[#28B8A6] rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-[#28B8A6]/20 mb-6">
                {operator.name.charAt(0)}
              </div>
              
              <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase leading-none mb-2">{operator.name}</h2>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-500 tracking-widest uppercase">
                  {operator.jabatan}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                  operator.status === Status.ACTIVE 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {operator.status}
                </span>
              </div>

              <div className="w-full space-y-4 text-left">
                {[
                  { label: 'Total Produksi', value: totalProduction, sub: 'Berkas Terverifikasi', icon: Activity, color: 'text-[#28B8A6]' },
                  { label: 'Rata-rata Harian', value: avgProduction.toFixed(1), sub: 'Berkas / Hari', icon: TrendingUp, color: 'text-blue-600' },
                  { label: 'Kehadiran', value: `${attendanceRate.toFixed(0)}%`, sub: `${daysPresent} Hari Aktif`, icon: Calendar, color: 'text-rose-600' },
                  { label: 'Pencapaian Terbaik', value: bestDay, sub: 'Dalam 1 Hari', icon: Award, color: 'text-amber-600' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className={`p-2 rounded-xl bg-gray-50 ${stat.color}`}>
                       <stat.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-lg font-black text-gray-900 leading-tight">{stat.value}</p>
                    </div>
                  </div>
                ))}

                {/* Target Editor Section */}
                <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-[#28B8A6]/20 shadow-sm space-y-3 relative group overflow-hidden">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#28B8A6]/10 text-[#28B8A6]">
                         <Target size={18} />
                      </div>
                      <div className="flex-1">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Target Harian</p>
                         <p className="text-sm font-black text-gray-800 leading-none mt-1">{operator.targetPerDay} berkas</p>
                      </div>
                   </div>
                   
                   <div className="pt-2 border-t border-gray-50 flex items-center gap-2">
                      <input 
                         type="number"
                         value={tempTarget}
                         onChange={(e) => setTempTarget(parseInt(e.target.value) || 0)}
                         className="w-20 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-black text-center text-gray-800 outline-none focus:ring-2 focus:ring-[#28B8A6]/30 font-mono"
                       />
                       <span className="text-[9px] font-bold text-gray-400 uppercase">Berkas</span>
                       
                       {tempTarget !== operator.targetPerDay && (
                         <button
                           type="button"
                           disabled={isSaving}
                           onClick={async () => {
                             if (!onSaveTarget) return;
                             setIsSaving(true);
                             await onSaveTarget(operator.id, tempTarget);
                             setIsSaving(false);
                           }}
                           className="ml-auto bg-[#28B8A6] hover:bg-[#209c8c] text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg shadow-md hover:scale-[1.03] transition-all"
                         >
                           {isSaving ? 'Saving...' : 'SIMPAN'}
                         </button>
                       )}
                    </div>
                 </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 w-full">
                 <div className="flex items-center gap-2 text-gray-400 mb-4 px-2">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Shift Work</span>
                 </div>
                 <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 uppercase">{operator.shift}</span>
                    <div className="w-2 h-2 rounded-full bg-[#28B8A6] animate-pulse" />
                 </div>
              </div>
            </div>

            {/* Main view */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl transition-colors z-10 text-gray-400"
              >
                <X size={24} />
              </button>

              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[#28B8A6] mb-2">
                  <Target size={16} />
                  <span className="text-xs font-black tracking-widest uppercase">Performance Analytics</span>
                </div>
                <h3 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Grafik Produktivitas</h3>
                <p className="text-gray-500 mb-10 italic">Data pencapaian harian berdasarkan laporan verifikasi lapangan periodik.</p>

                <div className="h-[300px] mb-12">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="opColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#28B8A6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#28B8A6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
                        />
                        <Tooltip 
                          contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="bt" 
                          stackId="1"
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          fillOpacity={0} 
                          name="Buku Tanah"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="su" 
                          stackId="1"
                          stroke="#10B981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#opColor)"
                          name="Surat Ukur"
                        />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Work History Log</h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {[...operator.workData].sort((a, b) => {
                           const parseDateObj = (dStr: string) => {
                             const parts = dStr.split(" ");
                             if (parts.length === 3) {
                               const day = parseInt(parts[0], 10);
                               const monthStr = parts[1].toUpperCase();
                               const year = parseInt(parts[2], 10);
                               const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                               const monthIndex = months.indexOf(monthStr);
                               if (monthIndex !== -1) {
                                 return new Date(year, monthIndex, day).getTime();
                               }
                             }
                             const parsed = Date.parse(dStr);
                             return !isNaN(parsed) ? parsed : 0;
                           };
                           return parseDateObj(a.date) - parseDateObj(b.date);
                         }).map((day, idx) => (
                           <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#28B8A6]/30 transition-colors">
                              <div className="flex items-center gap-3">
                                 <div className={`w-2 h-2 rounded-full ${day.isPresent ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                 <span className="text-xs font-bold text-gray-700 tracking-tight">{day.date}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-black">
                                 <span className="text-blue-600">BT: {Number(day.bt.toFixed(1))}</span>
                                 <span className="text-emerald-600">SU: {Number(day.su.toFixed(1))}</span>
                                 <span className="bg-white px-2 py-1 rounded-lg shadow-sm">TOTAL: {Number((day.bt * 0.6 + day.su * 0.4).toFixed(1))}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
                      <div className="relative z-10">
                        <Award className="text-amber-400 mb-4" size={32} />
                        <h4 className="text-xl font-black mb-2">Achievement Analysis</h4>
                        <p className="text-gray-400 text-xs leading-relaxed mb-6">
                          Berdasarkan data performa terakhir, operator ini menunjukkan konsistensi yang baik dengan rata-rata harian mendekati target operasional.
                        </p>
                        
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Target Hit Rate</span>
                              </div>
                              <span className="text-xs font-black">{targetHitRate}%</span>
                           </div>
                           <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Consistency Score</span>
                                 </div>
                              <span className="text-xs font-black">{consistencyScore}</span>
                           </div>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                         <Activity size={180} />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
