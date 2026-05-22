import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Trash2, Shield, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Pencil } from 'lucide-react';
import { KMUser, Project, UserRole } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: KMUser[];
  projects: Project[];
  currentUser: KMUser | null;
  onSaveUser: (user: KMUser) => void;
  onDeleteUser: (username: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  projects,
  currentUser,
  onSaveUser,
  onDeleteUser,
}) => {
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('leader');
  const [projectId, setProjectId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const startEdit = (usr: KMUser) => {
    setEditingUsername(usr.username);
    setUsername(usr.username);
    setName(usr.name);
    setPassword(usr.password);
    setRole(usr.role);
    setProjectId(usr.projectId || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const cancelEdit = (keepMessage = false) => {
    setEditingUsername(null);
    setUsername('');
    setName('');
    setPassword('');
    setRole('leader');
    setProjectId('');
    if (!keepMessage) {
      setErrorMsg('');
      setSuccessMsg('');
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validations
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg('Username tidak boleh kosong');
      return;
    }
    if (cleanUsername.length < 3) {
      setErrorMsg('Username minimal 3 karakter');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong');
      return;
    }
    if (!password) {
      setErrorMsg('Password tidak boleh kosong');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('Password minimal 4 karakter');
      return;
    }

    // Check availability only when not editing
    if (!editingUsername) {
      const exists = users.some(u => u.username.toLowerCase() === cleanUsername);
      if (exists) {
        setErrorMsg(`User dengan username "${cleanUsername}" sudah terdaftar.`);
        return;
      }
    }

    // Prepare project binding
    let assignedProjId = undefined;
    if ((role === 'leader' || role === 'bpn') && projectId) {
      assignedProjId = projectId;
    }

    const newUser: KMUser = {
      username: editingUsername || cleanUsername,
      name: name.trim(),
      password: password,
      role,
      projectId: assignedProjId,
    };

    onSaveUser(newUser);

    if (editingUsername) {
      setSuccessMsg(`Informasi akun "${editingUsername}" berhasil diperbarui!`);
      cancelEdit(true);
    } else {
      setSuccessMsg(`User "${cleanUsername}" berhasil ditambahkan!`);
      // Reset fields
      setUsername('');
      setName('');
      setPassword('');
      setProjectId('');
    }
  };

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-cyan-100 text-cyan-750 border-cyan-200';
      case 'leader':
        return 'bg-indigo-100 text-indigo-750 border-indigo-200';
      case 'bpn':
        return 'bg-amber-100 text-amber-700 border-amber-250';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'leader': return 'Leader Proyek';
      case 'bpn': return 'Pihak BPN (Viewer)';
      default: return r;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
        />

        {/* Modal dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden border border-gray-100 max-h-[90vh]"
        >
          {/* Header Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-55 shadow-sm rounded-full bg-white border border-gray-100 z-10"
          >
            <X size={18} />
          </button>

          {/* Form Create/Edit User (Left Side) */}
          <div className="w-full md:w-5/12 bg-gray-50/50 p-8 border-r border-gray-100 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 bg-[#28B8A6]/10 rounded-2xl text-[#28B8A6]">
                {editingUsername ? <Pencil size={20} /> : <UserPlus size={20} />}
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">
                  {editingUsername ? 'Edit User' : 'Tambah User'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {editingUsername ? 'Ubah Informasi Akun' : 'Registrasi Akun Baru'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-450 mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!editingUsername}
                    placeholder="Contoh: leader_banyusin"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-[#28B8A6] focus:ring-1 focus:ring-[#28B8A6] font-mono lowercase disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
                {editingUsername && (
                  <p className="text-[9px] text-gray-400 font-semibold mt-1">
                    *Username tidak dapat diubah (sebagai ID unik).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-450 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Asrri Mongol"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-[#28B8A6]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-450 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 pr-10 text-xs font-semibold focus:outline-none focus:border-[#28B8A6] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-450 mb-2">Level / Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-[#28B8A6] cursor-pointer"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="leader">Leader Proyek</option>
                  <option value="bpn">Pihak BPN (Viewer)</option>
                </select>
              </div>

              {(role === 'leader' || role === 'bpn') && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-450 mb-2">Batas Akses Proyek</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-[#28B8A6] cursor-pointer text-red-650"
                  >
                    <option value="">-- PILIH PROYEK --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    *User dengan role ini hanya dapat melihat atau mengelola proyek yang terpilih.
                  </p>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                {editingUsername && (
                  <button
                    type="button"
                    onClick={() => cancelEdit()}
                    className="flex-1 bg-gray-100 text-gray-600 font-bold uppercase tracking-wider text-xs py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] bg-[#28B8A6] text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-[#28B8A6]/10 flex items-center justify-center gap-2"
                >
                  {editingUsername ? <CheckCircle2 size={14} /> : <UserPlus size={14} />}
                  {editingUsername ? 'Simpan Perubahan' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>

          {/* User List Panel (Right Side) */}
          <div className="w-full md:w-7/12 p-8 flex flex-col overflow-hidden">
            <div className="mb-4">
              <h3 className="font-black text-lg tracking-tight">Daftar Akun Pengguna</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Keseluruhan Personil KM Dash ({users.length})</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {users.map((usr) => {
                const assignedProj = projects.find(p => p.id === usr.projectId);
                const isSelf = currentUser?.username === usr.username;
                const isDefaultAdmin = usr.username === 'admin';

                return (
                  <div
                    key={usr.username}
                    className="flex justify-between items-center p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-gray-900 tracking-tight">{usr.name}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getRoleBadgeColor(usr.role)}`}>
                          {getRoleLabel(usr.role)}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-black uppercase bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">
                            Anda
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 font-mono">@{usr.username}</span>
                        <span className="text-[9px] text-gray-300">•</span>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 font-mono">
                          <Lock size={10} /> {usr.password ? '*'.repeat(usr.password.length) : 'N/A'}
                        </span>
                      </div>

                      {usr.projectId && (
                        <p className="text-[10px] font-black text-indigo-650 uppercase mt-1">
                          Proyek: {assignedProj ? assignedProj.name : `ID: ${usr.projectId}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit button */}
                      <button
                        onClick={() => startEdit(usr)}
                        className="p-2 text-gray-400 hover:text-[#28B8A6] hover:bg-teal-50 rounded-lg transition-all border border-transparent hover:border-teal-100"
                        title="Edit Data User"
                      >
                        <Pencil size={14} />
                      </button>

                      {!isDefaultAdmin && !isSelf && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus akun "${usr.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
                              onDeleteUser(usr.username);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                          title="Hapus Pengguna"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
