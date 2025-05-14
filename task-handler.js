// Estilos para as notificações (caso não estejam definidos no CSS principal)
(function() {
    // Verificar se os estilos já estão definidos
    const styleId = 'notification-styles';
    if (document.getElementById(styleId)) return;
    
    // Criar elemento de estilo
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            animation: slide-in 0.3s ease-out;
            opacity: 1;
            transition: opacity 0.3s;
        }

        .notification i {
            font-size: 1.2rem;
        }

        .notification.success {
            background-color: #10b981;
        }

        .notification.error {
            background-color: #ef4444;
        }

        .notification.warning {
            background-color: #f59e0b;
        }

        .notification.info {
            background-color: #3b82f6;
        }

        @keyframes slide-in {
            0% {
                transform: translateX(100%);
                opacity: 0;
            }
            100% {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    
    // Adicionar ao head
    document.head.appendChild(style);
})();

// Funções de fallback para notificações caso as globais não estejam disponíveis
if (typeof window.showSuccessNotification !== 'function') {
    window.showSuccessNotification = function(message) {
        console.log('Success:', message);
        
        // Criar elemento de notificação manualmente
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
}

if (typeof window.showErrorNotification !== 'function') {
    window.showErrorNotification = function(message) {
        console.error('Error:', message);
        
        // Criar elemento de notificação manualmente
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
}

if (typeof window.showWarningNotification !== 'function') {
    window.showWarningNotification = function(message) {
        console.warn('Warning:', message);
        
        // Criar elemento de notificação manualmente
        const notification = document.createElement('div');
        notification.className = 'notification warning';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
}

// Adicionar função de notificação informativa se não existir
if (typeof window.showInfoNotification !== 'function') {
    window.showInfoNotification = function(message) {
        console.info('Info:', message);
        
        // Criar elemento de notificação manualmente
        const notification = document.createElement('div');
        notification.className = 'notification info';
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${message}
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
}

// Função para validar datas (fallback)
if (typeof window.validateDates !== 'function') {
    window.validateDates = function(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return end > start;
    };
}

// Função para carregar tarefas do localStorage
function loadTasksFromLocalStorage() {
    console.log('Tentando carregar tarefas do localStorage...');
    
    try {
        const storedTasks = localStorage.getItem('tasks');
        
        if (storedTasks) {
            const parsedTasks = JSON.parse(storedTasks);
            console.log('Tarefas carregadas do localStorage:', parsedTasks);
            
            // Verificar se o objeto de tarefas é válido
            if (parsedTasks && typeof parsedTasks === 'object') {
                // Atribuir ao objeto global window.tasks
                window.tasks = parsedTasks;
                
                console.log('Tarefas atribuídas ao objeto global window.tasks');
                
                // Atualizar a interface, se a função estiver disponível
                if (typeof window.renderTasks === 'function') {
                    window.renderTasks();
                }
                
                return true;
            } else {
                console.error('Formato de tarefas inválido no localStorage');
                return false;
            }
        } else {
            console.warn('Nenhuma tarefa encontrada no localStorage');
            
            // Inicializar tasks como objeto vazio se não existir
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
            
            return false;
        }
    } catch (error) {
        console.error('Erro ao carregar tarefas do localStorage:', error);
        return false;
    }
}

// Função para renderizar tarefas (backup caso a original não funcione)
function renderTasksBackup() {
    console.log('Executando renderização de tarefas de backup...');
    
    if (!window.tasks) {
        console.error('window.tasks não está definido!');
        return;
    }
    
    // Para cada categoria (day, week, month, year)
    Object.keys(window.tasks).forEach(category => {
        // Selecionar a lista para essa categoria
        const taskList = document.querySelector(`#${category} .task-list`);
        
        // Se a lista não existir, pular
        if (!taskList) {
            console.warn(`Lista de tarefas para categoria ${category} não encontrada`);
            return;
        }
        
        // Limpar a lista antes de adicionar as tarefas
        taskList.innerHTML = '';
        
        // Verificar se há tarefas nesta categoria
        if (window.tasks[category].length === 0) {
            // Se não houver tarefas, mostrar mensagem
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <i class="fas fa-inbox"></i>
                <p>Nenhuma tarefa para este período</p>
            `;
            taskList.appendChild(emptyMessage);
        } else {
            // Se houver tarefas, adicionar cada uma à lista
            window.tasks[category].forEach(task => {
                const taskElement = createTaskElementBackup(task);
                taskList.appendChild(taskElement);
            });
        }
        
        // Atualizar o contador de tarefas
        const countElement = document.querySelector(`#${category}-count`);
        if (countElement) {
            const count = window.tasks[category].length;
            countElement.textContent = `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`;
        }
    });
    
    console.log('Renderização de tarefas de backup concluída');
}

// Função de backup para criar elemento de tarefa
function createTaskElementBackup(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item status-${task.status || 'pending'}`;
    taskItem.dataset.id = task.id;
    
    // Ícones para status
    const statusIcons = {
        'pending': '<i class="fas fa-clock"></i>',
        'completed': '<i class="fas fa-check"></i>',
        'finished': '<i class="fas fa-flag-checkered"></i>',
        'late': '<i class="fas fa-exclamation-triangle"></i>'
    };
    
    // Textos para status
    const statusTexts = {
        'pending': 'Em andamento',
        'completed': 'Concluído',
        'finished': 'Finalizado',
        'late': 'Em atraso'
    };
    
    // Formatação de data
    const formatDate = function(dateString) {
        if (!dateString) return 'Data não definida';
        
        try {
            const options = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return new Date(dateString).toLocaleString('pt-BR', options);
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return dateString;
        }
    };
    
    // Conteúdo do card
    taskItem.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${task.text || task.title || 'Sem título'}</h3>
            <div class="task-actions">
                <button class="task-action-btn edit-task" aria-label="Editar tarefa">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="task-action-btn delete-task" aria-label="Excluir tarefa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="task-footer">
            <div class="task-date">
                <i class="far fa-calendar-alt"></i>
                <span>${formatDate(task.endDate)}</span>
            </div>
            <div class="task-status status-${task.status || 'pending'}">
                ${statusIcons[task.status] || statusIcons['pending']}
                <span>${statusTexts[task.status] || statusTexts['pending']}</span>
            </div>
        </div>
    `;
    
    // Adicionar event listeners para botões
    const editBtn = taskItem.querySelector('.edit-task');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            console.log('Botão de editar tarefa clicado para tarefa ID:', task.id);
            // Abrir modal de edição (se disponível na aplicação)
            if (typeof openEditTaskModal === 'function') {
                openEditTaskModal(task);
            } else {
                alert('Função de edição não disponível');
            }
        });
    }
    
    const deleteBtn = taskItem.querySelector('.delete-task');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            console.log('Botão de excluir tarefa clicado para tarefa ID:', task.id);
            
            // Confirmar exclusão
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                // Encontrar a tarefa em todas as categorias
                let taskFound = false;
                Object.keys(window.tasks).forEach(category => {
                    const index = window.tasks[category].findIndex(t => t.id === task.id);
                    if (index !== -1) {
                        // Remover tarefa do array
                        window.tasks[category].splice(index, 1);
                        taskFound = true;
                        
                        // Salvar alterações no localStorage
                        localStorage.setItem('tasks', JSON.stringify(window.tasks));
                        
                        // Renderizar tarefas novamente
                        renderTasksBackup();
                        
                        // Mostrar notificação
                        if (typeof showSuccessNotification === 'function') {
                            showSuccessNotification('Tarefa excluída com sucesso!');
                        } else {
                            alert('Tarefa excluída com sucesso!');
                        }
                    }
                });
                
                if (!taskFound) {
                    console.error('Tarefa não encontrada:', task.id);
                    if (typeof showErrorNotification === 'function') {
                        showErrorNotification('Erro: Tarefa não encontrada');
                    } else {
                        alert('Erro: Tarefa não encontrada');
                    }
                }
            }
        });
    }
    
    return taskItem;
}

// Carregar tarefas quando a página for carregada
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, carregando tarefas do localStorage...');
    
    // Primeiro tentar carregar usando a função de carregamento principal
    const loadResult = loadTasksFromLocalStorage();
    
    // Força a renderização usando nosso backup caso a renderização normal não funcione
    setTimeout(() => {
        const anyVisibleTasks = document.querySelectorAll('.task-item').length > 0;
        if (!anyVisibleTasks) {
            console.warn('Nenhuma tarefa visível na interface após carregamento normal. Tentando renderização de backup...');
            // Usar nossa função de renderização de backup
            renderTasksBackup();
        }
    }, 500); // Dar meio segundo para a renderização normal acontecer
    
    // Sobrescrever a função de renderização global se ela não existir
    if (typeof window.renderTasks !== 'function') {
        console.log('Função renderTasks global não encontrada. Substituindo com nossa implementação de backup.');
        window.renderTasks = renderTasksBackup;
    }
});

// Função para tratar a submissão do formulário de tarefas
async function handleAddTaskEvent(event) {
    event.preventDefault();
    console.log('Formulário de nova tarefa enviado');
    
    try {
        // Debug auxiliar para verificar todos os elementos do formulário
        console.log('Verificando elementos do formulário:');
        const taskForm = document.getElementById('task-form');
        console.log('Task Form encontrado:', taskForm !== null);
        
        // Obter referências aos elementos do formulário
        const taskInput = document.getElementById('task-input');
        const taskCategory = document.getElementById('task-category');
        const taskStartDate = document.getElementById('task-start-date');
        const taskEndDate = document.getElementById('task-end-date');
        
        // Verificação detalhada de cada elemento
        console.log('Task Input encontrado:', taskInput !== null, taskInput ? taskInput.value : 'N/A');
        console.log('Task Category encontrado:', taskCategory !== null, taskCategory ? taskCategory.value : 'N/A');
        console.log('Task Start Date encontrado:', taskStartDate !== null, taskStartDate ? taskStartDate.value : 'N/A');
        console.log('Task End Date encontrado:', taskEndDate !== null, taskEndDate ? taskEndDate.value : 'N/A');
        
        if (!taskInput || !taskCategory) {
            console.error('Elementos do formulário não encontrados');
            showErrorNotification('Erro ao processar formulário: elementos não encontrados');
            return;
        }
        
        // Validar campos obrigatórios
        if (!taskInput.value.trim()) {
            console.error('Título da tarefa é obrigatório');
            showWarningNotification('Por favor, informe o título da tarefa');
            taskInput.focus();
            return;
        }
        
        // Criar objeto de nova tarefa com ID único
        const taskId = 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const newTask = {
            id: taskId,
            text: taskInput.value.trim(),
            title: taskInput.value.trim(), // Adicionar título também para compatibilidade
            category: taskCategory.value,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Adicionar datas se fornecidas
        if (taskStartDate && taskStartDate.value) {
            newTask.startDate = new Date(taskStartDate.value).toISOString();
        } else {
            // Usar data atual como padrão para data de início
            newTask.startDate = new Date().toISOString();
        }
        
        if (taskEndDate && taskEndDate.value) {
            newTask.endDate = new Date(taskEndDate.value).toISOString();
        } else {
            // Definir data final como 1 semana a partir de hoje por padrão
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            newTask.endDate = nextWeek.toISOString();
        }
        
        // Validar datas
        if (newTask.startDate && newTask.endDate) {
            if (new Date(newTask.endDate) <= new Date(newTask.startDate)) {
                console.error('Data de término deve ser posterior à data de início');
                showWarningNotification('Data de término deve ser posterior à data de início');
                return;
            }
        }
        
        console.log('Nova tarefa a ser adicionada:', newTask);
        
        // Verificar estrutura atual de tasks
        console.log('Estado atual de window.tasks:', window.tasks);
        
        // Carregar tarefas do localStorage primeiro (garantindo que temos os dados mais recentes)
        try {
            const storedTasks = localStorage.getItem('tasks');
            if (storedTasks) {
                window.tasks = JSON.parse(storedTasks);
                console.log('Tarefas carregadas do localStorage');
            }
        } catch (error) {
            console.error('Erro ao carregar tarefas do localStorage:', error);
        }
        
        // Garantir que o objeto window.tasks esteja inicializado corretamente
        if (!window.tasks) {
            console.log('Inicializando objeto de tarefas');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
        
        // Garantir que a categoria exista
        if (!window.tasks[newTask.category]) {
            console.log(`Criando categoria de tarefas: ${newTask.category}`);
            window.tasks[newTask.category] = [];
        }
        
        // Verificar duplicações por título e data similar
        const isDuplicate = window.tasks[newTask.category].some(task => 
            task.text === newTask.text && 
            Math.abs(new Date(task.startDate) - new Date(newTask.startDate)) < 60000 // 1 minuto
        );
        
        if (isDuplicate) {
            console.warn('Possível tarefa duplicada detectada. Verificando se deve prosseguir...');
            if (!confirm('Uma tarefa similar já existe. Deseja adicionar mesmo assim?')) {
                console.log('Adição de tarefa similar cancelada pelo usuário.');
                return;
            }
        }
        
        // Adicionar a tarefa à categoria correspondente
        window.tasks[newTask.category].push(newTask);
        console.log(`Tarefa adicionada à categoria ${newTask.category}. Total: ${window.tasks[newTask.category].length}`);
        
        // IMPORTANTE: Salvar diretamente no localStorage
        try {
            localStorage.setItem('tasks', JSON.stringify(window.tasks));
            console.log('Tarefas salvas no localStorage com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar tarefas no localStorage:', error);
            showErrorNotification('Erro ao salvar tarefas localmente');
        }
        
        // Adicionar à fila de sincronização com o servidor (se disponível)
        if (window.taskSyncApi && typeof window.taskSyncApi.addTask === 'function') {
            console.log('Enviando tarefa para sincronização com o servidor');
            window.taskSyncApi.addTask(newTask);
            
            // Mostrar indicador de sincronização (se desejar)
            if (typeof window.showInfoNotification === 'function') {
                window.showInfoNotification('Sincronizando tarefa com o servidor...');
            }
        } else {
            console.warn('API de sincronização não encontrada. A tarefa será salva apenas localmente.');
            
            // Tentar salvar diretamente via Supabase API (fallback)
            if (window.supabaseApi && typeof window.supabaseApi.addTask === 'function') {
                try {
                    console.log('Tentando salvar direto no Supabase (fallback)');
                    window.supabaseApi.addTask(newTask).then(result => {
                        if (result) {
                            console.log('Tarefa salva com sucesso no servidor (fallback)');
                            if (typeof window.showSuccessNotification === 'function') {
                                window.showSuccessNotification('Tarefa salva com sucesso no servidor!');
                            }
                        } else {
                            console.error('Falha ao salvar tarefa no servidor (fallback)');
                        }
                    }).catch(err => {
                        console.error('Erro ao salvar no servidor (fallback):', err);
                    });
                } catch (error) {
                    console.error('Erro ao tentar fallback para Supabase:', error);
                }
            }
        }
        
        // Salvar as tarefas usando a função global (caso exista)
        if (typeof window.saveTasks === 'function') {
            console.log('Salvando tarefas com a função global saveTasks');
            window.saveTasks();
        }
        
        // Atualizar contadores
        if (typeof window.updateTaskCounts === 'function') {
            window.updateTaskCounts();
        }
        
        // Mostrar notificação de sucesso
        if (typeof window.showSuccessNotification === 'function') {
            window.showSuccessNotification('Tarefa adicionada com sucesso!');
        } else {
            alert('Tarefa adicionada com sucesso!');
        }
        
        // Fechar o modal após salvar
        if (typeof window.closeModal === 'function') {
            window.closeModal();
        } else {
            // Fallback se closeModal não estiver disponível
            const modal = document.getElementById('task-form-modal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        
        // Atualizar a interface (muito importante!)
        if (typeof window.renderTasks === 'function') {
            console.log('Renderizando tarefas na interface');
            window.renderTasks();
        } else {
            console.error('Função renderTasks não encontrada. A interface não será atualizada.');
            // Tentar recarregar a página como último recurso
            window.location.reload();
        }
        
        // Atualizar o calendário, se estiver inicializado
        if (typeof window.loadCalendarTasks === 'function') {
            setTimeout(() => {
                console.log('Atualizando calendário após adicionar tarefa');
                window.loadCalendarTasks();
            }, 100);
        }
        
        // Limpar o formulário
        if (taskForm) {
            taskForm.reset();
        }
        
    } catch (error) {
        console.error('Erro ao adicionar nova tarefa:', error);
        if (typeof window.showErrorNotification === 'function') {
            window.showErrorNotification('Erro ao adicionar tarefa: ' + error.message);
        } else {
            alert('Erro ao adicionar tarefa: ' + error.message);
        }
    }
}

// Criando um gerenciador de status padronizado
const StatusManager = {
    // Definições padrão de status
    STATUS_TYPES: {
        PENDING: 'pending',
        COMPLETED: 'completed', 
        LATE: 'late'
    },
    
    // Texto para cada status
    STATUS_TEXT: {
        'pending': 'Em andamento',
        'completed': 'Concluído',
        'late': 'Em atraso'
    },
    
    // Ícones para cada status
    STATUS_ICONS: {
        'pending': '<i class="fas fa-clock"></i>',
        'completed': '<i class="fas fa-check"></i>',
        'late': '<i class="fas fa-exclamation-triangle"></i>'
    },
    
    // Cores para cada status (em hexadecimal)
    STATUS_COLORS: {
        'pending': '#f39c12', // Amarelo
        'completed': '#27ae60', // Verde
        'late': '#e74c3c'     // Vermelho
    },
    
    // Obter texto do status
    getText: function(status) {
        return this.STATUS_TEXT[status] || this.STATUS_TEXT['pending'];
    },
    
    // Obter ícone do status
    getIcon: function(status) {
        return this.STATUS_ICONS[status] || this.STATUS_ICONS['pending'];
    },
    
    // Obter cor do status
    getColor: function(status) {
        return this.STATUS_COLORS[status] || this.STATUS_COLORS['pending'];
    },
    
    // Obter HTML completo para elemento de status (ícone + texto)
    getStatusHTML: function(status) {
        return `${this.getIcon(status)} <span>${this.getText(status)}</span>`;
    },
    
    // Atualizar elemento visual com novo status
    updateElement: function(element, status) {
        if (!element) return;
        
        // Remover classes antigas e adicionar nova
        element.classList.remove('status-pending', 'status-completed', 'status-late');
        element.classList.add(`status-${status}`);
        
        // Se for um elemento de exibição de status, atualizar o conteúdo
        if (element.classList.contains('task-status') || 
            element.classList.contains('status-badge') || 
            element.classList.contains('status-text') || 
            element.classList.contains('status-label')) {
            element.innerHTML = this.getStatusHTML(status);
        }
        
        // Se for um select, atualizar o valor
        if (element.tagName === 'SELECT') {
            element.value = status;
        }
        
        // Adicionar destaque temporário
        element.classList.add('highlight-success');
        setTimeout(() => {
            element.classList.remove('highlight-success');
        }, 1500);
    },
    
    // Atualizar todos os elementos relacionados a uma tarefa com o novo status
    updateAllElements: function(taskId, status) {
        // Selecionar todos os elementos relacionados à tarefa
        const taskElements = document.querySelectorAll(
            `[data-id="${taskId}"], [data-task-id="${taskId}"], .task-item[data-id="${taskId}"]`
        );
        
        taskElements.forEach(element => {
            // Atualizar o elemento principal
            this.updateElement(element, status);
            
            // Atualizar subelementos de status
            const statusElements = element.querySelectorAll(
                '.task-status, .status-badge, .status-label, .status-text, ' +
                'select.status-select, [class*="status-"]'
            );
            
            statusElements.forEach(statusElement => {
                this.updateElement(statusElement, status);
            });
            
            // Atualizar spans com textos de status
            const allSpans = element.querySelectorAll('span, div');
            allSpans.forEach(span => {
                const text = span.textContent.trim();
                // Verificar se o texto é um texto de status conhecido
                Object.values(this.STATUS_TEXT).forEach(statusText => {
                    if (text === statusText) {
                        span.textContent = this.getText(status);
                    }
                });
            });
        });
    }
};

// Substituir a função forceUpdateTaskStatus para usar o StatusManager
function forceUpdateTaskStatus(taskId, newStatus) {
    console.log(`Forçando atualização de status para tarefa ${taskId} -> ${newStatus}`);
    
    try {
        // 1. Garantir que a tarefa tenha seu status atualizado no objeto global
        let taskUpdated = false;
        let taskData = null;
        let oldStatus = null;
        
        Object.keys(window.tasks || {}).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                taskData = window.tasks[category][taskIndex];
                oldStatus = taskData.status; // Guardar status antigo
                taskData.status = newStatus;
                
                // Definir timestamp de conclusão se for 'completed'
                if (newStatus === 'completed' && !taskData.completedAt) {
                    taskData.completedAt = new Date().toISOString();
                }
                
                taskUpdated = true;
            }
        });
        
        if (!taskUpdated) {
            console.warn(`Tarefa ${taskId} não encontrada no objeto global de tarefas`);
        }
        
        // 2. Salvar no localStorage independentemente
        try {
            localStorage.setItem('tasks', JSON.stringify(window.tasks || {}));
            console.log('Tarefa salva no localStorage após atualização de status');
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
        
        // 3. Usar o StatusManager para atualizar todos os elementos visuais
        StatusManager.updateAllElements(taskId, newStatus);
        
        // 4. Notificar o usuário
        if (typeof window.showInfoNotification === 'function') {
            window.showInfoNotification(`Status da tarefa atualizado para: ${StatusManager.getText(newStatus)}`);
        }
        
        // 5. Disparar evento customizado para notificar a mudança de status
        // Este evento permitirá que outras partes da aplicação reajam à mudança
        try {
            const statusChangeEvent = new CustomEvent('taskStatusChanged', {
                detail: {
                    taskId,
                    oldStatus, 
                    newStatus,
                    task: taskData
                },
                bubbles: true,
                cancelable: false
            });
            
            console.log('Disparando evento taskStatusChanged', statusChangeEvent.detail);
            
            // Disparar o evento na janela para que possa ser capturado globalmente
            window.dispatchEvent(statusChangeEvent);
        } catch (eventError) {
            console.error('Erro ao disparar evento de mudança de status:', eventError);
        }
        
        // 6. Atualizar KPIs IMEDIATAMENTE - NOVA FUNCIONALIDADE
        try {
            console.log('Atualizando KPIs em tempo real...');
            
            // Atualizar KPIs do dashboard principal
            if (typeof window.updateKPIDashboard === 'function') {
                // Usar Promise.resolve para garantir que mesmo que updateKPIDashboard não retorne uma promessa,
                // não ocorrerá erro. O .catch garante que erros não interromperão a execução.
                Promise.resolve(window.updateKPIDashboard(true)).catch(err => {
                    console.error('Erro ao atualizar KPIs:', err);
                });
            }
            
            // Atualizar gráficos de análise
            if (typeof window.updateAnalytics === 'function') {
                window.updateAnalytics();
            }
            
            // Caso esteja na página de calendário, atualizar também
            if (typeof window.loadCalendarTasks === 'function' && 
                window.location.hash === '#calendario') {
                window.loadCalendarTasks();
            }
        } catch (kpiError) {
            // Não interromper o fluxo principal em caso de erro nos KPIs
            console.error('Erro ao atualizar KPIs em tempo real:', kpiError);
        }
        
        // 7. Tentar sincronizar com o Supabase
        try {
            if (window.supabaseApi && typeof window.supabaseApi.updateTask === 'function') {
                window.supabaseApi.updateTask(taskId, { 
                    status: newStatus,
                    updatedAt: new Date().toISOString(),
                    ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
                })
                .then(success => {
                    console.log(`Sincronização com Supabase: ${success ? 'Sucesso' : 'Falha'}`);
                })
                .catch(err => {
                    console.error('Erro ao sincronizar com Supabase:', err);
                });
            }
        } catch (error) {
            console.error('Erro ao tentar sincronizar com Supabase:', error);
        }
        
        return true;
    } catch (error) {
        console.error('Erro na função forceUpdateTaskStatus:', error);
        return false;
    }
}

// Substituir a função handleTaskStatusChange pela nova versão mais robusta
function handleTaskStatusChange(taskId, newStatus) {
    console.log(`handleTaskStatusChange: ${taskId} -> ${newStatus}`);
    
    // Usar nossa nova função robusta como principal método
    const success = forceUpdateTaskStatus(taskId, newStatus);
    
    // Se falhar, tentar o método legado
    if (!success) {
        console.warn('Usando método legado como fallback');
        if (typeof window.updateTaskStatus === 'function') {
            return window.updateTaskStatus(taskId, newStatus);
        } else {
            console.error('Não foi possível atualizar o status da tarefa');
            return false;
        }
    }
    
    return success;
}

// Expor a função ao escopo global para poder usá-la diretamente
window.forceUpdateTaskStatus = forceUpdateTaskStatus;

// Expor StatusManager globalmente
window.StatusManager = StatusManager;

// Exportar funções para o escopo global
function exportTaskHandlerFunctions() {
    console.log('Exportando funções do task-handler para o escopo global');
    
    // Expor a função handleTaskStatusChange globalmente
    window.handleTaskStatusChange = handleTaskStatusChange;
    
    // Expor outras funções importantes
    if (typeof loadTasksFromLocalStorage === 'function') {
        window.loadTasksFromLocalStorage = loadTasksFromLocalStorage;
    }
    
    if (typeof handleAddTaskEvent === 'function') {
        window.handleAddTaskEvent = handleAddTaskEvent;
    }
    
    // Garantir que o StatusManager esteja disponível globalmente
    window.StatusManager = StatusManager;
    
    // Garantir que a função forceUpdateTaskStatus esteja disponível globalmente
    window.forceUpdateTaskStatus = forceUpdateTaskStatus;
    
    // Criar um objeto taskHandler para agrupar todas as funções
    window.taskHandler = {
        handleTaskStatusChange,
        updateTaskStatus: (taskId, newStatus) => {
            return handleTaskStatusChange(taskId, newStatus);
        },
        loadTasks: loadTasksFromLocalStorage || function() { 
            console.warn('Função loadTasksFromLocalStorage não disponível');
        },
        addTask: handleAddTaskEvent || function() { 
            console.warn('Função handleAddTaskEvent não disponível');
        },
        StatusManager: StatusManager
    };
    
    console.log('Funções do task-handler exportadas com sucesso');
}

// Adicionar evento para inicializar o StatusManager quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando StatusManager');
    
    // Exportar as funções do task-handler
    exportTaskHandlerFunctions();
    
    // Aplicar estilos CSS se a função estiver disponível
    if (typeof applyStatusStyles === 'function') {
        applyStatusStyles();
    } else {
        // Implementar diretamente os estilos aqui como fallback
        const styleElement = document.createElement('style');
        styleElement.id = 'task-status-styles-fallback';
        
        styleElement.textContent = `
            /* Estilos de Status (fallback) */
            .status-completed { 
                color: ${StatusManager.getColor('completed')} !important;
                border-color: ${StatusManager.getColor('completed')} !important;
            }
            
            .status-pending { 
                color: ${StatusManager.getColor('pending')} !important;
                border-color: ${StatusManager.getColor('pending')} !important;
            }
            
            .status-late { 
                color: ${StatusManager.getColor('late')} !important;
                border-color: ${StatusManager.getColor('late')} !important;
            }
            
            /* Transição suave para mudanças de status */
            .task-item, .calendar-task, .status-select, .task-status {
                transition: all 0.3s ease !important;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    // Atualizar tarefas existentes para usar o novo sistema de status
    setTimeout(function() {
        if (window.tasks) {
            let atLeastOneUpdated = false;
            
            // Percorrer todas as tarefas e atualizar sua visualização
            Object.keys(window.tasks).forEach(category => {
                window.tasks[category].forEach(task => {
                    if (task.id && task.status) {
                        console.log(`Atualizando visualização da tarefa ${task.id} com status ${task.status}`);
                        StatusManager.updateAllElements(task.id, task.status);
                        atLeastOneUpdated = true;
                    }
                });
            });
            
            if (atLeastOneUpdated) {
                console.log('Visualização de status atualizada para todas as tarefas existentes');
            }
        }
    }, 500);
}); 