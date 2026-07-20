import React, { useState, useEffect } from 'react';
import { X, Plus, Target, Wallet, Link as LinkIcon, Building2, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, SalaryConfig } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  onDelete?: (id: string) => void;
  project?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, onDelete, project }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    targetTotal: 150000,
    targetPerDayOperator: 150,
    sheetIds: [''],
    priceBT: 1500,
    priceSU: 1000,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        location: project.location,
        targetTotal: project.targetTotal,
        targetPerDayOperator: project.targetPerDayOperator || 150,
        sheetIds: project.sheetIds && project.sheetIds.length > 0 ? project.sheetIds : [''],
        priceBT: project.salaryConfig.priceBT,
        priceSU: project.salaryConfig.priceSU,
        startDate: project.startDate || '',
        endDate: project.endDate || ''
      });
    } else {
      setFormData({
        name: '',
        location: '',
        targetTotal: 150000,
        targetPerDayOperator: 150,
        sheetIds: [''],
        priceBT: 1500,
        priceSU: 1000,
        startDate: '',
        endDate: ''
      });
    }
  }, [project, isOpen]);

  const handleAddSheetId = () => {
    setFormData(prev => ({ ...prev, sheetIds: [...prev.sheetIds, ''] }));
  };

  const handleRemoveSheetId = (index: number) => {
    setFormData(prev => {
      const newIds = prev.sheetIds.filter((_, i) => i !== index);
      return { ...prev, sheetIds: newIds.length > 0 ? newIds : [''] };
    });
  };

  const handleSheetIdChange = (index: number, value: string) => {
    setFormData(prev => {
      const newIds = [...prev.sheetIds];
      newIds[index] = value;
      return { ...prev, sheetIds: newIds };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProject: Project = {
      id: project?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      location: formData.location,
      targetTotal: formData.targetTotal,
      targetPerDayOperator: formData.targetPerDayOperator,
      sheetIds: formData.sheetIds.filter(id => id.trim() !== ''),
      salaryConfig: {
        priceBT: formData.priceBT,
        priceSU: formData.priceSU
      },
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined
    };
    onSave(updatedProject);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  {project ? 'Edit Proyek' : 'Tambah Proyek Baru'}
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Konfigurasi Operasional</p>
              </div>
              <div className="flex items-center gap-2">
                {project && onDelete && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm('Apakah Anda yakin ingin menghapus proyek ini?')) {
                        onDelete(project.id);
                        onClose();
                      }
                    }}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={12} /> Nama Proyek
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: BPN Jombang"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    Lokasi / Daerah
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Contoh: Jawa Timur"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Target size={12} /> Target Total Berkas
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.targetTotal}
                      onChange={(e) => setFormData({ ...formData, targetTotal: parseInt(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Target size={12} /> Target Harian Operator (Standar)
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.targetPerDayOperator}
                      onChange={(e) => setFormData({ ...formData, targetPerDayOperator: parseInt(e.target.value) || 0 })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      Tanggal Mulai Proyek (Opsional)
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      Tanggal Selesai Proyek (Opsional)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <LinkIcon size={12} /> Google Sheet Links / IDs
                    </label>
                    <button 
                      type="button"
                      onClick={handleAddSheetId}
                      className="text-xs font-bold text-[#28B8A6] hover:underline"
                    >
                      + Tambah Link
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.sheetIds.map((id, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          required
                          type="text"
                          value={id}
                          onChange={(e) => handleSheetIdChange(idx, e.target.value)}
                          placeholder="Paste Link Google Sheet atau ID"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-[#28B8A6]/10 outline-none transition-all font-mono text-xs"
                        />
                        {formData.sheetIds.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveSheetId(idx)}
                            className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">
                    * Pastikan akses sheet: "Anyone with link can view" (Siapa saja dengan link dapat melihat).
                  </p>
                </div>
              </div>

              <div className="bg-[#28B8A6]/5 p-6 rounded-3xl space-y-4">
                <h3 className="text-xs font-black text-[#28B8A6] uppercase tracking-widest flex items-center gap-2">
                  <Wallet size={14} /> Konfigurasi Tarif Per Berkas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Buku Tanah (BT)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span>
                      <input
                        type="number"
                        value={formData.priceBT}
                        onChange={(e) => setFormData({ ...formData, priceBT: parseInt(e.target.value) })}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#28B8A6]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Surat Ukur (SU)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Rp</span>
                      <input
                        type="number"
                        value={formData.priceSU}
                        onChange={(e) => setFormData({ ...formData, priceSU: parseInt(e.target.value) })}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#28B8A6]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-white">
                <button
                  type="submit"
                  className="w-full bg-[#28B8A6] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#28B8A6]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {project ? <Save size={20} /> : <Plus size={20} />}
                  {project ? 'Perbarui Konfigurasi Proyek' : 'Simpan Konfigurasi Proyek'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
