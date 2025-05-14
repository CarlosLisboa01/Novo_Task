// KPI Dashboard para TaskPRO
// Este módulo implementa indicadores de performance (KPIs) para o dashboard,
// utilizando dados do Supabase

// Configuração de cores e ícones para KPIs
const KPI_CONFIG = {
    concluidas: {
        icon: 'fas fa-check-circle',
        color: '#22c55e', // Verde
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        title: 'Concluídas'
    },
    andamento: {
        icon: 'fas fa-spinner fa-spin',
        color: '#eab308', // Amarelo
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        title: 'Em Andamento'
    },
    atrasadas: {
        icon: 'fas fa-exclamation-triangle',
        color: '#ef4444', // Vermelho
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        title: 'Atrasadas'
    }
};

// Cache global para os dados de KPI
let kpiDataCache = null;
let kpiDataTimestamp = 0;
const CACHE_VALIDITY_TIME = 2000; // 2 segundos em milissegundos

// Função otimizada para buscar os dados dos KPIs do Supabase com cache
async function fetchKPIData(forceRefresh = false) {
    // Se temos dados em cache válidos e não foi solicitada atualização forçada
    const now = Date.now();
    if (kpiDataCache && !forceRefresh && (now - kpiDataTimestamp) < CACHE_VALIDITY_TIME) {
        console.log('Usando dados KPI em cache (ainda válidos)');
        return kpiDataCache;
    }
    
    try {
        console.log('Iniciando busca de dados KPI do Supabase...');
        
        // Método 1: Usar o estado em memória (window.tasks) primeiro para resposta imediata
        // Isto proporciona uma atualização instantânea enquanto os dados do servidor são buscados
        if (window.tasks) {
            // Obter todas as tarefas
            const allTasks = [
                ...window.tasks.day,
                ...window.tasks.week,
                ...window.tasks.month,
                ...window.tasks.year
            ];
            
            // Contar tarefas por status
            const localKpiData = {
                concluidas: allTasks.filter(task => 
                    task.status === 'completed' || task.status === 'finished'
                ).length,
                andamento: allTasks.filter(task => 
                    task.status === 'pending'
                ).length,
                atrasadas: allTasks.filter(task => 
                    task.status === 'late'
                ).length,
                total: allTasks.length,
                source: 'local'
            };
            
            console.log('KPIs calculados a partir de window.tasks (resposta rápida):', localKpiData);
            
            // Atualizar o cache com os dados locais enquanto aguardamos os dados do servidor
            kpiDataCache = localKpiData;
            kpiDataTimestamp = now;
            
            // Iniciar busca de dados do servidor em background
            // e atualizar o cache quando terminar
            if (typeof supabase !== 'undefined') {
                fetchServerKPIData().then(serverData => {
                    if (serverData) {
                        kpiDataCache = { ...serverData, source: 'server' };
                        kpiDataTimestamp = Date.now();
                        console.log('Cache KPI atualizado com dados do servidor');
                        
                        // Se algum elemento estiver visível, atualizar a UI
                        const kpiElements = document.querySelectorAll('.kpi-value');
                        if (kpiElements.length > 0) {
                            updateKPIDashboard();
                        }
                    }
                }).catch(err => {
                    console.error('Erro ao buscar dados KPI do servidor em background:', err);
                });
            }
            
            // Retornar imediatamente os dados locais
            return localKpiData;
        }
        
        // Se não temos window.tasks, buscar do servidor diretamente
        const serverData = await fetchServerKPIData();
        
        // Atualizar o cache
        kpiDataCache = serverData;
        kpiDataTimestamp = Date.now();
        
        return serverData;
    } catch (error) {
        console.error('Exceção em fetchKPIData():', error);
        
        // Se temos dados em cache, mesmo que antigos, retorná-los em caso de erro
        if (kpiDataCache) {
            console.log('Usando dados KPI em cache após erro');
            return kpiDataCache;
        }
        
        // Último recurso - retornar zeros
        return { concluidas: 0, andamento: 0, atrasadas: 0, total: 0, source: 'fallback' };
    }
}

// Função para buscar dados de KPI apenas do servidor
async function fetchServerKPIData() {
    try {
        // Verificar se temos a conexão com o Supabase
        if (typeof supabase === 'undefined') {
            throw new Error('Cliente Supabase não disponível');
        }
        
        // Buscar dados diretamente da tabela no Supabase
        const { data, error } = await supabase
            .from('tasks')
            .select('status');
            
        if (error) {
            console.error('Erro ao consultar tarefas no Supabase:', error);
            throw error;
        }
        
        console.log('Dados recebidos do Supabase para KPIs:', data ? data.length : 0, 'registros');
        
        // Inicializar contadores
        const kpiData = {
            concluidas: 0,
            andamento: 0,
            atrasadas: 0,
            total: data ? data.length : 0,
            source: 'server'
        };
        
        // Processar dados
        if (data && data.length > 0) {
            data.forEach(task => {
                // Mapear status do banco para categorias de KPI
                if (task.status === 'completed' || task.status === 'finished') {
                    kpiData.concluidas++;
                } else if (task.status === 'late') {
                    kpiData.atrasadas++;
                } else if (task.status === 'pending') {
                    kpiData.andamento++;
                }
            });
        }
        
        return kpiData;
    } catch (error) {
        console.error('Erro ao buscar dados KPI do servidor:', error);
        throw error;
    }
}

// Função para criar o HTML dos cards de KPI
function createKPICardsHTML(kpiData) {
    // Container para KPIs
    let html = `
        <div class="kpi-container">
    `;
    
    // Gerar HTML para cada KPI
    Object.keys(KPI_CONFIG).forEach(key => {
        const config = KPI_CONFIG[key];
        const value = kpiData[key] || 0;
        
        html += `
            <div class="kpi-card" data-kpi="${key}">
                <div class="kpi-icon" style="background-color: ${config.backgroundColor}">
                    <i class="${config.icon}" style="color: ${config.color}"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-title">${config.title}</div>
                    <div class="kpi-value" style="color: ${config.color}">${value}</div>
                </div>
            </div>
        `;
    });
    
    // Gráfico de pizza (opcional)
    html += `
        <div class="kpi-chart-card">
            <div class="kpi-chart-header">
                <h4>Distribuição de Tarefas</h4>
            </div>
            <div class="kpi-chart-body">
                <canvas id="kpi-distribution-chart"></canvas>
            </div>
        </div>
    `;
    
    // Fechar container
    html += `
        </div>
    `;
    
    return html;
}

// Função para renderizar o gráfico de distribuição
function renderKPIChart(kpiData) {
    const ctx = document.getElementById('kpi-distribution-chart');
    if (!ctx) return null;
    
    // Destruir gráfico existente se houver
    if (window.kpiDistributionChart) {
        window.kpiDistributionChart.destroy();
    }
    
    // Dados e cores para o gráfico
    const data = [
        kpiData.concluidas,
        kpiData.andamento,
        kpiData.atrasadas
    ];
    
    const backgroundColor = [
        '#22c55e', // Verde
        '#eab308', // Amarelo
        '#ef4444'  // Vermelho
    ];
    
    // Configurar e criar o gráfico
    window.kpiDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Concluídas', 'Em Andamento', 'Atrasadas'],
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderColor: 'white',
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
                            const total = data.reduce((a, b) => a + b, 0) || 1; // Evitar divisão por zero
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    return window.kpiDistributionChart;
}

// Função principal para inicializar e renderizar KPIs
async function initKPIDashboard() {
    try {
        console.log('Inicializando KPI Dashboard...');
        
        // Buscar e validar o container no qual os KPIs serão renderizados
        const dashboardView = document.getElementById('dashboard-view');
        if (!dashboardView) {
            console.error('Container do dashboard não encontrado');
            return false;
        }
        
        // Mostrar mensagem de carregamento durante a busca de dados
        const loadingEl = document.createElement('div');
        loadingEl.className = 'kpi-loading';
        loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando indicadores...';
        
        // Buscar elementos existentes para inserir KPIs após o cabeçalho
        const pageHeader = dashboardView.querySelector('.page-header');
        if (pageHeader) {
            // Inserir após o cabeçalho da página
            pageHeader.insertAdjacentElement('afterend', loadingEl);
        } else {
            // Fallback: inserir no início do dashboard
            dashboardView.prepend(loadingEl);
        }
        
        // Buscar dados dos KPIs
        const kpiData = await fetchKPIData();
        console.log('Dados de KPI obtidos:', kpiData);
        
        // Remover KPIs existentes (para atualizações)
        const existingKPIs = dashboardView.querySelector('.kpi-container');
        if (existingKPIs) {
            existingKPIs.remove();
        }
        
        // Gerar HTML dos KPIs
        const kpiHTML = createKPICardsHTML(kpiData);
        
        // Substituir mensagem de carregamento pelos KPIs
        loadingEl.outerHTML = kpiHTML;
        
        // Renderizar gráfico de distribuição
        renderKPIChart(kpiData);
        
        console.log('KPI Dashboard inicializado com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao inicializar KPI Dashboard:', error);
        
        // Tentar remover mensagem de carregamento em caso de erro
        const loadingEl = document.querySelector('.kpi-loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="kpi-error">
                    <i class="fas fa-exclamation-circle"></i>
                    Não foi possível carregar os indicadores
                </div>
            `;
        }
        
        return false;
    }
}

// Adicionar estilos CSS para as atualizações dos KPIs
function addKPIUpdateStyles() {
    // Verificar se os estilos já foram adicionados
    if (document.getElementById('kpi-update-styles')) {
        return;
    }
    
    // Criar elemento de estilo
    const styleElement = document.createElement('style');
    styleElement.id = 'kpi-update-styles';
    
    // Definir os estilos CSS
    styleElement.textContent = `
        /* Animação de atualização para KPIs */
        .kpi-updating {
            animation: kpi-pulse 0.5s ease;
        }
        
        @keyframes kpi-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        /* Indicador de atualização */
        .kpi-refresh-indicator {
            display: inline-block;
            font-size: 0.6em;
            margin-left: 5px;
            opacity: 0.7;
            vertical-align: super;
            color: inherit;
        }
        
        /* Melhorar a aparência dos cards de KPI */
        .kpi-card {
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .kpi-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }
        
        /* Animação para valor dos KPIs */
        .kpi-value {
            transition: color 0.3s ease;
            position: relative;
            display: inline-block;
        }
        
        /* Para a transição entre estados */
        [data-kpi="concluidas"] .kpi-value {
            color: #22c55e !important;
        }
        
        [data-kpi="andamento"] .kpi-value {
            color: #eab308 !important;
        }
        
        [data-kpi="atrasadas"] .kpi-value {
            color: #ef4444 !important;
        }
    `;
    
    // Adicionar ao head
    document.head.appendChild(styleElement);
}

// Função para atualizar os KPIs
async function updateKPIDashboard(forceRefresh = false) {
    try {
        console.log(`Atualizando KPI Dashboard... ${forceRefresh ? '(forçando atualização)' : ''}`);
        
        // Garantir que os estilos de atualização estejam aplicados
        addKPIUpdateStyles();
        
        // Criar um timestamp para registrar o tempo de execução
        const startTime = performance.now();
        
        // Usar promessas para buscar dados e atualizar elementos simultaneamente
        // para evitar bloqueio, passando o parâmetro forceRefresh
        const kpiDataPromise = fetchKPIData(forceRefresh);
        
        // Enquanto os dados estão sendo buscados, preparar elementos que serão atualizados
        const kpiElements = {};
        Object.keys(KPI_CONFIG).forEach(key => {
            kpiElements[key] = document.querySelector(`.kpi-card[data-kpi="${key}"] .kpi-value`);
        });
        
        // Indicar visualmente que estamos atualizando
        Object.values(kpiElements).forEach(element => {
            if (element) {
                // Adicionar classe de atualização (criará um efeito de pulse ou highlight)
                element.classList.add('kpi-updating');
                
                // Adicionar ícone temporário de refresh
                const refreshIcon = document.createElement('small');
                refreshIcon.className = 'kpi-refresh-indicator';
                refreshIcon.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
                // Só adicionar se ainda não existir
                if (!element.querySelector('.kpi-refresh-indicator')) {
                    element.appendChild(refreshIcon);
                }
            }
        });
        
        // Aguardar os dados
        const kpiData = await kpiDataPromise;
        
        // Atualizar valores nos cards existentes
        Object.keys(KPI_CONFIG).forEach(key => {
            const element = kpiElements[key];
            if (element) {
                // Substituir o conteúdo com o novo valor
                const value = kpiData[key] || 0;
                
                // Remover o ícone de refresh
                const refreshIcon = element.querySelector('.kpi-refresh-indicator');
                if (refreshIcon) refreshIcon.remove();
                
                // Atualizar o valor com um efeito de contador (para valores maiores)
                if (value > 0) {
                    // Animação de contagem para valores > 0
                    const currentValue = parseInt(element.textContent) || 0;
                    animateCounterValue(element, currentValue, value);
                } else {
                    // Para zero, apenas definir diretamente
                    element.textContent = value;
                }
                
                // Remover classe de atualização após um pequeno delay
                setTimeout(() => {
                    element.classList.remove('kpi-updating');
                }, 300);
            }
        });
        
        // Atualizar gráfico de distribuição
        renderKPIChart(kpiData);
        
        // Mostrar tempo de execução para diagnóstico
        const endTime = performance.now();
        console.log(`KPI Dashboard atualizado em ${(endTime - startTime).toFixed(2)}ms`);
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar KPI Dashboard:', error);
        return false;
    }
}

// Função auxiliar para animar contador
function animateCounterValue(element, startValue, endValue) {
    // Definir duração da animação baseada na diferença dos valores
    const difference = Math.abs(endValue - startValue);
    const duration = Math.min(1000, Math.max(200, difference * 50)); // Entre 200ms e 1000ms
    
    // Calcular incremento por frame para uma animação suave
    const framesPerSecond = 60;
    const totalFrames = duration / 1000 * framesPerSecond;
    const increment = (endValue - startValue) / totalFrames;
    
    let currentValue = startValue;
    let frame = 0;
    
    // Função que será chamada a cada frame para incrementar o contador
    function updateFrame() {
        frame++;
        currentValue += increment;
        
        // Verificar se chegamos ao final
        if ((increment > 0 && currentValue >= endValue) || 
            (increment < 0 && currentValue <= endValue) || 
            frame >= totalFrames) {
            element.textContent = endValue;
            return;
        }
        
        // Atualizar o texto com o valor atual arredondado
        element.textContent = Math.round(currentValue);
        
        // Agendar próximo frame
        requestAnimationFrame(updateFrame);
    }
    
    // Iniciar animação
    requestAnimationFrame(updateFrame);
}

// Inicializar KPIs quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar KPIs imediatamente em qualquer página
    console.log('DOM carregado, inicializando KPIs imediatamente...');
    
    // Remover o setTimeout que causava delay na inicialização
    initKPIDashboard();
    
    // Adicionar listener para mudanças de hash (navegação)
    window.addEventListener('hashchange', () => {
        // Atualizar KPIs sempre que mudar de página, especialmente útil
        // ao retornar para o dashboard
        if (window.location.hash === '' || window.location.hash === '#dashboard') {
            const kpiContainer = document.querySelector('.kpi-container');
            if (kpiContainer) {
                // Chamar com forceRefresh=true para garantir dados atualizados
                updateKPIDashboard(true);
            } else {
                initKPIDashboard();
            }
        }
    });
    
    // Adicionar listener para o evento de mudança de status de tarefa
    // Isto vai garantir que os KPIs sejam atualizados automaticamente
    // quando qualquer tarefa for atualizada em qualquer lugar da aplicação
    window.addEventListener('taskStatusChanged', (event) => {
        console.log('Evento de mudança de status detectado, atualizando KPIs...');
        const kpiContainer = document.querySelector('.kpi-container');
        if (kpiContainer) {
            // Atualizar com refresh forçado para garantir dados precisos
            updateKPIDashboard(true);
        }
    });
});

// Exportar funções para uso global
window.initKPIDashboard = initKPIDashboard;
window.updateKPIDashboard = updateKPIDashboard;

// Dashboard e KPIs
let statsCharts = {};

// Inicializar gráficos quando a análise é carregada
function initializeAnalytics() {
    // Configuração global para gráficos
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color-light').trim();
    Chart.defaults.scale.grid.color = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() + '80';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.tooltip.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim();
    Chart.defaults.plugins.tooltip.titleColor = getComputedStyle(document.documentElement).getPropertyValue('--title-color').trim();
    Chart.defaults.plugins.tooltip.bodyColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    Chart.defaults.plugins.tooltip.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;

    // Limpar gráficos existentes
    Object.values(statsCharts).forEach(chart => {
        if (chart instanceof Chart) {
            chart.destroy();
        }
    });
    statsCharts = {};

    // Inicializar novos gráficos
    createCategoryChart();
    createTrendChart();
    createStatusChart();
    createDailyProductivityChart();
}

// Atualizar estatísticas e KPIs
function updateAnalytics() {
    // Estatísticas gerais
    const allTasks = getAllTasks();
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const pendingTasks = allTasks.filter(task => task.status === 'pending');
    const lateTasks = allTasks.filter(task => isTaskLate(task));
    const completionRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    // Atualizar contadores
    document.getElementById('completed-tasks-count').textContent = completedTasks.length;
    document.getElementById('pending-tasks-count').textContent = pendingTasks.length;
    document.getElementById('late-tasks-count').textContent = lateTasks.length;
    document.getElementById('completion-rate').textContent = `${completionRate}%`;

    // Atualizar gráficos
    updateCategoryChart();
    updateTrendChart();
    updateStatusChart();
    updateDailyProductivityChart();
}

// Obter todas as tarefas de todas as categorias
function getAllTasks() {
    let allTasks = [];
    Object.values(window.tasks).forEach(categoryTasks => {
        allTasks = allTasks.concat(categoryTasks);
    });
    return allTasks;
}

// Criar gráfico de progresso por categoria
function createCategoryChart() {
    const ctx = document.getElementById('tasks-by-category-chart');
    if (!ctx) return;

    statsCharts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hoje', 'Esta Semana', 'Este Mês', 'Este Ano'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#10b981', // Hoje - Verde
                    '#3b82f6', // Semana - Azul
                    '#7c3aed', // Mês - Roxo
                    '#f59e0b', // Ano - Laranja
                ],
                borderWidth: 2,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim()
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
                        padding: 20,
                        boxWidth: 12,
                        boxHeight: 12,
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Atualizar gráfico de progresso por categoria
function updateCategoryChart() {
    if (!statsCharts.category) return;
    
    const categoryCounts = {
        'day': window.tasks.day.length,
        'week': window.tasks.week.length,
        'month': window.tasks.month.length,
        'year': window.tasks.year.length
    };
    
    statsCharts.category.data.datasets[0].data = [
        categoryCounts.day,
        categoryCounts.week,
        categoryCounts.month,
        categoryCounts.year
    ];
    
    statsCharts.category.update();
}

// Criar gráfico de tendência de conclusão
function createTrendChart() {
    const ctx = document.getElementById('task-completion-trend-chart');
    if (!ctx) return;

    // Gerar dados para os últimos 7 dias
    const dates = [];
    const completedData = [];
    const pendingData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));
        
        // Dados de exemplo (na implementação real, calcule com base nas tarefas concluídas por dia)
        completedData.push(Math.floor(Math.random() * 5));
        pendingData.push(Math.floor(Math.random() * 3));
    }

    statsCharts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Concluídas',
                    data: completedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Pendentes',
                    data: pendingData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end'
                }
            }
        }
    });
}

// Atualizar gráfico de tendência (na implementação real, calcule com base nas tarefas)
function updateTrendChart() {
    if (!statsCharts.trend) return;
    
    // Atualizar com dados reais baseados no histórico de conclusão
    // Esta é uma implementação simples - em um ambiente real, você usaria dados históricos verdadeiros
    statsCharts.trend.update();
}

// Criar gráfico de distribuição de status
function createStatusChart() {
    const ctx = document.getElementById('task-status-chart');
    if (!ctx) return;

    statsCharts.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Concluídas', 'Em Andamento', 'Atrasadas'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#10b981', // Concluídas - Verde
                    '#f59e0b', // Em Andamento - Laranja
                    '#ef4444'  // Atrasadas - Vermelho
                ],
                borderWidth: 2,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim()
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Atualizar gráfico de distribuição de status
function updateStatusChart() {
    if (!statsCharts.status) return;
    
    const allTasks = getAllTasks();
    const completedCount = allTasks.filter(task => task.status === 'completed').length;
    const pendingCount = allTasks.filter(task => task.status === 'pending').length;
    const lateCount = allTasks.filter(task => isTaskLate(task)).length;
    
    statsCharts.status.data.datasets[0].data = [completedCount, pendingCount, lateCount];
    statsCharts.status.update();
}

// Criar gráfico de produtividade diária
function createDailyProductivityChart() {
    const ctx = document.getElementById('daily-productivity-chart');
    if (!ctx) return;

    // Gerar dados de produtividade para os dias da semana
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    statsCharts.daily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekdays,
            datasets: [{
                label: 'Tarefas Concluídas',
                data: [2, 4, 6, 8, 6, 4, 2], // Dados de exemplo
                backgroundColor: 'rgba(124, 58, 237, 0.7)',
                borderColor: '#7c3aed',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Atualizar gráfico de produtividade diária
function updateDailyProductivityChart() {
    if (!statsCharts.daily) return;
    
    // Implementar cálculo real baseado em tarefas concluídas por dia da semana
    statsCharts.daily.update();
}

// Inicializar os gráficos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página de análises
    function checkAnalyticsPage() {
        if (window.location.hash === '#analises') {
            initializeAnalytics();
            updateAnalytics();
        }
    }
    
    // Verificar ao carregar
    checkAnalyticsPage();
    
    // Verificar quando a navegação mudar
    window.addEventListener('hashchange', checkAnalyticsPage);
    
    // Botões de período para a página de análises
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover a classe 'active' de todos os botões
            periodButtons.forEach(btn => btn.classList.remove('active'));
            // Adicionar a classe 'active' ao botão clicado
            this.classList.add('active');
            
            // Atualizar os dados baseados no período selecionado
            // Na implementação real, você filtraria os dados por período
            updateAnalytics();
        });
    });
}); 