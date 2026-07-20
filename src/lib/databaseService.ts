import { supabase, isSupabaseConfigured } from './supabase';
import { KMUser, Project } from '../types';

export const DEFAULT_USERS: KMUser[] = [
  {
    username: 'admin',
    name: 'Super Admin KM',
    role: 'super_admin',
    password: 'km1234',
  },
  {
    username: 'admin_utama',
    name: 'Admin Utama KM',
    role: 'admin',
    password: 'admin',
  },
  {
    username: 'leader_malang',
    name: 'Leader BPN Malang',
    role: 'leader',
    password: 'km',
    projectId: 'bpn-kab-malang',
  },
  {
    username: 'bpn_malang',
    name: 'BPN Kabupaten Malang (Viewer)',
    role: 'bpn',
    password: 'bpn',
    projectId: 'bpn-kab-malang',
  }
];

export const databaseService = {
  // --- USERS ---
  async fetchUsers(): Promise<KMUser[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('km_users')
          .select('*');

        if (!error && data) {
          if (data.length > 0) {
            return data as KMUser[];
          } else {
            // Auto seed default users if the online database is newly created and empty
            for (const usr of DEFAULT_USERS) {
              await supabase.from('km_users').upsert({
                username: usr.username,
                name: usr.name,
                role: usr.role,
                password: usr.password || '',
                projectId: usr.projectId || null
              });
            }
            return DEFAULT_USERS;
          }
        } else if (error) {
          console.error("Supabase fetch users failed, switching to local:", error);
        }
      } catch (err) {
        console.warn("Got exception fetching users from Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('km_users');
    if (saved) return JSON.parse(saved);
    localStorage.setItem("km_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  },

  async saveUser(user: KMUser): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('km_users')
          .upsert({
            username: user.username,
            name: user.name,
            role: user.role,
            password: user.password || '',
            projectId: user.projectId || null
          });

        if (error) {
          console.error("Supabase save user failed:", error);
        }
      } catch (err) {
        console.warn("Supabase save user Exception:", err);
      }
    }

    // Always mirror to local storage as fallback/immediate cache
    const saved = localStorage.getItem('km_users');
    const list: KMUser[] = saved ? JSON.parse(saved) : DEFAULT_USERS;
    const idx = list.findIndex(u => u.username === user.username);
    if (idx !== -1) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    localStorage.setItem('km_users', JSON.stringify(list));
  },

  async deleteUser(username: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('km_users')
          .delete()
          .eq('username', username);

        if (error) {
          console.error("Supabase delete user failed:", error);
        }
      } catch (err) {
        console.warn("Supabase delete user exception:", err);
      }
    }

    const saved = localStorage.getItem('km_users');
    if (saved) {
      const list: KMUser[] = JSON.parse(saved);
      const updated = list.filter(u => u.username !== username);
      localStorage.setItem('km_users', JSON.stringify(updated));
    }
  },

  // --- PROJECTS ---
  async fetchProjects(initialProjects: Project[]): Promise<Project[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('km_projects')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!error && data) {
          if (data.length > 0) {
            return data.map((d: any) => ({
              id: d.id,
              name: d.name,
              location: d.location,
              targetTotal: d.targetTotal,
              targetPerDayOperator: d.targetPerDayOperator || 150,
              sheetIds: Array.isArray(d.sheetIds) ? d.sheetIds : JSON.parse(d.sheetIds || '[]'),
              salaryConfig: typeof d.salaryConfig === 'object' ? d.salaryConfig : JSON.parse(d.salaryConfig || '{"priceBT": 1500, "priceSU": 1000}'),
              startDate: d.startDate,
              endDate: d.endDate
            })) as Project[];
          } else {
            // Auto seed initial projects if empty
            for (const proj of initialProjects) {
              await supabase.from('km_projects').insert({
                id: proj.id,
                name: proj.name,
                location: proj.location,
                targetTotal: proj.targetTotal,
                targetPerDayOperator: proj.targetPerDayOperator || 150,
                sheetIds: proj.sheetIds,
                salaryConfig: proj.salaryConfig,
                startDate: proj.startDate,
                endDate: proj.endDate
              });
            }
            return initialProjects;
          }
        } else if (error) {
          console.error("Supabase fetch projects failed, switching to local:", error);
        }
      } catch (err) {
        console.warn("Got Exception fetching projects from Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('km_projects');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('km_projects', JSON.stringify(initialProjects));
    return initialProjects;
  },

  async saveProject(project: Project): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('km_projects')
          .upsert({
            id: project.id,
            name: project.name,
            location: project.location,
            targetTotal: project.targetTotal,
            targetPerDayOperator: project.targetPerDayOperator || 150,
            sheetIds: project.sheetIds,
            salaryConfig: project.salaryConfig,
            startDate: project.startDate,
            endDate: project.endDate
          });

        if (error) {
          console.error("Supabase save project failed:", error);
        }
      } catch (err) {
        console.warn("Supabase save project exception:", err);
      }
    }

    // Always mirror to localStorage as fallback/immediate cache
    const saved = localStorage.getItem('km_projects');
    const list: Project[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      list[idx] = project;
    } else {
      list.push(project);
    }
    localStorage.setItem('km_projects', JSON.stringify(list));
  },

  async deleteProject(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('km_projects')
          .delete()
          .eq('id', id);

        if (error) {
          console.error("Supabase delete project failed:", error);
        }
      } catch (err) {
        console.warn("Supabase delete project exception:", err);
      }
    }

    const saved = localStorage.getItem('km_projects');
    if (saved) {
      const list: Project[] = JSON.parse(saved);
      const updated = list.filter(p => p.id !== id);
      localStorage.setItem('km_projects', JSON.stringify(updated));
    }
  },

  // --- CUSTOM TARGETS ---
  async fetchCustomTargets(): Promise<Record<string, number>> {
    const saved = localStorage.getItem('km_operator_targets');
    const localTargets: Record<string, number> = saved ? JSON.parse(saved) : {};

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('km_operator_targets')
          .select('*');

        if (!error && data) {
          if (data.length > 0) {
            const map: Record<string, number> = {};
            data.forEach((d: any) => {
              map[d.id] = d.targetPerDay;
            });
            return map;
          } else if (Object.keys(localTargets).length > 0) {
            // Auto migrate local operator targets to Supabase if the online table is empty
            for (const [opId, targetVal] of Object.entries(localTargets)) {
              await supabase
                .from('km_operator_targets')
                .upsert({
                  id: opId,
                  targetPerDay: targetVal
                });
            }
            return localTargets;
          } else {
            return {};
          }
        } else if (error) {
          console.error("Supabase fetch operator targets failed, switching to local:", error);
        }
      } catch (err) {
        console.warn("Supabase fetch custom targets exception:", err);
      }
    }

    return localTargets;
  },

  async saveOperatorTarget(opId: string, targetPerDay: number): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('km_operator_targets')
          .upsert({
            id: opId,
            targetPerDay: targetPerDay
          });

        if (error) {
          console.error("Supabase save operator target failed:", error);
        }
      } catch (err) {
        console.warn("Supabase save target exception:", err);
      }
    }

    const saved = localStorage.getItem('km_operator_targets');
    const map = saved ? JSON.parse(saved) : {};
    map[opId] = targetPerDay;
    localStorage.setItem('km_operator_targets', JSON.stringify(map));
  }
};
export default databaseService;
