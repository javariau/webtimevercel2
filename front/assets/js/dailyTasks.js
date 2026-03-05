
// --- DAILY TASK TRACKING SYSTEM (SUPABASE VERSION) ---

// Fungsi Render UI Tugas (Dipanggil di tasks.html)
window.renderDailyTasks = async function() {
    const container = document.getElementById('dailyTasksContainer');
    if (!container) return;

    try {
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();

        if (!user) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Silakan login untuk melihat tugas harian.</div>`;
            return;
        }

        // 1. Ambil Master Tugas (tasks)
        let { data: tasks, error: taskErr } = await sb
            .from('tasks')
            .select('*')
            .eq('is_daily', true)
            .order('id', { ascending: true });

        if (taskErr || !tasks || tasks.length === 0) {
            // Fallback jika tabel kosong: Buat data dummy di memori agar UI tidak rusak
            console.warn('Tabel tasks kosong atau error, menggunakan fallback.');
            tasks = [
                { id: 1, title: 'Login Harian', description: 'Login ke aplikasi setiap hari.', target_count: 1, points_reward: 20, type: 'daily_login' },
                { id: 2, title: 'Baca 1 Materi', description: 'Baca minimal 1 materi sejarah.', target_count: 1, points_reward: 50, type: 'read_material' },
                { id: 3, title: 'Main 1 Game', description: 'Mainkan dan menangkan 1 game.', target_count: 1, points_reward: 100, type: 'play_game' }
            ];
        }

        // 2. Ambil Progres User (user_tasks)
        // Kita butuh left join, tapi karena supabase-js v2 agak strict, kita ambil terpisah dulu
        const { data: userTasks, error: utErr } = await sb
            .from('user_tasks')
            .select('*')
            .eq('user_id', user.id);

        // Map progres ke tugas
        const tasksWithProgress = tasks.map(task => {
            const userTask = userTasks ? userTasks.find(ut => ut.task_id === task.id) : null;
            
            // Cek reset harian (jika last_updated_at bukan hari ini)
            let currentProgress = 0;
            let isCompleted = false;
            let isClaimed = false; // Kita perlu field 'is_claimed' di DB, kalau belum ada kita anggap sama dengan isCompleted sementara

            if (userTask) {
                const lastUpdate = new Date(userTask.last_updated_at);
                const today = new Date();
                const isSameDay = lastUpdate.getDate() === today.getDate() && 
                                  lastUpdate.getMonth() === today.getMonth() && 
                                  lastUpdate.getFullYear() === today.getFullYear();
                
                if (isSameDay) {
                    currentProgress = userTask.current_progress;
                    isCompleted = userTask.is_completed;
                    // Asumsi: jika completed, berarti sudah diklaim (atau kita butuh kolom status klaim terpisah)
                    // Untuk saat ini kita anggap completed = claimed agar aman
                    isClaimed = isCompleted; 
                } else {
                    // Reset progres di UI (di DB akan direset saat update berikutnya)
                    currentProgress = 0;
                    isCompleted = false;
                }
            }

            return { ...task, currentProgress, isCompleted, isClaimed };
        });

        // Render UI
        container.innerHTML = tasksWithProgress.map(t => {
            const percent = Math.min((t.currentProgress / t.target_count) * 100, 100);
            
            let btnHtml = '';
            if (t.isCompleted) {
                btnHtml = `<button class="btn-secondary" disabled style="width:100%; font-size:12px; opacity:0.7; background: #e0e0e0; color: #666; border: none; padding: 8px;"><i class="fas fa-check-double"></i> Selesai</button>`;
            } else if (t.currentProgress >= t.target_count) {
                // Siap Klaim - Perbaikan Style Tombol
                btnHtml = `<button class="btn-primary" onclick="claimTaskReward(${t.id})" style="width:100%; font-size:12px; background: #4caf50; color: white; border: none; padding: 10px; cursor: pointer; font-weight: bold; border-radius: 8px; box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3); animation: pulse 2s infinite;"><i class="fas fa-gift"></i> KLAIM +${t.points_reward} XP</button>`;
            } else {
                btnHtml = `<button class="btn-secondary" disabled style="width:100%; font-size:12px; background: #f5f5f5; color: #999; border: 1px solid #ddd; padding: 8px;">${t.currentProgress}/${t.target_count}</button>`;
            }

            let icon = 'star';
            if (t.type === 'read_material') icon = 'book-open';
            if (t.type === 'play_game') icon = 'gamepad';
            if (t.type === 'daily_login') icon = 'calendar-check';

            return `
            <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:var(--bg-light); display:flex; align-items:center; justify-content:center; color:var(--primary);">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div>
                        <h4 style="margin:0; font-size:14px;">${t.title}</h4>
                        <span style="font-size:11px; color:var(--text-light);">+${t.points_reward} XP</span>
                    </div>
                </div>
                
                <div style="margin-bottom:12px;">
                    <div style="height:6px; background:#eee; border-radius:3px; overflow:hidden;">
                        <div style="height:100%; width:${percent}%; background:var(--primary); transition:width 0.3s;"></div>
                    </div>
                </div>
                
                ${btnHtml}
            </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Error render tasks:', e);
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: red;">Gagal memuat tugas.</div>`;
    }
};

// Fungsi Track (Update Progress)
window.trackDailyTask = async function(taskType, amount = 1) {
    try {
        console.log(`Tracking task: ${taskType}, amount: ${amount}`);
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // 1. Coba cari Task berdasarkan tipe persis
        let { data: tasks } = await sb.from('tasks').select('id, target_count, type, title').eq('is_daily', true);
        
        if (!tasks || tasks.length === 0) {
            console.warn('No daily tasks found in DB');
            return;
        }

        // Filter di client side agar lebih fleksibel (fuzzy match)
        // Mapping tipe kode -> kata kunci di database
        const keywords = {
            'read_material': ['baca', 'read', 'materi', 'material'],
            'play_game': ['main', 'play', 'game', 'kuis', 'quiz'],
            'daily_login': ['login', 'masuk']
        };

        // Cari task yang cocok
        const relevantTasks = tasks.filter(t => {
            // Cek exact match tipe
            if (t.type === taskType) return true;
            
            // Cek keywords di title atau type
            const searchTerms = keywords[taskType] || [];
            const text = (t.title + ' ' + (t.type || '')).toLowerCase();
            return searchTerms.some(k => text.includes(k));
        });

        if (relevantTasks.length === 0) {
            console.log(`No relevant task found for type: ${taskType}`);
            return;
        }

        console.log('Found relevant tasks:', relevantTasks);

        // Update semua task yang relevan
        for (const task of relevantTasks) {
            // Cek User Task yang ada
            const { data: userTask } = await sb
                .from('user_tasks')
                .select('*')
                .eq('user_id', user.id)
                .eq('task_id', task.id)
                .maybeSingle();

            let newProgress = amount;
            let isCompleted = false;

            // Logika Reset Harian & Update
            if (userTask) {
                const lastUpdate = new Date(userTask.last_updated_at);
                const today = new Date();
                const isSameDay = lastUpdate.getDate() === today.getDate() && 
                                  lastUpdate.getMonth() === today.getMonth() && 
                                  lastUpdate.getFullYear() === today.getFullYear();
                
                if (isSameDay) {
                    if (userTask.is_completed) continue; // Skip jika sudah selesai
                    newProgress = userTask.current_progress + amount;
                } else {
                    // Hari baru, reset progress
                    newProgress = amount;
                }
            }

            // Batasi progres agar tidak melebihi target (opsional, tapi bagus untuk UI)
            if (newProgress > task.target_count) newProgress = task.target_count;

            console.log(`Updating task ${task.id} (${task.title}): ${newProgress}/${task.target_count}`);

            // Upsert (Insert or Update)
            const { error } = await sb.from('user_tasks').upsert({
                user_id: user.id,
                task_id: task.id,
                current_progress: newProgress,
                last_updated_at: new Date().toISOString(),
                is_completed: false // Tetap false, biar user klik klaim manual
            }, { onConflict: 'user_id, task_id' });

            if (error) console.error('Upsert failed:', error);
        }

        if (window.renderDailyTasks) {
            window.renderDailyTasks(); // Refresh UI real-time
        }

    } catch (e) {
        console.error('Track error:', e);
    }
};

// Fungsi Klaim Hadiah
window.claimTaskReward = async function(taskId) {
    console.log('Claiming reward for task:', taskId);
    
    // Cari tombol yang diklik dan ubah statusnya LANGSUNG (Visual Feedback)
    const buttons = document.querySelectorAll('button');
    let clickedBtn = null;
    for (let btn of buttons) {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`claimTaskReward(${taskId})`)) {
            clickedBtn = btn;
            break;
        }
    }

    if (clickedBtn) {
        clickedBtn.disabled = true;
        clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        clickedBtn.style.background = '#9e9e9e';
        clickedBtn.style.cursor = 'wait';
        clickedBtn.style.animation = 'none';
    }

    try {
        // Hapus modal lama jika ada
        const oldModal = document.getElementById('claimSuccessModal');
        if (oldModal) oldModal.remove();

        // Buat Modal
        let modal = document.createElement('div');
        modal.id = 'claimSuccessModal';
        modal.className = 'modal-overlay';
        // Z-Index Max Int untuk memastikan selalu di paling atas
        modal.style.cssText = 'position:fixed !important; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5) !important; z-index:2147483647 !important; display:flex !important; align-items:center !important; justify-content:center !important; opacity:0; transition:opacity 0.3s;';
        
        // Isi modal sementara (loading)
        modal.innerHTML = `
            <div class="modal-content" style="background:white; padding:30px; border-radius:20px; text-align:center; max-width:300px; transform:scale(0.8); transition:transform 0.3s; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <div style="font-size:40px; margin-bottom:15px;"><i class="fas fa-spinner fa-spin" style="color:#4caf50;"></i></div>
                <h3 style="margin:0; color:#333;">Memproses...</h3>
            </div>
        `;
        document.body.appendChild(modal);

        // Tampilkan
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        }, 50);

        // 2. Proses Database
        const sb = await getSupabaseClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error('User not found');

        // Ambil info reward
        const { data: task } = await sb.from('tasks').select('points_reward').eq('id', taskId).single();
        if (!task) throw new Error('Task not found');

        // Update User Task jadi Completed
        const { error } = await sb.from('user_tasks').update({
            is_completed: true,
            last_updated_at: new Date().toISOString()
        }).eq('user_id', user.id).eq('task_id', taskId);

        if (error) throw error;

        // Tambah XP User
        let finalXp = 0;
        const { data: profile } = await sb.from('profiles').select('xp').eq('id', user.id).single();
        if (profile) {
            const newXp = (profile.xp || 0) + task.points_reward;
            finalXp = newXp;
            await sb.from('profiles').update({ xp: newXp }).eq('id', user.id);
            if (window.updateUserUI) window.updateUserUI();
        }

        // 3. Update Modal jadi SUKSES
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div style="font-size:50px; margin-bottom:15px; animation: bounce 1s infinite;">🎉</div>
            <h3 style="margin:0; color:#333;">Selamat!</h3>
            <p style="color:#666; margin:10px 0 5px;">Kamu mendapatkan <b style="color:#4caf50;">+${task.points_reward} XP</b></p>
            <p style="color:#888; font-size:12px; margin-bottom:20px;">Total XP: <b>${finalXp}</b></p>
            <button class="close-modal-btn" style="background:#4caf50; color:white; border:none; padding:10px 25px; border-radius:50px; cursor:pointer; font-weight:bold;">
                Mantap!
            </button>
        `;

        // Update tombol di kartu jadi "Selesai" (Permanen)
        if (clickedBtn) {
            clickedBtn.innerHTML = '<i class="fas fa-check-double"></i> Selesai';
            clickedBtn.style.background = '#e0e0e0';
            clickedBtn.style.color = '#666';
            clickedBtn.style.cursor = 'default';
        }

        // Pasang event listener tutup (Gunakan querySelector pada modal untuk lebih aman)
        const closeBtn = modal.querySelector('.close-modal-btn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                modal.style.opacity = '0';
                setTimeout(() => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                    // Refresh UI setelah tutup modal
                    if (window.renderDailyTasks) window.renderDailyTasks();
                }, 300);
            };
        }

    } catch (e) {
        console.error('Claim error:', e);
        
        // Reset tombol jika gagal
        if (clickedBtn) {
            clickedBtn.disabled = false;
            clickedBtn.innerHTML = '<i class="fas fa-gift"></i> Coba Lagi';
            clickedBtn.style.background = '#ff5252';
            clickedBtn.style.cursor = 'pointer';
        }

        // Fallback Alert jika modal gagal
        alert('Gagal klaim hadiah. Cek koneksi internet.');
    }
};

// Init
if (window.location.pathname.endsWith('tasks.html')) {
    const initTasks = () => {
        console.log('Initializing Daily Tasks...');
        trackDailyTask('daily_login', 1);
        renderDailyTasks();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTasks);
    } else {
        initTasks(); // Run immediately if DOM is already ready
    }
}
