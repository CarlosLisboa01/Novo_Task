// dashboard-filters.js
// Script para implementar os filtros do dashboard do TaskPRO

// Configuração de estados e variáveis
let activeFilters = {
    pending: true,  // Em Andamento
    completed: true, // Concluído
    late: true,     // Atrasado
    // Removido: finished: true  // Finalizado
};

// Constantes para cores dos status
const STATUS_COLORS = {
    pending: '#fbbf24',    // Amarelo - Em Andamento (alterado de azul para amarelo)
    completed: '#22c55e',  // Verde - Concluído
    // Removido: finished: '#8b5cf6',   // Roxo - Finalizado
    late: '#ef4444'        // Vermelho - Atrasado
};

// Constantes para ícones dos status
const STATUS_ICONS = {
    pending: 'fa-spinner',
    completed: 'fa-check-circle',
    // Removido: finished: 'fa-flag-checkered',
    late: 'fa-exclamation-circle'
};

// Função principal para inicializar os filtros
function initDashboardFilters() {
    console.log('Inicializando filtros do dashboard...');
    
    // Criar os elementos HTML do filtro
    createFilterUI();
    
    // Configurar event listeners
    setupFilterListeners();
    
    // Aplicar o estado inicial dos filtros
    applyFilters();
}

// Criar a UI dos filtros
function createFilterUI() {
    // O container que vai receber os filtros
    const dashboardView = document.getElementById('dashboard-view');
    if (!dashboardView) {
        console.error('Container do dashboard não encontrado');
        return;
    }
    
    // Verificar se já existe
    if (document.getElementById('dashboard-status-filters')) {
        console.log('Filtros já existem, não criando novamente');
        return;
    }
    
    // Criar o container de filtros
    const filtersContainer = document.createElement('div');
    filtersContainer.id = 'dashboard-status-filters';
    filtersContainer.className = 'filter-controls';
    
    // Adicionar título
    const filterTitle = document.createElement('div');
    filterTitle.className = 'filter-title';
    filterTitle.innerHTML = '<i class="fas fa-filter"></i> Filtrar por Status:';
    filtersContainer.appendChild(filterTitle);
    
    // Container para os filtros
    const filterOptions = document.createElement('div');
    filterOptions.className = 'filter-options';
    
    // Criar os checkboxes para cada status
    const statusOptions = [
        { id: 'pending', label: 'Em Andamento', icon: 'fa-spinner', color: STATUS_COLORS.pending },
        { id: 'completed', label: 'Concluído', icon: 'fa-check-circle', color: STATUS_COLORS.completed },
        { id: 'late', label: 'Atrasado', icon: 'fa-exclamation-circle', color: STATUS_COLORS.late },
        // Removido: { id: 'finished', label: 'Finalizado', icon: 'fa-flag-checkered', color: STATUS_COLORS.finished }
    ];
    
    statusOptions.forEach(option => {
        const filterOption = document.createElement('label');
        filterOption.className = 'filter-option';
        filterOption.setAttribute('for', `filter-${option.id}`);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-${option.id}`;
        checkbox.checked = activeFilters[option.id];
        checkbox.dataset.status = option.id;
        
        const filterLabel = document.createElement('span');
        filterLabel.className = 'filter-label';
        filterLabel.innerHTML = `<i class="fas ${option.icon}"></i> ${option.label}`;
        filterLabel.style.setProperty('--filter-color', option.color);
        
        filterOption.appendChild(checkbox);
        filterOption.appendChild(filterLabel);
        
        filterOptions.appendChild(filterOption);
    });
    
    filtersContainer.appendChild(filterOptions);
    
    // Adicionar status selecionado
    const filterStatus = document.createElement('div');
    filterStatus.className = 'filter-status';
    filterStatus.id = 'filter-status';
    filtersContainer.appendChild(filterStatus);
    
    // Atualizar indicador visual de status
    updateFilterStatus();
    
    // Botões de ação
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'filter-buttons';
    
    const selectAllButton = document.createElement('button');
    selectAllButton.type = 'button';
    selectAllButton.id = 'select-all-filters';
    selectAllButton.className = 'filter-button select-all';
    selectAllButton.innerHTML = 'Selecionar Todos';
    
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.id = 'clear-all-filters';
    clearButton.className = 'filter-button clear-all';
    clearButton.innerHTML = 'Limpar Seleção';
    
    buttonContainer.appendChild(selectAllButton);
    buttonContainer.appendChild(clearButton);
    
    filtersContainer.appendChild(buttonContainer);
    
    // Inserir no início do dashboard
    const firstChild = dashboardView.querySelector('.view-header');
    if (firstChild) {
        dashboardView.insertBefore(filtersContainer, firstChild.nextSibling);
    } else {
        dashboardView.appendChild(filtersContainer);
    }
}

// Atualizar o status dos filtros ativos
function updateFilterStatus() {
    const filterStatus = document.getElementById('filter-status');
    if (!filterStatus) return;
    
    // Limpar o status atual
    filterStatus.innerHTML = '';
    
    // Verificar quantos filtros estão ativos
    const activeCount = Object.values(activeFilters).filter(v => v).length;
    const totalFilters = Object.keys(activeFilters).length;
    
    // Se todos estiverem ativos ou nenhum estiver ativo, mostrar mensagem adequada
    if (activeCount === totalFilters) {
        filterStatus.innerHTML = '<div class="filter-status-item"><i class="fas fa-check"></i> Todos os status selecionados</div>';
    } 
    else if (activeCount === 0) {
        filterStatus.innerHTML = '<div class="filter-status-item"><i class="fas fa-exclamation-triangle"></i> Nenhum status selecionado</div>';
    }
    // Caso especial: verificar se apenas 'Em Andamento' está ativo
    else if (activeCount === 1 && activeFilters.pending) {
        const emAndamento = document.createElement('div');
        emAndamento.className = 'em-andamento-ativo';
        emAndamento.innerHTML = '<i class="fas fa-spinner"></i> Apenas Em Andamento';
        filterStatus.appendChild(emAndamento);
    }
    // Mostrar indicadores específicos se houver filtros ativos
    else {
        const statusNames = {
            pending: 'Em Andamento',
            completed: 'Concluído',
            late: 'Atrasado',
            // Removido: finished: 'Finalizado'
        };
        
        Object.keys(activeFilters).forEach(status => {
            if (activeFilters[status]) {
                const indicator = document.createElement('div');
                indicator.className = 'filter-status-item';
                indicator.innerHTML = `<i class="fas ${STATUS_ICONS[status]}"></i> ${statusNames[status]}`;
                filterStatus.appendChild(indicator);
            }
        });
    }
}

// Configurar event listeners para os filtros
function setupFilterListeners() {
    // Event listeners para checkboxes
    document.querySelectorAll('#dashboard-status-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const status = this.dataset.status;
            activeFilters[status] = this.checked;
            
            // Atualizar o status visual
            updateFilterStatus();
            
            // Aplicar filtros
            applyFilters();
            
            // Também renderizar as tarefas usando a função global
            if (typeof window.renderTasks === 'function') {
                window.renderTasks();
            }
        });
    });
    
    // Event listener para o botão "Selecionar Todos"
    const selectAllButton = document.getElementById('select-all-filters');
    if (selectAllButton) {
        selectAllButton.addEventListener('click', function() {
            Object.keys(activeFilters).forEach(status => {
                activeFilters[status] = true;
            });
            
            // Atualizar checkboxes na UI
            document.querySelectorAll('#dashboard-status-filters input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // Atualizar o status visual
            updateFilterStatus();
            
            // Aplicar filtros
            applyFilters();
            
            // Também renderizar as tarefas usando a função global
            if (typeof window.renderTasks === 'function') {
                window.renderTasks();
            }
            
            // Efeito visual
            this.classList.add('button-active');
            setTimeout(() => {
                this.classList.remove('button-active');
            }, 300);
        });
    }
    
    // Event listener para o botão "Limpar Seleção"
    const clearButton = document.getElementById('clear-all-filters');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            Object.keys(activeFilters).forEach(status => {
                activeFilters[status] = false;
            });
            
            // Atualizar checkboxes na UI
            document.querySelectorAll('#dashboard-status-filters input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Atualizar o status visual
            updateFilterStatus();
            
            // Aplicar filtros
            applyFilters();
            
            // Também renderizar as tarefas usando a função global
            if (typeof window.renderTasks === 'function') {
                window.renderTasks();
            }
            
            // Efeito visual
            this.classList.add('button-active');
            setTimeout(() => {
                this.classList.remove('button-active');
            }, 300);
        });
    }
    
    // Integrar com o filtro de rádio original
    document.querySelectorAll('input[name="status-filter"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                console.log('Radio selecionado:', this.value);
                setFiltersFromRadio(this.value);
            }
        });
    });
}

// Obter filtros ativos para uso externo
function getActiveFilters() {
    return { ...activeFilters };
}

// Função para aplicar os filtros nas tarefas
function applyFilters() {
    // Verificar se há algum filtro ativo
    const anyFilterActive = Object.values(activeFilters).some(v => v);
    if (!anyFilterActive) {
        console.log('Nenhum filtro ativo, ocultando todas as tarefas');
        hideAllTasks();
        return;
    }
    
    // Contar tarefas visíveis para cada categoria
    const taskCountByCategory = {
        day: 0,
        week: 0,
        month: 0,
        year: 0
    };
    
    // Para cada categoria, filtrar as tarefas
    ['day', 'week', 'month', 'year'].forEach(category => {
        const taskList = document.getElementById(category)?.querySelector('.task-list');
        if (!taskList) return;
        
        const taskItems = taskList.querySelectorAll('.task-item');
        taskItems.forEach(task => {
            // Verificar o status da tarefa
            const taskStatus = getTaskStatus(task);
            
            // Mostrar ou ocultar com base nos filtros
            if (activeFilters[taskStatus]) {
                task.style.display = '';
                taskCountByCategory[category]++;
            } else {
                task.style.display = 'none';
            }
        });
        
        // Atualizar contadores
        updateTaskCounter(category, taskCountByCategory[category]);
        
        // Mostrar ou ocultar mensagem de "nenhuma tarefa"
        toggleEmptyMessage(category, taskCountByCategory[category]);
    });
    
    console.log('Filtros aplicados:', activeFilters);
}

// Função para ocultar todas as tarefas
function hideAllTasks() {
    const allTasks = document.querySelectorAll('.task-item');
    allTasks.forEach(task => {
        task.style.display = 'none';
    });
    
    // Atualizar contadores para zero
    ['day', 'week', 'month', 'year'].forEach(category => {
        updateTaskCounter(category, 0);
        toggleEmptyMessage(category, 0);
    });
}

// Função para converter a seleção de radio em filtros checkbox
function setFiltersFromRadio(radioValue) {
    // Mapear o valor do radio para os filtros
    const filterMap = {
        'all': {
            pending: true,
            completed: true,
            // Removido: finished: true,
            late: true
        },
        'pending': {
            pending: true,
            completed: false,
            // Removido: finished: false,
            late: false
        },
        'completed': {
            pending: false,
            completed: true,
            // Finalizado passa a não ser mais incluído no filtro de "Concluído"
            // Removido: finished: true,
            late: false
        },
        'late': {
            pending: false,
            completed: false,
            // Removido: finished: false,
            late: true
        }
    };
    
    // Aplicar o mapeamento se existir
    if (filterMap[radioValue]) {
        Object.keys(filterMap[radioValue]).forEach(status => {
            activeFilters[status] = filterMap[radioValue][status];
            
            // Atualizar a UI
            const checkbox = document.querySelector(`#filter-${status}`);
            if (checkbox) {
                checkbox.checked = filterMap[radioValue][status];
            }
        });
        
        // Atualizar o status visual
        updateFilterStatus();
        
        // Aplicar filtros
        applyFilters();
    }
}

// Função para obter o status de uma tarefa
function getTaskStatus(taskElement) {
    if (taskElement.classList.contains('status-pending')) return 'pending';
    if (taskElement.classList.contains('status-completed')) return 'completed';
    if (taskElement.classList.contains('status-late')) return 'late';
    // Removido: if (taskElement.classList.contains('status-finished')) return 'finished';
    return 'pending'; // Padrão
}

// Função para atualizar o contador de tarefas
function updateTaskCounter(category, count) {
    const counterElement = document.getElementById(`${category}-count`);
    if (counterElement) {
        counterElement.textContent = `${count} tarefa${count !== 1 ? 's' : ''}`;
    }
}

// Função para mostrar ou ocultar mensagem de "nenhuma tarefa"
function toggleEmptyMessage(category, count) {
    const taskList = document.getElementById(category)?.querySelector('.task-list');
    if (!taskList) return;
    
    // Remover mensagem existente se houver
    const existingMessage = taskList.querySelector('.empty-filter-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Se não houver tarefas, mostrar mensagem
    if (count === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-filter-message';
        emptyMessage.innerHTML = '<i class="fas fa-filter"></i><p>Nenhuma tarefa com os filtros selecionados</p>';
        taskList.appendChild(emptyMessage);
    }
}

// API pública para outros módulos
window.dashboardFilters = {
    init: initDashboardFilters,
    applyFilters: applyFilters,
    setFilter: function(status, value) {
        if (activeFilters.hasOwnProperty(status)) {
            activeFilters[status] = value;
            
            // Atualizar a UI
            const checkbox = document.querySelector(`#filter-${status}`);
            if (checkbox) {
                checkbox.checked = value;
            }
            
            // Atualizar o status visual
            updateFilterStatus();
            
            // Aplicar filtros
            applyFilters();
        }
    },
    getActiveFilters: getActiveFilters,
    setFiltersFromRadio: setFiltersFromRadio
}; 