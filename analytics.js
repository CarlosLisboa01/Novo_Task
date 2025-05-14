// Funções para a página de Análises do TaskPro
let analyticsInitialized = false;
let chartsInstances = {};

// Função para gerar dados mockados para inicialização
function generateMockData() {
    return {
        totalTasks: 5,
        completedPercentage: 20,
        latePercentage: 20,
        averageHours: 2.5,
        distribution: {
            pending: 2,
            completed: 1,
            finished: 1,
            late: 1
        },
        evolution: {
            '01/05/2023': 0,
            '02/05/2023': 1,
            '03/05/2023': 0,
            '04/05/2023': 1,
            '05/05/2023': 2,
            '06/05/2023': 0,
            '07/05/2023': 1
        },
        byDay: [1, 2, 1, 0, 1, 0, 0],
        byHour: [
            {
                label: 'Segunda',
                data: [0, 1, 0, 0],
                backgroundColor: 'rgba(124, 58, 237, 0.7)'
            },
            {
                label: 'Terça',
                data: [0, 1, 1, 0],
                backgroundColor: 'rgba(114, 53, 222, 0.7)'
            },
            {
                label: 'Quarta',
                data: [0, 0, 1, 0],
                backgroundColor: 'rgba(104, 48, 207, 0.7)'
            },
            {
                label: 'Quinta',
                data: [0, 0, 0, 0],
                backgroundColor: 'rgba(94, 43, 192, 0.7)'
            },
            {
                label: 'Sexta',
                data: [0, 1, 0, 0],
                backgroundColor: 'rgba(84, 38, 177, 0.7)'
            }
        ]
    };
}

// Função para inicializar os gráficos e análises
function initAnalytics() {
    // Só inicializa uma vez para evitar duplicação
    if (analyticsInitialized) return;
    
    console.log('Inicializando Análises...');
    
    // Renderizar inicialmente com dados mockados para garantir visualização imediata
    const mockData = generateMockData();
    renderInitialCharts(mockData);
    
    // Atualizar com dados reais após um breve tempo
    setTimeout(() => {
        // Atualizar os valores de resumo
        updateSummaryValues();
        initTasksDistributionChart();
        initTasksEvolutionChart();
        initTasksByDayChart();
        initTasksByHourChart();
        
        console.log('Gráficos atualizados com dados reais');
    }, 500);
    
    // Configurar botões Ver Detalhes
    setupDetailButtons();
    
    // Configurar botão de exportação
    setupExportButton();
    
    analyticsInitialized = true;
}

// Função para obter todas as tarefas em um único array
async function getAllTasks() {
    try {
        console.log('Obtendo todas as tarefas para análises do Supabase');
        
        // Verificar se o usuário está autenticado no Supabase
        let userAuthenticated = false;
        if (window.supabaseApi && typeof window.supabaseApi.isAuthenticated === 'function') {
            try {
                userAuthenticated = await window.supabaseApi.isAuthenticated();
                console.log('Status de autenticação Supabase:', userAuthenticated ? 'Autenticado' : 'Não autenticado');
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
            }
        }
        
        // Primeiro, verificar se a API do Supabase está disponível
        if (window.supabaseApi && typeof window.supabaseApi.fetchTasks === 'function') {
            try {
                console.log('Tentando buscar tarefas diretamente do Supabase...');
                
                // Verificar conexão com Supabase
                if (typeof window.supabaseApi.checkSupabaseConnection === 'function') {
                    const connected = await window.supabaseApi.checkSupabaseConnection();
                    console.log('Conexão com Supabase:', connected ? 'OK' : 'Falha');
                    
                    if (!connected) {
                        console.warn('Sem conexão com Supabase, usando dados locais');
                        throw new Error('Falha na conexão com Supabase');
                    }
                }
                
                // Buscar tarefas
                const tasksFromSupabase = await window.supabaseApi.fetchTasks();
                
                // Se conseguiu obter tarefas do Supabase
                if (tasksFromSupabase) {
                    console.log('Tarefas obtidas com sucesso do Supabase:', 
                        Object.keys(tasksFromSupabase).reduce((total, key) => total + tasksFromSupabase[key].length, 0), 
                        'tarefas encontradas');
                    
                    // Concatenar todas as tarefas em um único array
                    const allTasks = [
                        ...tasksFromSupabase.day,
                        ...tasksFromSupabase.week,
                        ...tasksFromSupabase.month,
                        ...tasksFromSupabase.year
                    ];
                    
                    // Garantir que IDs sejam únicos (para evitar duplicações)
                    const uniqueTasks = [];
                    const processedIds = new Set();
                    
                    allTasks.forEach(task => {
                        if (!processedIds.has(task.id)) {
                            processedIds.add(task.id);
                            uniqueTasks.push(task);
                        }
                    });
                    
                    console.log('Total de tarefas únicas do Supabase:', uniqueTasks.length);
                    return uniqueTasks;
                }
            } catch (error) {
                console.error('Erro ao buscar tarefas do Supabase:', error);
                // Continuar para fallback em caso de erro
            }
        }
        
        // Fallback para localStorage se não conseguir do Supabase
        console.warn('Fallback: buscando tarefas do localStorage...');
        
        // Se window.tasks não estiver disponível, tentar recuperar do localStorage
        if (!window.tasks) {
            console.warn('window.tasks não encontrado. Tentando recuperar do localStorage...');
            const storedTasks = localStorage.getItem('tasks');
            if (storedTasks) {
                try {
                    window.tasks = JSON.parse(storedTasks);
                    console.log('Tarefas recuperadas do localStorage');
                } catch (e) {
                    console.error('Erro ao parsear tarefas do localStorage:', e);
                    return [];
                }
            } else {
                console.error('Nenhum dado encontrado no localStorage');
                return [];
            }
        }
        
        // Garantir que todas as categorias existam para evitar erros
        if (!window.tasks.day) window.tasks.day = [];
        if (!window.tasks.week) window.tasks.week = [];
        if (!window.tasks.month) window.tasks.month = [];
        if (!window.tasks.year) window.tasks.year = [];
        
        // Concatenar todas as tarefas em um único array
        const localTasks = [
            ...window.tasks.day,
            ...window.tasks.week,
            ...window.tasks.month,
            ...window.tasks.year
        ];
        
        console.log('Total de tarefas do localStorage:', localTasks.length);
        return localTasks;
    } catch (error) {
        console.error('Erro ao obter todas as tarefas:', error);
        return [];
    }
}

// Função para atualizar os valores resumidos com dados reais
async function updateSummaryValues() {
    const allTasks = await getAllTasks();
    const totalTasks = allTasks.length;
    
    // Calcula a quantidade de tarefas por status
    const pendingTasks = allTasks.filter(task => 
        task.status === 'pending'
    ).length;
    
    const completedTasks = allTasks.filter(task => 
        task.status === 'completed' || task.status === 'finished'
    ).length;
    
    const lateTasks = allTasks.filter(task => 
        task.status === 'late'
    ).length;
    
    // Calcula a taxa de conclusão
    const completionRate = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;
    
    // Atualiza os elementos no DOM
    document.getElementById('completed-tasks-count').textContent = completedTasks;
    document.getElementById('pending-tasks-count').textContent = pendingTasks;
    document.getElementById('late-tasks-count').textContent = lateTasks;
    document.getElementById('completion-rate').textContent = `${completionRate}%`;
}

// Função para inicializar o gráfico de pizza com a distribuição de tarefas
async function initTasksDistributionChart() {
    const ctx = document.getElementById('task-status-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.distribution) {
        chartsInstances.distribution.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = await getAllTasks();
    const pendingCount = allTasks.filter(task => task.status === 'pending').length;
    const completedCount = allTasks.filter(task => task.status === 'completed').length;
    const finishedCount = allTasks.filter(task => task.status === 'finished').length;
    const lateCount = allTasks.filter(task => task.status === 'late').length;
    
    // Configuração do gráfico
    chartsInstances.distribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Em Andamento', 'Concluídas', 'Finalizadas', 'Atrasadas'],
            datasets: [{
                data: [pendingCount, completedCount, finishedCount, lateCount],
                backgroundColor: [
                    '#eab308', // amarelo (pendente)
                    '#22c55e', // verde (concluído)
                    '#3b82f6', // azul (finalizado)
                    '#ef4444'  // vermelho (atrasado)
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            return `${label}: ${value} tarefas`;
                        }
                    }
                }
            }
        }
    });
}

// Função para agrupar tarefas por data
function groupTasksByDate(allTasks, daysAgo = 7) {
    try {
        const result = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Inicializar todos os dias dos últimos 'daysAgo' dias com zero
        for (let i = daysAgo - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('pt-BR');
            result[dateStr] = 0;
        }
        
        console.log(`Agrupando tarefas por data (últimos ${daysAgo} dias)`);
        
        // Contar tarefas concluídas/finalizadas por dia
        allTasks.forEach(task => {
            if (task.status === 'completed' || task.status === 'finished') {
                // Tentar usar a data em que foi marcada como concluída (para análise de produtividade)
                // Se não estiver disponível, usar a data de término planejada
                const taskDate = new Date(task.completedAt || task.endDate);
                taskDate.setHours(0, 0, 0, 0);
                
                // Verificar se está dentro do período
                const diffTime = today - taskDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 0 && diffDays < daysAgo) {
                    const dateStr = taskDate.toLocaleDateString('pt-BR');
                    result[dateStr] = (result[dateStr] || 0) + 1;
                }
            }
        });
        
        return result;
    } catch (error) {
        console.error('Erro ao agrupar tarefas por data:', error);
        // Retornar um objeto com os últimos 7 dias, mas com contagem zero
        const fallbackResult = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            fallbackResult[date.toLocaleDateString('pt-BR')] = 0;
        }
        return fallbackResult;
    }
}

// Função para inicializar o gráfico de linha com a evolução das tarefas concluídas
async function initTasksEvolutionChart() {
    const ctx = document.getElementById('task-completion-trend-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.evolution) {
        chartsInstances.evolution.destroy();
    }
    
    try {
        // Obter dados reais para o gráfico
        const allTasks = await getAllTasks();
        
        // Criar dados para últimos 7 dias
        const today = new Date();
        const labels = [];
        const pendingData = [];
        const completedData = [];
        
        // Inicializar dados dos últimos 7 dias
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('pt-BR');
            labels.push(dateStr);
            
            // Inicializar com zero
            pendingData.push(0);
            completedData.push(0);
        }
        
        // Preencher dados reais
        allTasks.forEach(task => {
            if (!task.startDate) return;
            
            const taskDate = new Date(task.startDate);
            const taskDateStr = taskDate.toLocaleDateString('pt-BR');
            const index = labels.indexOf(taskDateStr);
            
            if (index !== -1) {
                if (task.status === 'pending') {
                    pendingData[index]++;
                } else if (task.status === 'completed' || task.status === 'finished') {
                    completedData[index]++;
                }
            }
        });
        
        // Configuração do gráfico
        chartsInstances.evolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Concluídas',
                        data: completedData,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#22c55e',
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Pendentes',
                        data: pendingData,
                        borderColor: '#eab308',
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#eab308',
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao inicializar gráfico de evolução:', error);
        // Criar um gráfico vazio em caso de erro
        chartsInstances.evolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                datasets: [
                    {
                        label: 'Concluídas',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    },
                    {
                        label: 'Pendentes',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#eab308',
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// Função para agrupar tarefas por dia da semana
function groupTasksByDayOfWeek(allTasks) {
    try {
        const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const result = [0, 0, 0, 0, 0, 0, 0]; // Inicializa com zero para cada dia
        
        // Agrupar tarefas por dia da semana (usando data de conclusão ou data final)
        allTasks.forEach(task => {
            if (task.status === 'completed' || task.status === 'finished') {
                const taskDate = new Date(task.completedAt || task.endDate);
                const dayOfWeek = taskDate.getDay();
                result[dayOfWeek]++;
            }
        });
        
        return result;
    } catch (error) {
        console.error('Erro ao agrupar tarefas por dia da semana:', error);
        // Retornar array com zeros para evitar erro no gráfico
        return [0, 0, 0, 0, 0, 0, 0];
    }
}

// Função para inicializar o gráfico de barras com tarefas por categoria
async function initTasksByDayChart() {
    const ctx = document.getElementById('tasks-by-category-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.byDay) {
        chartsInstances.byDay.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = await getAllTasks();
    
    // Agrupar por categoria
    const dayTasks = allTasks.filter(task => task.category === 'day').length;
    const weekTasks = allTasks.filter(task => task.category === 'week').length;
    const monthTasks = allTasks.filter(task => task.category === 'month').length;
    const yearTasks = allTasks.filter(task => task.category === 'year').length;
    
    // Dados para tarefas pendentes e concluídas por categoria
    const pendingByCategory = [
        allTasks.filter(task => task.category === 'day' && task.status === 'pending').length,
        allTasks.filter(task => task.category === 'week' && task.status === 'pending').length,
        allTasks.filter(task => task.category === 'month' && task.status === 'pending').length,
        allTasks.filter(task => task.category === 'year' && task.status === 'pending').length
    ];
    
    const completedByCategory = [
        allTasks.filter(task => task.category === 'day' && (task.status === 'completed' || task.status === 'finished')).length,
        allTasks.filter(task => task.category === 'week' && (task.status === 'completed' || task.status === 'finished')).length,
        allTasks.filter(task => task.category === 'month' && (task.status === 'completed' || task.status === 'finished')).length,
        allTasks.filter(task => task.category === 'year' && (task.status === 'completed' || task.status === 'finished')).length
    ];
    
    // Configuração do gráfico
    chartsInstances.byDay = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Dia', 'Semana', 'Mês', 'Ano'],
            datasets: [
                {
                    label: 'Concluídas',
                    data: completedByCategory,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Pendentes',
                    data: pendingByCategory,
                    backgroundColor: 'rgba(234, 179, 8, 0.7)',
                    borderColor: '#eab308',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Função para agrupar tarefas por hora do dia e dia da semana
function groupTasksByHourAndDay(allTasks) {
    try {
        // Definir dias e faixas de horários
        const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        const timeRanges = ['0h-6h', '6h-12h', '12h-18h', '18h-24h'];
        
        // Inicializar objeto para armazenar dados por dia e hora
        const result = [];
        
        // Criar dataset para cada dia da semana
        for (let i = 0; i < daysOfWeek.length; i++) {
            const day = daysOfWeek[i];
            const dayIndex = i + 1; // Ajustar índice: 0 (domingo) para 1 (segunda)
            
            // Preparar dados para este dia com as cores do tema
            const backgroundColor = `rgba(${124 - i * 10}, ${58 - i * 5}, ${237 - i * 15}, 0.7)`;
            
            // Inicializar contadores para cada faixa de horário
            const hoursData = [0, 0, 0, 0]; // 0h-6h, 6h-12h, 12h-18h, 18h-24h
            
            // Contar tarefas para este dia e faixas de horário
            allTasks.forEach(task => {
                // Verificar se a tarefa tem data
                if (!task.startDate) return;
                
                const taskDate = new Date(task.startDate);
                // Verificar se o dia da semana coincide
                if (taskDate.getDay() === dayIndex) {
                    // Determinar faixa de horário
                    const hour = taskDate.getHours();
                    const rangeIndex = Math.floor(hour / 6);
                    hoursData[rangeIndex]++;
                }
            });
            
            // Adicionar ao resultado
            result.push({
                label: day,
                data: hoursData,
                backgroundColor: backgroundColor
            });
        }
        
        return result;
    } catch (error) {
        console.error('Erro ao agrupar tarefas por hora e dia:', error);
        // Retornar estrutura vazia mas válida em caso de erro
        return [
            { label: 'Segunda', data: [0, 0, 0, 0], backgroundColor: 'rgba(124, 58, 237, 0.7)' },
            { label: 'Terça', data: [0, 0, 0, 0], backgroundColor: 'rgba(114, 53, 222, 0.7)' },
            { label: 'Quarta', data: [0, 0, 0, 0], backgroundColor: 'rgba(104, 48, 207, 0.7)' },
            { label: 'Quinta', data: [0, 0, 0, 0], backgroundColor: 'rgba(94, 43, 192, 0.7)' },
            { label: 'Sexta', data: [0, 0, 0, 0], backgroundColor: 'rgba(84, 38, 177, 0.7)' }
        ];
    }
}

// Função para inicializar o gráfico de barras horizontais com distribuição por horário
async function initTasksByHourChart() {
    const ctx = document.getElementById('daily-productivity-chart').getContext('2d');
    
    // Destruir chart existente se houver
    if (chartsInstances.byHour) {
        chartsInstances.byHour.destroy();
    }
    
    // Obter dados reais para o gráfico
    const allTasks = await getAllTasks();
    const completedTasksByDay = groupTasksByDayOfWeek(allTasks);
    
    // Configuração do gráfico
    chartsInstances.byHour = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
            datasets: [{
                label: 'Tarefas Concluídas',
                data: completedTasksByDay,
                backgroundColor: [
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(124, 58, 237, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(59, 130, 246, 0.7)'
                ],
                borderColor: [
                    '#7c3aed',
                    '#7c3aed',
                    '#7c3aed',
                    '#7c3aed',
                    '#7c3aed',
                    '#3b82f6',
                    '#3b82f6'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Função para configurar botões de detalhes
function setupDetailButtons() {
    const detailButtons = document.querySelectorAll('.view-details-btn');
    
    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Aqui poderíamos abrir um modal com detalhes mais aprofundados
            // Por enquanto, apenas exibe uma mensagem no console
            const chartType = this.closest('.analytics-card').querySelector('h3').textContent;
            console.log(`Detalhes solicitados para: ${chartType}`);
            
            // Adicionar um ícone de loading no botão temporariamente
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
            
            // Simular carregamento e restaurar o botão
            setTimeout(() => {
                this.innerHTML = originalText;
                alert(`Detalhes de "${chartType}" seriam exibidos aqui em um modal.`);
            }, 800);
        });
    });
}

// Função para configurar o botão de exportação
function setupExportButton() {
    const exportButton = document.querySelector('.export-btn');
    
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            // Preparar dados para exportação
            const allTasks = getAllTasks();
            const exportData = {
                resumo: {
                    total: allTasks.length,
                    concluidas: allTasks.filter(t => t.status === 'completed' || t.status === 'finished').length,
                    atrasadas: allTasks.filter(t => t.status === 'late').length,
                    emAndamento: allTasks.filter(t => t.status === 'pending').length
                },
                tarefasPorCategoria: {
                    dia: window.tasks.day.length,
                    semana: window.tasks.week.length,
                    mes: window.tasks.month.length,
                    ano: window.tasks.year.length
                },
                tarefasPorStatus: {
                    emAndamento: allTasks.filter(t => t.status === 'pending').length,
                    concluidas: allTasks.filter(t => t.status === 'completed').length,
                    finalizadas: allTasks.filter(t => t.status === 'finished').length,
                    atrasadas: allTasks.filter(t => t.status === 'late').length
                }
            };
            
            // Converter para JSON e criar blob para download
            const jsonData = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Criar link de download e clicar nele
            const a = document.createElement('a');
            a.href = url;
            a.download = `analise_tarefas_${new Date().toISOString().slice(0, 10)}.json`;
            
            // Adicionar um ícone de loading no botão temporariamente
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
            
            setTimeout(() => {
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.innerHTML = originalText;
                showSuccessNotification('Dados exportados com sucesso!');
            }, 800);
        });
    }
}

// Função para atualizar os gráficos com dados mais recentes
async function updateAnalytics() {
    try {
        console.log('Atualizando análises com os dados mais recentes das tarefas');
        
        // Atualizar tudo de forma assíncrona
        await updateSummaryValues();
        await initTasksDistributionChart();
        await initTasksEvolutionChart();
        await initTasksByDayChart();
        await initTasksByHourChart();
        
        console.log('Análises atualizadas com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao atualizar análises:', error);
        return false;
    }
}

// Função para reagir a mudanças de tamanho da janela
window.addEventListener('resize', function() {
    // Reajustar gráficos quando a janela for redimensionada
    if (analyticsInitialized) {
        Object.values(chartsInstances).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
});

// Adicionar evento para inicializar análises quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    console.log('Verificando inicialização da página de análises');
    
    // Função para verificar a navegação
    const checkAnalyticsPage = () => {
        if (window.location.hash === '#analises' || 
            document.querySelector('#analises-view.active')) {
            console.log('Página de análises detectada');
            
            // Inicializar análises apenas uma vez
            if (!analyticsInitialized) {
                console.log('Inicializando análises pela primeira vez');
                initAnalytics();
                setupAnalyticsRefresh();
                
                // Aguardar um pouco para garantir que o DOM foi renderizado
                setTimeout(() => {
                    refreshAllAnalytics();
                }, 300);
                
                analyticsInitialized = true;
            } else {
                console.log('Análises já inicializadas, atualizando dados');
                refreshAllAnalytics();
            }
        }
    };
    
    // Verificar imediatamente e também quando a navegação mudar
    checkAnalyticsPage();
    
    window.addEventListener('hashchange', checkAnalyticsPage);
    
    // Também verificar quando a visualização for alternada (para sistemas de navegação baseados em classe)
    const viewLinks = document.querySelectorAll('.sidebar-nav a');
    viewLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(checkAnalyticsPage, 100); // Pequeno atraso para garantir que as classes foram atualizadas
        });
    });
});

// Função para renderizar gráficos iniciais com dados mockados
function renderInitialCharts(mockData) {
    console.log('Renderizando gráficos iniciais com dados mockados');
    
    // Atualizar os elementos de resumo
    document.getElementById('total-tasks').textContent = mockData.totalTasks;
    document.getElementById('completed-tasks').textContent = `${mockData.completedPercentage}%`;
    document.getElementById('late-tasks').textContent = `${mockData.latePercentage}%`;
    document.getElementById('average-time').textContent = `${mockData.averageHours}h`;
    
    // Renderizar gráfico de distribuição
    const ctxDistribution = document.getElementById('tasks-distribution-chart');
    if (ctxDistribution && ctxDistribution.getContext) {
        chartsInstances.distribution = new Chart(ctxDistribution.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Em Andamento', 'Concluídas', 'Finalizadas', 'Atrasadas'],
                datasets: [{
                    data: [40, 20, 20, 20],
                    backgroundColor: [
                        '#eab308', // amarelo (pendente)
                        '#22c55e', // verde (concluído)
                        '#3b82f6', // azul (finalizado)
                        '#ef4444'  // vermelho (atrasado)
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                }
            }
        });
    }
    
    // Renderizar gráfico de evolução
    const ctxEvolution = document.getElementById('tasks-evolution-chart');
    if (ctxEvolution && ctxEvolution.getContext) {
        chartsInstances.evolution = new Chart(ctxEvolution.getContext('2d'), {
            type: 'line',
            data: {
                labels: Object.keys(mockData.evolution),
                datasets: [{
                    label: 'Tarefas Concluídas',
                    data: Object.values(mockData.evolution),
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#7c3aed',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Renderizar gráfico por dia da semana
    const ctxByDay = document.getElementById('tasks-by-day-chart');
    if (ctxByDay && ctxByDay.getContext) {
        chartsInstances.byDay = new Chart(ctxByDay.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                datasets: [{
                    label: 'Tarefas',
                    data: mockData.byDay,
                    backgroundColor: [
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(59, 130, 246, 0.7)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Renderizar gráfico por hora
    const ctxByHour = document.getElementById('tasks-by-hour-chart');
    if (ctxByHour && ctxByHour.getContext) {
        chartsInstances.byHour = new Chart(ctxByHour.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['0h-6h', '6h-12h', '12h-18h', '18h-24h'],
                datasets: mockData.byHour
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        stacked: true,
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        }
                    },
                    y: {
                        stacked: true,
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Iniciar ou atualizar todas as análises
async function refreshAllAnalytics() {
    try {
        console.log('Iniciando atualização de todas as análises...');
        
        // Exibir indicadores de carregamento nos gráficos
        document.querySelectorAll('.chart-container').forEach(container => {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'chart-loading';
            loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando dados...';
            container.appendChild(loadingIndicator);
        });
        
        // Primeiro tentar forçar uma sincronização com o servidor
        if (window.taskSyncApi && typeof window.taskSyncApi.syncNow === 'function') {
            try {
                console.log('Forçando sincronização de tarefas com o servidor antes de atualizar análises');
                await window.taskSyncApi.syncNow();
            } catch (error) {
                console.error('Erro ao sincronizar com o servidor:', error);
            }
        }
        
        // Atualizar todos os gráficos em paralelo
        await Promise.all([
            updateSummaryValues(),
            initTasksDistributionChart(),
            initTasksEvolutionChart(),
            initTasksByDayChart(),
            initTasksByHourChart()
        ]);
        
        // Remover indicadores de carregamento
        document.querySelectorAll('.chart-loading').forEach(element => {
            element.remove();
        });
        
        console.log('Todas as análises atualizadas com sucesso');
        
        if (typeof window.showSuccessNotification === 'function') {
            window.showSuccessNotification('Dados de análise atualizados com sucesso!');
        }
        
        return true;
    } catch (error) {
        console.error('Erro durante atualização das análises:', error);
        
        // Remover indicadores de carregamento mesmo em caso de erro
        document.querySelectorAll('.chart-loading').forEach(element => {
            element.remove();
        });
        
        if (typeof window.showErrorNotification === 'function') {
            window.showErrorNotification('Erro ao atualizar dados de análise');
        }
        
        return false;
    }
}

// Configurar botão de atualização e intervalo automático
function setupAnalyticsRefresh() {
    // Botão de atualização manual
    const refreshButton = document.querySelector('.refresh-analytics-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
            this.disabled = true;
            
            refreshAllAnalytics().finally(() => {
                this.innerHTML = originalText;
                this.disabled = false;
            });
        });
    }
    
    // Atualização automática a cada 5 minutos
    setInterval(() => {
        if (document.visibilityState === 'visible' && window.location.hash === '#analises') {
            console.log('Atualizando análises automaticamente');
            refreshAllAnalytics();
        }
    }, 5 * 60 * 1000); // 5 minutos
} 