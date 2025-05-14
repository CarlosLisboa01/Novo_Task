// dashboard-filters.js
// Script para implementar os filtros do dashboard do TaskPRO

// Configuração de estados e variáveis
let activeFilters = {
    pending: true,  // Em Andamento
    completed: true, // Concluído
    late: true,     // Atrasado
    finished: true  // Finalizado
};

// Constantes para cores dos status
const STATUS_COLORS = {
    pending: '#fbbf24',    // Amarelo - Em Andamento (alterado de azul para amarelo)
    completed: '#22c55e',  // Verde - Concluído
    finished: '#8b5cf6',   // Roxo - Finalizado
    late: '#ef4444'        // Vermelho - Atrasado
};

// Constantes para ícones dos status
const STATUS_ICONS = {
    pending: 'fa-spinner',
    completed: 'fa-check-circle',
    finished: 'fa-flag-checkered',
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
        { id: 'finished', label: 'Finalizado', icon: 'fa-flag-checkered', color: STATUS_COLORS.finished }
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
    
    // Inserir antes do conteúdo do dashboard
    const statusFilter = dashboardView.querySelector('.status-filter');
    if (statusFilter) {
        // Se o filtro de status existente estiver presente, escondê-lo
        statusFilter.style.display = 'none';
    }
    
    // Inserir após o cabeçalho da view
    const viewHeader = dashboardView.querySelector('.view-header');
    if (viewHeader && viewHeader.nextElementSibling) {
        dashboardView.insertBefore(filtersContainer, viewHeader.nextElementSibling);
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
            finished: 'Finalizado'
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

// Configurar os ouvintes de eventos para os filtros
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
            
            // Criar animação visual de confirmação
            const label = this.closest('.filter-option').querySelector('.filter-label');
            if (label) {
                const animClass = this.checked ? 'pulse-active' : 'pulse-inactive';
                label.classList.add(animClass);
                setTimeout(() => {
                    label.classList.remove(animClass);
                }, 500);
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
}

// Aplicar os filtros às tarefas
function applyFilters() {
    console.log('Aplicando filtros:', activeFilters);
    
    // Verificar se há algum filtro ativo
    const hasActiveFilter = Object.values(activeFilters).some(value => value);
    
    // Selecionar todas as tarefas no dashboard
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(taskItem => {
        // Se nenhum filtro estiver ativo, mostrar todas as tarefas
        if (!hasActiveFilter) {
            taskItem.style.display = '';
            return;
        }
        
        // Obter o status da tarefa
        const taskStatus = taskItem.dataset.status || 'pending';
        
        // Mostrar ou esconder com base no filtro
        if (activeFilters[taskStatus]) {
            // Adicionar animação para tornar visível
            if (taskItem.style.display === 'none') {
                taskItem.style.opacity = '0';
                taskItem.style.display = '';
                setTimeout(() => {
                    taskItem.style.opacity = '1';
                }, 50);
            }
        } else {
            // Adicionar animação para esconder
            if (taskItem.style.display !== 'none') {
                taskItem.style.opacity = '0';
                setTimeout(() => {
                    taskItem.style.display = 'none';
                }, 200);
            } else {
                taskItem.style.display = 'none';
            }
        }
    });
    
    // Atualizar contadores de tarefas nas colunas
    updateTaskCounters();
}

// Atualizar os contadores de tarefas nas colunas
function updateTaskCounters() {
    document.querySelectorAll('.tasks-column').forEach(column => {
        const columnId = column.id; // day, week, month, year
        const taskCount = column.querySelector('.task-count');
        const visibleTasks = column.querySelectorAll('.task-item:not([style*="display: none"])').length;
        
        if (taskCount) {
            taskCount.textContent = `${visibleTasks} ${visibleTasks === 1 ? 'tarefa' : 'tarefas'}`;
            
            // Destacar os contadores com efeito visual
            taskCount.classList.add('count-updated');
            setTimeout(() => {
                taskCount.classList.remove('count-updated');
            }, 600);
        }
    });
}

// Função para obter o estado atual dos filtros
function getActiveFilters() {
    return activeFilters;
}

// Função para converter a seleção de radio em filtros checkbox
function setFiltersFromRadio(radioValue) {
    // Mapear o valor do radio para os filtros
    const filterMap = {
        'all': {
            pending: true,
            completed: true,
            finished: true,
            late: true
        },
        'pending': {
            pending: true,
            completed: false,
            finished: false,
            late: false
        },
        'completed': {
            pending: false,
            completed: true,
            finished: true,
            late: false
        },
        'late': {
            pending: false,
            completed: false,
            finished: false,
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

// Executar a inicialização quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página do dashboard
    if (document.getElementById('dashboard-view')) {
        // Inicializar os filtros com um pequeno atraso para garantir que as tarefas já foram carregadas
        setTimeout(initDashboardFilters, 300);
    }
});

// Configurar reinicialização em eventos de navegação para manter os filtros mesmo após mudanças de visualização
window.addEventListener('hashchange', function() {
    if (window.location.hash === '#dashboard' || window.location.hash === '') {
        // Reinicializar os filtros quando voltar ao dashboard
        setTimeout(function() {
            // Verificar se já existe, senão inicializar
            if (!document.getElementById('dashboard-status-filters')) {
                initDashboardFilters();
            } else {
                // Apenas reaplicar os filtros se já existirem
                updateFilterStatus();
                applyFilters();
            }
        }, 300);
    }
});

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