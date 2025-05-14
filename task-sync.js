// Gerenciador de sincronização de tarefas com o servidor Supabase

/**
 * Objeto de configuração da sincronização
 */
const TaskSync = {
    // Estado
    syncing: false,
    syncQueue: [],
    lastSync: 0,
    syncInterval: 5000, // 5 segundos entre sincronizações
    
    // Indica se há tarefas não sincronizadas
    hasPendingSyncs: function() {
        return this.syncQueue.length > 0;
    },
    
    // Inicializar o sistema de sincronização
    init: function() {
        console.log('[TaskSync] Inicializando sistema de sincronização');
        
        // Restaurar fila de sincronização do localStorage se existir
        try {
            const savedQueue = localStorage.getItem('sync_queue');
            if (savedQueue) {
                this.syncQueue = JSON.parse(savedQueue);
                console.log(`[TaskSync] Fila de sincronização restaurada com ${this.syncQueue.length} operações pendentes`);
            }
        } catch (error) {
            console.error('[TaskSync] Erro ao restaurar fila de sincronização:', error);
        }
        
        // Iniciar processo de sincronização periódica
        setInterval(() => this.processSyncQueue(), this.syncInterval);
        
        // Processar fila imediatamente se houver itens pendentes
        if (this.hasPendingSyncs()) {
            setTimeout(() => this.processSyncQueue(), 1000);
        }
        
        // Adicionar evento para sincronizar antes de fechar a página
        window.addEventListener('beforeunload', () => {
            if (this.hasPendingSyncs()) {
                // Salvar fila de sincronização
                localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
                
                // Tentar sincronizar imediatamente
                this.processSyncQueue(true);
                
                // Retornar uma mensagem (nem sempre exibida pelos navegadores modernos)
                return "Existem alterações não salvas no servidor. Tem certeza que deseja sair?";
            }
        });
        
        console.log('[TaskSync] Inicialização concluída');
    },
    
    // Adicionar operação à fila de sincronização
    queueOperation: function(operation, data) {
        console.log(`[TaskSync] Adicionando operação à fila: ${operation}`, data);
        
        // Adicionar à fila
        this.syncQueue.push({
            operation,  // 'create', 'update', 'delete'
            data,       // dados da operação
            timestamp: Date.now()
        });
        
        // Salvar fila no localStorage para persistência
        localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
        
        // Iniciar sincronização se não estiver em progresso
        if (!this.syncing) {
            setTimeout(() => this.processSyncQueue(), 1000);
        }
        
        return true;
    },
    
    // Processar fila de sincronização
    processSyncQueue: async function(isFinalSync = false) {
        // Se já estiver sincronizando ou não houver itens na fila, retornar
        if (this.syncing || this.syncQueue.length === 0) {
            return;
        }
        
        // Verificar se passou tempo suficiente desde a última sincronização
        const now = Date.now();
        if (!isFinalSync && now - this.lastSync < this.syncInterval) {
            return;
        }
        
        // Marcar como sincronizando
        this.syncing = true;
        this.lastSync = now;
        
        console.log(`[TaskSync] Processando fila de sincronização: ${this.syncQueue.length} operações pendentes`);
        
        try {
            // Verificar conexão com o servidor antes de tentar sincronizar
            const isConnected = await window.supabaseApi.checkSupabaseConnection();
            
            if (!isConnected) {
                console.warn('[TaskSync] Sem conexão com o servidor. Sincronização adiada.');
                this.syncing = false;
                return;
            }
            
            // Verificar autenticação
            const isAuth = await window.supabaseApi.isAuthenticated();
            if (!isAuth) {
                console.warn('[TaskSync] Usuário não autenticado. Sincronização adiada.');
                this.syncing = false;
                return;
            }
            
            // Processar cada operação na fila
            while (this.syncQueue.length > 0) {
                const syncItem = this.syncQueue[0]; // Pegar o primeiro item da fila
                
                try {
                    let success = false;
                    
                    // Processar baseado no tipo de operação
                    switch (syncItem.operation) {
                        case 'create':
                            success = await this.syncCreateTask(syncItem.data);
                            break;
                            
                        case 'update':
                            success = await this.syncUpdateTask(syncItem.data);
                            break;
                            
                        case 'delete':
                            success = await this.syncDeleteTask(syncItem.data);
                            break;
                            
                        default:
                            console.error(`[TaskSync] Operação desconhecida: ${syncItem.operation}`);
                            success = false;
                    }
                    
                    if (success) {
                        // Remover da fila se for bem-sucedido
                        this.syncQueue.shift();
                        
                        // Atualizar localStorage
                        localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
                    } else {
                        // Se falhar, parar o processamento para tentar novamente mais tarde
                        throw new Error(`Falha ao processar operação ${syncItem.operation}`);
                    }
                } catch (error) {
                    console.error(`[TaskSync] Erro ao processar operação ${syncItem.operation}:`, error);
                    break; // Sair do loop em caso de erro
                }
            }
            
            // Se a fila estiver vazia, remover do localStorage
            if (this.syncQueue.length === 0) {
                localStorage.removeItem('sync_queue');
                console.log('[TaskSync] Fila de sincronização processada com sucesso');
            } else {
                console.warn(`[TaskSync] Sincronização incompleta: ${this.syncQueue.length} operações pendentes`);
            }
        } catch (error) {
            console.error('[TaskSync] Erro durante a sincronização:', error);
        } finally {
            // Marcar como não sincronizando
            this.syncing = false;
        }
    },
    
    // Sincronizar criação de tarefa
    syncCreateTask: async function(task) {
        console.log('[TaskSync] Sincronizando criação de tarefa:', task);
        
        try {
            // Enviar para o servidor
            const result = await window.supabaseApi.addTask(task);
            
            if (result) {
                console.log('[TaskSync] Tarefa criada com sucesso no servidor:', result);
                
                // Atualizar o ID local com o ID do servidor se necessário
                if (result.id && result.id !== task.id) {
                    this.updateTaskId(task.id, result.id);
                }
                
                return true;
            } else {
                console.error('[TaskSync] Falha ao criar tarefa no servidor');
                return false;
            }
        } catch (error) {
            console.error('[TaskSync] Erro ao sincronizar criação de tarefa:', error);
            return false;
        }
    },
    
    // Sincronizar atualização de tarefa
    syncUpdateTask: async function(update) {
        console.log('[TaskSync] Sincronizando atualização de tarefa:', update);
        
        try {
            const result = await window.supabaseApi.updateTask(update.id, update.changes);
            
            if (result) {
                console.log('[TaskSync] Tarefa atualizada com sucesso no servidor');
                return true;
            } else {
                console.error('[TaskSync] Falha ao atualizar tarefa no servidor');
                return false;
            }
        } catch (error) {
            console.error('[TaskSync] Erro ao sincronizar atualização de tarefa:', error);
            return false;
        }
    },
    
    // Sincronizar exclusão de tarefa
    syncDeleteTask: async function(task) {
        console.log('[TaskSync] Sincronizando exclusão de tarefa:', task);
        
        try {
            const result = await window.supabaseApi.deleteTask(task.id);
            
            if (result) {
                console.log('[TaskSync] Tarefa excluída com sucesso no servidor');
                return true;
            } else {
                console.error('[TaskSync] Falha ao excluir tarefa no servidor');
                return false;
            }
        } catch (error) {
            console.error('[TaskSync] Erro ao sincronizar exclusão de tarefa:', error);
            return false;
        }
    },
    
    // Atualizar ID local para o ID do servidor
    updateTaskId: function(oldId, newId) {
        console.log(`[TaskSync] Atualizando ID de tarefa: ${oldId} -> ${newId}`);
        
        // Atualizar no estado global
        try {
            if (window.tasks) {
                Object.keys(window.tasks).forEach(category => {
                    const taskIndex = window.tasks[category].findIndex(t => t.id === oldId);
                    if (taskIndex !== -1) {
                        // Atualizar ID
                        window.tasks[category][taskIndex].id = newId;
                        console.log(`[TaskSync] ID atualizado na categoria ${category}`);
                    }
                });
                
                // Salvar no localStorage
                localStorage.setItem('tasks', JSON.stringify(window.tasks));
            }
        } catch (error) {
            console.error('[TaskSync] Erro ao atualizar ID de tarefa:', error);
        }
    }
};

// Interface de API para o restante da aplicação
window.taskSyncApi = {
    // Adicionar tarefa (local + fila para servidor)
    addTask: function(task) {
        // Adicionar à fila de sincronização
        TaskSync.queueOperation('create', task);
    },
    
    // Atualizar tarefa (local + fila para servidor)
    updateTask: function(taskId, changes) {
        // Adicionar à fila de sincronização
        TaskSync.queueOperation('update', { id: taskId, changes });
    },
    
    // Excluir tarefa (local + fila para servidor)
    deleteTask: function(taskId) {
        // Adicionar à fila de sincronização
        TaskSync.queueOperation('delete', { id: taskId });
    },
    
    // Forçar sincronização imediata
    syncNow: function() {
        return TaskSync.processSyncQueue(true);
    },
    
    // Verificar estado de sincronização
    isInSync: function() {
        return !TaskSync.hasPendingSyncs();
    },
    
    // Obter número de operações pendentes
    getPendingCount: function() {
        return TaskSync.syncQueue.length;
    }
};

// Inicializar o sistema de sincronização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        TaskSync.init();
    }, 1000);
}); 