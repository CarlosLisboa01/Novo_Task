// Funções de Calendário para o TaskPro
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calendarTasks = {};
let isCalendarInitialized = false;
let calendarObserver = null;

// Sistema de observação de mudanças
const CalendarObserver = {
    callbacks: new Set(),
    
    // Registrar um callback para mudanças
    subscribe: function(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    },
    
    // Notificar todos os observadores
    notify: function(changeType, data) {
        console.log(`[Calendar] Notificando mudança: ${changeType}`, data);
        this.callbacks.forEach(callback => {
            try {
                callback(changeType, data);
            } catch (error) {
                console.error('[Calendar] Erro ao executar callback:', error);
            }
        });
    }
};

// Função para debug do estado das tarefas
function debugCalendarState() {
    console.group('[Calendar Debug]');
    console.log('Estado atual do calendário:');
    console.log('Tarefas carregadas:', Object.keys(calendarTasks).length);
    console.log('Estado global (window.tasks):', window.tasks ? 'Disponível' : 'Não disponível');
    console.log('Supabase API:', typeof window.supabaseApi !== 'undefined' ? 'Disponível' : 'Não disponível');
    console.log('Cache local:', localStorage.getItem('calendar_tasks') ? 'Disponível' : 'Não disponível');
    console.log('Calendário inicializado:', isCalendarInitialized);
    console.groupEnd();
}

// Cache de elementos DOM frequentemente usados
const DOM = {
    get calendarContainer() { return document.querySelector('#calendario-view .calendar-container') },
    get calendarGrid() { return document.getElementById('calendar-grid') },
    get monthYearElement() { return document.getElementById('calendar-month-year') }
};

// Constantes
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS_LABELS = {
    'pending': 'Em andamento',
    'completed': 'Concluído',
    'finished': 'Finalizado',
    'late': 'Em atraso'
};

// Função para inicializar o calendário
async function initCalendar() {
    try {
        console.group('[Calendar Debug] Inicializando calendário');
        console.log('Estado atual:', {
            globalSync: !!window.GlobalSync,
            tasks: !!window.tasks,
            localStorage: !!localStorage.getItem('calendar_tasks')
        });
        
        const calendarContainer = document.querySelector('#calendario-view .calendar-container');
        const calendarGrid = document.getElementById('calendar-grid');
        
        if (!calendarContainer || !calendarGrid) {
            console.error('Elementos do calendário não encontrados:', {
                container: !!calendarContainer,
                grid: !!calendarGrid
            });
            throw new Error('Elementos do calendário não encontrados');
        }

        // Mostrar indicador de carregamento
        calendarGrid.innerHTML = `
            <div class="calendar-loading">
                <div class="loading-spinner"></div>
                <span>Carregando calendário...</span>
            </div>
        `;

        // Configurar integrações primeiro
        console.log('Configurando integrações...');
        setupGlobalSyncIntegration();
        integrateWithKPI();
        integrateWithTaskStatusManager();
        
        // Configurar atualizações instantâneas
        console.log('Configurando atualizações instantâneas...');
        setupInstantUpdates();
        
        // Limpar elementos duplicados
        console.log('Limpando elementos duplicados...');
        cleanupCalendarElements();

        // Carregar tarefas
        console.log('Carregando tarefas...');
        await loadCalendarTasks();
        
        console.log('Tarefas carregadas:', calendarTasks);

        // Renderizar o calendário
        console.log('Renderizando calendário...');
        renderCalendar();

        // Configurar navegação
        console.log('Configurando navegação...');
        setupNavigationListeners();

        isCalendarInitialized = true;
        console.log('Inicialização concluída com sucesso');
        console.groupEnd();

    } catch (error) {
        console.error('[Calendar] Erro ao inicializar calendário:', error);
        console.groupEnd();
        
        showCalendarError(`Erro ao carregar o calendário: ${error.message}`);
        
        // Tentar recuperar de forma graciosa
        setTimeout(() => {
            console.log('Tentando reinicializar o calendário...');
            retryInitCalendar();
        }, 2000);
    }
}

// Função para tentar novamente
function retryInitCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (calendarGrid) {
        calendarGrid.innerHTML = '<div class="loading">Carregando calendário...</div>';
    }
    setTimeout(() => {
        initCalendar();
    }, 500);
}

// Função para carregar tarefas
async function loadCalendarTasks() {
    try {
        showCalendarLoadingIndicator();
        console.group('[Calendar Debug] Carregando Tarefas');
        console.log('Iniciando carregamento de tarefas...');

        // Tentar obter do GlobalSync primeiro
        if (window.GlobalSync) {
            if (window.GlobalSync.tasksByDate) {
                console.log('Usando tasksByDate do GlobalSync');
                calendarTasks = window.GlobalSync.tasksByDate;
                console.groupEnd();
                return;
            } else if (window.GlobalSync.tasksCache) {
                console.log('Processando tasksCache do GlobalSync');
                calendarTasks = {};
                Object.values(window.GlobalSync.tasksCache).flat().forEach(task => {
                    if (task.startDate) {
                        const dateKey = task.startDate.split('T')[0];
                        if (!calendarTasks[dateKey]) {
                            calendarTasks[dateKey] = [];
                        }
                        calendarTasks[dateKey].push(task);
                    }
                });
                console.log('Tarefas processadas:', calendarTasks);
                console.groupEnd();
                return;
            }
        }

        // Tentar carregar do estado global
        if (window.tasks) {
            console.log('Processando estado global');
            calendarTasks = {};
            Object.values(window.tasks).flat().forEach(task => {
                if (task.startDate) {
                    const dateKey = task.startDate.split('T')[0];
                    if (!calendarTasks[dateKey]) {
                        calendarTasks[dateKey] = [];
                    }
                    calendarTasks[dateKey].push(task);
                }
            });
            console.log('Tarefas processadas do estado global:', calendarTasks);
            console.groupEnd();
            return;
        }

        // Tentar usar cache local
        const storedTasks = localStorage.getItem('calendar_tasks');
        if (storedTasks) {
            console.log('Usando cache local');
            calendarTasks = JSON.parse(storedTasks);
            console.groupEnd();
            return;
        }

        console.warn('Nenhuma fonte de dados disponível para tarefas');
        console.groupEnd();
        throw new Error('Não foi possível carregar as tarefas de nenhuma fonte');

    } catch (error) {
        console.error('[Calendar] Erro ao carregar tarefas:', error);
        throw error;
    } finally {
        hideCalendarLoadingIndicator();
    }
}

// Adicionar estilos CSS para o erro
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .calendar-error {
        width: 100%;
        padding: 20px;
        text-align: center;
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 8px;
    }

    .error-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }

    .error-message i {
        font-size: 24px;
        margin-bottom: 8px;
    }

    .retry-button {
        padding: 8px 16px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        transition: all 0.2s ease;
    }

    .retry-button:hover {
        background: #dc2626;
    }

    .loading {
        text-align: center;
        padding: 20px;
        color: #6366f1;
    }
`;
document.head.appendChild(styleSheet);

// Adicionar estilos CSS para loading e erro
const calendarStyles = document.createElement('style');
calendarStyles.textContent = `
    .calendar-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #6366f1;
        gap: 16px;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .error-details {
        color: #666;
        font-size: 0.9em;
        margin: 8px 0;
    }

    ${styleSheet.textContent}
`;

document.head.appendChild(calendarStyles);

// Função para limpar elementos duplicados no calendário
function cleanupCalendarElements() {
    // Limpar popups existentes
    const popup = document.getElementById('calendar-task-popup');
    if (popup) {
        popup.remove();
    }
    
    // Verificar se existem múltiplas grades de calendário
    const calendarGrids = document.querySelectorAll('.calendar-grid');
    if (calendarGrids.length > 1) {
        console.log(`Removendo ${calendarGrids.length - 1} grades de calendário duplicadas`);
        // Manter apenas a primeira grade e remover as demais
        for (let i = 1; i < calendarGrids.length; i++) {
            calendarGrids[i].remove();
        }
    }
}

// Função otimizada para renderizar o calendário
function renderCalendar() {
    console.group('[Calendar Debug] Renderizando Calendário');
    
    const { calendarGrid, monthYearElement } = DOM;
    if (!calendarGrid || !monthYearElement) {
        console.error('Elementos DOM não encontrados');
        console.groupEnd();
        return;
    }

    // Limpar grid
    calendarGrid.innerHTML = '';
    monthYearElement.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    console.log('Renderizando para:', {
        mes: MONTH_NAMES[currentMonth],
        ano: currentYear,
        tarefasCarregadas: Object.keys(calendarTasks).length
    });

    // Adicionar cabeçalhos
    const headerFragment = document.createDocumentFragment();
    WEEKDAYS.forEach((day, index) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = `calendar-header${index === 0 || index === 6 ? ' calendar-weekend' : ''}`;
        dayHeader.textContent = day;
        headerFragment.appendChild(dayHeader);
    });
    calendarGrid.appendChild(headerFragment);

    // Calcular datas
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const today = new Date();
    const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

    console.log('Período do calendário:', {
        inicio: firstDay.toISOString(),
        fim: lastDay.toISOString(),
        diasNoMes: lastDay.getDate()
    });

    // Criar células
    const cellFragment = document.createDocumentFragment();

    // Células vazias iniciais
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell calendar-empty';
        cellFragment.appendChild(emptyCell);
    }

    // Células dos dias
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateCell = createDateCell(day, today, isCurrentMonth);
        
        // Verificar se há tarefas para este dia
        const currentDate = formatDate(currentYear, currentMonth, day);
        const tasksForDay = calendarTasks[currentDate] || [];
        
        if (tasksForDay.length > 0) {
            console.log(`Tarefas para ${currentDate}:`, tasksForDay.length);
        }
        
        cellFragment.appendChild(dateCell);
    }

    calendarGrid.appendChild(cellFragment);
    
    console.log('Renderização concluída');
    console.groupEnd();
}

// Função para criar célula de data
function createDateCell(day, today, isCurrentMonth) {
    const dateCell = document.createElement('div');
    const formattedDate = formatDate(currentYear, currentMonth, day);
    const isToday = day === today.getDate() && isCurrentMonth;
    const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`Criando célula para ${formattedDate}`, {
        tarefas: calendarTasks[formattedDate] || []
    });
    
    dateCell.className = `calendar-cell${isToday ? ' calendar-today' : ''}${isPast && isCurrentMonth ? ' calendar-past' : ''}`;
    dateCell.dataset.date = formattedDate;

    // Criar estrutura interna da célula
    const cellContent = document.createElement('div');
    cellContent.className = 'calendar-cell-content';

    // Cabeçalho com número do dia
    const header = document.createElement('div');
    header.className = 'calendar-cell-header';
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;

    if (isToday) {
        const todayIndicator = document.createElement('span');
        todayIndicator.className = 'today-indicator';
        todayIndicator.textContent = 'Hoje';
        dayNumber.appendChild(todayIndicator);
    }

    header.appendChild(dayNumber);
    cellContent.appendChild(header);

    // Container de tarefas
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'calendar-tasks-container';

    // Adicionar tarefas
    const tasksForDay = calendarTasks[formattedDate] || [];
    if (tasksForDay.length > 0) {
        console.log(`Adicionando ${tasksForDay.length} tarefas para ${formattedDate}`);
        
        // Mostrar apenas 3 tarefas inicialmente
        const visibleTasks = tasksForDay.slice(0, 3);
        const hiddenTasks = tasksForDay.slice(3);
        
        visibleTasks.forEach(task => {
            const taskElement = createCalendarTask(task);
            tasksContainer.appendChild(taskElement);
        });

        if (hiddenTasks.length > 0) {
            const viewMoreBtn = document.createElement('button');
            viewMoreBtn.className = 'view-more-tasks';
            viewMoreBtn.textContent = `+ ${hiddenTasks.length} mais`;
            viewMoreBtn.onclick = (e) => {
                e.stopPropagation();
                showAllTasks(dateCell, formattedDate, tasksForDay);
            };
            tasksContainer.appendChild(viewMoreBtn);
            
            // Armazenar as tarefas ocultas como atributo de dados no botão
            viewMoreBtn.dataset.hiddenTasks = JSON.stringify(hiddenTasks.map(t => t.id));
        }
    }

    cellContent.appendChild(tasksContainer);
    dateCell.appendChild(cellContent);

    // Adicionar evento de clique
    dateCell.addEventListener('click', handleCellClick);

    return dateCell;
}

// Função auxiliar para mostrar todas as tarefas
function showAllTasks(cell, date, tasks) {
    console.log(`Mostrando todas as ${tasks.length} tarefas para ${date}`);
    
    // Obter o container de tarefas
    const tasksContainer = cell.querySelector('.calendar-tasks-container');
    if (!tasksContainer) return;
    
    // Remover o botão "mais"
    const moreButton = tasksContainer.querySelector('.view-more-tasks');
    if (moreButton) {
        moreButton.remove();
    }
    
    // Limpar o container
    tasksContainer.innerHTML = '';
    
    // Adicionar todas as tarefas
    tasks.forEach(task => {
        const taskElement = createCalendarTask(task);
        tasksContainer.appendChild(taskElement);
    });
    
    // Adicionar botão para fechar/minimizar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-expanded-view';
    closeBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Minimizar';
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        // Recriar a célula normal com apenas 3 tarefas visíveis
        const day = parseInt(date.split('-')[2]);
        const today = new Date();
        const isCurrentMonth = true;
        const newCell = createDateCell(day, today, isCurrentMonth);
        
        // Substituir a célula atual pela nova
        cell.parentNode.replaceChild(newCell, cell);
    };
    
    // Adicionar o botão ao final do container
    tasksContainer.appendChild(closeBtn);
    
    // Expandir o container
    tasksContainer.style.maxHeight = `${tasksContainer.scrollHeight + 20}px`;
    
    // Marcar a célula como expandida
    cell.classList.add('expanded-cell');
}

// Handlers de eventos
function handleCellClick(e) {
    if (e.target.closest('button') || e.target.closest('.calendar-task')) return;
    
    const cell = e.currentTarget;
    cell.classList.add('cell-pulse');
    setTimeout(() => cell.classList.remove('cell-pulse'), 500);

    if (typeof prepareNewTask === 'function') {
        const date = cell.dataset.date;
        prepareNewTask(date);
    }
}

function handleViewAllClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const container = btn.closest('.calendar-tasks-container');
    const cell = container.closest('.calendar-cell');

    container.style.maxHeight = `${container.scrollHeight + 20}px`;
    btn.style.display = 'none';
    cell.classList.add('expanded-cell');

    const closeBtn = createCloseButton(btn, container, cell);
    cell.appendChild(closeBtn);
}

// Funções utilitárias
function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function showCalendarError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'calendar-error';
    errorElement.textContent = message;
    DOM.calendarGrid?.appendChild(errorElement);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const calendarView = document.getElementById('calendario-view');
    if (!calendarView) return;

    console.group('[Calendar] Configurando observador do calendário');
    debugCalendarState();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'calendario-view' && 
                mutation.target.style.display !== 'none' && 
                mutation.attributeName === 'style') {
                console.log('[Calendar] Mudança detectada na visibilidade do calendário');
                calendarTasks = {};
                initCalendar();
            }
        });
    });

    observer.observe(calendarView, { attributes: true });
    console.log('[Calendar] Observador configurado');

    if (calendarView.style.display !== 'none') {
        console.log('[Calendar] Calendário visível, iniciando...');
        initCalendar();
    }
    
    console.groupEnd();
});

// Função para mostrar pop-up detalhado ao passar o mouse sobre uma tarefa
function showTaskPopup(event, task) {
    console.log('Mostrando popup para tarefa:', task.text);
    
    // Remover qualquer pop-up existente
    const existingPopup = document.getElementById('calendar-task-popup');
    if (existingPopup) {
        console.log('Removendo popup existente');
        existingPopup.remove();
    }
    
    // Obter status em português
    const statusLabels = {
        'pending': 'Em andamento',
        'completed': 'Concluído',
        'finished': 'Finalizado',
        'late': 'Em atraso'
    };
    
    // Obter categoria em português
    const categoryLabels = {
        'day': 'Dia',
        'week': 'Semana',
        'month': 'Mês',
        'year': 'Ano'
    };
    
    // Extrair informações adicionais da tarefa
    const completedAt = task.completedAt ? formatDateTime(task.completedAt) : 'Não concluída';
    const finishedAt = task.finishedAt ? formatDateTime(task.finishedAt) : 'Não finalizada';
    const taskCreated = task.createdAt ? formatDateTime(task.createdAt) : 'Data desconhecida';
    const priority = task.priority || 'Normal';
    const comments = task.comments ? task.comments.length : 0;
    const progress = task.progress || 0;
    
    // Calcular tempo restante ou atrasado
    let timeInfo = '';
    const now = new Date();
    const endDate = task.endDate ? new Date(task.endDate) : null;
    
    if (endDate) {
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffTime < 0) {
            if (task.status === 'completed' || task.status === 'finished') {
                timeInfo = `<div class="popup-info success">
                    <i class="fas fa-check-circle"></i>
                    <span>Tarefa concluída</span>
                </div>`;
            } else {
                timeInfo = `<div class="popup-info danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Atrasada em ${Math.abs(diffDays)} dias</span>
                </div>`;
            }
        } else {
            timeInfo = `<div class="popup-info">
                <i class="fas fa-clock"></i>
                <span>Restam ${diffDays} dias</span>
            </div>`;
        }
    }
    
    // Referência aos ícones de status
    const statusIcons = {
        'pending': '<i class="fas fa-clock"></i>',
        'completed': '<i class="fas fa-check"></i>',
        'finished': '<i class="fas fa-flag-checkered"></i>',
        'late': '<i class="fas fa-exclamation-triangle"></i>'
    };
    
    // Criar o elemento do pop-up
    const popup = document.createElement('div');
    popup.id = 'calendar-task-popup';
    popup.className = `calendar-task-popup status-${task.status}`;
    
    // Conteúdo do pop-up
    popup.innerHTML = `
        <div class="popup-header">
            <h3>${task.text || 'Sem título'}</h3>
            <div class="popup-status-badge status-${task.status}">
                ${statusIcons[task.status] || statusIcons.pending}
                ${statusLabels[task.status] || 'Status desconhecido'}
            </div>
        </div>
        
        <div class="popup-content">
            <div class="popup-section">
                <div class="popup-info">
                    <i class="fas fa-layer-group"></i> 
                    <span><strong>Categoria:</strong> ${categoryLabels[task.category] || task.category}</span>
                </div>
                
                <div class="popup-info">
                    <i class="fas fa-flag"></i> 
                    <span><strong>Prioridade:</strong> ${priority}</span>
                </div>
                
                ${timeInfo}
            </div>
            
            <div class="popup-divider"></div>
            
            <div class="popup-section">
                <div class="popup-info">
                    <i class="fas fa-hourglass-start"></i> 
                    <span><strong>Início:</strong> ${formatDateTime(task.startDate)}</span>
                </div>
                
                <div class="popup-info">
                    <i class="fas fa-hourglass-end"></i> 
                    <span><strong>Término:</strong> ${formatDateTime(task.endDate)}</span>
                </div>
                
                ${task.status === 'completed' || task.status === 'finished' ? `
                <div class="popup-info success">
                    <i class="fas fa-check-circle"></i>
                    <span><strong>Completada em:</strong> ${completedAt}</span>
                </div>` : ''}
            </div>
            
            ${task.description ? `
            <div class="popup-divider"></div>
            <div class="popup-section">
                <div class="popup-description">
                    <i class="fas fa-align-left"></i>
                    <span>${task.description}</span>
                </div>
            </div>` : ''}
            
            ${progress > 0 ? `
            <div class="popup-divider"></div>
            <div class="popup-section">
                <div class="popup-progress-label">Progresso: ${progress}%</div>
                <div class="popup-progress-bar">
                    <div class="popup-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>` : ''}
            
            <div class="popup-footer">
                <button class="popup-action-btn edit-btn">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="popup-action-btn status-btn status-${task.status}" data-status="${task.status === 'pending' ? 'completed' : task.status === 'completed' ? 'pending' : 'pending'}">
                    ${task.status === 'pending' ? '<i class="fas fa-check"></i> Concluir' : 
                      task.status === 'completed' ? '<i class="fas fa-clock"></i> Em Andamento' : 
                      '<i class="fas fa-clock"></i> Em Andamento'}
                </button>
            </div>
        </div>
    `;
    
    // Adicionar estilos CSS para o pop-up (se ainda não existirem)
    if (!document.getElementById('calendar-popup-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'calendar-popup-styles';
        styleElement.textContent = `
            .calendar-task-popup {
                position: absolute;
                z-index: 1000;
                width: 300px;
                background-color: var(--bg-color, #fff);
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                border: 1px solid rgba(0, 0, 0, 0.2);
                font-size: 0.9rem;
                animation: popup-fade-in 0.2s ease-out forwards, popup-attention 1s ease-in-out 0.5s;
            }
            
            @keyframes popup-attention {
                0%, 100% { transform: scale(1); box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2); }
                50% { transform: scale(1.03); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3); }
            }
            
            .calendar-task-popup.status-pending {
                border-left: 5px solid #fbbf24;
            }
            
            .calendar-task-popup.status-completed {
                border-left: 5px solid #22c55e;
            }
            
            .calendar-task-popup.status-finished {
                border-left: 5px solid #8b5cf6;
            }
            
            .calendar-task-popup.status-late {
                border-left: 5px solid #ef4444;
            }
            
            @keyframes popup-fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes popup-fade-out {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(10px); }
            }
            
            .popup-header {
                padding: 12px 15px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                background-color: rgba(0, 0, 0, 0.03);
            }
            
            .popup-header h3 {
                margin: 0 0 8px 0;
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-color, #333);
                line-height: 1.3;
            }
            
            .popup-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 50px;
                font-size: 0.75rem;
                font-weight: 500;
                color: white;
            }
            
            .popup-status-badge.status-pending {
                background-color: #fbbf24;
            }
            
            .popup-status-badge.status-completed {
                background-color: #22c55e;
            }
            
            .popup-status-badge.status-finished {
                background-color: #8b5cf6;
            }
            
            .popup-status-badge.status-late {
                background-color: #ef4444;
            }
            
            .popup-content {
                padding: 15px;
            }
            
            .popup-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .popup-divider {
                height: 1px;
                background-color: rgba(0, 0, 0, 0.1);
                margin: 10px 0;
            }
            
            .popup-info {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.85rem;
                color: var(--text-color, #333);
            }
            
            .popup-info i {
                color: var(--primary-color, #7c3aed);
                font-size: 0.9rem;
                width: 16px;
                text-align: center;
            }
            
            .popup-info.success i {
                color: #22c55e;
            }
            
            .popup-info.danger i {
                color: #ef4444;
            }
            
            .popup-description {
                display: flex;
                gap: 8px;
                font-size: 0.85rem;
                color: var(--text-color, #666);
                line-height: 1.4;
            }
            
            .popup-description i {
                color: var(--primary-color, #7c3aed);
                font-size: 0.9rem;
                margin-top: 2px;
            }
            
            .popup-progress-label {
                font-size: 0.85rem;
                margin-bottom: 4px;
                color: var(--text-color, #333);
            }
            
            .popup-progress-bar {
                height: 8px;
                background-color: rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .popup-progress-fill {
                height: 100%;
                background-color: #22c55e;
                border-radius: 4px;
            }
            
            .popup-footer {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                justify-content: space-between;
            }
            
            .popup-action-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                background-color: rgba(0, 0, 0, 0.05);
                color: var(--text-color, #333);
                font-size: 0.85rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .popup-action-btn:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }
            
            .popup-action-btn.edit-btn:hover {
                background-color: rgba(124, 58, 237, 0.1);
                color: #7c3aed;
            }
            
            .popup-action-btn.status-btn {
                background-color: rgba(34, 197, 94, 0.1);
                color: #22c55e;
            }
            
            .popup-action-btn.status-btn:hover {
                background-color: rgba(34, 197, 94, 0.2);
            }
            
            .popup-action-btn.status-btn.status-completed {
                background-color: rgba(251, 191, 36, 0.1);
                color: #d97706;
            }
            
            .popup-action-btn.status-btn.status-completed:hover {
                background-color: rgba(251, 191, 36, 0.2);
            }
            
            /* Tema escuro */
            body.dark .calendar-task-popup {
                background-color: #1e293b;
                border-color: rgba(255, 255, 255, 0.1);
            }
            
            body.dark .popup-header {
                border-color: rgba(255, 255, 255, 0.1);
                background-color: rgba(255, 255, 255, 0.03);
            }
            
            body.dark .popup-header h3 {
                color: #e2e8f0;
            }
            
            body.dark .popup-divider {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            body.dark .popup-info {
                color: #cbd5e1;
            }
            
            body.dark .popup-description {
                color: #94a3b8;
            }
            
            body.dark .popup-progress-label {
                color: #cbd5e1;
            }
            
            body.dark .popup-action-btn {
                background-color: rgba(255, 255, 255, 0.05);
                color: #cbd5e1;
            }
            
            body.dark .popup-action-btn:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    // Calcular a posição do pop-up
    const taskRect = event.currentTarget.getBoundingClientRect();
    const calendarGrid = document.getElementById('calendar-grid');
    
    // Dimensões do pop-up
    const popupWidth = 300;
    const popupHeight = 280; // Valor aproximado
    
    // Posição do pop-up
    let left, top;
    
    if (calendarGrid) {
        const gridRect = calendarGrid.getBoundingClientRect();
        
        // Verificar se há espaço à direita
        if (taskRect.right + popupWidth + 10 <= document.documentElement.clientWidth) {
            left = taskRect.right + 10;
        }
        // Se não houver espaço à direita, tentar à esquerda
        else if (taskRect.left - popupWidth - 10 >= 0) {
            left = taskRect.left - popupWidth - 10;
        }
        // Caso contrário, centralizar na tela
        else {
            left = Math.max(10, (document.documentElement.clientWidth - popupWidth) / 2);
        }
        
        // Posição vertical - alinhado com o topo do elemento
        top = taskRect.top;
        
        // Verificar se há espaço suficiente abaixo
        if (top + popupHeight + 10 > document.documentElement.clientHeight) {
            top = Math.max(10, document.documentElement.clientHeight - popupHeight - 10);
        }
        
        // Ajustar para a posição na página (considerando o scroll)
        left += window.pageXOffset;
        top += window.pageYOffset;
    } else {
        // Fallback se não encontrar o grid
        left = event.clientX + window.pageXOffset + 10;
        top = event.clientY + window.pageYOffset + 10;
    }
    
    // Aplicar posição ao pop-up
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    
    // Adicionar o pop-up ao corpo do documento
    document.body.appendChild(popup);
    console.log('Popup adicionado ao DOM:', popup.id);
    
    // Adicionar classe de destaque para chamar atenção
    setTimeout(() => {
        if (document.body.contains(popup)) {
            popup.classList.add('popup-visible');
        }
    }, 50);
    
    // Adicionar eventos aos botões
    const editBtn = popup.querySelector('.edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            // Fechar o pop-up
            popup.remove();
            
            // Abrir o editor de tarefas
            if (typeof prepareEditTask === 'function') {
                prepareEditTask(task);
            } else {
                console.warn('Função para editar tarefa não disponível');
                showInfoNotification('Edição de tarefa não disponível no momento.');
            }
        });
    }
    
    // Botão de alterar status
    const statusBtn = popup.querySelector('.status-btn');
    if (statusBtn) {
        statusBtn.addEventListener('click', () => {
            const newStatus = statusBtn.getAttribute('data-status');
            
            // Fechar o pop-up
            popup.remove();
            
            // Atualizar o status
            if (newStatus && typeof updateTaskStatus === 'function') {
                updateTaskStatus(task.id, newStatus);
                showInfoNotification(`Tarefa "${task.text}" atualizada para "${STATUS_LABELS[newStatus]}"`);
            }
        });
    }
    
    // Fechar o pop-up quando o mouse sair do elemento ou do próprio pop-up
    const closePopup = () => {
        popup.style.animation = 'popup-fade-out 0.2s ease-out forwards';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 200);
    };
    
    // Adicionar evento para fechar o pop-up quando o mouse sair do elemento de tarefa
    event.currentTarget.addEventListener('mouseleave', (e) => {
        // Verificar se o mouse saiu para o pop-up
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const popupRect = popup.getBoundingClientRect();
        
        // Se o mouse estiver dentro do pop-up, não fechar
        if (mouseX >= popupRect.left && mouseX <= popupRect.right && 
            mouseY >= popupRect.top && mouseY <= popupRect.bottom) {
            return;
        }
        
        // Aguardar um pouco para verificar se o mouse entrou no pop-up
        setTimeout(() => {
            // Verificar se o mouse está sobre o pop-up
            if (!popup.matches(':hover')) {
                closePopup();
            }
        }, 100);
    });
    
    // Fechar o pop-up quando o mouse sair do pop-up (se não entrar em outro elemento relevante)
    popup.addEventListener('mouseleave', (e) => {
        // Verificar se o mouse saiu para o elemento de tarefa
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const taskElementRect = event.currentTarget.getBoundingClientRect();
        
        // Se o mouse estiver dentro do elemento de tarefa, não fechar
        if (mouseX >= taskElementRect.left && mouseX <= taskElementRect.right && 
            mouseY >= taskElementRect.top && mouseY <= taskElementRect.bottom) {
            return;
        }
        
        // Aguardar um pouco para verificar se o mouse entrou no elemento de tarefa
        setTimeout(() => {
            // Verificar se o mouse está sobre o elemento de tarefa
            if (!event.currentTarget.matches(':hover')) {
                closePopup();
            }
        }, 100);
    });
    
    return popup;
}

// Função para esconder o tooltip das tarefas do calendário
function hideTaskTooltip(tooltip) {
    if (!tooltip) return;
    
    console.log('Escondendo popup:', tooltip.id);
    
    // Adicionar animação de fade-out
    tooltip.style.animation = 'popup-fade-out 0.2s ease-out forwards';
    
    // Remover após a animação terminar
    setTimeout(() => {
        if (document.body.contains(tooltip)) {
            console.log('Removendo popup do DOM');
            document.body.removeChild(tooltip);
        }
    }, 200);
}

// Função para atualizar o status de uma tarefa no calendário
function updateCalendarTaskStatus(taskId, newStatus) {
    console.log(`[Calendar] Iniciando atualização de status: ${taskId} -> ${newStatus}`);
    
    try {
        let taskUpdated = false;
        let needsRerender = false;

        // Atualizar nos dados do calendário
        Object.keys(calendarTasks).forEach(date => {
            const tasks = calendarTasks[date];
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex !== -1) {
                const oldStatus = tasks[taskIndex].status;
                tasks[taskIndex].status = newStatus;
                taskUpdated = true;
                
                console.log(`[Calendar] Tarefa atualizada em ${date}: ${oldStatus} -> ${newStatus}`);
                
                // Verificar se precisa re-renderizar
                needsRerender = needsRerender || 
                    oldStatus === 'late' || 
                    newStatus === 'late' || 
                    tasks.length === 1;
            }
        });

        if (taskUpdated) {
            // Atualizar cache local
            localStorage.setItem('calendar_tasks', JSON.stringify(calendarTasks));
            
            // Atualizar visualmente
            const taskElements = document.querySelectorAll(`.calendar-task[data-task-id="${taskId}"]`);
            console.log(`[Calendar] Atualizando ${taskElements.length} elementos visuais`);
            
            taskElements.forEach(taskEl => {
                // Atualizar classes de status
                const oldClasses = Array.from(taskEl.classList)
                    .filter(cls => cls.startsWith('status-'));
                oldClasses.forEach(cls => taskEl.classList.remove(cls));
                taskEl.classList.add(`status-${newStatus}`);
                
                // Atualizar atributos de dados
                taskEl.dataset.taskStatus = newStatus;
                
                // Atualizar ícone
                const statusIcon = taskEl.querySelector('.task-status-icon');
                if (statusIcon) {
                    const icons = {
                        'pending': '<i class="fas fa-clock"></i>',
                        'completed': '<i class="fas fa-check"></i>',
                        'finished': '<i class="fas fa-flag-checkered"></i>',
                        'late': '<i class="fas fa-exclamation-triangle"></i>'
                    };
                    statusIcon.innerHTML = icons[newStatus] || icons.pending;
                }
                
                // Adicionar animação de atualização
                taskEl.classList.add('task-updated');
                setTimeout(() => taskEl.classList.remove('task-updated'), 1000);
            });
            
            // Se necessário, re-renderizar o calendário
            if (needsRerender) {
                console.log('[Calendar] Re-renderizando calendário');
                renderCalendar();
            }
            
            // Disparar evento de atualização
            const event = new CustomEvent('calendarTaskUpdated', {
                detail: { taskId, newStatus }
            });
            window.dispatchEvent(event);
            
            console.log('[Calendar] Atualização concluída com sucesso');
            return true;
        } else {
            console.warn('[Calendar] Tarefa não encontrada no calendário');
            return false;
        }
    } catch (error) {
        console.error('[Calendar] Erro ao atualizar status:', error);
        return false;
    }
}

// Função para integrar com o sistema de KPI
function integrateWithKPI() {
    try {
        console.log('[Calendar] Iniciando integração com KPI');
        
        // Registrar no evento global de atualização de status
        window.addEventListener('taskStatusUpdated', function(event) {
            if (event.detail) {
                const { taskId, newStatus } = event.detail;
                console.log('[Calendar] Evento de atualização de status recebido:', taskId, newStatus);
                updateCalendarTaskStatus(taskId, newStatus);
            }
        });

        // Registrar no KPIManager se disponível
        if (typeof window.KPIManager === 'object' && window.KPIManager !== null) {
            console.log('[Calendar] KPIManager encontrado, registrando listener');
            if (typeof window.KPIManager.on === 'function') {
                window.KPIManager.on('statusChanged', (taskId, newStatus) => {
                    console.log('[Calendar] KPIManager notificou mudança:', taskId, newStatus);
                    updateCalendarTaskStatus(taskId, newStatus);
                });
            }
            
            if (typeof window.KPIManager.subscribe === 'function') {
                window.KPIManager.subscribe('taskUpdate', (data) => {
                    console.log('[Calendar] KPIManager notificou atualização:', data);
                    if (data.taskId && data.status) {
                        updateCalendarTaskStatus(data.taskId, data.status);
                    }
                });
            }
        }

        // Registrar no StatusManager para redundância
        if (window.StatusManager) {
            console.log('[Calendar] StatusManager encontrado, registrando handler');
            if (typeof window.StatusManager.registerStatusChangeHandler === 'function') {
                window.StatusManager.registerStatusChangeHandler('calendar', (taskId, newStatus) => {
                    console.log('[Calendar] StatusManager notificou mudança:', taskId, newStatus);
                    updateCalendarTaskStatus(taskId, newStatus);
                });
            }
            
            if (typeof window.StatusManager.on === 'function') {
                window.StatusManager.on('statusChange', (data) => {
                    console.log('[Calendar] StatusManager evento recebido:', data);
                    if (data.taskId && data.status) {
                        updateCalendarTaskStatus(data.taskId, data.status);
                    }
                });
            }
        }

        // Observar mudanças diretas no DOM
        const taskElements = document.querySelectorAll('.calendar-task');
        taskElements.forEach(taskEl => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-status') {
                        const taskId = taskEl.dataset.taskId;
                        const newStatus = taskEl.dataset.status;
                        console.log('[Calendar] Mudança detectada no DOM:', taskId, newStatus);
                        updateCalendarTaskStatus(taskId, newStatus);
                    }
                });
            });
            
            observer.observe(taskEl, {
                attributes: true,
                attributeFilter: ['data-status']
            });
        });

        console.log('[Calendar] Integração com KPI concluída');
    } catch (error) {
        console.error('[Calendar] Erro ao integrar com KPI:', error);
    }
}

// Função para mostrar indicador de carregamento no calendário
function showCalendarLoadingIndicator() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    // Verificar se já existe um indicador
    if (document.getElementById('calendar-loading-indicator')) return;
    
    // Criar indicador de carregamento
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'calendar-loading-indicator';
    loadingIndicator.className = 'calendar-loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Carregando tarefas...</p>
    `;
    
    // Adicionar ao grid do calendário
    calendarGrid.appendChild(loadingIndicator);
    
    // Adicionar estilo CSS para o indicador de carregamento se ainda não existir
    if (!document.getElementById('calendar-loading-style')) {
        const style = document.createElement('style');
        style.id = 'calendar-loading-style';
        style.textContent = `
            .calendar-loading-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                z-index: 100;
            }
            
            .loading-spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 30px;
                height: 30px;
                margin: 0 auto 10px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .calendar-error {
                background-color: rgba(220, 53, 69, 0.9) !important;
                padding: 15px !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Função para esconder o indicador de carregamento
function hideCalendarLoadingIndicator() {
    const loadingIndicator = document.getElementById('calendar-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// Função para configurar os event listeners dos botões de navegação
function setupNavigationListeners() {
    // Event listeners para botões de ícone nos controles do calendário
    const prevMonthIcon = document.getElementById('prev-month-icon');
    const nextMonthIcon = document.getElementById('next-month-icon');
    
    if (prevMonthIcon) {
        prevMonthIcon.addEventListener('click', () => {
            navigateMonth(-1);
        });
    }
    
    if (nextMonthIcon) {
        nextMonthIcon.addEventListener('click', () => {
            navigateMonth(1);
        });
    }
}

// Função para navegar entre os meses
function navigateMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    renderCalendar();
}

// Função para integrar o calendário com o TaskStatusManager global
function integrateWithTaskStatusManager() {
    try {
        // Verificar se o StatusManager global está disponível e é válido
        if (typeof window.StatusManager === 'object' && 
            window.StatusManager !== null && 
            typeof window.StatusManager.registerStatusChangeHandler === 'function') {
            
            console.log('Integrando calendário com o TaskStatusManager...');
            
            // Registrar listener para eventos de mudança de status
            window.StatusManager.registerStatusChangeHandler('calendar', (taskId, newStatus) => {
                console.log(`StatusManager notificou alteração para tarefa ${taskId}: ${newStatus}`);
                updateCalendarTaskStatus(taskId, newStatus);
            });
        } else {
            console.warn('StatusManager não está disponível ou não está completamente inicializado');
            
            // Criar um StatusManager básico se não existir
            if (!window.StatusManager) {
                window.StatusManager = {
                    handlers: {},
                    registerStatusChangeHandler: function(id, handler) {
                        this.handlers[id] = handler;
                    },
                    notifyStatusChange: function(taskId, newStatus) {
                        Object.values(this.handlers).forEach(handler => {
                            try {
                                handler(taskId, newStatus);
                            } catch (error) {
                                console.error('Erro ao executar handler:', error);
                            }
                        });
                    }
                };
                console.log('StatusManager básico criado para fallback');
            }
        }
    } catch (error) {
        console.error('Erro ao integrar com StatusManager:', error);
    }
}

// Função para atualizar o status de uma tarefa
function updateTaskStatus(taskId, newStatus) {
    try {
        // Atualizar o status no calendário
        const updated = updateCalendarTaskStatus(taskId, newStatus);
        
        // Notificar outros componentes através do StatusManager se disponível
        if (window.StatusManager && typeof window.StatusManager.notifyStatusChange === 'function') {
            window.StatusManager.notifyStatusChange(taskId, newStatus);
        }
        
        return updated;
    } catch (error) {
        console.error('Erro ao atualizar status da tarefa:', error);
        return false;
    }
}

// Ao criar tarefas do calendário, adicionar:
function createCalendarTask(task) {
    if (!task || !task.id) {
        console.error('Tarefa inválida ou sem ID fornecida para createCalendarTask');
        return document.createElement('div'); // Retornar elemento vazio para evitar erros
    }
    
    const taskElement = document.createElement('div');
    taskElement.className = `calendar-task status-${task.status || 'pending'}`;
    taskElement.setAttribute('data-task-id', task.id); // Garantir que o ID da tarefa seja um atributo
    
    // Ícone baseado no status
    const statusIcons = {
        'pending': '<i class="fas fa-clock"></i>',
        'completed': '<i class="fas fa-check"></i>',
        'finished': '<i class="fas fa-flag-checkered"></i>',
        'late': '<i class="fas fa-exclamation-triangle"></i>'
    };
    
    // Usar um ícone padrão se o status não for reconhecido
    const statusIcon = statusIcons[task.status] || statusIcons.pending;
    
    // Limitar o comprimento do texto da tarefa no calendário para não quebrar o layout
    const maxDisplayLength = 25;
    let taskText = task.text || 'Sem título';
    
    // Truncar texto longo com elipses
    if (taskText.length > maxDisplayLength) {
        taskText = `${taskText.substring(0, maxDisplayLength)}...`;
    }
    
    // Criar uma estrutura mais robusta para o conteúdo da tarefa
    taskElement.innerHTML = `
        <span class="task-status-icon">${statusIcon}</span>
        <span class="task-title">${taskText}</span>
    `;
    
    // Adicionar informação completa em atributos de dados
    taskElement.dataset.taskTitle = task.text;
    taskElement.dataset.taskStatus = task.status || 'pending';
    taskElement.dataset.taskCategory = task.category;
    
    // Variáveis para controlar o timer do tooltip
    let tooltipTimer = null;
    const tooltipDelay = 300; // Reduzir o atraso para 300ms para melhor experiência
    
    // Adicionar tooltip ao passar o mouse - com atraso para evitar flickering
    taskElement.addEventListener('mouseenter', (e) => {
        console.log('Mouse entrou na tarefa:', task.text);
        
        // Limpar qualquer timer existente
        if (tooltipTimer) clearTimeout(tooltipTimer);
        
        // Remover qualquer popup existente para evitar duplicação
        const existingPopup = document.getElementById('calendar-task-popup');
        if (existingPopup) {
            hideTaskTooltip(existingPopup);
        }
        
        // Configurar um novo timer para mostrar o tooltip após o atraso
        tooltipTimer = setTimeout(() => {
            // Verificar se a célula não está expandida
            if (!e.currentTarget.closest('.expanded-cell')) {
                // Criar o popup diretamente
                showTaskPopup(e, task);
                // Adicionar classe para mostrar que o elemento tem tooltip ativo
                e.currentTarget.classList.add('tooltip-active');
            }
        }, tooltipDelay);
    });
    
    // Remover o timer se o mouse sair antes do tempo especificado
    taskElement.addEventListener('mouseleave', (e) => {
        console.log('Mouse saiu da tarefa:', task.text);
        
        // Limpar o timer para não mostrar o tooltip
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        
        // Esconder o tooltip com um pequeno atraso para facilitar a transição para o próprio tooltip
        setTimeout(() => {
            const popup = document.getElementById('calendar-task-popup');
            if (popup && !popup.matches(':hover')) {
                hideTaskTooltip(popup);
                e.currentTarget.classList.remove('tooltip-active');
            }
        }, 100);
    });
    
    // Permitir clicar na tarefa para editar
    taskElement.addEventListener('click', (e) => {
        // Impedir que o evento se propague para a célula do calendário
        e.stopPropagation();
        
        // Limpar qualquer timer pendente
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        
        // Fechar qualquer tooltip aberto
        const popup = document.getElementById('calendar-task-popup');
        if (popup) {
            hideTaskTooltip(popup);
        }
        
        // Remover classe de tooltip ativo
        taskElement.classList.remove('tooltip-active');
        
        // Adicionar efeito de clique
        taskElement.classList.add('task-click-effect');
        setTimeout(() => {
            taskElement.classList.remove('task-click-effect');
        }, 300);
        
        // Verificar se a função para editar tarefa existe
        if (typeof prepareEditTask === 'function') {
            prepareEditTask(task);
        } else {
            console.warn('Função para editar tarefa não disponível');
            
            // Solução alternativa: atualizar status diretamente se não houver editor
            if (typeof updateTaskStatus === 'function') {
                // Ciclar entre os estados: pendente -> concluído -> finalizado -> pendente
                const statusCycle = {
                    'pending': 'completed',
                    'completed': 'finished',
                    'finished': 'pending',
                    'late': 'completed'
                };
                
                const newStatus = statusCycle[task.status || 'pending'];
                updateTaskStatus(task.id, newStatus);
                
                // Mostrar feedback visual
                showInfoNotification(`Tarefa "${taskText}" marcada como "${getStatusText(newStatus)}"`);
            }
        }
    });
    
    return taskElement;
}

// Função para obter o texto do status em português
function getStatusText(status) {
    const statusTexts = {
        'pending': 'Em andamento',
        'completed': 'Concluído',
        'finished': 'Finalizado',
        'late': 'Em atraso'
    };
    
    return statusTexts[status] || 'Desconhecido';
}

// Função para atualização instantânea do calendário
function setupInstantUpdates() {
    console.log('[Calendar] Configurando atualizações instantâneas');
    
    // Observer para mudanças no estado global de tarefas
    if (window.tasks) {
        const tasksProxy = new Proxy(window.tasks, {
            set: function(target, property, value) {
                target[property] = value;
                CalendarObserver.notify('tasks-updated', { category: property });
                return true;
            }
        });
        window.tasks = tasksProxy;
    }
    
    // Observar mudanças no KPI
    if (typeof window.KPIManager === 'object' && window.KPIManager !== null) {
        window.KPIManager.registerStatusChangeListener((taskId, newStatus) => {
            CalendarObserver.notify('status-changed', { taskId, newStatus });
        });
    }
    
    // Observar mudanças no StatusManager
    if (window.StatusManager && typeof window.StatusManager.registerStatusChangeHandler === 'function') {
        window.StatusManager.registerStatusChangeHandler('calendar-instant', (taskId, newStatus) => {
            CalendarObserver.notify('status-changed', { taskId, newStatus });
        });
    }
    
    // Registrar callback para atualizações
    CalendarObserver.subscribe((changeType, data) => {
        console.log(`[Calendar] Processando atualização: ${changeType}`, data);
        
        switch (changeType) {
            case 'status-changed':
                updateCalendarTaskStatus(data.taskId, data.newStatus);
                break;
                
            case 'tasks-updated':
                refreshCalendarTasks();
                break;
                
            case 'task-added':
            case 'task-deleted':
                refreshCalendarTasks();
                break;
        }
    });
}

// Função para atualizar tarefas do calendário
async function refreshCalendarTasks() {
    console.log('[Calendar] Atualizando tarefas do calendário');
    
    try {
        // Salvar scroll atual
        const grid = document.getElementById('calendar-grid');
        const scrollPos = grid ? { top: grid.scrollTop, left: grid.scrollLeft } : null;
        
        // Recarregar tarefas
        await loadCalendarTasks();
        
        // Renderizar calendário
        renderCalendar();
        
        // Restaurar posição do scroll
        if (scrollPos && grid) {
            grid.scrollTop = scrollPos.top;
            grid.scrollLeft = scrollPos.left;
        }
        
        console.log('[Calendar] Atualização concluída');
    } catch (error) {
        console.error('[Calendar] Erro ao atualizar calendário:', error);
    }
}

// Função para integrar com o sistema de sincronização global
function setupGlobalSyncIntegration() {
    if (!window.GlobalSync) {
        console.error('[Calendar] Sistema de sincronização global não encontrado');
        return;
    }

    console.log('[Calendar] Configurando integração com sistema de sincronização global');

    // Registrar para atualizações de status
    window.GlobalSync.on('status-change', ({ taskId, newStatus }) => {
        console.log('[Calendar] Recebida atualização de status do GlobalSync:', taskId, newStatus);
        updateCalendarTaskStatus(taskId, newStatus);
    });

    // Registrar para atualizações de dados
    window.GlobalSync.on('data-update', (change) => {
        console.log('[Calendar] Recebida atualização de dados do GlobalSync:', change);
        refreshCalendarTasks();
    });

    // Registrar para erros
    window.GlobalSync.on('error', (error) => {
        console.error('[Calendar] Erro reportado pelo GlobalSync:', error);
        showCalendarError('Erro ao sincronizar dados. Tentando novamente...');
    });
}

// Função para atualizar o calendário quando houver mudanças
function handleTasksUpdate(event) {
    console.group('[Calendar] Atualizando calendário');
    
    try {
        if (event.detail && event.detail.tasksByDate) {
            console.log('Recebidas novas tarefas por data:', event.detail.tasksByDate);
            calendarTasks = event.detail.tasksByDate;
            renderCalendar();
        } else if (event.detail && event.detail.tasks) {
            console.log('Processando tarefas recebidas');
            calendarTasks = {};
            Object.values(event.detail.tasks).flat().forEach(task => {
                if (task.startDate) {
                    const dateKey = task.startDate.split('T')[0];
                    if (!calendarTasks[dateKey]) {
                        calendarTasks[dateKey] = [];
                    }
                    calendarTasks[dateKey].push(task);
                }
            });
            renderCalendar();
        }
        
        console.log('Calendário atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar calendário:', error);
    }
    
    console.groupEnd();
}

// Registrar listener para atualizações
window.addEventListener('tasksUpdated', handleTasksUpdate);