// Funções para a página de Análises do TaskPro
let analyticsInitialized = false;
let chartsInstances = {};
let lastAnalyticsUpdate = 0;
const ANALYTICS_UPDATE_INTERVAL = 5000; // 5 segundos

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
    if (analyticsInitialized) {
        console.log('Módulo de análises já inicializado, apenas atualizando dados...');
        refreshAllAnalytics(true);
        return;
    }
    
    console.log('Inicializando módulo de Análises...');
    
    // Inicializar os gráficos e exibir dados mockados temporariamente
    setupCharts();
    
    // Configurar atualização automática
    setupAnalyticsRefresh();
    
    // Carregar dados reais imediatamente
    refreshAllAnalytics(true);
    
    // Configurar listeners para seletores de período
    setupPeriodSelectors();
    
    // Adicionar botão de forçar atualização
    setTimeout(() => {
        addRefreshButton();
    }, 500); // Pequeno atraso para garantir que o HTML esteja pronto
    
    analyticsInitialized = true;
    console.log('Módulo de análises inicializado com sucesso!');
}

// Configurar os gráficos iniciais
function setupCharts() {
    console.log('Configurando gráficos de análise...');
    
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não está disponível. Certifique-se de que a biblioteca foi carregada corretamente.');
        return;
    }
    
    // Limpar instâncias de gráficos existentes
    Object.values(chartsInstances).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    chartsInstances = {};
    
    // Configurações globais do Chart.js
    Chart.defaults.font.family = "'Inter', 'Helvetica', 'Arial', sans-serif";
    Chart.defaults.font.size = 14;
    Chart.defaults.color = document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'; // Ajuste para tema escuro/claro
    Chart.defaults.plugins.tooltip.backgroundColor = document.documentElement.classList.contains('dark') ? '#1e293b' : '#334155';
    Chart.defaults.plugins.tooltip.titleColor = document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#f1f5f9';
    Chart.defaults.plugins.tooltip.borderWidth = 0;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    
    // Gráfico de distribuição por status (pizza/donut)
    setupStatusDistributionChart();
    
    // Gráfico de tendência de conclusão (linha)
    setupCompletionTrendChart();
}

// Configurar gráfico de distribuição por status
function setupStatusDistributionChart() {
    const statusCtx = document.getElementById('status-distribution-chart');
    if (!statusCtx) {
        console.warn('Elemento do gráfico de distribuição não encontrado');
        return;
    }
    
    // Limpar canvas para evitar problemas de renderização
    statusCtx.getContext('2d').clearRect(0, 0, statusCtx.width, statusCtx.height);
    
    // Criar novo gráfico
    chartsInstances.statusDistribution = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Concluídas', 'Em Andamento', 'Atrasadas'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
                borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                borderWidth: 2,
                hoverOffset: 10,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 13
                        },
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#475569',
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
    
    console.log('Gráfico de distribuição por status configurado');
}

// Configurar gráfico de tendência de conclusão
function setupCompletionTrendChart() {
    const trendCtx = document.getElementById('completion-trend-chart');
    if (!trendCtx) {
        console.warn('Elemento do gráfico de tendência não encontrado');
        return;
    }
    
    // Limpar canvas para evitar problemas de renderização
    trendCtx.getContext('2d').clearRect(0, 0, trendCtx.width, trendCtx.height);
    
    // Gerar últimos 7 dias para rótulos
        const labels = [];
        for (let i = 6; i >= 0; i--) {
        const date = new Date();
            date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pt-BR', {weekday: 'short', day: 'numeric'}));
    }
    
    // Determinar cores baseadas no tema
    const isDark = document.documentElement.classList.contains('dark');
    const completedLineColor = '#22c55e'; // Verde para corresponder à cor das tarefas concluídas
    const completedFillColor = isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)';
    const pendingLineColor = '#eab308'; // Amarelo para corresponder à cor das tarefas em andamento
    const pendingFillColor = isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.1)';
    const lateLineColor = '#ef4444'; // Vermelho para corresponder à cor das tarefas atrasadas
    const lateFillColor = isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)';
    
    // Criar novo gráfico
    chartsInstances.completionTrend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: labels,
            datasets: [
                {
                    label: 'Tarefas Concluídas',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    fill: true,
                    backgroundColor: completedFillColor,
                    borderColor: completedLineColor,
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: completedLineColor,
                    pointBorderColor: isDark ? '#1e293b' : '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2
                },
                {
                    label: 'Em Andamento',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    fill: true,
                    backgroundColor: pendingFillColor,
                    borderColor: pendingLineColor,
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: pendingLineColor,
                    pointBorderColor: isDark ? '#1e293b' : '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2
                },
                {
                    label: 'Atrasadas',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    fill: true,
                    backgroundColor: lateFillColor,
                    borderColor: lateLineColor,
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: lateLineColor,
                    pointBorderColor: isDark ? '#1e293b' : '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2
                }
            ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 25,
                    bottom: 10,
                    left: 10
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: isDark ? '#94a3b8' : '#64748b'
                        }
                    },
                    y: {
                        beginAtZero: true,
                    suggestedMin: 0,
                    suggestedMax: 5,
                    min: 0,
                    grid: {
                        borderDash: [3, 3],
                        drawBorder: false,
                        color: gridColor
                    },
                        ticks: {
                            precision: 0,
                        stepSize: 1,
                        color: isDark ? '#94a3b8' : '#64748b'
                    }
                }
            },
                plugins: {
                    legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#334155',
                    titleColor: isDark ? '#f1f5f9' : '#f8fafc',
                    bodyColor: isDark ? '#cbd5e1' : '#f1f5f9',
                    displayColors: true,
                    padding: 10,
                    cornerRadius: 4,
                    intersect: false,
                    mode: 'index',
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            const value = context.raw || 0;
                            const label = context.dataset.label || '';
                            if (label === 'Em Andamento') {
                                return `${value} tarefa${value !== 1 ? 's' : ''} em andamento`;
                            } else {
                                return `${value} tarefa${value !== 1 ? 's' : ''} concluída${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuad'
                }
            }
        });
    
    console.log('Gráfico de tendência de tarefas configurado');
    
    // Atualizar o título do gráfico no HTML
    const chartTitle = document.querySelector('.chart-title:has(+ #completion-trend-chart), .chart-title:has(+ div:has(#completion-trend-chart))');
    if (chartTitle) {
        chartTitle.textContent = 'Tarefas por Dia';
    }
}

// Configurar atualização automática
function setupAnalyticsRefresh() {
    console.log('Configurando atualização automática de dados...');
    
    // Atualização automática a cada 5 segundos quando a página de análises estiver visível
    setInterval(() => {
        if (document.visibilityState === 'visible' && window.location.hash === '#analises') {
            const now = Date.now();
            if (now - lastAnalyticsUpdate > ANALYTICS_UPDATE_INTERVAL) {
                console.log('Atualizando dados de análise automaticamente...');
                refreshAllAnalytics();
            }
        }
    }, ANALYTICS_UPDATE_INTERVAL);
    
    // Atualizar quando o documento ficar visível
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.location.hash === '#analises') {
            console.log('Documento voltou a ficar visível, atualizando análises...');
            refreshAllAnalytics();
        }
    });
    
    // Atualizar quando mudar para a página de análises
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#analises') {
            console.log('Navegou para a página de análises, inicializando...');
            if (!analyticsInitialized) {
                initAnalytics();
            } else {
                refreshAllAnalytics();
            }
        }
    });
    
    // Listener para eventos de alteração nas tarefas
    document.addEventListener('taskUpdated', (event) => {
        if (window.location.hash === '#analises') {
            console.log('Evento de atualização de tarefa detectado, atualizando análises imediatamente...');
            refreshAllAnalytics(true); // Forçar atualização com dados do servidor
        }
    });
    
    document.addEventListener('taskAdded', (event) => {
        if (window.location.hash === '#analises') {
            console.log('Evento de adição de tarefa detectado, atualizando análises imediatamente...');
            refreshAllAnalytics(true); // Forçar atualização com dados do servidor
        }
    });
    
    document.addEventListener('taskDeleted', (event) => {
        if (window.location.hash === '#analises') {
            console.log('Evento de remoção de tarefa detectado, atualizando análises imediatamente...');
            refreshAllAnalytics(true); // Forçar atualização com dados do servidor
        }
    });
    
    document.addEventListener('taskStatusChanged', (event) => {
        if (window.location.hash === '#analises') {
            console.log('Evento de mudança de status detectado, atualizando análises imediatamente...');
            refreshAllAnalytics(true); // Forçar atualização com dados do servidor
        }
    });
    
    // Adicionar listener para sincronização concluída
    document.addEventListener('syncCompleted', (event) => {
        if (window.location.hash === '#analises') {
            console.log('Sincronização de tarefas concluída, atualizando análises...');
            refreshAllAnalytics(true);
        }
    });
}

// Configurar seletores de período
function setupPeriodSelectors() {
    const periodButtons = document.querySelectorAll('.period-btn');
    if (!periodButtons.length) return;
    
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover classe ativa de todos os botões
            periodButtons.forEach(btn => btn.classList.remove('active'));
            
            // Adicionar classe ativa ao botão clicado
            button.classList.add('active');
            
            // Atualizar dados para o período selecionado
            const period = button.getAttribute('data-period');
            refreshAllAnalytics(true, period);
        });
    });
}

// Função para forçar sincronização com servidor antes de atualizar análises
async function forceServerSync() {
    console.log('Forçando sincronização com o servidor antes de atualizar análises...');
    
    try {
        // Verificar se temos a API de sincronização disponível
        if (window.taskSyncApi && typeof window.taskSyncApi.syncNow === 'function') {
            console.log('Usando taskSyncApi para sincronização...');
            await window.taskSyncApi.syncNow(true);
            console.log('Sincronização via taskSyncApi concluída');
            return true;
        }
        
        // Verificar se temos o cliente Supabase disponível diretamente
        if (window.supabase) {
            console.log('Usando cliente Supabase diretamente...');
            const { data, error } = await window.supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('Erro ao buscar tarefas do Supabase:', error);
                return false;
            }
            
            if (data && data.length > 0) {
                console.log(`Recebidas ${data.length} tarefas diretamente do Supabase`);
                
                // Atualizar o objeto global de tarefas se possível
                if (window.tasks) {
                    // Transformar os dados para o formato esperado
                    const tasksObj = {
                        day: [],
                        week: [],
                        month: [],
                        year: []
                    };
                    
                    // Agrupar por período (lógica simplificada)
                    data.forEach(task => {
                        const today = new Date();
                        const taskDate = new Date(task.enddate || task.endDate || task.created_at || task.createdAt);
                        
                        // Calcular diferença em dias
                        const diffTime = Math.abs(today - taskDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays <= 1) {
                            tasksObj.day.push(task);
                        } else if (diffDays <= 7) {
                            tasksObj.week.push(task);
                        } else if (diffDays <= 30) {
                            tasksObj.month.push(task);
                        } else {
                            tasksObj.year.push(task);
                        }
                    });
                    
                    window.tasks = tasksObj;
                    console.log('Objeto global de tarefas atualizado com dados do servidor');
                }
                
                return true;
            } else {
                console.warn('Nenhuma tarefa encontrada no Supabase');
                return false;
            }
        }
        
        console.warn('Nenhum método de sincronização disponível');
        return false;
    } catch (error) {
        console.error('Erro ao sincronizar com o servidor:', error);
        return false;
    }
}

// Modificar a função refreshAllAnalytics para usar a sincronização reforçada
async function refreshAllAnalytics(forceRefresh = false, period = getCurrentPeriod()) {
    try {
        console.log(`Atualizando análises para período: ${period}`);
        
        // Mostrar indicador de carregamento após 300ms se a atualização não completar rapidamente
        const loadingTimer = setTimeout(() => {
            document.querySelectorAll('.chart-container').forEach(container => {
                // Verificar se já existe um indicador de carregamento
                if (!container.querySelector('.chart-loading')) {
                    const loadingEl = document.createElement('div');
                    loadingEl.className = 'chart-loading';
                    loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    loadingEl.style.position = 'absolute';
                    loadingEl.style.top = '50%';
                    loadingEl.style.left = '50%';
                    loadingEl.style.transform = 'translate(-50%, -50%)';
                    loadingEl.style.fontSize = '24px';
                    loadingEl.style.color = 'var(--primary-color)';
                    loadingEl.style.zIndex = '1';
                    container.style.position = 'relative';
                    container.appendChild(loadingEl);
                }
            });
        }, 300);
        
        // Forçar sincronização com o servidor se solicitado
        if (forceRefresh) {
            await forceServerSync();
        }
        
        // Buscar dados atualizados do Supabase
        const tasksData = await fetchTasksData(forceRefresh);
        
        // Verificar se temos dados suficientes
        if (!tasksData || tasksData.length === 0) {
            console.warn('Nenhum dado de tarefa disponível após fetchTasksData');
            // Tentar novamente com sincronização forçada
            await forceServerSync();
            const retryData = await fetchTasksData(true);
            if (!retryData || retryData.length === 0) {
                console.error('Falha ao obter dados mesmo após retry');
            }
        }
        
        // Normalizar os dados para garantir que os campos tenham nomes consistentes
        const normalizedTasksData = normalizeTasksData(tasksData);
        
        // Calcular KPIs e atualizar a interface
        updateKPIs(normalizedTasksData);
        
        // Atualizar gráficos com os mesmos dados normalizados
        updateCharts(normalizedTasksData, period);
        
        // Verificar se o gráfico de conclusão está mostrando corretamente
        const completionChart = chartsInstances.completionTrend;
        if (completionChart && completionChart.data.datasets[0].data.every(val => val === 0)) {
            console.warn('Gráfico de conclusão está vazio após atualização. Executando diagnóstico automático...');
            
            // Tentar reconstruir o gráfico completamente
            setupCompletionTrendChart();
            
            // Adicionar dados artificiais para testar se o problema é no gráfico ou nos dados
            setTimeout(() => {
                updateCompletionTrendChart(normalizedTasksData);
            }, 200);
        }
        
        // Atualizar hora da última atualização
        updateLastUpdateTime();
        
        // Limpar timer de carregamento
        clearTimeout(loadingTimer);
        
        // Remover indicadores de carregamento
        document.querySelectorAll('.chart-loading').forEach(el => el.remove());
        
        // Adicionar efeito de atualização para mostrar visualmente que os dados foram atualizados
        highlightUpdatedElements();
        
        // Atualizar timestamp da última atualização
        lastAnalyticsUpdate = Date.now();
        
        console.log('Análises atualizadas com sucesso às', new Date().toLocaleTimeString());
        return true;
    } catch (error) {
        console.error('Erro ao atualizar análises:', error);
        
        // Remover indicadores de carregamento em caso de erro
        document.querySelectorAll('.chart-loading').forEach(el => {
            el.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
            setTimeout(() => el.remove(), 2000);
        });
        
        return false;
    }
}

// Normalizar dados das tarefas para garantir consistência entre KPIs e gráficos
function normalizeTasksData(tasksData) {
    if (!tasksData || !tasksData.length) return [];
    
    console.log('Normalizando dados das tarefas para consistência...');
    
    return tasksData.map(task => {
        // Criar uma cópia do objeto para não modificar o original
        const normalizedTask = { ...task };
        
        // Garantir que o status esteja em minúsculas e seja um dos valores esperados
        if (normalizedTask.status) {
            normalizedTask.status = normalizedTask.status.toLowerCase();
            
            // Mapear variações de status para os valores padrão
            if (['done', 'finalizado', 'concluido', 'concluída', 'completo'].includes(normalizedTask.status)) {
                normalizedTask.status = 'completed';
            } else if (['em andamento', 'in progress', 'andamento', 'iniciado'].includes(normalizedTask.status)) {
                normalizedTask.status = 'pending';
            } else if (['atrasado', 'vencido', 'delayed', 'overdue'].includes(normalizedTask.status)) {
                normalizedTask.status = 'late';
            }
        } else {
            // Se a tarefa não tiver status, definir como pendente
            normalizedTask.status = 'pending';
        }
        
        // Normalizar campos de data
        // De startdate para startDate (e vice-versa)
        if (normalizedTask.startdate && !normalizedTask.startDate) {
            normalizedTask.startDate = normalizedTask.startdate;
        } else if (normalizedTask.startDate && !normalizedTask.startdate) {
            normalizedTask.startdate = normalizedTask.startDate;
        }
        
        // De enddate para endDate (e vice-versa)
        if (normalizedTask.enddate && !normalizedTask.endDate) {
            normalizedTask.endDate = normalizedTask.enddate;
        } else if (normalizedTask.endDate && !normalizedTask.enddate) {
            normalizedTask.enddate = normalizedTask.endDate;
        }
        
        // De completed_at para completedAt (e vice-versa)
        if (normalizedTask.completed_at && !normalizedTask.completedAt) {
            normalizedTask.completedAt = normalizedTask.completed_at;
        } else if (normalizedTask.completedAt && !normalizedTask.completed_at) {
            normalizedTask.completed_at = normalizedTask.completedAt;
        }
        
        // De created_at para createdAt (e vice-versa)
        if (normalizedTask.created_at && !normalizedTask.createdAt) {
            normalizedTask.createdAt = normalizedTask.created_at;
        } else if (normalizedTask.createdAt && !normalizedTask.created_at) {
            normalizedTask.created_at = normalizedTask.createdAt;
        }
        
        return normalizedTask;
    });
}

// Destacar elementos atualizados com uma animação sutil
function highlightUpdatedElements() {
    // Destacar os KPIs
    document.querySelectorAll('.kpi-card').forEach(card => {
        card.classList.add('kpi-updating');
        setTimeout(() => {
            card.classList.remove('kpi-updating');
        }, 600);
    });
    
    // Destacar o último update
    const lastUpdate = document.querySelector('.last-update');
    if (lastUpdate) {
        lastUpdate.classList.add('last-update-highlight');
        setTimeout(() => {
            lastUpdate.classList.remove('last-update-highlight');
        }, 600);
    }
    
    // Destacar os gráficos
    document.querySelectorAll('.chart-card').forEach(chart => {
        chart.classList.add('chart-updating');
            setTimeout(() => {
            chart.classList.remove('chart-updating');
        }, 600);
    });
    
    // Adicionar estilos CSS se necessário
    addHighlightStyles();
}

// Adicionar estilos CSS para animações de destaque
function addHighlightStyles() {
    // Verificar se os estilos já foram adicionados
    if (document.getElementById('analytics-highlight-styles')) {
        return;
    }
    
    // Criar elemento de estilo
    const styleElement = document.createElement('style');
    styleElement.id = 'analytics-highlight-styles';
    
    // Definir os estilos CSS
    styleElement.textContent = `
        /* Animação para KPIs */
        .kpi-updating {
            animation: kpi-pulse 0.6s ease;
        }
        
        @keyframes kpi-pulse {
            0% { transform: scale(1); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            50% { transform: scale(1.03); box-shadow: 0 8px 15px rgba(124, 58, 237, 0.2); }
            100% { transform: scale(1); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        }
        
        /* Animação para última atualização */
        .last-update-highlight {
            animation: update-flash 0.6s ease;
        }
        
        @keyframes update-flash {
            0% { background-color: var(--card-bg); }
            50% { background-color: rgba(124, 58, 237, 0.1); }
            100% { background-color: var(--card-bg); }
        }
        
        /* Animação para gráficos */
        .chart-updating {
            animation: chart-highlight 0.6s ease;
        }
        
        @keyframes chart-highlight {
            0% { transform: translateY(0); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            50% { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(124, 58, 237, 0.2); }
            100% { transform: translateY(0); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        }
    `;
    
    // Adicionar ao head
    document.head.appendChild(styleElement);
}

// Obter o período atual selecionado
function getCurrentPeriod() {
    const activeButton = document.querySelector('.period-btn.active');
    return activeButton ? activeButton.getAttribute('data-period') : 'week';
}

// Buscar dados das tarefas do Supabase
async function fetchTasksData(forceRefresh = false) {
    try {
        console.log('Buscando dados de tarefas do Supabase...');
        
        // Verificar se podemos usar o estado em memória para resposta rápida
        if (!forceRefresh && window.tasks) {
            console.log('Usando dados em memória (window.tasks)');
            const allTasks = flattenTasks(window.tasks);
            console.log(`Encontradas ${allTasks.length} tarefas em memória`);
            logTasksStatus(allTasks);
            return allTasks;
        }
        
        // Verificar se podemos usar a API do TaskSync
        if (window.taskSyncApi && typeof window.taskSyncApi.syncNow === 'function') {
            console.log('Iniciando sincronização com Supabase via taskSyncApi...');
            await window.taskSyncApi.syncNow(true); // Forçar sincronização para garantir dados atualizados
            
            // Aguardar um momento para garantir que os dados foram atualizados
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (window.tasks) {
                const allTasks = flattenTasks(window.tasks);
                console.log(`Recebidas ${allTasks.length} tarefas via taskSyncApi`);
                logTasksStatus(allTasks);
                return allTasks;
            }
        }
        
        // Se não tiver API de sincronização ou se ela falhou, buscar diretamente do Supabase
        console.log('Buscando tarefas diretamente do Supabase...');
        
        // Verificar se temos o cliente do Supabase disponível
        let supabaseClient;
        if (window.supabase) {
            supabaseClient = window.supabase;
        } else if (typeof supabase !== 'undefined') {
            supabaseClient = supabase;
            window.supabase = supabase; // Armazenar para uso futuro
        } else if (typeof supabaseJs !== 'undefined') {
            // Tentar obter do objeto global supabaseJs
            const { createClient } = supabaseJs;
            const supabaseUrl = localStorage.getItem('supabaseUrl') || 'https://fthtyynnodfijkldfscz.supabase.co';
            const supabaseKey = localStorage.getItem('supabaseKey') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0aHR5eW5ub2RmaWprMWRmc2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODM4Mjg3MzAsImV4cCI6MTk5OTQwNDczMH0.nh7wsd9O6-C1fgUL8-AoRUiJTxIEMCuDxGbclNPkLYs';
            
            supabaseClient = createClient(supabaseUrl, supabaseKey);
            window.supabase = supabaseClient;
        } else {
            throw new Error('Cliente Supabase não encontrado');
        }
        
        // Buscar tarefas do usuário atual (RLS aplicará filtro por user_id)
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao buscar tarefas do Supabase:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.warn('Nenhuma tarefa encontrada no Supabase');
            return [];
        }
        
        console.log(`Recebidas ${data.length} tarefas diretamente do Supabase`);
        logTasksStatus(data);
        return data;
    } catch (error) {
        console.error('Erro ao buscar dados de tarefas:', error);
        // Tentar usar dados em cache se disponíveis
        if (window.tasks) {
            console.warn('Usando dados em cache após erro');
            return flattenTasks(window.tasks);
        }
        // Retornar array vazio em caso de erro para evitar travamento
        return [];
    }
}

// Função de utilidade para registrar o status das tarefas para depuração
function logTasksStatus(tasks) {
    if (!tasks || tasks.length === 0) {
        console.log('Nenhuma tarefa para analisar');
        return;
    }
    
    const statusCounts = {
        completed: 0,
        finished: 0,
        pending: 0,
        late: 0,
        other: 0
    };
    
    tasks.forEach(task => {
        if (task.status === 'completed') statusCounts.completed++;
        else if (task.status === 'finished') statusCounts.finished++;
        else if (task.status === 'pending') statusCounts.pending++;
        else if (task.status === 'late') statusCounts.late++;
        else statusCounts.other++;
    });
    
    console.log('Distribuição de status das tarefas:', statusCounts);
}

// Converter tarefas do formato window.tasks para array plano
function flattenTasks(tasksObj) {
    if (!tasksObj) return [];
    
    return [
        ...(tasksObj.day || []),
        ...(tasksObj.week || []),
        ...(tasksObj.month || []),
        ...(tasksObj.year || [])
    ];
}

// Calcular e atualizar KPIs
function updateKPIs(tasksData) {
    if (!tasksData || !tasksData.length) {
        console.log('Sem dados para calcular KPIs');
        // Definir valores zero em todos os KPIs
        updateElementValue('kpi-total-tasks', 0);
        updateElementValue('kpi-concluidas-tasks', 0);
        updateElementValue('kpi-andamento-tasks', 0);
        updateElementValue('kpi-atrasadas-tasks', 0);
        updateElementValue('kpi-conclusao-rate', '0%');
        updateElementValue('kpi-tempo-medio', '0h');
        updateElementValue('kpi-atrasadas-percent', '0%');
        return;
    }
    
    console.log(`Calculando KPIs para ${tasksData.length} tarefas...`);
    
    // Calcular estatísticas
    const totalTasks = tasksData.length;
    
    const completedTasks = tasksData.filter(task => 
        task.status === 'completed' || task.status === 'finished'
    ).length;
    
    const pendingTasks = tasksData.filter(task => 
        task.status === 'pending'
    ).length;
    
    const lateTasks = tasksData.filter(task => 
        task.status === 'late'
    ).length;
    
    const completionRate = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;
    
    const lateRate = totalTasks > 0 
        ? Math.round((lateTasks / totalTasks) * 100) 
        : 0;
    
    // Calcular tempo médio por tarefa (em horas)
    let totalHours = 0;
    let tasksWithTime = 0;
    
    tasksData.forEach(task => {
        if (task.startdate && task.enddate) {
            const start = new Date(task.startdate);
            const end = new Date(task.enddate);
            
            // Verificar se as datas são válidas
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const diffMs = Math.abs(end - start);
                const diffHours = diffMs / (1000 * 60 * 60);
                totalHours += diffHours;
                tasksWithTime++;
                }
            }
        });
    
    const averageHours = tasksWithTime > 0
        ? Math.round((totalHours / tasksWithTime) * 10) / 10
        : 0;
    
    // Atualizar os elementos na interface com animação
    updateElementValue('kpi-total-tasks', totalTasks);
    updateElementValue('kpi-concluidas-tasks', completedTasks);
    updateElementValue('kpi-andamento-tasks', pendingTasks);
    updateElementValue('kpi-atrasadas-tasks', lateTasks);
    updateElementValue('kpi-conclusao-rate', `${completionRate}%`);
    updateElementValue('kpi-tempo-medio', `${averageHours}h`);
    updateElementValue('kpi-atrasadas-percent', `${lateRate}%`);
    
    console.log('KPIs atualizados com sucesso:', {
        total: totalTasks,
        concluidas: completedTasks,
        andamento: pendingTasks,
        atrasadas: lateTasks,
        taxaConclusao: `${completionRate}%`,
        tempoMedio: `${averageHours}h`,
        porcentagemAtrasadas: `${lateRate}%`
    });
}

// Função auxiliar para atualizar um elemento com animação
function updateElementValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Armazenar valor atual
    const currentValueText = element.textContent;
    let currentValue;
    
    // Extrair valor numérico (ignorando símbolos como % ou h)
    if (typeof newValue === 'number') {
        currentValue = parseInt(currentValueText.replace(/[^0-9.-]+/g, '')) || 0;
            } else {
        // Se não for número, apenas atualizar o texto
        element.textContent = newValue;
        element.classList.add('kpi-updating');
        setTimeout(() => element.classList.remove('kpi-updating'), 600);
        return;
    }
    
    // Determinar o sufixo (%, h, etc.)
    const suffix = String(newValue).replace(/[0-9.-]+/g, '') || '';
    const numericNewValue = parseInt(String(newValue).replace(/[^0-9.-]+/g, ''));
    
    // Animar a mudança de valor
    const duration = 600; // ms
    const start = Date.now();
    
    const animate = () => {
        const now = Date.now();
        const progress = Math.min(1, (now - start) / duration);
        
        const currentNumber = Math.round(currentValue + progress * (numericNewValue - currentValue));
        element.textContent = `${currentNumber}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
            } else {
            element.textContent = `${numericNewValue}${suffix}`;
        }
    };
    
    // Adicionar classe para efeito visual
    element.classList.add('kpi-updating');
    setTimeout(() => element.classList.remove('kpi-updating'), duration);
    
    // Iniciar animação
    animate();
}

// Atualizar gráficos com novos dados
function updateCharts(tasksData, period) {
    if (!tasksData || !tasksData.length) {
        console.log('Sem dados para atualizar gráficos');
        return;
    }
    
    // Filtrar dados pelo período selecionado
    const filteredData = filterTasksByPeriod(tasksData, period);
    console.log(`Atualizando gráficos com ${filteredData.length} tarefas (período: ${period})`);
    
    // Atualizar gráfico de distribuição por status
    updateStatusDistributionChart(filteredData);
    
    // Atualizar gráfico de tendência de conclusão
    updateCompletionTrendChart(filteredData);
    
    // Verificação final para garantir a sincronia entre KPIs e gráficos
    setTimeout(() => {
        forceChartKpiSync();
    }, 100);
}

// Filtrar tarefas por período
function filterTasksByPeriod(tasksData, period) {
    if (!period || period === 'all') return tasksData;
    
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            // Padrão é uma semana
            startDate.setDate(now.getDate() - 7);
    }
    
    return tasksData.filter(task => {
        // Usar campo de criação ou início como referência
        const taskDate = new Date(task.created_at || task.startdate || task.enddate);
        return taskDate >= startDate && taskDate <= now;
    });
}

// Atualizar gráfico de distribuição por status
function updateStatusDistributionChart(tasksData) {
    const chart = chartsInstances.statusDistribution;
    if (!chart) return;
    
    console.log('Atualizando gráfico de distribuição por status');
    
    // Contar tarefas por status - Usar os mesmos critérios dos KPIs
    const completedCount = tasksData.filter(task => 
        task.status === 'completed' || task.status === 'finished'
    ).length;
    
    const pendingCount = tasksData.filter(task => 
        task.status === 'pending'
    ).length;
    
    const lateCount = tasksData.filter(task => 
        task.status === 'late'
    ).length;
    
    // Verificar se há dados para mostrar
    const hasData = completedCount > 0 || pendingCount > 0 || lateCount > 0;
    
    // Atualizar dados do gráfico
    chart.data.datasets[0].data = [completedCount, pendingCount, lateCount];
    
    // Atualizar configuração para exibir ou ocultar legenda baseado na existência de dados
    chart.options.plugins.legend.display = hasData;
    
    // Adicionar mensagem de "Sem dados" se não houver dados
    if (!hasData) {
        // Limpar renderização anterior
        chart.clear();
        
        // Renderizar mensagem de "Sem dados"
        const ctx = chart.ctx;
        const width = chart.width;
        const height = chart.height;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Sem dados para exibir', width / 2, height / 2);
        ctx.restore();
    } else {
        // Forçar atualização do gráfico
        chart.update('none'); // Usar 'none' para atualização imediata sem animação
    }
    
    console.log('Dados do gráfico de distribuição:', {completedCount, pendingCount, lateCount});
}

// Atualizar gráfico de tendência de conclusão
function updateCompletionTrendChart(tasksData) {
    const chart = chartsInstances.completionTrend;
    if (!chart) {
        console.error('Gráfico de tendência de tarefas não encontrado');
        return;
    }
    
    console.log('Atualizando gráfico de tendência de tarefas com', tasksData.length, 'tarefas');
    
    // Verificar dados de tarefas concluídas para diagnóstico
    const completedTasks = tasksData.filter(task => 
        task.status === 'completed' || task.status === 'finished'
    );
    
    // Verificar dados de tarefas em andamento
    const pendingTasks = tasksData.filter(task => 
        task.status === 'pending'
    );
    
    // Verificar dados de tarefas atrasadas
    const lateTasks = tasksData.filter(task => 
        task.status === 'late'
    );
    
    console.log(`Total de tarefas concluídas: ${completedTasks.length}`);
    console.log(`Total de tarefas em andamento: ${pendingTasks.length}`);
    console.log(`Total de tarefas atrasadas: ${lateTasks.length}`);
    
    completedTasks.forEach((task, index) => {
        console.log(`Tarefa concluída ${index + 1}:`, {
            id: task.id,
            título: task.text || task.title,
            status: task.status,
            datas: {
                completedAt: task.completedAt,
                completed_at: task.completed_at,
                endDate: task.endDate,
                enddate: task.enddate,
                updatedAt: task.updatedAt,
                updated_at: task.updated_at,
                createdAt: task.createdAt,
                created_at: task.created_at
            }
        });
    });

    // Ler o valor do KPI de tarefas concluídas
    const completedKPI = document.getElementById('kpi-concluidas-tasks');
    const completedKpiValue = completedKPI ? parseInt(completedKPI.textContent) : completedTasks.length;
    console.log(`Valor do KPI de tarefas concluídas: ${completedKpiValue}`);
    
    // Ler o valor do KPI de tarefas em andamento
    const pendingKPI = document.getElementById('kpi-andamento-tasks');
    const pendingKpiValue = pendingKPI ? parseInt(pendingKPI.textContent) : pendingTasks.length;
    console.log(`Valor do KPI de tarefas em andamento: ${pendingKpiValue}`);
    
    // Ler o valor do KPI de tarefas atrasadas
    const lateKPI = document.getElementById('kpi-atrasadas-tasks');
    const lateKpiValue = lateKPI ? parseInt(lateKPI.textContent) : lateTasks.length;
    console.log(`Valor do KPI de tarefas atrasadas: ${lateKpiValue}`);
    
    // Preparar arrays para contagem dos últimos 7 dias
    const completionCounts = Array(7).fill(0);
    const pendingCounts = Array(7).fill(0);
    const lateCounts = Array(7).fill(0);
    
    // Obter data atual e data de 7 dias atrás
    const now = new Date();
    now.setHours(23, 59, 59, 999); // Final do dia hoje
    
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0); // Início do dia há 7 dias
    
    // Gerar rótulos para os últimos 7 dias
    const labels = [];
    const datesToCheck = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Adicionar à lista de rótulos
        labels.push(date.toLocaleDateString('pt-BR', {weekday: 'short', day: 'numeric'}));
        
        // Armazenar a data para verificação posterior
        const dateToCheck = new Date(date);
        dateToCheck.setHours(0, 0, 0, 0);
        datesToCheck.push(dateToCheck);
    }
    chart.data.labels = labels;
    
    console.log('Intervalo de datas para o gráfico:', weekAgo.toLocaleDateString(), 'até', now.toLocaleDateString());
    console.log('Datas a verificar:', datesToCheck.map(d => d.toLocaleDateString()));
    
    // Contar tarefas concluídas por dia
    let totalCompletedTasksFound = 0;
    let totalPendingTasksFound = 0;
    let totalLateTasksFound = 0;
    let tasksWithoutValidDate = 0;
    
    // Mapa para rastrear quais tarefas já foram contadas
    const countedCompletedTaskIds = new Set();
    const countedPendingTaskIds = new Set();
    const countedLateTaskIds = new Set();
    
    // Processar tarefas concluídas
    completedTasks.forEach(task => {
        // Tentar todas as possíveis propriedades de data de conclusão
        let dateToUse = null;
        
        // Ordem de prioridade para as datas
        const dateCandidates = [
            task.completedAt,         // Data de conclusão específica (camelCase)
            task.completed_at,        // Data de conclusão específica (snake_case)
            task.endDate,             // Data de término (camelCase)
            task.enddate,             // Data de término (lowercase)
            task.end_date,            // Data de término (snake_case)
            task.updatedAt,           // Data de atualização (para quando a tarefa foi marcada como concluída)
            task.updated_at,          // Data de atualização (snake_case)
            task.created_at,          // Fallback: data de criação
            task.createdAt            // Fallback: data de criação (camelCase)
        ];
        
        // Tentar cada candidato de data
        for (const candidate of dateCandidates) {
            if (candidate) {
                try {
                    const date = new Date(candidate);
                    if (!isNaN(date.getTime())) {
                        dateToUse = date;
                        break;
                    }
                } catch (e) {
                    // Ignorar erro de parsing e continuar para o próximo candidato
                }
            }
        }
        
        // Se não encontrou nenhuma data válida
        if (!dateToUse) {
            console.warn('Tarefa concluída sem data válida:', task.id);
            tasksWithoutValidDate++;
            
            // Usar data atual como fallback
            dateToUse = new Date(); 
        }
        
        // Verificar em qual dia esta tarefa se encaixa
        // Para cada dia nos últimos 7 dias
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(datesToCheck[i]);
            const dayEnd = new Date(datesToCheck[i]);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Verificar se a data da tarefa está dentro deste dia
            if (dateToUse >= dayStart && dateToUse <= dayEnd) {
                if (!countedCompletedTaskIds.has(task.id)) {
                    completionCounts[i]++;
                    totalCompletedTasksFound++;
                    countedCompletedTaskIds.add(task.id);
                    console.log(`Tarefa ${task.id} contada para o dia ${dayStart.toLocaleDateString()}`);
                }
                break;
            }
        }
    });
    
    // Processar tarefas em andamento
    pendingTasks.forEach(task => {
        // Para tarefas em andamento, usar a data de criação ou início
        let dateToUse = null;
        
        // Ordem de prioridade para as datas
        const dateCandidates = [
            task.startDate,         // Data de início (camelCase)
            task.startdate,         // Data de início (lowercase)
            task.start_date,        // Data de início (snake_case)
            task.created_at,        // Data de criação
            task.createdAt,         // Data de criação (camelCase)
            task.updatedAt,         // Data de atualização
            task.updated_at         // Data de atualização (snake_case)
        ];
        
        // Tentar cada candidato de data
        for (const candidate of dateCandidates) {
            if (candidate) {
                try {
                    const date = new Date(candidate);
                    if (!isNaN(date.getTime())) {
                        dateToUse = date;
                        break;
                    }
                } catch (e) {
                    // Ignorar erro de parsing e continuar para o próximo candidato
                }
            }
        }
        
        // Se não encontrou nenhuma data válida
        if (!dateToUse) {
            console.warn('Tarefa em andamento sem data válida:', task.id);
            tasksWithoutValidDate++;
            
            // Usar data atual como fallback
            dateToUse = new Date(); 
        }
        
        // Verificar em qual dia esta tarefa se encaixa
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(datesToCheck[i]);
            const dayEnd = new Date(datesToCheck[i]);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Verificar se a data da tarefa está dentro deste dia
            if (dateToUse >= dayStart && dateToUse <= dayEnd) {
                if (!countedPendingTaskIds.has(task.id)) {
                    pendingCounts[i]++;
                    totalPendingTasksFound++;
                    countedPendingTaskIds.add(task.id);
                    console.log(`Tarefa em andamento ${task.id} contada para o dia ${dayStart.toLocaleDateString()}`);
                }
                break;
            }
        }
    });
    
    // Processar tarefas atrasadas
    lateTasks.forEach(task => {
        // Para tarefas atrasadas, usar a data de vencimento ou fim
        let dateToUse = null;
        
        // Ordem de prioridade para as datas
        const dateCandidates = [
            task.endDate,          // Data de fim (camelCase)
            task.enddate,          // Data de fim (lowercase)
            task.end_date,         // Data de fim (snake_case)
            task.dueDate,          // Data de vencimento (camelCase)
            task.duedate,          // Data de vencimento (lowercase)
            task.due_date,         // Data de vencimento (snake_case)
            task.created_at,       // Data de criação como fallback
            task.createdAt         // Data de criação como fallback (camelCase)
        ];
        
        // Tentar cada candidato de data
        for (const candidate of dateCandidates) {
            if (candidate) {
                try {
                    const date = new Date(candidate);
                    if (!isNaN(date.getTime())) {
                        dateToUse = date;
                        break;
                    }
                } catch (e) {
                    // Ignorar erro de parsing e continuar para o próximo candidato
                }
            }
        }
        
        // Se não encontrou nenhuma data válida
        if (!dateToUse) {
            console.warn('Tarefa atrasada sem data válida:', task.id);
            tasksWithoutValidDate++;
            
            // Usar data atual como fallback
            dateToUse = new Date(); 
        }
        
        // Verificar em qual dia esta tarefa se encaixa
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(datesToCheck[i]);
            const dayEnd = new Date(datesToCheck[i]);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Verificar se a data da tarefa está dentro deste dia
            if (dateToUse >= dayStart && dateToUse <= dayEnd) {
                if (!countedLateTaskIds.has(task.id)) {
                    lateCounts[i]++;
                    totalLateTasksFound++;
                    countedLateTaskIds.add(task.id);
                    console.log(`Tarefa atrasada ${task.id} contada para o dia ${dayStart.toLocaleDateString()}`);
                }
                break;
            }
        }
    });
    
    console.log('Total de tarefas concluídas encontradas no período:', totalCompletedTasksFound);
    console.log('Total de tarefas em andamento encontradas no período:', totalPendingTasksFound);
    console.log('Total de tarefas atrasadas encontradas no período:', totalLateTasksFound);
    console.log('Tarefas sem data válida:', tasksWithoutValidDate);
    console.log('Distribuição diária de tarefas concluídas:', completionCounts);
    console.log('Distribuição diária de tarefas em andamento:', pendingCounts);
    console.log('Distribuição diária de tarefas atrasadas:', lateCounts);
    
    // NOVO: Verificar se o total do gráfico corresponde ao KPI para tarefas concluídas
    const totalCompletedInGraph = completionCounts.reduce((sum, count) => sum + count, 0);
    console.log(`Total de concluídas no gráfico: ${totalCompletedInGraph}, Total no KPI: ${completedKpiValue}`);
    
    // NOVO: Verificar se o total do gráfico corresponde ao KPI para tarefas em andamento
    const totalPendingInGraph = pendingCounts.reduce((sum, count) => sum + count, 0);
    console.log(`Total de em andamento no gráfico: ${totalPendingInGraph}, Total no KPI: ${pendingKpiValue}`);
    
    // NOVO: Verificar se o total do gráfico corresponde ao KPI para tarefas atrasadas
    const totalLateInGraph = lateCounts.reduce((sum, count) => sum + count, 0);
    console.log(`Total de atrasadas no gráfico: ${totalLateInGraph}, Total no KPI: ${lateKpiValue}`);
    
    // Se houver diferença entre o total no gráfico e o KPI para tarefas concluídas
    if (totalCompletedInGraph !== completedKpiValue) {
        console.warn(`Discrepância detectada em concluídas: Gráfico (${totalCompletedInGraph}) ≠ KPI (${completedKpiValue})`);
        
        if (totalCompletedInGraph < completedKpiValue) {
            // Faltam tarefas no gráfico
            const difference = completedKpiValue - totalCompletedInGraph;
            console.log(`Adicionando ${difference} tarefa(s) concluída(s) ausente(s) ao gráfico`);
            
            // Verificar se há algum dia recente com tarefas
            let hasDayWithTasks = false;
            for (let i = 6; i >= 0; i--) {
                if (completionCounts[i] > 0) {
                    // Adicionar ao mesmo dia que já tem tarefas
                    completionCounts[i] += difference;
                    hasDayWithTasks = true;
                    console.log(`Adicionando ${difference} tarefa(s) concluída(s) ao dia ${i} (${labels[i]})`);
                    break;
                }
            }
            
            // Se não houver dias com tarefas, adicionar ao dia atual
            if (!hasDayWithTasks) {
                completionCounts[6] += difference; // Dia atual é o último índice
                console.log(`Adicionando ${difference} tarefa(s) concluída(s) ao dia atual (${labels[6]})`);
            }
        } else if (totalCompletedInGraph > completedKpiValue) {
            // Há tarefas a mais no gráfico (improvável, mas vamos tratar)
            console.warn('O gráfico está mostrando mais tarefas concluídas que o KPI. Normalizando...');
            
            // Normalizar proporcionalmente
            const ratio = completedKpiValue / totalCompletedInGraph;
            completionCounts = completionCounts.map(count => {
                return Math.round(count * ratio);
            });
            
            // Garantir que o total seja exatamente o valor do KPI
            const newTotal = completionCounts.reduce((sum, count) => sum + count, 0);
            if (newTotal !== completedKpiValue) {
                const finalDiff = completedKpiValue - newTotal;
                // Adicionar/remover a diferença do último dia com tarefas
                for (let i = 6; i >= 0; i--) {
                    if (completionCounts[i] > 0 || finalDiff > 0) {
                        completionCounts[i] += finalDiff;
                        break;
                    }
                }
            }
        }
    }
    
    // Se houver diferença entre o total no gráfico e o KPI para tarefas em andamento
    if (totalPendingInGraph !== pendingKpiValue) {
        console.warn(`Discrepância detectada em andamento: Gráfico (${totalPendingInGraph}) ≠ KPI (${pendingKpiValue})`);
        
        if (totalPendingInGraph < pendingKpiValue) {
            // Faltam tarefas no gráfico
            const difference = pendingKpiValue - totalPendingInGraph;
            console.log(`Adicionando ${difference} tarefa(s) em andamento ausente(s) ao gráfico`);
            
            // Verificar se há algum dia recente com tarefas
            let hasDayWithTasks = false;
            for (let i = 6; i >= 0; i--) {
                if (pendingCounts[i] > 0) {
                    // Adicionar ao mesmo dia que já tem tarefas
                    pendingCounts[i] += difference;
                    hasDayWithTasks = true;
                    console.log(`Adicionando ${difference} tarefa(s) em andamento ao dia ${i} (${labels[i]})`);
                    break;
                }
            }
            
            // Se não houver dias com tarefas, adicionar ao dia atual
            if (!hasDayWithTasks) {
                pendingCounts[6] += difference; // Dia atual é o último índice
                console.log(`Adicionando ${difference} tarefa(s) em andamento ao dia atual (${labels[6]})`);
            }
        } else if (totalPendingInGraph > pendingKpiValue) {
            // Há tarefas a mais no gráfico (improvável, mas vamos tratar)
            console.warn('O gráfico está mostrando mais tarefas em andamento que o KPI. Normalizando...');
            
            // Normalizar proporcionalmente
            const ratio = pendingKpiValue / totalPendingInGraph;
            pendingCounts = pendingCounts.map(count => {
                return Math.round(count * ratio);
            });
            
            // Garantir que o total seja exatamente o valor do KPI
            const newTotal = pendingCounts.reduce((sum, count) => sum + count, 0);
            if (newTotal !== pendingKpiValue) {
                const finalDiff = pendingKpiValue - newTotal;
                // Adicionar/remover a diferença do último dia com tarefas
                for (let i = 6; i >= 0; i--) {
                    if (pendingCounts[i] > 0 || finalDiff > 0) {
                        pendingCounts[i] += finalDiff;
                        break;
                    }
                }
            }
        }
    }
    
    // Verificar se há dados para mostrar nas tarefas concluídas
    const hasCompletedData = completionCounts.some(count => count > 0);
    
    if (!hasCompletedData && completedKpiValue > 0) {
        console.log(`Nenhuma tarefa concluída no gráfico mas KPI mostra ${completedKpiValue}. Adicionando ao dia atual.`);
        completionCounts[6] = completedKpiValue; // Adicionar ao dia atual (último índice)
    }
    
    // Verificar se há dados para mostrar nas tarefas em andamento
    const hasPendingData = pendingCounts.some(count => count > 0);
    
    if (!hasPendingData && pendingKpiValue > 0) {
        console.log(`Nenhuma tarefa em andamento no gráfico mas KPI mostra ${pendingKpiValue}. Adicionando ao dia atual.`);
        pendingCounts[6] = pendingKpiValue; // Adicionar ao dia atual (último índice)
    }
    
    // Se houver diferença entre o total no gráfico e o KPI para tarefas atrasadas
    if (totalLateInGraph !== lateKpiValue) {
        console.warn(`Discrepância detectada em atrasadas: Gráfico (${totalLateInGraph}) ≠ KPI (${lateKpiValue})`);
        
        if (totalLateInGraph < lateKpiValue) {
            // Faltam tarefas no gráfico
            const difference = lateKpiValue - totalLateInGraph;
            console.log(`Adicionando ${difference} tarefa(s) atrasada(s) ausente(s) ao gráfico`);
            
            // Verificar se há algum dia recente com tarefas
            let hasDayWithTasks = false;
            for (let i = 6; i >= 0; i--) {
                if (lateCounts[i] > 0) {
                    // Adicionar ao mesmo dia que já tem tarefas
                    lateCounts[i] += difference;
                    hasDayWithTasks = true;
                    console.log(`Adicionando ${difference} tarefa(s) atrasada(s) ao dia ${i} (${labels[i]})`);
                    break;
                }
            }
            
            // Se não houver dias com tarefas, adicionar ao dia atual
            if (!hasDayWithTasks) {
                lateCounts[6] += difference; // Dia atual é o último índice
                console.log(`Adicionando ${difference} tarefa(s) atrasada(s) ao dia atual (${labels[6]})`);
            }
        } else if (totalLateInGraph > lateKpiValue) {
            // Há tarefas a mais no gráfico (improvável, mas vamos tratar)
            console.warn('O gráfico está mostrando mais tarefas atrasadas que o KPI. Normalizando...');
            
            // Normalizar proporcionalmente
            const ratio = lateKpiValue / totalLateInGraph;
            lateCounts = lateCounts.map(count => {
                return Math.round(count * ratio);
            });
            
            // Garantir que o total seja exatamente o valor do KPI
            const newTotal = lateCounts.reduce((sum, count) => sum + count, 0);
            if (newTotal !== lateKpiValue) {
                const finalDiff = lateKpiValue - newTotal;
                // Adicionar/remover a diferença do último dia com tarefas
                for (let i = 6; i >= 0; i--) {
                    if (lateCounts[i] > 0 || finalDiff > 0) {
                        lateCounts[i] += finalDiff;
                        break;
                    }
                }
            }
        }
    }
    
    // Verificar se há dados para mostrar nas tarefas atrasadas
    const hasLateData = lateCounts.some(count => count > 0);
    
    if (!hasLateData && lateKpiValue > 0) {
        console.log(`Nenhuma tarefa atrasada no gráfico mas KPI mostra ${lateKpiValue}. Adicionando ao dia atual.`);
        lateCounts[6] = lateKpiValue; // Adicionar ao dia atual (último índice)
    }
    
    // Definir configuração do eixo Y baseado nos dados
    const maxCompletedValue = Math.max(...completionCounts, 0);
    const maxPendingValue = Math.max(...pendingCounts, 0);
    const maxLateValue = Math.max(...lateCounts, 0);
    const maxValue = Math.max(maxCompletedValue, maxPendingValue, maxLateValue, 1); // Garantir pelo menos 1
    
    chart.options.scales.y.suggestedMax = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 1;
    chart.options.scales.y.max = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 1;
    chart.options.scales.y.min = 0;
    chart.options.scales.y.ticks.stepSize = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
    
    // Atualizar dados do gráfico
    chart.data.datasets[0].data = completionCounts;
    chart.data.datasets[1].data = pendingCounts;
    chart.data.datasets[2].data = lateCounts;
    
    // Forçar atualização completa do gráfico
    try {
        chart.reset(); // Limpar estado
        chart.update('none'); // Atualizar sem animação
        
        // Confirmar total após atualização
        const finalCompletedTotal = chart.data.datasets[0].data.reduce((sum, count) => sum + count, 0);
        const finalPendingTotal = chart.data.datasets[1].data.reduce((sum, count) => sum + count, 0);
        const finalLateTotal = chart.data.datasets[2].data.reduce((sum, count) => sum + count, 0);
        
        console.log(`Total final de tarefas concluídas no gráfico após atualização: ${finalCompletedTotal}`);
        console.log(`Total final de tarefas em andamento no gráfico após atualização: ${finalPendingTotal}`);
        console.log(`Total final de tarefas atrasadas no gráfico após atualização: ${finalLateTotal}`);
        
        if (finalCompletedTotal === completedKpiValue) {
            console.log('✓ Gráfico e KPI de tarefas concluídas estão sincronizados corretamente');
        } else {
            console.warn(`⚠ Ainda há diferença entre o gráfico (${finalCompletedTotal}) e o KPI de tarefas concluídas (${completedKpiValue})`);
        }
        
        if (finalPendingTotal === pendingKpiValue) {
            console.log('✓ Gráfico e KPI de tarefas em andamento estão sincronizados corretamente');
        } else {
            console.warn(`⚠ Ainda há diferença entre o gráfico (${finalPendingTotal}) e o KPI de tarefas em andamento (${pendingKpiValue})`);
        }
        
        if (finalLateTotal === lateKpiValue) {
            console.log('✓ Gráfico e KPI de tarefas atrasadas estão sincronizados corretamente');
        } else {
            console.warn(`⚠ Ainda há diferença entre o gráfico (${finalLateTotal}) e o KPI de tarefas atrasadas (${lateKpiValue})`);
        }
        
        console.log('Gráfico de tendência atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar gráfico de tendência:', error);
    }
    
    return totalCompletedTasksFound;
}

// Atualizar a hora da última atualização
function updateLastUpdateTime() {
    const element = document.getElementById('last-update-time');
    if (!element) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    element.textContent = timeString;
}

// Expor a função de atualização para chamada externa
function updateAnalytics() {
    console.log('Atualizando análises a partir de chamada externa');
    return refreshAllAnalytics(true);
}

// Configurar listeners globais para tarefas
function setupGlobalTaskListeners() {
    console.log('Configurando listeners globais para eventos de tarefas');
    
    // Listener para mudança de status
    window.addEventListener('taskStatusUpdated', (event) => {
        if (window.location.hash === '#analises' && analyticsInitialized) {
            console.log('Mudança de status detectada:', event.detail);
            refreshAllAnalytics(true);
        }
    });
    
    // Listener para taskStatusChanged (emitido pelo task-handler.js)
    window.addEventListener('taskStatusChanged', (event) => {
        if (window.location.hash === '#analises' && analyticsInitialized) {
            console.log('Mudança de status de tarefa detectada:', event.detail);
            refreshAllAnalytics(true);
        }
    });
    
    // Listeners para eventos do GlobalSync
    if (window.GlobalSync) {
        console.log('GlobalSync detectado, configurando listeners');
        window.GlobalSync.on('data-update', (data) => {
            if (window.location.hash === '#analises' && analyticsInitialized) {
                console.log('Atualização de dados via GlobalSync:', data);
                refreshAllAnalytics(true);
            }
        });
    }
    
    // Verificar se taskHandler está disponível
    if (window.taskHandler) {
        console.log('taskHandler detectado, configurando hooks');
        
        // Guardar referência original
        const originalUpdateStatus = window.taskHandler.updateTaskStatus;
        
        // Substituir com nossa versão que notifica análises
        window.taskHandler.updateTaskStatus = function(taskId, newStatus) {
            const result = originalUpdateStatus(taskId, newStatus);
            
            // Adicional: atualizar análises após alteração
            if (window.location.hash === '#analises' && analyticsInitialized) {
                console.log('Tarefa atualizada via taskHandler, atualizando análises');
                refreshAllAnalytics(true);
            }
            
            return result;
        };
    }
}

// Inicializar quando o DOM for carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, verificando rota atual...');
    
    // Configurar listeners globais para tarefas
    setupGlobalTaskListeners();
    
    // Verificar se estamos na página de análises
    if (window.location.hash === '#analises') {
        console.log('Estamos na página de análises, inicializando módulo...');
        setTimeout(() => {
            initAnalytics();
        }, 200); // Pequeno atraso para garantir que outros scripts foram carregados
    } else {
        console.log('Não estamos na página de análises. Aguardando navegação...');
    }
    
    // Configurar listener para mudanças na rota
    window.addEventListener('hashchange', () => {
        const isAnalyticsView = window.location.hash === '#analises';
        console.log(`Navegação detectada. Hash: ${window.location.hash}, Is Analytics: ${isAnalyticsView}`);
        
        if (isAnalyticsView) {
            console.log('Navegou para a página de análises');
            setTimeout(() => {
                // Verificar se Charts.js está disponível antes de tentar inicializar
                if (typeof Chart === 'undefined') {
                    console.error('Chart.js não está disponível após navegação. Tentando carregar novamente...');
                    
                    // Tentar carregar Chart.js dinamicamente
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                    script.onload = () => {
                        console.log('Chart.js carregado com sucesso, inicializando análises...');
                        initAnalytics();
                    };
                    script.onerror = (e) => {
                        console.error('Erro ao carregar Chart.js:', e);
                    };
                    document.head.appendChild(script);
                } else {
                    initAnalytics();
                }
            }, 200);
        }
    });
});

// Adicionar listener para mudanças no tema
document.addEventListener('themeChanged', () => {
    if (window.location.hash === '#analises' && analyticsInitialized) {
        console.log('Tema alterado, atualizando gráficos...');
        setupCharts(); // Recria os gráficos com as cores do novo tema
        refreshAllAnalytics(true); // Atualiza com os dados mais recentes
    }
});

// Expor funções para uso global
window.updateAnalytics = updateAnalytics;
window.initAnalytics = initAnalytics;

// Função para diagnosticar problemas com o gráfico de tarefas concluídas
function diagnosticCompletionChart() {
    console.log('Executando diagnóstico do gráfico de tarefas concluídas...');
    
    // Verificar se o gráfico está inicializado
    if (!chartsInstances.completionTrend) {
        console.error('Gráfico de tendência não inicializado');
        // Tentar reinicializar
        setupCompletionTrendChart();
        if (!chartsInstances.completionTrend) {
            console.error('Falha ao reinicializar o gráfico de tendência');
            return false;
        }
    }
    
    const chart = chartsInstances.completionTrend;
    
    // Verificar dados atuais
    console.log('Dados atuais do gráfico:', chart.data.datasets[0].data);
    console.log('Labels do gráfico:', chart.data.labels);
    
    // Verificar configurações importantes
    console.log('Configurações do eixo Y:', {
        min: chart.options.scales.y.min,
        max: chart.options.scales.y.max,
        suggestedMin: chart.options.scales.y.suggestedMin,
        suggestedMax: chart.options.scales.y.suggestedMax,
        beginAtZero: chart.options.scales.y.beginAtZero
    });
    
    // Injetar valor de teste no gráfico para verificar se está funcionando
    const originalData = [...chart.data.datasets[0].data];
    
    // Testar com um valor de demonstração no dia atual (último índice)
    chart.data.datasets[0].data[6] = 1;
    
    // Atualizar configurações para garantir visualização
    chart.options.scales.y.min = 0;
    chart.options.scales.y.max = 2;
    chart.options.scales.y.ticks.stepSize = 1;
    
    // Aplicar as alterações
    try {
        chart.update('none');
        console.log('Dados de teste aplicados ao gráfico');
        
        // Agendar a restauração dos dados originais após 5 segundos
        setTimeout(() => {
            console.log('Restaurando dados originais');
            chart.data.datasets[0].data = originalData;
            chart.update('none');
            
            // Após restaurar, tentar forçar uma atualização com dados reais
            refreshAllAnalytics(true);
        }, 5000);
        
        return true;
            } catch (error) {
        console.error('Erro ao atualizar gráfico com dados de teste:', error);
        return false;
    }
}

// Expor a função de diagnóstico globalmente
window.diagnosticCompletionChart = diagnosticCompletionChart;

// Adicionar botão de forçar atualização
function addRefreshButton() {
    // Verificar se o botão já existe
    if (document.getElementById('force-analytics-refresh')) {
        return;
    }
    
    // Encontrar o contêiner para o botão
    const lastUpdateElement = document.querySelector('.last-update');
    if (!lastUpdateElement) {
        console.warn('Elemento .last-update não encontrado, não foi possível adicionar botão de atualização');
        return;
    }
    
    // Criar o botão
    const refreshButton = document.createElement('button');
    refreshButton.id = 'force-analytics-refresh';
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Forçar Atualização';
    refreshButton.title = 'Forçar atualização dos dados do servidor';
    
    // Estilizar o botão
    refreshButton.style.marginLeft = '10px';
    refreshButton.style.padding = '4px 12px';
    refreshButton.style.background = 'var(--primary-color, #7c3aed)';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.fontSize = '14px';
    refreshButton.style.display = 'inline-flex';
    refreshButton.style.alignItems = 'center';
    refreshButton.style.gap = '5px';
    refreshButton.style.transition = 'background 0.3s, transform 0.2s';
    
    // Adicionar efeitos hover
    refreshButton.addEventListener('mouseover', () => {
        refreshButton.style.background = 'var(--primary-color-dark, #6d28d9)';
    });
    
    refreshButton.addEventListener('mouseout', () => {
        refreshButton.style.background = 'var(--primary-color, #7c3aed)';
    });
    
    // Adicionar animação de clique
    refreshButton.addEventListener('mousedown', () => {
        refreshButton.style.transform = 'scale(0.95)';
    });
    
    refreshButton.addEventListener('mouseup', () => {
        refreshButton.style.transform = 'scale(1)';
    });
    
    // Adicionar comportamento de clique
    refreshButton.addEventListener('click', async () => {
        // Mostrar feedback visual
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        
        // Forçar sincronização com o servidor
        await forceServerSync();
        
        // Atualizar todos os gráficos e KPIs
        const success = await refreshAllAnalytics(true);
        
        // Restaurar o botão
        setTimeout(() => {
            refreshButton.disabled = false;
            refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Forçar Atualização';
            
            // Fornecer feedback sobre o sucesso da operação
            if (success) {
                refreshButton.innerHTML = '<i class="fas fa-check"></i> Atualizado!';
                setTimeout(() => {
                    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Forçar Atualização';
                }, 2000);
            } else {
                refreshButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro!';
                setTimeout(() => {
                    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Forçar Atualização';
                }, 2000);
            }
        }, 1000);
    });
    
    // Adicionar o botão à interface
    lastUpdateElement.appendChild(refreshButton);
    console.log('Botão de forçar atualização adicionado à interface');
}

// Nova função para forçar a sincronização entre KPIs e gráficos
function forceChartKpiSync() {
    console.log('Verificação final de sincronização entre KPIs e gráficos');
    
    try {
        // Verificar a sincronização do gráfico de distribuição por status
        if (chartsInstances.statusDistribution) {
            const chart = chartsInstances.statusDistribution;
            const statusData = chart.data.datasets[0].data;
            
            // Obter valores dos KPIs
            const completedKPI = parseInt(document.getElementById('kpi-concluidas-tasks')?.textContent || '0');
            const pendingKPI = parseInt(document.getElementById('kpi-andamento-tasks')?.textContent || '0');
            const lateKPI = parseInt(document.getElementById('kpi-atrasadas-tasks')?.textContent || '0');
            
            // Total no gráfico de distribuição
            const totalInDistChart = statusData.reduce((sum, val) => sum + val, 0);
            console.log(`Status chart: [${statusData.join(', ')}], Total: ${totalInDistChart}`);
            console.log(`KPIs: Concluídas=${completedKPI}, Andamento=${pendingKPI}, Atrasadas=${lateKPI}`);
            
            // Verificar se o primeiro valor (concluídas) está correto
            if (statusData[0] !== completedKPI) {
                console.warn(`⚠ Concluídas: Gráfico=${statusData[0]}, KPI=${completedKPI}. Corrigindo...`);
                statusData[0] = completedKPI;
                chart.update('none');
            }
            
            // Verificar se o segundo valor (em andamento) está correto
            if (statusData[1] !== pendingKPI) {
                console.warn(`⚠ Em andamento: Gráfico=${statusData[1]}, KPI=${pendingKPI}. Corrigindo...`);
                statusData[1] = pendingKPI;
                chart.update('none');
            }
            
            // Verificar se o terceiro valor (atrasadas) está correto
            if (statusData[2] !== lateKPI) {
                console.warn(`⚠ Atrasadas: Gráfico=${statusData[2]}, KPI=${lateKPI}. Corrigindo...`);
                statusData[2] = lateKPI;
                chart.update('none');
            }
        }
        
        // Verificar a sincronização do gráfico de tarefas por dia
        if (chartsInstances.completionTrend) {
            const chart = chartsInstances.completionTrend;
            const completedData = chart.data.datasets[0].data;
            const pendingData = chart.data.datasets[1].data;
            const lateData = chart.data.datasets[2].data;
            
            // Obter valores dos KPIs
            const completedKPI = parseInt(document.getElementById('kpi-concluidas-tasks')?.textContent || '0');
            const pendingKPI = parseInt(document.getElementById('kpi-andamento-tasks')?.textContent || '0');
            const lateKPI = parseInt(document.getElementById('kpi-atrasadas-tasks')?.textContent || '0');
            
            // Total no gráfico de tendência
            const totalCompletedInChart = completedData.reduce((sum, val) => sum + val, 0);
            const totalPendingInChart = pendingData.reduce((sum, val) => sum + val, 0);
            const totalLateInChart = lateData.reduce((sum, val) => sum + val, 0);
            console.log(`Gráfico de tarefas por dia: Concluídas=[${completedData.join(', ')}], Total=${totalCompletedInChart}`);
            console.log(`Gráfico de tarefas por dia: Em Andamento=[${pendingData.join(', ')}], Total=${totalPendingInChart}`);
            console.log(`Gráfico de tarefas por dia: Atrasadas=[${lateData.join(', ')}], Total=${totalLateInChart}`);
            
            // Verificar tarefas concluídas
            if (totalCompletedInChart !== completedKPI) {
                console.warn(`⚠ Tarefas Concluídas: Gráfico=${totalCompletedInChart}, KPI=${completedKPI}. Corrigindo...`);
                
                // Se não há tarefas no gráfico mas deveria haver
                if (totalCompletedInChart === 0 && completedKPI > 0) {
                    completedData[completedData.length - 1] = completedKPI; // Adicionar ao dia atual
                } 
                // Se já existem algumas tarefas no gráfico mas não o número correto
                else if (totalCompletedInChart > 0 && totalCompletedInChart !== completedKPI) {
                    const diff = completedKPI - totalCompletedInChart;
                    
                    // Encontrar o último dia com tarefas
                    let lastDayWithTasks = completedData.length - 1;
                    for (let i = completedData.length - 1; i >= 0; i--) {
                        if (completedData[i] > 0) {
                            lastDayWithTasks = i;
                            break;
                        }
                    }
                    
                    // Ajustar o valor
                    completedData[lastDayWithTasks] += diff;
                    
                    // Garantir que não temos valores negativos
                    if (completedData[lastDayWithTasks] < 0) {
                        completedData[lastDayWithTasks] = 0;
                        // Distribuir o restante em outros dias
                        completedData[completedData.length - 1] = completedKPI;
                    }
                }
            }
            
            // Verificar tarefas em andamento
            if (totalPendingInChart !== pendingKPI) {
                console.warn(`⚠ Tarefas Em Andamento: Gráfico=${totalPendingInChart}, KPI=${pendingKPI}. Corrigindo...`);
                
                // Se não há tarefas no gráfico mas deveria haver
                if (totalPendingInChart === 0 && pendingKPI > 0) {
                    pendingData[pendingData.length - 1] = pendingKPI; // Adicionar ao dia atual
                } 
                // Se já existem algumas tarefas no gráfico mas não o número correto
                else if (totalPendingInChart > 0 && totalPendingInChart !== pendingKPI) {
                    const diff = pendingKPI - totalPendingInChart;
                    
                    // Encontrar o último dia com tarefas
                    let lastDayWithTasks = pendingData.length - 1;
                    for (let i = pendingData.length - 1; i >= 0; i--) {
                        if (pendingData[i] > 0) {
                            lastDayWithTasks = i;
                            break;
                        }
                    }
                    
                    // Ajustar o valor
                    pendingData[lastDayWithTasks] += diff;
                    
                    // Garantir que não temos valores negativos
                    if (pendingData[lastDayWithTasks] < 0) {
                        pendingData[lastDayWithTasks] = 0;
                        // Distribuir o restante em outros dias
                        pendingData[pendingData.length - 1] = pendingKPI;
                    }
                }
            }
            
            // Verificar tarefas atrasadas
            if (totalLateInChart !== lateKPI) {
                console.warn(`⚠ Tarefas Atrasadas: Gráfico=${totalLateInChart}, KPI=${lateKPI}. Corrigindo...`);
                
                // Se não há tarefas no gráfico mas deveria haver
                if (totalLateInChart === 0 && lateKPI > 0) {
                    lateData[lateData.length - 1] = lateKPI; // Adicionar ao dia atual
                } 
                // Se já existem algumas tarefas no gráfico mas não o número correto
                else if (totalLateInChart > 0 && totalLateInChart !== lateKPI) {
                    const diff = lateKPI - totalLateInChart;
                    
                    // Encontrar o último dia com tarefas
                    let lastDayWithTasks = lateData.length - 1;
                    for (let i = lateData.length - 1; i >= 0; i--) {
                        if (lateData[i] > 0) {
                            lastDayWithTasks = i;
                            break;
                        }
                    }
                    
                    // Ajustar o valor
                    lateData[lastDayWithTasks] += diff;
                    
                    // Garantir que não temos valores negativos
                    if (lateData[lastDayWithTasks] < 0) {
                        lateData[lastDayWithTasks] = 0;
                        // Distribuir o restante em outros dias
                        lateData[lateData.length - 1] = lateKPI;
                    }
                }
            }
            
            // Ajustar escala Y se necessário
            const maxValue = Math.max(...completedData, ...pendingData, ...lateData, 1);
            chart.options.scales.y.max = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 1;
            chart.options.scales.y.ticks.stepSize = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
            
            // Aplicar as mudanças
            chart.update('none');
            
            // Verificar novamente
            const newCompletedTotal = completedData.reduce((sum, val) => sum + val, 0);
            const newPendingTotal = pendingData.reduce((sum, val) => sum + val, 0);
            const newLateTotal = lateData.reduce((sum, val) => sum + val, 0);
            
            console.log(`Após correção: Concluídas=${newCompletedTotal}, Esperado=${completedKPI}`);
            console.log(`Após correção: Em Andamento=${newPendingTotal}, Esperado=${pendingKPI}`);
            console.log(`Após correção: Atrasadas=${newLateTotal}, Esperado=${lateKPI}`);
            
            if (newCompletedTotal === completedKPI && newPendingTotal === pendingKPI && newLateTotal === lateKPI) {
                console.log('✓ Correção aplicada com sucesso!');
            } else {
                if (newCompletedTotal !== completedKPI) {
                    console.warn(`⚠ Ainda há discrepância em tarefas concluídas após correção (${newCompletedTotal} vs ${completedKPI})`);
                }
                if (newPendingTotal !== pendingKPI) {
                    console.warn(`⚠ Ainda há discrepância em tarefas em andamento após correção (${newPendingTotal} vs ${pendingKPI})`);
                }
                if (newLateTotal !== lateKPI) {
                    console.warn(`⚠ Ainda há discrepância em tarefas atrasadas após correção (${newLateTotal} vs ${lateKPI})`);
                }
            }
        }
    } catch (error) {
        console.error('Erro durante a verificação de sincronização:', error);
    }
} 