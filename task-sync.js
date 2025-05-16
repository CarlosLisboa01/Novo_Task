// Gerenciador de sincronização de tarefas com o servidor Supabase

/**
 * Sistema de Sincronização Global
 */
const GlobalSync = {
    // Configurações
    updateInterval: 5000, // 5 segundos
    isInitialized: false,
    lastUpdate: 0,
    
    // Cache de dados
    tasksCache: {},
    tasksByDate: {},
    
    // Callbacks registrados
    listeners: {
        'status-change': new Set(),
        'data-update': new Set(),
        'error': new Set()
    },
    
    // Inicializar sistema
    init: function() {
        if (this.isInitialized) return;
        
        console.log('[GlobalSync] Iniciando sistema de sincronização');
        
        // Iniciar sincronização periódica
        this.startPeriodicSync();
        
        // Configurar eventos globais
        this.setupGlobalEvents();
        
        this.isInitialized = true;
    },
    
    // Iniciar sincronização periódica
    startPeriodicSync: function() {
        console.log('[GlobalSync] Iniciando sincronização periódica');
        
        // Primeira sincronização imediata
        this.syncNow();
        
        // Configurar intervalo de sincronização
        setInterval(() => this.syncNow(), this.updateInterval);
    },
    
    // Realizar sincronização
    syncNow: async function(forceRefresh = false) {
        try {
            const now = Date.now();
            
            // Se não for forçado, respeitar o intervalo mínimo entre sincronizações
            if (!forceRefresh && (now - this.lastUpdate < this.updateInterval)) {
                return;
            }
            
            console.log(`[GlobalSync] Iniciando sincronização com servidor (forçada: ${forceRefresh})`);
            
            if (!navigator.onLine) {
                throw new Error('Sem conexão com a internet');
            }
            
            const updatedTasks = await window.supabaseApi.fetchTasks(forceRefresh);
            
            if (!updatedTasks) {
                throw new Error('Não foi possível obter dados do servidor');
            }
            
            // Atualizar cache por categoria
            this.tasksCache = updatedTasks;
            
            // Processar tarefas por data
            this.tasksByDate = {};
            Object.values(updatedTasks).flat().forEach(task => {
                if (task.startDate) {
                    const dateKey = task.startDate.split('T')[0];
                    if (!this.tasksByDate[dateKey]) {
                        this.tasksByDate[dateKey] = [];
                    }
                    this.tasksByDate[dateKey].push(task);
                }
            });
            
            console.log('[GlobalSync] Cache atualizado:', {
                porCategoria: this.tasksCache,
                porData: this.tasksByDate
            });
            
            // Salvar no localStorage
            localStorage.setItem('calendar_tasks', JSON.stringify(this.tasksByDate));
            
            // Notificar mudanças
            this.notifyChanges([{
                type: 'full-update',
                tasksByCategory: this.tasksCache,
                tasksByDate: this.tasksByDate
            }]);
            
            this.lastUpdate = now;
            
        } catch (error) {
            console.error('[GlobalSync] Erro na sincronização:', error);
            this.notifyError(error);
        }
    },
    
    // Detectar mudanças nos dados
    detectChanges: function(newTasks) {
        console.group('[GlobalSync] Detectando mudanças');
        console.log('Novas tarefas recebidas:', newTasks);
        console.log('Cache atual:', this.tasksCache);
        
        const changes = [];
        
        try {
            // Processar tarefas por data
            const processedTasks = {};
            
            // Processar todas as categorias
            Object.keys(newTasks).forEach(category => {
                const tasksList = newTasks[category] || [];
                
                tasksList.forEach(task => {
                    if (task.startDate) {
                        const dateKey = task.startDate.split('T')[0];
                        if (!processedTasks[dateKey]) {
                            processedTasks[dateKey] = [];
                        }
                        processedTasks[dateKey].push(task);
                    } else {
                        console.warn('[GlobalSync] Tarefa sem data de início:', task);
                    }
                });
            });
            
            console.log('Tarefas processadas por data:', processedTasks);
            
            // Atualizar cache
            this.tasksCache = processedTasks;
            
            // Salvar no localStorage
            localStorage.setItem('calendar_tasks', JSON.stringify(processedTasks));
            
            // Notificar mudanças
            changes.push({ 
                type: 'full-update',
                tasks: processedTasks
            });
            
        } catch (error) {
            console.error('[GlobalSync] Erro ao processar mudanças:', error);
        }
        
        console.log('Mudanças detectadas:', changes);
        console.groupEnd();
        return changes;
    },
    
    // Obter campos alterados entre duas versões de uma tarefa
    getChangedFields: function(oldTask, newTask) {
        const changes = {};
        
        Object.keys(newTask).forEach(key => {
            if (JSON.stringify(oldTask[key]) !== JSON.stringify(newTask[key])) {
                changes[key] = newTask[key];
            }
        });
        
        return changes;
    },
    
    // Notificar mudanças
    notifyChanges: function(changes) {
        changes.forEach(change => {
            switch (change.type) {
                case 'updated':
                    if (change.changes.status) {
                        // Notificar mudança de status
                        this.notifyStatusChange(change.taskId, change.changes.status);
                    }
                    // Notificar atualização geral
                    this.notifyListeners('data-update', change);
                    break;
                    
                case 'added':
                case 'removed':
                    this.notifyListeners('data-update', change);
                    break;
            }
        });
    },
    
    // Notificar mudança de status
    notifyStatusChange: function(taskId, newStatus) {
        // Notificar listeners internos
        this.notifyListeners('status-change', { taskId, newStatus });
        
        // Notificar KPI Manager
        if (window.KPIManager) {
            if (typeof window.KPIManager.updateStatus === 'function') {
                window.KPIManager.updateStatus(taskId, newStatus);
            }
            if (typeof window.KPIManager.emit === 'function') {
                window.KPIManager.emit('statusChanged', taskId, newStatus);
            }
        }
        
        // Notificar Status Manager
        if (window.StatusManager && typeof window.StatusManager.notifyStatusChange === 'function') {
            window.StatusManager.notifyStatusChange(taskId, newStatus);
        }
        
        // Disparar evento global
        window.dispatchEvent(new CustomEvent('taskStatusUpdated', {
            detail: { taskId, newStatus }
        }));
    },
    
    // Notificar erro
    notifyError: function(error) {
        this.notifyListeners('error', error);
    },
    
    // Registrar listener
    on: function(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].add(callback);
            return () => this.listeners[event].delete(callback);
        }
    },
    
    // Notificar listeners
    notifyListeners: function(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[GlobalSync] Erro ao executar listener ${event}:`, error);
                }
            });
        }
    },
    
    // Configurar eventos globais
    setupGlobalEvents: function() {
        // Reconexão
        window.addEventListener('online', () => {
            console.log('[GlobalSync] Conexão restaurada, sincronizando...');
            this.syncNow();
        });
        
        // Foco na página
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[GlobalSync] Página visível, sincronizando...');
                this.syncNow();
            }
        });
        
        // Antes de fechar a página
        window.addEventListener('beforeunload', () => {
            // Salvar cache atual
            localStorage.setItem('tasks_cache', JSON.stringify(this.tasksCache));
        });
    }
};

// Inicializar sistema de sincronização
document.addEventListener('DOMContentLoaded', () => {
    GlobalSync.init();
});

// Exportar para uso global
window.GlobalSync = GlobalSync; 