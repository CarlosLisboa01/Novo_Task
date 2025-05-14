// Funções de Calendário para o TaskPro
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calendarTasks = {};
let isCalendarInitialized = false;
let calendarObserver = null; // Observer para monitorar alterações no DOM do calendário

// Armazenamento temporário para tarefas vindas do dashboard
let storedTasksFromDashboard = null;

// Função para armazenar tarefas do dashboard para uso futuro no calendário
window._storeTasksForCalendar = function(tasks) {
    console.log('Armazenando tarefas do dashboard para uso futuro no calendário');
    storedTasksFromDashboard = JSON.parse(JSON.stringify(tasks)); // Cópia profunda para evitar referências
};

// Função para inicializar o calendário
function initCalendar() {
    console.log('Inicializando calendário...');
    
    // Selecionar o container do calendário
    const calendarContainer = document.querySelector('#calendario-view .calendar-container');
    if (!calendarContainer) {
        console.error('Container do calendário não encontrado!');
        return;
    }
    
    console.log('Container do calendário encontrado:', calendarContainer);
    
    // Verificar se já existem elementos no calendário para evitar duplicação
    const existingControls = calendarContainer.querySelector('.calendar-controls');
    const existingGrid = calendarContainer.querySelector('.calendar-grid');
    
    // Se já estiver inicializado e existirem controles, apenas renderizar o calendário
    if (isCalendarInitialized && existingControls && existingGrid) {
        console.log('Calendário já inicializado, apenas atualizando...');
        
        // Limpar possíveis duplicações antes de renderizar novamente
        cleanupCalendarElements();
        
        // Garantir que os event listeners existam
        setupNavigationListeners();
        
        renderCalendar();
        return;
    }
    
    // Limpar quaisquer elementos duplicados
    cleanupCalendarElements();
    
    // Marcar como inicializado
    isCalendarInitialized = true;

    // Carregar as tarefas para o calendário
    loadCalendarTasks().then(() => {
        // Renderizar o calendário após carregar as tarefas
        renderCalendar();
        
        // Configurar event listeners para botões de navegação
        setupNavigationListeners();
        
        // Integrar com o gerenciador de status
        integrateWithTaskStatusManager();
    });
}

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

// Função para renderizar o calendário
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearElement = document.getElementById('calendar-month-year');
    
    if (!calendarGrid || !monthYearElement) {
        console.error('Elementos necessários do calendário não encontrados');
        return;
    }
    
    // Limpar grid do calendário
    calendarGrid.innerHTML = '';
    
    // Atualizar título do mês/ano
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Remover os botões de visualização (Mês, Semana, Dia) na inicialização do calendário
    const calendarViewOptions = document.querySelector('.calendar-view-options');
    if (calendarViewOptions) {
        calendarViewOptions.style.display = 'none';
    }
    
    // Remover a barra de navegação com os botões Anterior, Próximo e Hoje
    const calendarNavigation = document.querySelector('.calendar-navigation');
    if (calendarNavigation) {
        calendarNavigation.style.display = 'none';
    }
    
    // Adicionar cabeçalhos dos dias da semana
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekdays.forEach((day, index) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header';
        
        // Adicionar classe especial para finais de semana
        if (index === 0 || index === 6) {
            dayHeader.classList.add('calendar-weekend');
        }
        
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Calcular o primeiro e último dia do mês
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Adicionar células vazias para os dias anteriores ao primeiro dia do mês
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell calendar-empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    // Remover qualquer popup existente
    const existingPopup = document.getElementById('calendar-task-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Obter a data atual para comparação
    const today = new Date();
    const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
    
    // Criar um fragmento de documento para melhorar o desempenho de renderização
    const fragment = document.createDocumentFragment();
    
    // Adicionar células para cada dia do mês
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateCell = document.createElement('div');
        dateCell.className = 'calendar-cell';
        
        // Verificar se é hoje
        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // Adicionar classes com base no dia
        if (isToday) {
            dateCell.classList.add('calendar-today');
        } else if (isPast && isCurrentMonth) {
            dateCell.classList.add('calendar-past');
        }
        
        // Formato da data: YYYY-MM-DD
        const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Armazenar data formatada como atributo de dados para fácil acesso
        dateCell.dataset.date = formattedDate;
        
        // Criar cabeçalho da célula com número do dia e indicador de tarefas
        const cellHeader = document.createElement('div');
        cellHeader.className = 'calendar-cell-header';
        
        // Adicionar número do dia
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;

        // Adicionar indicador de "Hoje" junto ao número do dia
        if (isToday) {
            const todayIndicator = document.createElement('span');
            todayIndicator.className = 'today-indicator';
            todayIndicator.textContent = 'Hoje';
            dayNumber.appendChild(todayIndicator);
        }

        cellHeader.appendChild(dayNumber);
        
        // Adicionar indicador de tarefas se houver tarefas neste dia
        const dayTasks = calendarTasks[formattedDate] || [];
        if (dayTasks.length > 0) {
            const taskCount = dayTasks.length;
            const taskIndicator = document.createElement('div');
            taskIndicator.className = 'calendar-task-indicator';
            
            // Verificar status das tarefas para definir a cor do indicador
            const hasLate = dayTasks.some(task => task.status === 'late');
            if (hasLate) {
                taskIndicator.classList.add('has-late');
            }
            
            taskIndicator.innerHTML = `
                <span>${taskCount}</span>
                <i class="fas fa-tasks"></i>
            `;
            cellHeader.appendChild(taskIndicator);
        }
        
        dateCell.appendChild(cellHeader);
        
        // Adicionar container para tarefas
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'calendar-tasks-container';
        
        // Adicionar tarefas para esta data
        if (dayTasks.length > 0) {
            // Ordenar tarefas: tarefas atrasadas primeiro, depois por status
            const sortedTasks = [...dayTasks].sort((a, b) => {
                // Prioriza tarefas atrasadas
                if (a.status === 'late' && b.status !== 'late') return -1;
                if (a.status !== 'late' && b.status === 'late') return 1;
                
                // Depois, organiza por ordem de status: em andamento, concluído, finalizado
                const statusOrder = { 'pending': 1, 'completed': 2, 'finished': 3 };
                return statusOrder[a.status || 'pending'] - statusOrder[b.status || 'pending'];
            });
            
            // Limitar a quantidade de tarefas visíveis inicialmente para performance
            const maxVisibleTasks = Math.min(5, sortedTasks.length);
            const hasMoreTasks = sortedTasks.length > maxVisibleTasks;
            
            // Adicionar as tarefas visíveis
            for (let i = 0; i < maxVisibleTasks; i++) {
                const taskElement = createCalendarTask(sortedTasks[i]);
                tasksContainer.appendChild(taskElement);
            }
            
            // Se houver mais tarefas que o limite visível, adicionar botão "Ver todas"
            if (hasMoreTasks) {
                    tasksContainer.classList.add('has-more');
                    
                    // Adicionar botão "Ver todas"
                    const viewAllBtn = document.createElement('button');
                    viewAllBtn.className = 'view-all-tasks-btn';
                viewAllBtn.type = "button";
                viewAllBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Ver todas ${sortedTasks.length} tarefas`;
                    
                // Configurar evento de clique para expandir
                    viewAllBtn.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                    // Já adicionou as tarefas extras?
                    const hasExpandedTasks = dateCell.dataset.expanded === 'true';
                    
                    if (!hasExpandedTasks) {
                        // Adicionar as tarefas restantes
                        for (let i = maxVisibleTasks; i < sortedTasks.length; i++) {
                            const taskElement = createCalendarTask(sortedTasks[i]);
                            tasksContainer.appendChild(taskElement);
                        }
                        
                        // Marcar como expandido
                        dateCell.dataset.expanded = 'true';
                    }
                    
                    // Expandir o contêiner
                        tasksContainer.style.maxHeight = `${tasksContainer.scrollHeight + 20}px`;
                        
                    // Ocultar o botão e adicionar classe de expansão
                        this.style.display = 'none';
                        dateCell.classList.add('expanded-cell');
                        
                        // Criar botão para fechar a visualização expandida
                    if (!dateCell.querySelector('.close-expanded-view-btn')) {
                        const closeViewBtn = document.createElement('button');
                        closeViewBtn.className = 'close-expanded-view-btn';
                        closeViewBtn.innerHTML = `<i class="fas fa-chevron-up"></i> Fechar`;
                        closeViewBtn.type = "button";
                        
                        // Adicionar evento para fechar a visualização expandida
                        closeViewBtn.onclick = function(evt) {
                            evt.preventDefault();
                            evt.stopPropagation();
                            
                            // Restaurar altura padrão
                            tasksContainer.style.maxHeight = '';
                            
                            // Remover classe de expansão
                            dateCell.classList.remove('expanded-cell');
                            
                            // Mostrar novamente o botão "Ver todas"
                            viewAllBtn.style.display = 'flex';
                            
                            // Remover o botão de fechar
                            this.remove();
                        };
                        
                        // Adicionar botão de fechar à célula
                        dateCell.appendChild(closeViewBtn);
                    }
                        
                    return false; // Impedir comportamento padrão
                    };
                    
                    // Inserir botão após o contêiner de tarefas
                    dateCell.insertBefore(viewAllBtn, tasksContainer.nextSibling);
                }
        } else {
            // Se não houver tarefas, adicionar mensagem vazia mais sutil
            const emptyTasksPlaceholder = document.createElement('div');
            emptyTasksPlaceholder.className = 'empty-tasks-placeholder';
            tasksContainer.appendChild(emptyTasksPlaceholder);
        }
        
        dateCell.appendChild(tasksContainer);
        
        // Adicionar evento de clique na célula para abrir o modal de nova tarefa
        dateCell.addEventListener('click', (e) => {
            // Não processar o clique se foi em um botão ou em uma tarefa
            if (e.target.closest('button') || e.target.closest('.calendar-task')) {
                return;
            }
            
            // Criar hora atual formatada (HH:MM)
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const currentTime = `${hours}:${minutes}`;
            
            // Criar data formatada para o input datetime-local (YYYY-MM-DDTHH:MM)
            const selectedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${currentTime}`;
            
            // Adicionar efeito de pulso ao clicar na célula
            dateCell.classList.add('cell-pulse');
            setTimeout(() => {
                dateCell.classList.remove('cell-pulse');
            }, 500);
            
            // Verificar se a função para preparar nova tarefa existe
            if (typeof prepareNewTask === 'function') {
            // Preparar para nova tarefa
            prepareNewTask();
            
            // Preencher o campo de data de início
            setTimeout(() => {
                const taskStartDate = document.getElementById('task-start-date');
                if (taskStartDate) {
                    taskStartDate.value = selectedDate;
                    
                    // Disparar evento change para atualizar validação
                    const changeEvent = new Event('change');
                    taskStartDate.dispatchEvent(changeEvent);
                }
            }, 100);
            } else {
                console.error('Função prepareNewTask não encontrada');
            }
        });
        
        // Adicionar a célula ao fragmento
        fragment.appendChild(dateCell);
    }
    
    // Adicionar o fragmento ao grid (operação mais eficiente)
    calendarGrid.appendChild(fragment);
    
    // Adicionar listener para redimensionamento da janela
    window.removeEventListener('resize', handleCalendarResize);
    window.addEventListener('resize', handleCalendarResize);
    
    // Animar entrada das células do calendário
    const cells = document.querySelectorAll('.calendar-cell');
    cells.forEach((cell, index) => {
        // Usar um atraso proporcional ao índice, mas limitado para não demorar muito
        const delay = Math.min(index * 0.02, 0.5);
        cell.style.animationDelay = `${delay}s`;
    });
    
    // Dispara evento personalizado indicando que o calendário foi renderizado
    document.dispatchEvent(new CustomEvent('calendar-rendered'));
}

// Função para lidar com redimensionamento da janela
function handleCalendarResize() {
    // Ajustar alturas dos contêineres de tarefas
    const taskContainers = document.querySelectorAll('.calendar-tasks-container');
    taskContainers.forEach(container => {
        // Remover altura máxima personalizada
        if (!container.closest('.expanded-cell')) {
            container.style.maxHeight = '';
        }
        
        // Verificar se precisa da classe has-more
        const isContainerOverflowing = container.scrollHeight > container.clientHeight;
        container.classList.toggle('has-more', isContainerOverflowing);
        
        // Verificar botão "Ver todas" apenas se necessário
        if (isContainerOverflowing) {
            const cell = container.closest('.calendar-cell');
            const viewAllBtn = cell.querySelector('.view-all-tasks-btn');
            
            if (!viewAllBtn && !cell.classList.contains('expanded-cell')) {
                // Tentar encontrar quantas tarefas existem
                const tasks = container.querySelectorAll('.calendar-task');
                if (tasks.length > 0) {
                    const newViewAllBtn = document.createElement('button');
                    newViewAllBtn.className = 'view-all-tasks-btn';
                    newViewAllBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Ver todas ${tasks.length} tarefas`;
                    newViewAllBtn.type = "button";
                    cell.insertBefore(newViewAllBtn, container.nextSibling);
                }
            }
        }
    });
}

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
                showInfoNotification(`Tarefa "${task.text}" atualizada para "${statusLabels[newStatus]}"`);
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
    console.log(`Atualizando status da tarefa ${taskId} para ${newStatus} no calendário...`);
    
    // Variável para verificar se precisamos fazer uma renderização completa
    let needCompleteRender = false;
    
    try {
        // Primeiro, localizar todas as ocorrências da tarefa no DOM
        const taskElements = document.querySelectorAll(`.calendar-task[data-task-id="${taskId}"]`);
        console.log(`Encontradas ${taskElements.length} ocorrências da tarefa no calendário`);
        
        if (taskElements.length === 0) {
            // A tarefa pode não estar visível no mês atual, apenas atualizar o objeto de dados
            needCompleteRender = true;
        } else {
            // Verificar se precisamos de uma renderização completa
            needCompleteRender = needsFullRender(taskId, newStatus);
            
            // Atualizar cada ocorrência da tarefa no DOM
            taskElements.forEach(taskEl => {
                // Remover classes de status anteriores
                taskEl.classList.remove('status-pending', 'status-completed', 'status-finished', 'status-late');
                
                // Adicionar nova classe de status
                taskEl.classList.add(`status-${newStatus}`);
                
                // Atualizar o atributo de dados
                taskEl.dataset.taskStatus = newStatus;
                
                // Atualizar o ícone de status
                const statusIconEl = taskEl.querySelector('.task-status-icon');
                if (statusIconEl) {
                    const statusIcons = {
                        'pending': '<i class="fas fa-clock"></i>',
                        'completed': '<i class="fas fa-check"></i>',
                        'finished': '<i class="fas fa-flag-checkered"></i>',
                        'late': '<i class="fas fa-exclamation-triangle"></i>'
                    };
                    
                    statusIconEl.innerHTML = statusIcons[newStatus] || statusIcons.pending;
                }
            });
        }
        
        // Atualizar o status no objeto de dados do calendário
        let updated = false;
        
        Object.keys(calendarTasks).forEach(date => {
            const tasksForDate = calendarTasks[date];
            
            for (let i = 0; i < tasksForDate.length; i++) {
                if (tasksForDate[i].id === taskId) {
                    console.log(`Tarefa encontrada em ${date}, atualizando status de ${tasksForDate[i].status} para ${newStatus}`);
                    
                    // Armazenar status anterior para verificar mudança
                    const oldStatus = tasksForDate[i].status;
                    
                    // Atualizar status
                    tasksForDate[i].status = newStatus;
                    updated = true;
                    
                    // Atualizar tarefas globais, se disponíveis
                    if (window.tasks) {
                        // Iterar por todas as categorias e atualizar tarefas correspondentes
                        Object.keys(window.tasks).forEach(category => {
                            if (Array.isArray(window.tasks[category])) {
                                window.tasks[category].forEach(task => {
                                    if (task.id === taskId) {
                                        console.log(`Atualizando tarefa global em ${category}`);
                                        task.status = newStatus;
                                    }
                                });
                            }
                        });
                    }
                    
                    // Verificar se esta mudança requer uma re-renderização completa
                    // Por exemplo, se mudar de "em andamento" para "atrasado"
                    // Ou se mudar de "atrasado" para qualquer outro status
                    if ((oldStatus === 'late' && newStatus !== 'late') || 
                        (oldStatus !== 'late' && newStatus === 'late')) {
                        needCompleteRender = true;
                    }
                }
            }
        });
        
        if (!updated) {
            console.warn(`Tarefa ${taskId} não encontrada nos dados do calendário`);
        }
        
        // Se for necessária uma renderização completa
        if (needCompleteRender) {
            console.log('Necessária renderização completa do calendário...');
            renderCalendar();
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar status da tarefa no calendário:', error);
        return false;
    }
}

// Função para determinar se precisamos renderizar o calendário completamente
function needsFullRender(taskId, newStatus) {
    // Verificar situações específicas, como quando um dia tem apenas uma tarefa
    // e essa tarefa está mudando de status (afeta o indicador de dia)
    let needsRender = false;
    
    Object.keys(calendarTasks).forEach(dateKey => {
        const dateTasks = calendarTasks[dateKey];
        // Se for a única tarefa do dia ou se estiver mudando para/de 'late' (que muda o indicador)
        if ((dateTasks.length === 1 && dateTasks[0].id === taskId) || 
            (dateTasks.some(t => t.id === taskId) && 
             (newStatus === 'late' || dateTasks.find(t => t.id === taskId).status === 'late'))) {
            needsRender = true;
        }
    });
    
    return needsRender;
}

// Função para carregar tarefas no calendário
async function loadCalendarTasks() {
    try {
        console.log('Carregando tarefas para o calendário...');
        
        // Mostrar um indicador de carregamento no calendário
        showCalendarLoadingIndicator();
        
        // Limpar todas as tarefas do calendário antes de adicionar novamente
        calendarTasks = {};
        
        let tasks;
        
        // Verificar primeiro se temos tarefas armazenadas do dashboard
        if (storedTasksFromDashboard) {
            console.log('Usando tarefas armazenadas do dashboard');
            tasks = storedTasksFromDashboard;
            // Limpar para a próxima vez
            storedTasksFromDashboard = null;
        }
        // Tentar obter tarefas do Supabase
        else if (typeof fetchTasks === 'function') {
            try {
                console.log('Buscando tarefas do Supabase...');
                tasks = await fetchTasks();
            } catch (error) {
                console.warn('Erro ao buscar tarefas do Supabase:', error);
                tasks = null;
            }
        }
        
        // Se não conseguiu do Supabase, usar window.tasks
        if (!tasks && window.tasks) {
            console.log('Usando tarefas da memória (window.tasks)');
            tasks = window.tasks;
        }
        
        // Se ainda não tiver tarefas, criar objeto vazio
        if (!tasks) {
            console.warn('Nenhuma tarefa disponível para o calendário');
            tasks = { day: [], week: [], month: [], year: [] };
        }
        
        // Verificar se tasks está vazio, o que pode indicar que window.tasks ainda não foi carregado
        let isEmpty = true;
        Object.keys(tasks).forEach(category => {
            if (Array.isArray(tasks[category]) && tasks[category].length > 0) {
                isEmpty = false;
            }
        });
        
        if (isEmpty && !window.calendarRetryCount) {
            // Configurar contador de tentativas
            window.calendarRetryCount = 0;
        }
        
        // Se está vazio e ainda não excedeu o número máximo de tentativas, tentar novamente
        if (isEmpty && window.calendarRetryCount < 3) {
            window.calendarRetryCount++;
            console.log(`Tarefas vazias no calendário, tentando novamente (${window.calendarRetryCount}/3)...`);
            
            // Remover o indicador de carregamento
            hideCalendarLoadingIndicator();
            
            // Tentar novamente após um pequeno atraso
            return new Promise((resolve) => {
                setTimeout(async () => {
                    try {
                        const result = await loadCalendarTasks();
                        resolve(result);
                    } catch (err) {
                        console.error('Erro na tentativa de recarga do calendário:', err);
                        resolve(false);
                    }
                }, 1000); // Esperar 1 segundo antes de tentar novamente
            });
        }
        
        // Resetar o contador de tentativas
        window.calendarRetryCount = 0;
        
        // Contar quantas tarefas estão disponíveis
        let totalTasks = 0;
        
        // Criar conjunto para rastrear IDs já processados e evitar duplicação
        const processedTaskIds = new Set();
        
        // Primeiro, filtrar tarefas duplicadas em cada categoria
        Object.keys(tasks).forEach(category => {
            if (Array.isArray(tasks[category])) {
                // Identificar e remover duplicatas na mesma categoria
                const uniqueTasks = [];
                const categoryProcessedIds = new Set();
                
                for (const task of tasks[category]) {
                    if (!task.id) {
                        console.warn('Tarefa sem ID encontrada, gerando ID automático');
                        task.id = 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    }
                    
                    if (!categoryProcessedIds.has(task.id)) {
                        categoryProcessedIds.add(task.id);
                        uniqueTasks.push(task);
                    } else {
                        console.warn(`Tarefa duplicada removida na categoria ${category}: ${task.id}`);
                    }
                }
                
                // Substituir array original com versão sem duplicatas
                if (tasks[category].length !== uniqueTasks.length) {
                    console.log(`Removidas ${tasks[category].length - uniqueTasks.length} duplicatas em ${category}`);
                    tasks[category] = uniqueTasks;
                }
                
                totalTasks += tasks[category].length;
            }
        });
        
        // Processar cada categoria de tarefas para o calendário
        Object.keys(tasks).forEach(category => {
            if (Array.isArray(tasks[category])) {
                tasks[category].forEach(task => {
                    // Verificar se a tarefa já foi processada em qualquer categoria
                    if (processedTaskIds.has(task.id)) {
                        console.warn(`Tarefa duplicada entre categorias detectada e ignorada: ${task.id}`);
                        return;
                    }
                    
                    // Marcar como processada
                    processedTaskIds.add(task.id);
                    
                    // Usar a data de início da tarefa como data do calendário
                    if (!task.startDate) {
                        console.warn('Tarefa sem data de início:', task);
                        return;
                    }
                    
                    try {
                        const startDate = new Date(task.startDate);
                        
                        if (isNaN(startDate.getTime())) {
                            console.warn('Data de início inválida:', task.startDate);
                            return;
                        }
                        
                        // Formato da data: YYYY-MM-DD
                        const formattedDate = startDate.toISOString().split('T')[0];
                        
                        if (!calendarTasks[formattedDate]) {
                            calendarTasks[formattedDate] = [];
                        }
                        
                        // Verificar se a tarefa já existe na data específica
                        const exists = calendarTasks[formattedDate].some(t => t.id === task.id);
                        if (!exists) {
                            calendarTasks[formattedDate].push(task);
                        } else {
                            console.warn(`Tarefa duplicada para a data ${formattedDate}: ${task.id}`);
                        }
                    } catch (error) {
                        console.error('Erro ao processar data da tarefa:', error);
                    }
                });
            }
        });
        
        console.log(`Calendário carregado com ${totalTasks} tarefas, ${processedTaskIds.size} únicas`);
        
        // Se houve correção de duplicatas, salvar as tarefas corrigidas
        if (totalTasks !== processedTaskIds.size && window.tasks) {
            console.log('Salvando tarefas corrigidas no localStorage...');
            try {
                localStorage.setItem('tasks', JSON.stringify(tasks));
                console.log('Tarefas corrigidas salvas com sucesso');
            } catch (e) {
                console.error('Erro ao salvar tarefas corrigidas:', e);
            }
        }
        
        // Renderizar calendário com as tarefas
        renderCalendar();
        
        // Remover o indicador de carregamento
        hideCalendarLoadingIndicator();
        
        return true;
    } catch (error) {
        console.error('Erro ao carregar tarefas para o calendário:', error);
        hideCalendarLoadingIndicator();
        
        // Mostrar mensagem de erro no calendário
        showCalendarError('Não foi possível carregar as tarefas. Tente novamente.');
        
        return false;
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

// Função para mostrar mensagem de erro no calendário
function showCalendarError(message) {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    // Remover erro anterior se existir
    const existingError = document.getElementById('calendar-error-message');
    if (existingError) existingError.remove();
    
    // Criar mensagem de erro
    const errorElement = document.createElement('div');
    errorElement.id = 'calendar-error-message';
    errorElement.className = 'calendar-loading-indicator calendar-error';
    errorElement.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
        <p>${message}</p>
        <button id="retry-calendar-load" class="filter-button select-all" style="margin-top: 10px;">
            <i class="fas fa-sync-alt"></i> Tentar Novamente
        </button>
    `;
    
    // Adicionar ao grid do calendário
    calendarGrid.appendChild(errorElement);
    
    // Adicionar listener para o botão de tentar novamente
    const retryButton = document.getElementById('retry-calendar-load');
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            errorElement.remove();
            loadCalendarTasks();
        });
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

// Escutar eventos de navegação para a página de calendário
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos na página de calendário
    const calendarView = document.getElementById('calendario-view');
    
    // Configurar um observer para detectar quando o calendário se torna visível
    calendarObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'calendario-view' && 
                mutation.target.style.display !== 'none' && 
                mutation.attributeName === 'style') {
                console.log('Calendário se tornou visível, iniciando...');
                
                // Limpar quaisquer tarefas antigas e recarregar
                calendarTasks = {};
                
                // Inicializar o calendário quando se tornar visível
                initCalendar();
            }
        });
    });
    
    // Iniciar o observer para monitorar o elemento do calendário
    if (calendarView) {
        calendarObserver.observe(calendarView, { attributes: true });
        
        // Se o calendário já estiver visível, inicialize-o
        if (calendarView.style.display !== 'none') {
            console.log('Calendário já está visível, iniciando...');
            initCalendar();
        }
    }
    
    // Adicionar listener global para eventos de status
    document.addEventListener('status-change', function(e) {
        if (e.detail && e.detail.taskId && e.detail.newStatus) {
            console.log('Evento status-change recebido no calendário:', e.detail);
            
            // Atualizar o status da tarefa no calendário
            updateCalendarTaskStatus(e.detail.taskId, e.detail.newStatus);
        }
    });
});

// Função para integrar o calendário com o TaskStatusManager global
function integrateWithTaskStatusManager() {
    // Verificar se o TaskStatusManager global está disponível
    if (window.StatusManager) {
        console.log('Integrando calendário com o TaskStatusManager...');
        
        // Registrar listener para eventos de mudança de status
        window.StatusManager.registerStatusChangeHandler('calendar', (taskId, newStatus) => {
            console.log(`StatusManager notificou alteração para tarefa ${taskId}: ${newStatus}`);
            updateCalendarTaskStatus(taskId, newStatus);
        });
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