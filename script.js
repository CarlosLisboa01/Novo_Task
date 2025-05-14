// Função para seguramente selecionar elementos DOM
function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.error(`Erro ao selecionar elemento com seletor '${selector}':`, error);
        return null;
    }
}

// Função para seguramente selecionar múltiplos elementos DOM
function safeQuerySelectorAll(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (error) {
        console.error(`Erro ao selecionar elementos com seletor '${selector}':`, error);
        return [];
    }
}

// Seleção dos elementos do DOM
const taskForm = safeQuerySelector('#task-form');
const taskInput = safeQuerySelector('#task-input');
const taskCategory = safeQuerySelector('#task-category');
const taskStartDate = safeQuerySelector('#task-start-date');
const taskEndDate = safeQuerySelector('#task-end-date');
const newTaskBtn = safeQuerySelector('#new-task-btn');
const taskFormModal = safeQuerySelector('#task-form-modal');
const closeModalBtn = safeQuerySelector('.close-modal');
const cancelBtn = safeQuerySelector('.btn-cancel');
const themeToggle = safeQuerySelector('.theme-toggle');
const searchInput = safeQuerySelector('.header-search input');

// Seleção dos elementos relacionados aos comentários
const commentsModal = safeQuerySelector('#comments-modal');
const closeCommentsBtn = safeQuerySelector('.close-comments-modal');
const commentsList = safeQuerySelector('#comments-list');
const commentForm = safeQuerySelector('#comment-form');
const commentInput = safeQuerySelector('#comment-input');
const commentTaskId = safeQuerySelector('#comment-task-id');

// Seleção dos elementos relacionados à autenticação
const authOverlay = safeQuerySelector('#auth-overlay');
const userProfileButton = safeQuerySelector('#user-profile-button');
const userMenu = safeQuerySelector('#user-menu');
const userAvatar = safeQuerySelector('#user-avatar');
const userName = safeQuerySelector('#user-name');
const userMenuAvatar = safeQuerySelector('#user-menu-avatar');
const userMenuName = safeQuerySelector('#user-menu-name');
const userMenuEmail = safeQuerySelector('#user-menu-email');
const logoutButton = safeQuerySelector('#logout-button');
const profileSettings = safeQuerySelector('#profile-settings');
const themeToggleMenu = safeQuerySelector('#theme-toggle-menu');

// Configuração inicial
document.body.classList.add(localStorage.getItem('theme') || 'light');
const now = new Date();
const nowString = now.toISOString().slice(0, 16);

// Estado global das tarefas - será preenchido pelo Supabase ou localStorage
window.tasks = {
    day: [],
    week: [],
    month: [],
    year: []
};

// Estado global para os comentários das tarefas
let taskComments = {};

// Estado para o usuário autenticado
let userProfile = null;

// Verificar se o usuário está autenticado e configurar a aplicação
async function checkAuthentication() {
    try {
        const isUserAuthenticated = await isAuthenticated();
        
        if (!isUserAuthenticated) {
            // Mostrar overlay de autenticação
            authOverlay.classList.add('active');
            console.log('Usuário não autenticado');
            return false;
        }
        
        // Esconder overlay de autenticação
        authOverlay.classList.remove('active');
        
        // Buscar perfil do usuário
        userProfile = await getUserProfile();
        if (!userProfile) {
            console.error('Não foi possível buscar o perfil do usuário');
            return false;
        }
        
        // Atualizar informações do usuário na interface
        updateUserInterface(userProfile);
        
        // Configurar listener para eventos de autenticação
        setupAuthenticationListener();
        
        console.log('Usuário autenticado:', userProfile);
        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        authOverlay.classList.add('active');
        return false;
    }
}

// Atualizar interface do usuário
function updateUserInterface(profile) {
    // Atualizar avatar e nome no header
    const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}`;
    userAvatar.src = avatarUrl;
    userName.textContent = profile.full_name || 'Usuário';
    
    // Atualizar avatar, nome e email no menu do usuário
    userMenuAvatar.src = avatarUrl;
    userMenuName.textContent = profile.full_name || 'Usuário';
    userMenuEmail.textContent = profile.email || '';
    
    // Carregar as configurações do usuário, como tema
    getUserSettings().then(settings => {
        if (settings && settings.theme) {
            document.body.classList.remove('light', 'dark');
            document.body.classList.add(settings.theme);
            localStorage.setItem('theme', settings.theme);
        }
    });
}

// Configurar listener para eventos de autenticação
function setupAuthenticationListener() {
    const authSubscription = setupAuthListener((event, user) => {
        console.log('Evento de autenticação:', event);
        
        if (event === 'SIGNED_OUT') {
            // Redirecionar para a página de login
            window.location.href = 'auth.html';
        } else if (event === 'USER_UPDATED') {
            // Atualizar perfil
            getUserProfile().then(profile => {
                if (profile) {
                    userProfile = profile;
                    updateUserInterface(profile);
                }
            });
        }
    });
    
    // Salvar a subscription para limpar quando necessário
    window.authSubscription = authSubscription;
}

// Evento de clique para mostrar/esconder o menu do usuário
userProfileButton.addEventListener('click', () => {
    userMenu.classList.toggle('active');
});

// Clicar fora do menu para fechá-lo
document.addEventListener('click', (e) => {
    if (!userProfileButton.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove('active');
    }
});

// Evento de clique para logout
logoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        // Limpar a subscription de autenticação
        if (window.authSubscription) {
            window.authSubscription.unsubscribe();
        }
        
        // Fazer logout
        await logoutUser();
        
        // Redirecionar para a página de login
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showErrorNotification('Erro ao fazer logout');
    }
});

// Evento de clique para alternar tema pelo menu do usuário
themeToggleMenu.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Alternar tema
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.classList.remove(currentTheme);
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Se o usuário estiver autenticado, salvar preferência
    if (await isAuthenticated()) {
        updateUserSettings({ theme: newTheme })
            .then(result => {
                if (result.success) {
                    console.log('Tema atualizado com sucesso');
                }
            })
            .catch(error => {
                console.error('Erro ao atualizar tema:', error);
            });
    }
    
    // Fechar menu do usuário
    userMenu.classList.remove('active');
});

// Evento de clique para acessar configurações de perfil
profileSettings.addEventListener('click', (e) => {
    e.preventDefault();
    // Aqui você pode implementar o modal de configurações de perfil
    showInfoNotification('Configurações de perfil em desenvolvimento');
    
    // Fechar menu do usuário
    userMenu.classList.remove('active');
});

// Definir a função filterTasksByStatus no escopo global
window.filterTasksByStatus = function(status) {
    console.log("Filtrando por status (global):", status);
    
    // Assegurar que estamos na página correta
    if (window.location.hash !== '#dashboard' && window.location.hash !== '') {
        window.location.hash = '#dashboard';
        // Usar setTimeout para garantir que a navegação seja concluída
        setTimeout(() => {
            performFilterByStatus(status);
        }, 500);
    } else {
        performFilterByStatus(status);
    }
};

// Função real que realiza a filtragem
function performFilterByStatus(status) {
    console.log("Executando filtro para status:", status);
    
    if (!window.tasks) {
        console.error("Objeto 'tasks' não encontrado!");
        return;
    }
    
    // Contador para saber quantas tarefas foram filtradas
    let visibleTasksCount = 0;
    let totalTasksCount = 0;
    
    Object.keys(window.tasks).forEach(category => {
        const taskList = document.querySelector(`#${category} .task-list`);
        if (!taskList) {
            console.log(`Lista de tarefas não encontrada para categoria: ${category}`);
            return;
        }
        
        const taskItems = taskList.querySelectorAll('.task-item');
        console.log(`Encontradas ${taskItems.length} tarefas na categoria ${category}`);
        totalTasksCount += taskItems.length;
        
        taskItems.forEach(item => {
            if (status === 'all') {
                item.style.display = '';
                visibleTasksCount++;
            } else {
                const isMatching = item.classList.contains(`status-${status}`);
                item.style.display = isMatching ? '' : 'none';
                
                if (isMatching) {
                    visibleTasksCount++;
                }
            }
        });
        
        // Verificar se a lista ficou vazia após o filtro
        const visibleItems = Array.from(taskItems).filter(item => item.style.display !== 'none');
        if (visibleItems.length === 0) {
            // Se não houver itens visíveis, mostrar uma mensagem
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message filtered-empty';
            emptyMessage.innerHTML = `
                <i class="fas fa-filter"></i>
                <p>Nenhuma tarefa com status "${getStatusText(status)}" nesta categoria</p>
            `;
            
            // Remover mensagens anteriores
            const oldMessage = taskList.querySelector('.filtered-empty');
            if (oldMessage) oldMessage.remove();
            
            taskList.appendChild(emptyMessage);
        } else {
            // Remover mensagens de filtro vazio se existirem
            const oldMessage = taskList.querySelector('.filtered-empty');
            if (oldMessage) oldMessage.remove();
        }
    });
    
    console.log(`Filtro aplicado: ${visibleTasksCount} de ${totalTasksCount} tarefas visíveis`);
    
    // Atualizar visualmente qual filtro está selecionado
    const radioButton = document.querySelector(`.status-option input[value="${status}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }
    
    // Mostrar notificação sobre a filtragem
    const statusTexts = {
        'all': 'Todas as tarefas',
        'pending': 'Tarefas em andamento',
        'completed': 'Tarefas concluídas',
        'finished': 'Tarefas finalizadas', 
        'late': 'Tarefas atrasadas'
    };
    
    if (typeof showSuccessNotification === 'function') {
        showSuccessNotification(`Filtrando: ${statusTexts[status] || status} (${visibleTasksCount} tarefas)`);
    }
}

// Carregar tarefas do Supabase quando a página for carregada
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar estado de carregamento
    showLoadingState();
    
    try {
        // Verificar autenticação do usuário
        const isUserAuthenticated = await checkAuthentication();
        
        if (!isUserAuthenticated) {
            hideLoadingState();
            console.warn('Usuário não autenticado. O conteúdo será bloqueado.');
            return;
        }
        
        // Verificar conexão com Supabase
        const isConnected = await checkSupabaseConnection();
        
        if (!isConnected) {
            // Se não conseguir conectar ao Supabase, usar o localStorage como fallback
            const storedTasks = localStorage.getItem('tasks');
            if (storedTasks) {
                window.tasks = JSON.parse(storedTasks);
                console.log('Tarefas carregadas do localStorage:', window.tasks);
            } else {
                console.warn('Nenhuma tarefa encontrada no localStorage');
                window.tasks = {
                    day: [],
                    week: [],
                    month: [],
                    year: []
                };
            }
            
            showErrorNotification('Não foi possível conectar ao Supabase. Usando armazenamento local.');
        } else {
            // Buscar tarefas do Supabase
            const fetchedTasks = await fetchTasks();
            window.tasks = fetchedTasks;
            
            // Guardar uma cópia no localStorage para garantir
            localStorage.setItem('tasks', JSON.stringify(window.tasks));
            console.log('Tarefas carregadas do Supabase e salvas no localStorage:', window.tasks);
        }
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        
        // Fallback para localStorage em caso de erro
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            window.tasks = JSON.parse(storedTasks);
            console.log('Tarefas carregadas do localStorage (após erro):', window.tasks);
        } else {
            console.warn('Nenhuma tarefa encontrada no localStorage após erro');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
        
        showErrorNotification('Erro ao carregar tarefas. Usando armazenamento local.');
    } finally {
        // Ocultar estado de carregamento e renderizar tarefas
        hideLoadingState();
        renderTasks();
        
        // Configurar todos os botões de Nova Tarefa na aplicação
        setupAllTaskButtons();
        
        // Configurar a navegação entre as páginas
        setupNavigation();
    }
});

// Função para configurar todos os botões de Nova Tarefa
function setupAllTaskButtons() {
    console.log("Configurando botões de Nova Tarefa...");
    
    // Array com todos os seletores possíveis de botões de nova tarefa
    const newTaskButtonSelectors = [
        '#new-task-btn',
        '.new-task-btn',
        '#new-task-btn-calendar',
        '.new-task-button',
        '.column-add-btn'
    ];
    
    // Remover event listeners antigos e adicionar novos
    newTaskButtonSelectors.forEach(selector => {
        const buttons = safeQuerySelectorAll(selector);
        
        buttons.forEach(button => {
            // Remover event listeners antigos para evitar duplicação
            button.removeEventListener('click', prepareNewTask);
            
            // Adicionar novo event listener
            button.addEventListener('click', function(e) {
            e.preventDefault();
                e.stopPropagation();
                console.log(`Botão ${selector} clicado, abrindo modal...`);
            prepareNewTask();
        });
            
            // Marcar o botão como configurado
            button.setAttribute('data-task-btn-configured', 'true');
            
            console.log(`Configurado botão: ${selector}, encontrados: ${buttons.length}`);
        });
    });
    
    // Usar delegação de eventos para garantir que botões adicionados dinamicamente também funcionem
    document.removeEventListener('click', handleTaskButtonClick);
    document.addEventListener('click', handleTaskButtonClick);
    
    console.log("Configuração de botões de Nova Tarefa concluída.");
}

// Handler para o clique nos botões de Nova Tarefa usando delegação de eventos
function handleTaskButtonClick(e) {
    const target = e.target;
    
    // Verificar se o alvo do clique é um botão de nova tarefa ou seus elementos filhos (como ícones)
    const isNewTaskButton = 
        target.matches('#new-task-btn, .new-task-btn, #new-task-btn-calendar, .new-task-button, .column-add-btn') ||
        target.closest('#new-task-btn, .new-task-btn, #new-task-btn-calendar, .new-task-button, .column-add-btn') !== null;
    
    if (isNewTaskButton) {
        // Verificar se o clique foi diretamente no botão ou em seu ícone
        const newTaskButton = target.matches('#new-task-btn, .new-task-btn, #new-task-btn-calendar, .new-task-button, .column-add-btn') 
            ? target 
            : target.closest('#new-task-btn, .new-task-btn, #new-task-btn-calendar, .new-task-button, .column-add-btn');
        
        console.log('Botão de nova tarefa clicado via delegação:', newTaskButton);
        e.preventDefault();
        e.stopPropagation();
        prepareNewTask();
    }
}

// Ajuste para o fluxo de adição de tarefa - limpar todos os dados
function prepareNewTask() {
    console.log("Preparando nova tarefa...");
    
    // Verificar se o modal existe
    if (!taskFormModal) {
        console.error("Modal não encontrado!");
        showErrorNotification("Erro ao abrir formulário de nova tarefa");
        return;
    }
    
    // Limpar o formulário
    taskForm.reset();
    
    // Limpar restrições de data
clearDateRestrictions();
    
    // Definir status padrão como pendente
    const pendingRadio = document.querySelector('input[name="status"][value="pending"]');
    if (pendingRadio) {
        pendingRadio.checked = true;
    }
    
    // Abrir o modal
    openModal();
}

// Controle do modal
function openModal() {
    console.log("Abrindo modal...");
    if (!taskFormModal) {
        console.error("Modal não encontrado ao tentar abrir!");
        return;
    }
    taskFormModal.style.display = 'flex';
    
    // Focar no primeiro campo do formulário se existir
    if (taskInput) {
    taskInput.focus();
    }
    
    document.body.style.overflow = 'hidden';
    clearDateRestrictions();
}

function closeModal() {
    console.log("Fechando modal...");
    if (!taskFormModal) {
        console.error("Modal não encontrado ao tentar fechar!");
        return;
    }
    taskFormModal.style.display = 'none';
    
    // Redefinir o formulário se existir
    if (taskForm) {
    taskForm.reset();
    }
    
    document.body.style.overflow = '';
}

// Garantir que o modal comece fechado
if (taskFormModal) {
taskFormModal.style.display = 'none';

    // Restaurar os event listeners para fechar o modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

// Fechar modal ao clicar fora
taskFormModal.addEventListener('click', (e) => {
    if (e.target === taskFormModal) closeModal();
});
}

// Função para mostrar estado de carregamento
function showLoadingState() {
    // Adicionar um overlay de carregamento a cada coluna de tarefas
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando tarefas...</p>
            </div>
        `;
    });
}

// Função para ocultar estado de carregamento
function hideLoadingState() {
    document.querySelectorAll('.loading-state').forEach(loading => {
        loading.remove();
    });
}

// Função para limpar restrições de data
function clearDateRestrictions() {
    // Remover restrições dos inputs de data
    taskStartDate.removeAttribute('min');
    taskStartDate.removeAttribute('max');
    taskEndDate.removeAttribute('min');
    taskEndDate.removeAttribute('max');
}

// Limpar restrições ao carregar a página
    clearDateRestrictions();

// Função para validar datas antes de submeter
function validateDates(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return end > start;
}

// Função para formatar data e hora
function formatDateTime(dateString) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('pt-BR', options);
}

// Atualizar getStatusIcon para usar o StatusManager
function getStatusIcon(status) {
    // Se StatusManager estiver disponível, use-o
    if (window.StatusManager) {
        return window.StatusManager.getIcon(status);
    }
    
    // Fallback para comportamento original
    const icons = {
        pending: '<i class="fas fa-clock"></i>',
        completed: '<i class="fas fa-check"></i>',
        finished: '<i class="fas fa-flag-checkered"></i>',
        late: '<i class="fas fa-exclamation-triangle"></i>'
    };
    return icons[status] || icons.pending;
}

// Atualizar getStatusText para usar o StatusManager
function getStatusText(status) {
    // Se StatusManager estiver disponível, use-o
    if (window.StatusManager) {
        return window.StatusManager.getText(status);
    }
    
    // Fallback para comportamento original
    const texts = {
        pending: 'Em andamento',
        completed: 'Concluído',
        finished: 'Finalizado',
        late: 'Em atraso'
    };
    return texts[status] || texts.pending;
}

// Função atualizada para salvar tarefas no Supabase E localStorage como fallback
async function saveTasks() {
    try {
        // Verificar se as tarefas estão inicializadas
        if (!window.tasks) {
            console.error('Erro: window.tasks não está inicializado');
            return false;
        }
        
        // Sempre salvar no localStorage como fallback
        localStorage.setItem('tasks', JSON.stringify(window.tasks));
        console.log('Tarefas salvas no localStorage');
        
        // Atualizar contadores visuais
        updateTaskCounts();
        
        // Atualizar a página de análises, se estiver inicializada
        if (typeof updateAnalytics === 'function') {
            console.log('Atualizando análises após salvar tarefas');
            updateAnalytics();
        }
        
        // Verificar se estamos na página de calendário e atualizar
        const calendarioView = document.getElementById('calendario-view');
        if (calendarioView && calendarioView.style.display === 'block' && typeof loadCalendarTasks === 'function') {
            console.log('Atualizando calendário após salvar tarefas');
            loadCalendarTasks().catch(err => {
                console.error('Erro ao atualizar calendário após salvar tarefas:', err);
            });
        } else {
            // Armazenar tarefas para uso futuro no calendário
            if (typeof window._storeTasksForCalendar === 'function') {
                window._storeTasksForCalendar(window.tasks);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar tarefas:', error);
        showErrorNotification('Erro ao salvar tarefas');
        return false;
    }
}

// Função para atualizar contadores de tarefas
function updateTaskCounts() {
    // Verificar se window.tasks está inicializado
    if (!window.tasks) {
        console.error('window.tasks não está inicializado');
        return;
    }
    
    Object.keys(window.tasks).forEach(category => {
        const count = window.tasks[category].length;
        const countElement = document.querySelector(`#${category} .task-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Função para verificar se uma tarefa está atrasada
function isTaskLate(task) {
    const now = new Date();
    const endDate = new Date(task.endDate);
    return now > endDate;
}

// Função para verificar se uma tarefa está em andamento
function isTaskInProgress(task) {
    const now = new Date();
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    return now >= startDate && now <= endDate;
}
// Função para atualizar status de tarefas
async function updateTasksStatus() {
    console.log('Verificando status de tarefas automaticamente...');
    let updated = false;
    let updatedTasks = [];
    let completedTasksChecked = 0;
    
    // Verificar se window.tasks está inicializado
    if (!window.tasks) {
        console.error('window.tasks não está inicializado ao verificar status');
        return;
    }
    
    Object.keys(window.tasks).forEach(category => {
        window.tasks[category].forEach(task => {
            let newStatus = task.status;
            
            // Verificar tarefas com status diferente de 'finished'
            if (task.status !== 'finished') {
                
                // Lógica para tarefas concluídas: mudar para finalizado após 2 horas
                if (task.status === 'completed' && task.completedAt) {
                    completedTasksChecked++;
                    const completedTime = new Date(task.completedAt).getTime();
                    const currentTime = new Date().getTime();
                    const hoursElapsed = (currentTime - completedTime) / (1000 * 60 * 60);
                    
                    console.log(`Verificando tarefa concluída: "${task.text}" - Concluída há ${hoursElapsed.toFixed(2)} horas`);
                    
                    // Se passaram 2 horas ou mais desde a conclusão
                    if (hoursElapsed >= 2) {
                        newStatus = 'finished';
                        console.log(`Tarefa "${task.text}" movida para finalizado após ${hoursElapsed.toFixed(2)} horas de conclusão`);
                        updated = true;
                        
                        // Adicionar notificação para o usuário
                        showInfoNotification(`Tarefa "${task.text}" foi finalizada automaticamente após ${Math.floor(hoursElapsed)} horas de conclusão`);
                    }
                }
                // Lógica para tarefas em atraso ou em andamento
                else if (task.status !== 'completed') {
                    const wasLate = task.status === 'late';
                    const isLate = isTaskLate(task);
                    const inProgress = isTaskInProgress(task);
                    
                    if (isLate && !wasLate) {
                        newStatus = 'late';
                        updated = true;
                    } else if (inProgress && task.status !== 'pending') {
                        newStatus = 'pending';
                        updated = true;
                    }
                }
                
                // Atualizar status se mudou
                if (newStatus !== task.status) {
                    task.status = newStatus;
                    
                    // Adicionar timestamp para finalizados
                    if (newStatus === 'finished') {
                        task.finishedAt = new Date().toISOString();
                    }
                    
                    updatedTasks.push({
                        id: task.id,
                        text: task.text,
                        status: newStatus,
                        ...(newStatus === 'finished' ? { finishedAt: task.finishedAt } : {})
                    });
                }
            }
        });
    });
    
    console.log(`Verificação concluída: ${completedTasksChecked} tarefas concluídas verificadas, ${updatedTasks.length} atualizadas`);
    
    if (updated) {
        // Atualizar no localStorage
        saveTasks();
        
        // Atualizar a interface
        renderTasks();
        
        // Atualizar os gráficos
        if (typeof updateAnalytics === 'function') {
            console.log('Atualizando análises após mudança automática de status');
            updateAnalytics();
        }
        
        // Atualizar os KPIs
        if (typeof window.updateKPIDashboard === 'function') {
            console.log('Atualizando KPIs após mudança automática de status');
            window.updateKPIDashboard().catch(err => {
                console.error('Erro ao atualizar KPIs:', err);
            });
        }
        
        // Atualizar o calendário
        if (typeof loadCalendarTasks === 'function') {
            console.log('Atualizando calendário após mudança automática de status');
            loadCalendarTasks();
        }
        
        // Enviar todas as atualizações de status para o servidor (Supabase)
        try {
            console.log(`Enviando ${updatedTasks.length} atualizações de status para o servidor...`);
            
            // Processar cada tarefa atualizada
            const updatePromises = updatedTasks.map(async (task) => {
                try {
                    // Criar objeto de atualização para o servidor
                    const serverUpdate = {
                        status: task.status
                    };
                    
                    // Adicionar finishedAt se necessário
                    if (task.status === 'finished' && task.finishedAt) {
                        serverUpdate.finishedAt = task.finishedAt;
                    }
                    
                    // Enviar para o Supabase
                    const result = await window.supabaseApi.updateTask(task.id, serverUpdate);
                    return { id: task.id, success: !!result };
                } catch (error) {
                    console.error(`Erro ao atualizar tarefa ${task.id} (${task.text}) no servidor:`, error);
                    return { id: task.id, success: false, error };
                }
            });
            
            // Aguardar todas as atualizações
            const results = await Promise.allSettled(updatePromises);
            
            // Verificar resultados
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failCount = updatedTasks.length - successCount;
            
            console.log(`Atualizações no servidor: ${successCount} bem-sucedidas, ${failCount} falhas`);
            
            if (failCount > 0) {
                showWarningNotification(`${failCount} tarefas não puderam ser atualizadas no servidor.`);
            }
        } catch (error) {
            console.error('Erro ao enviar atualizações automáticas para o servidor:', error);
            showWarningNotification('Não foi possível sincronizar algumas alterações de status com o servidor.');
        }
        
        console.log(`${updatedTasks.length} tarefas tiveram status atualizado automaticamente`);
    }
}

// Função para filtrar tarefas
function filterTasks(searchTerm) {
    const term = searchTerm.toLowerCase();
    const tableBody = document.getElementById('task-table-body');
    const rows = tableBody.querySelectorAll('tr');
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        const taskText = row.querySelector('.title-cell').textContent.toLowerCase();
        const isVisible = taskText.includes(term);
        
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) {
            visibleCount++;
        }
    });
    
    // Mostrar mensagem se não houver resultados
    const noTasksMessage = document.getElementById('no-tasks-message');
    if (noTasksMessage) {
        noTasksMessage.style.display = visibleCount === 0 ? 'flex' : 'none';
    }
}

// Função para renderizar tarefas
function renderTasks() {
    console.log('Renderizando tarefas...');
    
    // Limpar as listas de tarefas
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = '';
    });
    
    // Verificar se temos tarefas para renderizar
    if (!window.tasks) {
        console.error('Objeto de tarefas não inicializado');
        return;
    }
    
    // Obter filtros de status para aplicar
    let statusFilter = 'all'; // Padrão: todos
    const statusRadios = document.querySelectorAll('input[name="status-filter"]');
    
    statusRadios.forEach(radio => {
        if (radio.checked) {
            statusFilter = radio.value;
        }
    });
    
    console.log('Filtro de status ativo:', statusFilter);
    
    // Para cada categoria de tarefas
    Object.keys(window.tasks).forEach(category => {
        const taskList = document.querySelector(`#${category} .task-list`);
        
        if (!taskList) {
            console.warn(`Elemento .task-list não encontrado para a categoria: ${category}`);
            return;
        }
        
        // Filtrar e ordenar tarefas
        const categoryTasks = window.tasks[category].filter(task => {
            // Filtrar por status se não for "all"
            if (statusFilter !== 'all') {
                return task.status === statusFilter;
            }
            
            // Se estamos usando filtros do dashboard e eles estão disponíveis
            if (window.dashboardFilters && typeof window.dashboardFilters.getActiveFilters === 'function') {
                const activeFilters = window.dashboardFilters.getActiveFilters();
                
                // Se nenhum filtro estiver ativo, mostrar todas as tarefas
                if (!Object.values(activeFilters).some(value => value)) {
                    return true;
                }
                
                // Aplicar filtro baseado no status da tarefa
                return activeFilters[task.status || 'pending'];
            }
            
            // Se não houver filtros, mostrar todas as tarefas
            return true;
        }).sort((a, b) => {
            // Priorizar tarefas fixadas
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            
            // Em seguida, classificar por data de término (mais próximas primeiro)
            const dateA = a.endDate ? new Date(a.endDate) : new Date(9999, 11, 31);
            const dateB = b.endDate ? new Date(b.endDate) : new Date(9999, 11, 31);
            return dateA - dateB;
        });
        
        // Renderizar as tarefas
        categoryTasks.forEach(task => {
            const taskItem = createTaskItem(task);
            taskList.appendChild(taskItem);
        });
        
        // Atualizar o contador de tarefas
        const taskCount = document.querySelector(`#${category}-count`);
        if (taskCount) {
            const count = categoryTasks.length;
            taskCount.textContent = `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`;
        }
    });
    
    // Configurar manipuladores de eventos nas tarefas
    setupTaskEventHandlers();
    
    // Atualizar os contadores de tarefas
    updateTaskCounts();
    
    // Inicializar filtros do dashboard se estiverem disponíveis
    if (window.dashboardFilters && typeof window.dashboardFilters.init === 'function') {
        // Inicializar apenas se ainda não tiver sido feito
        if (!window.dashboardFiltersInitialized) {
            window.dashboardFilters.init();
            window.dashboardFiltersInitialized = true;
        }
    }
    
    // Verificar se estamos na página do calendário e atualizar as tarefas
    const calendarioView = document.getElementById('calendario-view');
    if (calendarioView && calendarioView.style.display === 'block') {
        console.log('Atualizando tarefas no calendário após renderização dashboard...');
        
        // Garantir que a função loadCalendarTasks esteja disponível
        if (typeof loadCalendarTasks === 'function') {
            loadCalendarTasks().then(() => {
                console.log('Calendário atualizado com sucesso');
            }).catch(err => {
                console.error('Erro ao atualizar calendário:', err);
            });
        }
    } else {
        // Armazenar tarefas para uso futuro no calendário
        if (typeof window._storeTasksForCalendar === 'function') {
            window._storeTasksForCalendar(window.tasks);
        }
    }
}

// Criar elemento de tarefa (card)
function createTaskItem(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item status-${task.status}`;
    taskItem.dataset.id = task.id;
    taskItem.dataset.taskId = task.id; // Adicionar data-task-id para consistência
    
    // Adicionar classes extras se necessário
    if (task.pinned) {
        taskItem.classList.add('pinned');
    }
    
    // Conteúdo do card
    taskItem.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${task.text}</h3>
            <div class="task-actions">
                <button class="task-action-btn edit-task" aria-label="Editar tarefa">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="task-action-btn delete-task" aria-label="Excluir tarefa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="task-status-container">
            <select class="status-select status-${task.status}" data-task-id="${task.id}">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Em andamento</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Concluído</option>
                <option value="late" ${task.status === 'late' ? 'selected' : ''}>Em atraso</option>
            </select>
        </div>
        <div class="task-footer">
            <div class="task-date">
                <i class="far fa-calendar-alt"></i>
                <span>${formatDateTime(task.endDate)}</span>
            </div>
            <div class="task-status status-${task.status}">
                ${getStatusIcon(task.status)}
                <span>${getStatusText(task.status)}</span>
            </div>
        </div>
    `;
    
    // Adicionar event listeners
    const editBtn = taskItem.querySelector('.edit-task');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            prepareEditTask(task);
        });
    }
    
    const deleteBtn = taskItem.querySelector('.delete-task');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impedir propagação para não selecionar a tarefa
            deleteTask(task.id);
        });
    }
    
    // Adicionar listener para o select de status
    const statusSelect = taskItem.querySelector('.status-select');
    if (statusSelect) {
        statusSelect.addEventListener('change', function(e) {
            const newStatus = e.target.value;
            const taskId = e.target.getAttribute('data-task-id');
            
            console.log(`Alterando status da tarefa ${taskId} para ${newStatus}`);
            
            // Adicionar classe para destacar a alteração
            taskItem.classList.add('highlight-success');
            
            // Remover classe após a animação
            setTimeout(() => {
                taskItem.classList.remove('highlight-success');
            }, 1500);
            
            // Chamar a nova função robusta de atualização de status em vez da função original
            if (typeof window.forceUpdateTaskStatus === 'function') {
                window.forceUpdateTaskStatus(taskId, newStatus);
            } else if (typeof window.handleTaskStatusChange === 'function') {
                window.handleTaskStatusChange(taskId, newStatus);
            } else {
                updateTaskStatus(taskId, newStatus);
            }
        });
    }
    
    return taskItem;
}

// Função para preparar edição de tarefa existente
function prepareEditTask(task) {
    console.log('Preparando para editar tarefa:', task);
    
    // Abrir o modal
    openModal();
    
    // Preencher o formulário com os dados da tarefa
    const taskInput = document.getElementById('task-input');
    const taskCategory = document.getElementById('task-category');
    const taskStartDate = document.getElementById('task-start-date');
    const taskEndDate = document.getElementById('task-end-date');
    
    if (taskInput) taskInput.value = task.text || task.title || '';
    if (taskCategory) taskCategory.value = task.category || 'day';
    if (taskStartDate) taskStartDate.value = task.startDate ? task.startDate.substring(0, 16) : '';
    if (taskEndDate) taskEndDate.value = task.endDate ? task.endDate.substring(0, 16) : '';
    
    // Modificar o formulário para atualização em vez de criar nova tarefa
    const taskForm = document.getElementById('task-form');
    const formTitle = document.querySelector('#task-form-modal .modal-title');
    const submitButton = document.querySelector('#task-form .btn-primary');
    
    if (formTitle) formTitle.textContent = 'Editar Tarefa';
    if (submitButton) submitButton.textContent = 'Atualizar';
    
    // Armazenar ID da tarefa sendo editada para usar no submit
    if (taskForm) {
        taskForm.dataset.editingTaskId = task.id;
        
        // Remover manipulador antigo e adicionar novo
        taskForm.removeEventListener('submit', handleAddTaskEvent);
        taskForm.addEventListener('submit', function handleEditTaskEvent(e) {
            e.preventDefault();
            
            const taskId = taskForm.dataset.editingTaskId;
            if (!taskId) {
                console.error('ID da tarefa não encontrado');
                return;
            }
            
            // Coletar dados do formulário
            const formData = {
                text: taskInput.value.trim(),
                category: taskCategory.value,
                startDate: taskStartDate.value,
                endDate: taskEndDate.value,
                updatedAt: new Date().toISOString()
            };
            
            // Atualizar tarefa
            updateExistingTask(taskId, formData);
            
            // Fechar modal
            closeModal();
            
            // Remover este manipulador de eventos específico
            taskForm.removeEventListener('submit', handleEditTaskEvent);
            
            // Restaurar o manipulador original para adição de tarefas
            taskForm.addEventListener('submit', handleAddTaskEvent);
            
            // Limpar o ID da tarefa sendo editada
            delete taskForm.dataset.editingTaskId;
        });
    }
}

// Atualizar contadores de tarefas
function updateTaskCounts() {
    Object.keys(window.tasks).forEach(category => {
        const countElement = document.getElementById(`${category}-count`);
        if (countElement) {
            const count = window.tasks[category].length;
            countElement.textContent = `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`;
        }
    });
}

// Função setupNavigation modificada para animação suave
function setupNavigation() {
    const navLinks = safeQuerySelectorAll('.sidebar-nav a');
    
    // Criar o elemento de configurações se ele não existir
    const configView = safeQuerySelector('#configuracoes-view');
    if (!configView) {
        const viewsContainer = safeQuerySelector('.views-container');
        if (viewsContainer) {
            const configViewElement = document.createElement('div');
            configViewElement.className = 'view';
            configViewElement.id = 'configuracoes-view';
            configViewElement.style.display = 'none';
            
            // Adicionar conteúdo para a página de configurações
            configViewElement.innerHTML = `
                <div class="view-header">
                    <h1>Configurações</h1>
                </div>
                <div class="settings-container">
                    <div class="settings-section">
                        <h2>Preferências do Sistema</h2>
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <i class="fas fa-moon"></i>
                                <span>Tema Escuro</span>
                            </div>
                            <div class="settings-option-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="dark-theme-toggle">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="settings-option">
                            <div class="settings-option-label">
                                <i class="fas fa-bell"></i>
                                <span>Notificações</span>
                            </div>
                            <div class="settings-option-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="notifications-toggle" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h2>Perfil do Usuário</h2>
                        <div class="profile-settings">
                            <div class="profile-picture">
                                <img src="https://ui-avatars.com/api/?name=User&background=random" alt="Foto de Perfil" id="profile-image">
                                <button class="change-picture-btn">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                            <div class="profile-info">
                                <div class="form-group">
                                    <label>Nome Completo</label>
                                    <input type="text" id="profile-name" placeholder="Seu nome completo">
                                </div>
                                <div class="form-group">
                                    <label>E-mail</label>
                                    <input type="email" id="profile-email" placeholder="Seu e-mail">
                                </div>
                                <button class="btn-primary save-profile-btn">
                                    <i class="fas fa-save"></i>
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Adicionar a nova view ao container
            viewsContainer.appendChild(configViewElement);
            
            // Configurar o toggle do tema escuro
            const darkThemeToggle = document.getElementById('dark-theme-toggle');
            if (darkThemeToggle) {
                // Definir estado inicial baseado no tema atual
                darkThemeToggle.checked = document.body.classList.contains('dark');
                
                // Adicionar listener para alternar o tema
                darkThemeToggle.addEventListener('change', (e) => {
                    const isDark = e.target.checked;
                    document.body.classList.toggle('dark', isDark);
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                    
                    // Atualizar o ícone do botão de tema no cabeçalho
                    const themeToggleIcon = safeQuerySelector('.theme-toggle i');
                    if (themeToggleIcon) {
                        themeToggleIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                    }
                });
            }
            
            // Configurar o botão de salvar alterações de perfil
            const saveProfileBtn = safeQuerySelector('.save-profile-btn');
            if (saveProfileBtn) {
                saveProfileBtn.addEventListener('click', async () => {
                    try {
                        const nameInput = document.getElementById('profile-name');
                        const emailInput = document.getElementById('profile-email');
                        
                        if (nameInput && emailInput) {
                            const name = nameInput.value.trim();
                            const email = emailInput.value.trim();
                            
                            if (name && email) {
                                // Aqui seria implementada a lógica de atualização do perfil no Supabase
                                // Por enquanto, apenas simular uma atualização bem-sucedida
                                showSuccessNotification('Perfil atualizado com sucesso!');
                                
                                // Atualizar interface
                                const userNameElements = document.querySelectorAll('#user-name, #user-menu-name');
                                userNameElements.forEach(el => {
                                    if (el) el.textContent = name;
                                });
                                
                                const userEmailElements = document.querySelectorAll('#user-menu-email');
                                userEmailElements.forEach(el => {
                                    if (el) el.textContent = email;
                                });
                    } else {
                                showWarningNotification('Por favor, preencha todos os campos obrigatórios');
                            }
                        }
                } catch (error) {
                        console.error('Erro ao atualizar perfil:', error);
                        showErrorNotification('Erro ao atualizar perfil');
                    }
                });
            }
        }
    }
    
    function checkActivePage() {
        // Obter o hash atual, ou usar #dashboard como padrão se não houver hash
        const hash = window.location.hash || '#dashboard';
        
        console.log('Navegando para:', hash);
        
        // Remover classe ativa de todos os links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Adicionar classe ativa ao link correto
        const activeLink = safeQuerySelector(`.sidebar-nav a[href="${hash}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Obter referências a todas as visões
        const dashboardView = safeQuerySelector('#dashboard-view');
        const calendarioView = safeQuerySelector('#calendario-view');
        const analiseView = safeQuerySelector('#analises-view');
        const configuracoesView = safeQuerySelector('#configuracoes-view');
        
        // Esconder todas as visões
        if (dashboardView) dashboardView.style.display = 'none';
        if (calendarioView) calendarioView.style.display = 'none';
        if (analiseView) analiseView.style.display = 'none';
        if (configuracoesView) configuracoesView.style.display = 'none';
        
        // Mostrar a visão correta com base no hash da URL
        if (hash === '#dashboard' || hash === '') {
            if (dashboardView) dashboardView.style.display = 'block';
        } 
        else if (hash === '#calendario') {
            if (calendarioView) {
                calendarioView.style.display = 'block';
                
                // Inicializar o calendário se necessário
                if (typeof initCalendar === 'function') {
                    console.log('Inicializando calendário...');
                    initCalendar();
                }
                
                // Carregar tarefas no calendário
                if (typeof loadCalendarTasks === 'function') {
                    console.log('Carregando tarefas do calendário...');
                    loadCalendarTasks();
                }
                
                // Limpar duplicações no calendário
                if (typeof cleanupCalendarDuplicates === 'function') {
                    cleanupCalendarDuplicates();
                }
            } else {
                console.error('Elemento #calendario-view não encontrado');
            }
        } 
        else if (hash === '#analises') {
            if (analiseView) {
                analiseView.style.display = 'block';
                
                // Atualizar análises quando acessar a página
                if (typeof initializeAnalytics === 'function') {
                    console.log('Inicializando análises...');
                    initializeAnalytics();
                }
                
                if (typeof updateAnalytics === 'function') {
                    console.log('Atualizando análises...');
                    updateAnalytics();
                }
                
                // Inicializar KPIs
                if (typeof initKPIDashboard === 'function') {
                    console.log('Inicializando KPI Dashboard...');
                    initKPIDashboard();
                }
            } else {
                console.error('Elemento #analises-view não encontrado');
            }
        }
        else if (hash === '#configuracoes') {
            if (configuracoesView) {
                configuracoesView.style.display = 'block';
                
                // Preencher informações do usuário se disponíveis
                const profileNameInput = document.getElementById('profile-name');
                const profileEmailInput = document.getElementById('profile-email');
                const profileImage = document.getElementById('profile-image');
                
                if (profileNameInput && userProfile) {
                    profileNameInput.value = userProfile.full_name || '';
                }
                
                if (profileEmailInput && userProfile) {
                    profileEmailInput.value = userProfile.email || '';
                }
                
                if (profileImage && userProfile && userProfile.avatar_url) {
                    profileImage.src = userProfile.avatar_url;
                }
                
                // Atualizar estado do toggle do tema
                const darkThemeToggle = document.getElementById('dark-theme-toggle');
                if (darkThemeToggle) {
                    darkThemeToggle.checked = document.body.classList.contains('dark');
                }
            } else {
                console.error('Elemento #configuracoes-view não encontrado');
            }
        }
    }
    
    // Verificar página ativa quando carregar
    checkActivePage();
    
    // Verificar página ativa quando mudar a navegação
    window.addEventListener('hashchange', checkActivePage);
    
    // Adicionar funcionalidade de menu mobile
    const mobileMenuToggle = safeQuerySelector('#mobile-menu-toggle');
    const sidebar = safeQuerySelector('#sidebar');
    const overlay = safeQuerySelector('#sidebar-overlay');
    
    if (mobileMenuToggle && sidebar && overlay) {
        mobileMenuToggle.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
        
        // Fechar menu ao clicar em um link (em dispositivos móveis)
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('show-mobile');
                    overlay.classList.remove('show');
                    document.body.classList.remove('sidebar-open');
                }
            });
        });
    }
    
    function toggleSidebar() {
        sidebar.classList.toggle('show-mobile');
        overlay.classList.toggle('show');
        document.body.classList.toggle('sidebar-open');
    }
}

// Para atualizar o status de uma tarefa
function updateTaskStatus(taskId, newStatus) {
    console.log(`Atualizando status da tarefa ${taskId} para ${newStatus}`);
    
    // Se o StatusManager estiver disponível, usar a implementação mais robusta
    if (window.StatusManager && window.forceUpdateTaskStatus) {
        const result = window.forceUpdateTaskStatus(taskId, newStatus);
        
        // Após atualizar o status, verificar se é necessário atualizar o calendário
        updateCalendarAfterStatusChange(taskId, newStatus);
        
        return result;
    }
    
    // Implementação legada como fallback
    try {
        // Encontrar a tarefa
        let taskFound = null;
        let categoryFound = null;
        
        Object.keys(window.tasks).forEach(category => {
            const task = window.tasks[category].find(t => t.id === taskId);
            if (task) {
                taskFound = task;
                categoryFound = category;
            }
        });
        
        if (!taskFound || !categoryFound) {
            console.error(`Tarefa com ID ${taskId} não encontrada`);
            return false;
        }
        
        // Atualizar o status
        const oldStatus = taskFound.status;
        taskFound.status = newStatus;
        
        // Registrar o timestamp de conclusão se o status for completed
        if (newStatus === 'completed' && !taskFound.completedAt) {
            taskFound.completedAt = new Date().toISOString();
            console.log(`Tarefa marcada como concluída em: ${taskFound.completedAt}`);
        }
        
        // Salvar alterações
        saveTasks();
        
        // Mostrar notificação visual se o status mudou para concluído
        if (newStatus === 'completed' && oldStatus !== 'completed') {
            showInfoNotification(`Tarefa "${taskFound.text}" marcada como concluída!`);
        }
        
        // Atualizar o calendário se necessário
        updateCalendarAfterStatusChange(taskId, newStatus);
        
        // Tentar atualizar no Supabase
        try {
            if (window.supabaseApi && typeof window.supabaseApi.updateTask === 'function') {
                console.log(`Atualizando status da tarefa ${taskId} no Supabase`);
                window.supabaseApi.updateTask(taskId, { 
                    status: newStatus,
                    ...(newStatus === 'completed' ? { completedAt: taskFound.completedAt } : {})
                })
                    .then(success => {
                        if (success) {
                            console.log('Status atualizado no Supabase com sucesso');
        } else {
                            console.warn('Falha ao atualizar status no Supabase');
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao atualizar status no Supabase:', error);
                    });
            }
    } catch (error) {
            console.error('Erro ao tentar atualizar status no Supabase:', error);
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar status da tarefa:', error);
        return false;
    }
}

// Função auxiliar para atualizar o calendário após mudança de status
function updateCalendarAfterStatusChange(taskId, newStatus) {
    // Verificar se estamos na página de calendário
    const calendarioView = document.getElementById('calendario-view');
    
    if (calendarioView && calendarioView.style.display === 'block') {
        // Se estamos na visualização do calendário, atualizar a tarefa diretamente no calendário
        if (typeof updateCalendarTaskStatus === 'function') {
            console.log(`Atualizando tarefa ${taskId} no calendário para status ${newStatus}`);
            updateCalendarTaskStatus(taskId, newStatus);
        }
        // Ou recarregar o calendário completamente se a função específica não existir
        else if (typeof loadCalendarTasks === 'function') {
            console.log('Recarregando calendário após mudança de status');
            loadCalendarTasks().catch(err => {
                console.error('Erro ao recarregar calendário:', err);
            });
        }
    } else {
        // Se não estamos na visualização do calendário, armazenar as tarefas para uso futuro
        if (typeof window._storeTasksForCalendar === 'function') {
            window._storeTasksForCalendar(window.tasks);
        }
    }
}

// Carregar tarefas do Supabase/localStorage quando a página for carregada
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar estado de carregamento
    showLoadingState();
    
    try {
        // Verificar autenticação do usuário
        const isUserAuthenticated = await checkAuthentication();
        
        if (!isUserAuthenticated) {
            hideLoadingState();
            console.warn('Usuário não autenticado. O conteúdo será bloqueado.');
            return;
        }
        
        // Verificar conexão com Supabase
        const isConnected = await checkSupabaseConnection();
        
        if (!isConnected) {
            // Se não conseguir conectar ao Supabase, usar o localStorage como fallback
                    const storedTasks = localStorage.getItem('tasks');
                    if (storedTasks) {
                            window.tasks = JSON.parse(storedTasks);
                console.log('Tarefas carregadas do localStorage:', window.tasks);
                    } else {
                console.warn('Nenhuma tarefa encontrada no localStorage');
                        window.tasks = {
                            day: [],
                            week: [],
                            month: [],
                            year: []
                        };
            }
            
            showErrorNotification('Não foi possível conectar ao Supabase. Usando armazenamento local.');
        } else {
            // Buscar tarefas do Supabase
            const fetchedTasks = await fetchTasks();
            window.tasks = fetchedTasks;
            
            // Guardar uma cópia no localStorage para garantir
            localStorage.setItem('tasks', JSON.stringify(window.tasks));
            console.log('Tarefas carregadas do Supabase e salvas no localStorage:', window.tasks);
        }
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        
        // Fallback para localStorage em caso de erro
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            window.tasks = JSON.parse(storedTasks);
            console.log('Tarefas carregadas do localStorage (após erro):', window.tasks);
        } else {
            console.warn('Nenhuma tarefa encontrada no localStorage após erro');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
        
        showErrorNotification('Erro ao carregar tarefas. Usando armazenamento local.');
    } finally {
        // Ocultar estado de carregamento e renderizar tarefas
        hideLoadingState();
        renderTasks();
        
        // Configurar todos os botões de Nova Tarefa na aplicação
        setupAllTaskButtons();
        
        // Configurar a navegação entre as páginas
        setupNavigation();
        
        // Configurar filtros de status
        setupStatusFilters();
        
        // Verificar e atualizar status das tarefas (ex: atrasadas)
        updateTasksStatus();
    }
});

// Configurar filtros de status
function setupStatusFilters() {
    statusFilterRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const status = e.target.value;
            performFilterByStatus(status);
        });
    });
}

// Função para deletar uma tarefa
function deleteTask(taskId) {
    try {
        // Encontrar a tarefa para obter os detalhes
        let taskFound = false;
        let taskTitle = "";
        let taskCategory = null;
        let taskIndex = -1;
        
        Object.keys(window.tasks).forEach(category => {
            const index = window.tasks[category].findIndex(task => task.id === taskId);
            if (index !== -1) {
                taskFound = true;
                taskTitle = window.tasks[category][index].title || window.tasks[category][index].text;
                taskCategory = category;
                taskIndex = index;
            }
        });
        
        if (!taskFound) {
            console.error('Tarefa não encontrada:', taskId);
            return false;
        }
        
        // Adicionar classe de animação ao elemento antes da confirmação
        const taskElements = document.querySelectorAll(`[data-task-id="${taskId}"]`);
        taskElements.forEach(element => {
            element.classList.add('pre-delete');
            // Adicionar efeito de tremor
            element.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ], {
                duration: 400,
                iterations: 1
            });
        });
        
        // Exibir diálogo de confirmação elegante
        showConfirmDialog(
            'Excluir Tarefa',
            `Tem certeza que deseja excluir a tarefa "${taskTitle}"? Esta ação não pode ser desfeita.`,
            async () => {
                // Animar a remoção
                taskElements.forEach(element => {
                    element.classList.add('removing');
                });
                
                // Aguardar a animação terminar antes de remover do DOM
                setTimeout(async () => {
                    try {
                        // Primeiro tentar excluir no Supabase
                        try {
                            console.log(`Excluindo tarefa ${taskId} do Supabase...`);
                            // Aqui chamamos a função do supabase-config.js, usando seu namespace
                            const success = await window.supabaseApi.deleteTask(taskId);
                            
                            if (success) {
                                console.log(`Tarefa ${taskId} excluída com sucesso do Supabase.`);
                            } else {
                                console.error(`Falha ao excluir tarefa ${taskId} do Supabase.`);
                                showWarningNotification('Tarefa excluída localmente, mas pode permanecer no servidor.');
                            }
                        } catch (error) {
                            console.error('Erro na exclusão do Supabase:', error);
                            showWarningNotification('Tarefa excluída localmente, mas pode permanecer no servidor.');
                        }
                        
                        // Independentemente do resultado do Supabase, remover do estado local
                        window.tasks[taskCategory].splice(taskIndex, 1);
                        
                        // Salvar as tarefas no localStorage
                        saveTasks();
                        
                        // Atualizar a lista de tarefas
                        renderTasks();
                        
                        // Exibir notificação de sucesso
                        showSuccessNotification('Tarefa excluída com sucesso!');
                        
                        // Atualizar o calendário após exclusão
                        const calendarioView = document.getElementById('calendario-view');
                        if (calendarioView && calendarioView.style.display === 'block' && typeof loadCalendarTasks === 'function') {
                            console.log('Atualizando calendário após excluir tarefa');
                            loadCalendarTasks().catch(err => {
                                console.error('Erro ao atualizar calendário após exclusão:', err);
                            });
                        } else if (typeof window._storeTasksForCalendar === 'function') {
                            // Armazenar tarefas para uso futuro no calendário
                            window._storeTasksForCalendar(window.tasks);
                        }
                        
                        // Atualizar os gráficos
                        if (typeof updateAnalytics === 'function') {
                            console.log('Atualizando análises após excluir tarefa');
                            updateAnalytics();
                        }
                    } catch (error) {
                        console.error('Erro ao excluir tarefa:', error);
                        showErrorNotification('Ocorreu um erro ao excluir a tarefa.');
                    }
                }, 400); // Tempo para coincidir com a duração da animação
            },
            'delete' // Tipo especial para ações de exclusão
        );
        
        return true;
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        showErrorNotification('Ocorreu um erro ao excluir a tarefa.');
        return false;
    }
}

// Versão aprimorada da função para adicionar feedback visual para tarefas
function createTaskRow(task) {
    const row = document.createElement('tr');
    row.className = 'task-row';
    
    // Adicionar classe baseada no status
    if (task.status) {
        row.classList.add(`status-${task.status}`);
    }
    
    // Marcar tarefas fixadas
    if (task.pinned) {
        row.classList.add('pinned');
    }
    
    // Adicionar id da tarefa como atributo para facilitar manipulação
    row.setAttribute('data-task-id', task.id);
    
    // Adicionar classe de animação para novas tarefas
    row.classList.add('adding');
    
    // Remover a classe após a animação
    setTimeout(() => {
        row.classList.remove('adding');
    }, 500);
    
    // Adicionar células
    row.innerHTML = `
        <td class="period-cell">${getTaskPeriodText(task.category)}</td>
        <td class="title-cell">${task.title || task.text}</td>
        <td class="date-cell">
            <i class="far fa-calendar-alt"></i>
            ${formatDateTime(task.startDate)}
        </td>
        <td class="date-cell">
            <i class="far fa-calendar-check"></i>
            ${formatDateTime(task.endDate)}
        </td>
        <td class="status-cell">
            <select class="status-select status-${task.status}" data-task-id="${task.id}">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Em andamento</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Concluído</option>
                <option value="finished" ${task.status === 'finished' ? 'selected' : ''}>Finalizado</option>
                <option value="late" ${task.status === 'late' ? 'selected' : ''}>Em atraso</option>
            </select>
        </td>
        <td class="actions-cell">
            <button class="edit-button" title="Editar Tarefa">
                <i class="fas fa-edit"></i>
            </button>
            <button class="comments-button" title="Comentários">
                <i class="far fa-comment-alt"></i>
                <span class="comments-count" style="display: none;">0</span>
            </button>
            <button class="pin-button" title="${task.pinned ? 'Desafixar' : 'Fixar'} Tarefa">
                <i class="fas fa-thumbtack ${task.pinned ? 'pinned' : ''}"></i>
            </button>
            <button class="delete-button" title="Excluir Tarefa">
                <i class="fas fa-trash-alt" style="color: #ef4444;"></i>
            </button>
        </td>
    `;
    
    // Obter referências para elementos
    const statusSelect = row.querySelector('.status-select');
    const editButton = row.querySelector('.edit-button');
    const commentsButton = row.querySelector('.comments-button');
    const commentsCount = row.querySelector('.comments-count');
    const pinButton = row.querySelector('.pin-button');
    const deleteButton = row.querySelector('.delete-button');
    
    // Configurar evento para alteração de status
    statusSelect.addEventListener('change', function(e) {
        const newStatus = e.target.value;
        const taskId = e.target.getAttribute('data-task-id');
        
        console.log(`Alterando status da tarefa ${taskId} para ${newStatus}`);
        
        // Adicionar classe para destacar a alteração
        row.classList.add('highlight-success');
        
        // Remover classe após a animação
        setTimeout(() => {
            row.classList.remove('highlight-success');
        }, 1500);
        
        // Chamar a nova função robusta de atualização de status em vez da função original
        if (typeof window.forceUpdateTaskStatus === 'function') {
            window.forceUpdateTaskStatus(taskId, newStatus);
        } else if (typeof window.handleTaskStatusChange === 'function') {
            window.handleTaskStatusChange(taskId, newStatus);
        } else {
        updateTaskStatus(taskId, newStatus);
        }
    });
    
    // Carregar contagem de comentários
    loadCommentsCount(task.id).then(count => {
        if (count > 0) {
            commentsCount.textContent = count;
            commentsCount.style.display = 'flex';
        }
    });
    
    return { row, statusSelect, editButton, commentsButton, commentsCount, pinButton, deleteButton };
}

// Função para forçar a sincronização com o servidor
async function syncTasksWithServer() {
    try {
        console.log('Iniciando sincronização com o servidor...');
        showInfoNotification('Sincronizando com o servidor...');
        
        // Verificar conexão com Supabase
        const isConnected = await window.supabaseApi.checkSupabaseConnection();
        
        if (!isConnected) {
            console.error('Não foi possível conectar ao Supabase para sincronização');
            showErrorNotification('Falha na conexão com o servidor. Tente novamente mais tarde.');
            return false;
        }
        
        // Armazenar cópia das tarefas locais para uso posterior na mesclagem
        const localTasks = JSON.parse(JSON.stringify(window.tasks));
        
        // Criar um mapa das tarefas locais para facilitar a comparação
        const localTasksMap = {};
        Object.keys(localTasks).forEach(category => {
            localTasks[category].forEach(task => {
                localTasksMap[task.id] = {
                    category,
                    task: { ...task },
                    updatedAt: task.updatedAt ? new Date(task.updatedAt).getTime() : 0
                };
            });
        });
        
        // Obter tarefas do servidor
        console.log('Buscando tarefas do servidor...');
        const serverTasks = await window.supabaseApi.fetchTasks();
        
        if (!serverTasks) {
            console.error('Falha ao buscar tarefas do servidor');
            showErrorNotification('Falha ao sincronizar com o servidor');
            return false;
        }
        
        // Contar tarefas locais antes da sincronização
        const localTasksCount = Object.keys(localTasks).reduce((count, category) => {
            return count + localTasks[category].length;
        }, 0);
        
        // Contar tarefas do servidor
        const serverTasksCount = Object.keys(serverTasks).reduce((count, category) => {
            return count + serverTasks[category].length;
        }, 0);
        
        console.log(`Comparando tarefas - Local: ${localTasksCount}, Servidor: ${serverTasksCount}`);
        
        // Tarefas para atualizar no servidor após a mesclagem
        const tasksToUpdateOnServer = [];
        
        // Mesclar tarefas do servidor com locais, preservando alterações locais mais recentes
        Object.keys(serverTasks).forEach(category => {
            serverTasks[category].forEach((serverTask, index) => {
                const localTaskInfo = localTasksMap[serverTask.id];
                
                // Se a tarefa existe localmente, verificar qual versão é mais recente
                if (localTaskInfo) {
                    const serverUpdatedAt = serverTask.updatedAt ? new Date(serverTask.updatedAt).getTime() : 0;
                    
                    // Se a versão local foi atualizada mais recentemente, manter seus dados (especialmente o status)
                    if (localTaskInfo.updatedAt > serverUpdatedAt) {
                        console.log(`Tarefa ${serverTask.id} (${serverTask.text}) mais recente localmente - preservando status local: ${localTaskInfo.task.status}`);
                        
                        // Atualizar a versão do servidor com os dados locais
                        serverTasks[category][index] = { ...serverTask, ...localTaskInfo.task };
                        
                        // Adicionar à lista para atualizar no servidor posteriormente
                        tasksToUpdateOnServer.push({
                            id: serverTask.id,
                            updates: {
                                status: localTaskInfo.task.status,
                                updatedAt: localTaskInfo.task.updatedAt,
                                ...(localTaskInfo.task.completedAt ? { completedAt: localTaskInfo.task.completedAt } : {}),
                                ...(localTaskInfo.task.finishedAt ? { finishedAt: localTaskInfo.task.finishedAt } : {})
                            }
                        });
                    } else {
                        console.log(`Tarefa ${serverTask.id} (${serverTask.text}) mais recente no servidor - usando status do servidor: ${serverTask.status}`);
                    }
                }
            });
        });
        
        // Verificar tarefas locais que não existem no servidor (possivelmente novas tarefas criadas offline)
        const serverTaskIds = new Set();
        Object.keys(serverTasks).forEach(category => {
            serverTasks[category].forEach(task => {
                serverTaskIds.add(task.id);
            });
        });
        
        // Encontrar tarefas locais que não existem no servidor
        const newLocalTasks = [];
        Object.keys(localTasks).forEach(category => {
            localTasks[category].forEach(task => {
                if (!serverTaskIds.has(task.id)) {
                    newLocalTasks.push({ category, task });
                }
            });
        });
        
        // Adicionar novas tarefas locais ao servidor e à estrutura mesclada
        if (newLocalTasks.length > 0) {
            console.log(`Encontradas ${newLocalTasks.length} novas tarefas locais para adicionar ao servidor`);
            
            for (const { category, task } of newLocalTasks) {
                // Adicionar à estrutura mesclada
                if (!serverTasks[category]) {
                    serverTasks[category] = [];
                }
                serverTasks[category].push(task);
                
                // Tentar adicionar ao servidor
                try {
                    const result = await window.supabaseApi.addTask(task);
                    if (result) {
                        console.log(`Tarefa ${task.id} (${task.text}) adicionada ao servidor com sucesso`);
                    } else {
                        console.warn(`Não foi possível adicionar a tarefa ${task.id} (${task.text}) ao servidor`);
                    }
                } catch (error) {
                    console.error(`Erro ao adicionar tarefa ${task.id} ao servidor:`, error);
                }
            }
        }
        
        // Atualizar tarefas no servidor com as alterações locais mais recentes
        if (tasksToUpdateOnServer.length > 0) {
            console.log(`Enviando ${tasksToUpdateOnServer.length} atualizações para o servidor...`);
            
            for (const { id, updates } of tasksToUpdateOnServer) {
                try {
                    await window.supabaseApi.updateTask(id, updates);
                    console.log(`Atualização para o servidor da tarefa ${id} concluída com sucesso`);
                } catch (error) {
                    console.error(`Erro ao atualizar tarefa ${id} no servidor:`, error);
                }
            }
        }
        
        // Atualizar o estado local com os dados mesclados
        window.tasks = serverTasks;
        
        // Salvar no localStorage
        localStorage.setItem('tasks', JSON.stringify(window.tasks));
        
        // Atualizar a interface
        renderTasks();
        
        // Atualizar os gráficos
        if (typeof updateAnalytics === 'function') {
            updateAnalytics();
        }
        
        // Atualizar o calendário
        if (typeof loadCalendarTasks === 'function') {
            loadCalendarTasks();
        }
        
        console.log('Sincronização com o servidor concluída');
        showSuccessNotification('Sincronização com o servidor concluída');
        return true;
    } catch (error) {
        console.error('Erro durante a sincronização:', error);
        showErrorNotification('Erro durante a sincronização com o servidor');
        return false;
    }
}

// Adicionar função de notificação informativa
function showInfoNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification info';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Função aprimorada para alternar o estado de fixação de uma tarefa
function toggleTaskPin(taskId) {
    try {
        // Verificar se window.tasks está inicializado
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            return false;
        }
        
        // Buscar a tarefa em todas as categorias
        let taskFound = false;
        let task = null;
        let taskCategory = null;
        let taskIndex = -1;
        
        Object.keys(window.tasks).forEach(category => {
            const index = window.tasks[category].findIndex(t => t.id === taskId);
            
            if (index !== -1) {
                task = window.tasks[category][index];
                taskCategory = category;
                taskIndex = index;
                taskFound = true;
            }
        });
        
        if (!taskFound) {
            console.error('Tarefa não encontrada:', taskId);
            return false;
        }
        
        // Animar o elemento antes da mudança
        const taskElements = document.querySelectorAll(`[data-task-id="${taskId}"]`);
        
        // Animar o botão de pin
        const pinButtons = document.querySelectorAll(`[data-task-id="${taskId}"] .pin-button i`);
        pinButtons.forEach(icon => {
            icon.animate([
                { transform: 'rotate(0deg) scale(1)' },
                { transform: 'rotate(90deg) scale(1.5)' },
                { transform: task.pinned ? 'rotate(0deg) scale(1)' : 'rotate(-45deg) scale(1)' }
            ], {
                duration: 400,
                easing: 'ease-out',
                fill: 'forwards'
            });
        });
        
        // Adicionar efeito de pulsação nas linhas da tarefa
        taskElements.forEach(element => {
            element.animate([
                { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(138, 43, 226, 0)' },
                { transform: 'scale(1.01)', boxShadow: '0 0 0 3px rgba(138, 43, 226, 0.2)' },
                { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(138, 43, 226, 0)' }
            ], {
                duration: 600,
                easing: 'ease-out'
            });
        });
        
        // Inverter o estado de fixação
        task.pinned = !task.pinned;
        task.updatedAt = new Date().toISOString();
        
        // Atualizar a tarefa na lista
        window.tasks[taskCategory][taskIndex] = task;
        
        // Animar alteração para tarefa fixada/desafixada após breve delay
        setTimeout(() => {
            taskElements.forEach(element => {
                if (task.pinned) {
                    element.classList.add('pinned');
                    // Animar ao fixar
                    element.animate([
                        { backgroundColor: 'rgba(138, 43, 226, 0.05)' },
                        { backgroundColor: 'rgba(138, 43, 226, 0.15)' },
                        { backgroundColor: 'rgba(138, 43, 226, 0.05)' }
                    ], {
                        duration: 800,
                        easing: 'ease-out'
                    });
                } else {
                    element.classList.remove('pinned');
                }
            });
        }, 100);
        
        // Salvar as tarefas no localStorage
        saveTasks();
        
        // Mostrar notificação adequada com ícone
        if (task.pinned) {
            showSuccessNotification('<i class="fas fa-thumbtack"></i> Tarefa fixada com sucesso!');
        } else {
            showSuccessNotification('<i class="fas fa-thumbtack fa-rotate-90"></i> Tarefa desafixada com sucesso!');
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao alternar fixação da tarefa:', error);
        showErrorNotification('Ocorreu um erro ao atualizar a tarefa.');
        return false;
    }
}

// Configurar os filtros de período e status
function setupFilters() {
    // Configurar os filtros existentes baseados em radio buttons
    document.querySelectorAll('input[name="status-filter"]').forEach(radio => {
        radio.addEventListener('change', () => {
            console.log('Filtro de status alterado para:', radio.value);
            
            // Configurar filtros do dashboard para corresponder à seleção de radio
            if (window.dashboardFilters && typeof window.dashboardFilters.setFiltersFromRadio === 'function') {
                window.dashboardFilters.setFiltersFromRadio(radio.value);
            } else {
                // Renderizar diretamente se os novos filtros não estiverem disponíveis
                renderTasks();
            }
        });
    });
}

// Função para aplicar filtro de status programaticamente
function performFilterByStatus(status) {
    const statusRadio = document.querySelector(`input[name="status-filter"][value="${status}"]`);
    if (statusRadio) {
        statusRadio.checked = true;
        renderTasks();
    }
}

// Função para carregar tarefas (estava faltando)
async function loadTasks() {
    try {
        console.log('Iniciando carregamento de tarefas...');
        
        // Mostrar estado de carregamento
        showLoadingState();
        
        // Tentar obter as tarefas do Supabase
        let tasksLoaded = false;
        
        try {
            // Verificar conexão com Supabase
            const isConnected = await window.supabaseApi.checkSupabaseConnection();
            
            if (isConnected) {
                console.log('Conectado ao Supabase, buscando tarefas...');
                const fetchedTasks = await window.supabaseApi.fetchTasks();
                if (fetchedTasks) {
                    window.tasks = fetchedTasks;
                    
                    // Guardar uma cópia no localStorage para backup
                    localStorage.setItem('tasks', JSON.stringify(window.tasks));
                    
                    console.log('Tarefas carregadas do Supabase com sucesso:', 
                        Object.keys(window.tasks).reduce((total, key) => total + window.tasks[key].length, 0), 
                        'tarefas encontradas');
                    
                    tasksLoaded = true;
                    showSuccessNotification('Tarefas carregadas do servidor com sucesso!');
                }
            } else {
                console.error('Não foi possível conectar ao Supabase');
                throw new Error('Erro de conexão com o Supabase');
            }
        } catch (error) {
            console.error('Erro ao carregar tarefas do Supabase:', error);
            showWarningNotification('Não foi possível conectar ao servidor. Usando dados locais.');
        }
        
        // Se não conseguiu carregar do Supabase, tentar do localStorage
        if (!tasksLoaded) {
            console.log('Tentando carregar tarefas do localStorage...');
            const storedTasks = localStorage.getItem('tasks');
            
            if (storedTasks) {
                try {
                    window.tasks = JSON.parse(storedTasks);
                    console.log('Tarefas carregadas do localStorage com sucesso:', 
                        Object.keys(window.tasks).reduce((total, key) => total + window.tasks[key].length, 0), 
                        'tarefas encontradas');
                    
                    tasksLoaded = true;
                } catch (e) {
                    console.error('Erro ao parsear tarefas do localStorage:', e);
                }
            }
        }
        
        // Se ainda não conseguiu carregar, inicializar vazio
        if (!tasksLoaded) {
            console.log('Inicializando lista de tarefas vazia');
            window.tasks = {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
    } catch (error) {
        console.error('Erro geral ao carregar tarefas:', error);
        showErrorNotification('Erro ao carregar tarefas. Verifique o console para mais detalhes.');
        
        // Garantir que window.tasks exista mesmo em caso de erro
        window.tasks = window.tasks || {
            day: [],
            week: [],
            month: [],
            year: []
        };
    } finally {
        // Ocultar estado de carregamento, independentemente do resultado
        hideLoadingState();
        
        // Renderizar as tarefas, mesmo que esteja vazio
        renderTasks();
    }
}

// Função para configurar os ouvintes de eventos de formulário
function setupTaskForm() {
    const taskForm = document.getElementById('add-task-form');
    const taskTitle = document.getElementById('task-title');
    const taskDescription = document.getElementById('task-description');
    const taskStartDate = document.getElementById('task-start-date');
    const taskEndDate = document.getElementById('task-end-date');
    const taskCategory = document.getElementById('task-category');
    
    // Preencher a data atual
    if (taskStartDate) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;
        
        taskStartDate.value = today;
        
        // Definir a data final como 1 semana a partir de hoje por padrão
        if (taskEndDate) {
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);
            
            const yyyy2 = nextWeek.getFullYear();
            const mm2 = String(nextWeek.getMonth() + 1).padStart(2, '0');
            const dd2 = String(nextWeek.getDate()).padStart(2, '0');
            const nextWeekFormatted = `${yyyy2}-${mm2}-${dd2}`;
            
            taskEndDate.value = nextWeekFormatted;
        }
    }
    
    // Eventos de formulário
    if (taskForm) {
        // Remover manipulador antigo para evitar duplicação
        taskForm.removeEventListener('submit', handleAddTaskEvent);
        
        // Adicionar novo manipulador de eventos
        taskForm.addEventListener('submit', handleAddTaskEvent);
    }
}

// Função para adicionar uma nova tarefa
async function addNewTask(newTask) {
    try {
        // Primeiro tentar salvar no Supabase
        let savedTask = null;
        try {
            // Aqui chamamos a função do supabase-config.js
            savedTask = await window.supabaseApi.addTask(newTask);
            console.log('Tarefa salva no Supabase:', savedTask);
        } catch (error) {
            console.error('Erro ao salvar no Supabase:', error);
        }
        
        // Se falhou no Supabase, criar com ID local
        if (!savedTask) {
            savedTask = { ...newTask, id: 'local_' + Date.now() };
            console.log('Criando tarefa com ID local:', savedTask);
            showWarningNotification('Tarefa salva apenas localmente. A sincronização falhará.');
        } else {
            showSuccessNotification('Tarefa adicionada com sucesso!');
        }
        
        // Adicionar ao estado local e salvar
        if (!window.tasks[savedTask.category]) {
            window.tasks[savedTask.category] = [];
        }
        
        window.tasks[savedTask.category].push(savedTask);
        saveTasks();
        
        // Atualizar a UI
        renderTasks();
        
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
        showErrorNotification('Erro ao adicionar tarefa');
    }
}

// Função para atualizar uma tarefa existente
async function updateExistingTask(taskId, updatedData) {
    try {
        let taskFound = false;
        let originalCategory = null;
        
        // Encontrar a tarefa e sua categoria
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                taskFound = true;
                originalCategory = category;
            }
        });
        
        if (!taskFound) {
            console.error('Tarefa não encontrada para atualização:', taskId);
            showErrorNotification('Tarefa não encontrada');
            return;
        }
        
        // Tentar atualizar no Supabase
        try {
            await window.supabaseApi.updateTask(taskId, updatedData);
            console.log('Tarefa atualizada no Supabase');
        } catch (error) {
            console.error('Erro ao atualizar no Supabase:', error);
            showWarningNotification('Atualização local bem-sucedida, mas falhou no servidor');
        }
        
        // Atualizar localmente
        const taskIndex = window.tasks[originalCategory].findIndex(t => t.id === taskId);
        
        // Se a categoria mudou, mover a tarefa
        if (originalCategory !== updatedData.category) {
            // Remover da categoria original
            const taskToMove = window.tasks[originalCategory].splice(taskIndex, 1)[0];
            
            // Atualizar dados da tarefa
            const updatedTask = { ...taskToMove, ...updatedData };
            
            // Adicionar na nova categoria
            if (!window.tasks[updatedData.category]) {
                window.tasks[updatedData.category] = [];
            }
            window.tasks[updatedData.category].push(updatedTask);
        } else {
            // Atualizar na mesma categoria
            window.tasks[originalCategory][taskIndex] = { 
                ...window.tasks[originalCategory][taskIndex], 
                ...updatedData 
            };
        }
        
        // Salvar e atualizar UI
        saveTasks();
        renderTasks();
        
        showSuccessNotification('Tarefa atualizada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        showErrorNotification('Erro ao atualizar tarefa');
    }
}

// Função para configurar os event listeners
function setupEventListeners() {
    // Limpar a variável global para não duplicar os event listeners
    if (window.eventListenersSet) return;
    
    // Evento para novo botão de tarefa
    if (newTaskBtn) {
        newTaskBtn.addEventListener('click', prepareNewTask);
    }
    
    // Eventos para fechar o modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Evento para o modal de fundo
    if (taskFormModal) {
        taskFormModal.addEventListener('click', (e) => {
            if (e.target === taskFormModal) closeModal();
        });
    }
    
    // Configurar o formulário com o manipulador de evento correto
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        // Remover qualquer event listener antigo e adicionar o novo
        addTaskForm.removeEventListener('submit', addTask); // Remover a referência antiga
        addTaskForm.addEventListener('submit', handleAddTaskEvent); // Adicionar a referência nova
    }
    
    // Adicionar botão de sincronização no cabeçalho
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('sync-button')) {
        const syncButton = document.createElement('button');
        syncButton.id = 'sync-button';
        syncButton.className = 'sync-button';
        syncButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
        syncButton.title = 'Sincronizar com o servidor';
        
        syncButton.addEventListener('click', () => {
            // Mostrar animação de rotação durante a sincronização
            syncButton.classList.add('rotating');
            
            // Chamar a função de sincronização
            syncTasksWithServer()
                .finally(() => {
                    // Remover a animação de rotação
                    setTimeout(() => {
                        syncButton.classList.remove('rotating');
                    }, 500);
                });
        });
        
        headerActions.prepend(syncButton);
    }
    
    // Marcar que os event listeners foram configurados
    window.eventListenersSet = true;
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando a aplicação TaskPRO...');
    
    // Configuração da lupa de pesquisa
    const searchIcon = document.getElementById('search-icon');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const headerSearch = document.getElementById('header-search');
    
    if (searchIcon && searchInput && searchButton && headerSearch) {
        // Inicialmente, ajustar o estilo da barra de pesquisa para compacta
        headerSearch.style.maxWidth = '50px';
        searchInput.style.display = 'none';
        searchButton.style.display = 'none';
        
        // Adicionar evento de clique ao ícone de lupa
        searchIcon.addEventListener('click', function() {
            // Expandir a barra de pesquisa
            headerSearch.style.maxWidth = '1000px';
            searchInput.style.display = 'block';
            searchButton.style.display = 'flex';
            searchInput.focus();
        });
        
        // Fechar a pesquisa quando clicar fora
        document.addEventListener('click', function(event) {
            if (!headerSearch.contains(event.target) && 
                headerSearch.style.maxWidth !== '50px') {
                // Verificar se o campo está vazio antes de colapsar
                if (!searchInput.value.trim()) {
                    headerSearch.style.maxWidth = '50px';
                    searchInput.style.display = 'none';
                    searchButton.style.display = 'none';
                }
            }
        });
        
        // Pesquisar ao clicar no botão
        searchButton.addEventListener('click', function() {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                filterTasks(searchTerm);
            }
        });
        
        // Pesquisar ao pressionar Enter
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = this.value.trim();
                if (searchTerm) {
                    filterTasks(searchTerm);
                }
            }
        });
    }
    
    // Carregar tarefas
    loadTasks();
    
    // Configurar navegação
    setupNavigation();
    
    // Configurar formulário de tarefas
    setupTaskForm();
    
    // Configurar badges de status
    if (typeof setupStatusBadges === 'function') {
    setupStatusBadges();
    }
    
    // Configurar filtros
    if (typeof setupFilters === 'function') {
    setupFilters();
    }
    
    // Configurar TODOS os botões de Nova Tarefa
    setupAllTaskButtons();
    
    // Renderizar tarefas iniciais
    renderTasks();
    
    // Outras inicializações
    setupEventListeners();
    
    // Executar verificação imediata de status das tarefas
    console.log('Executando verificação inicial de status das tarefas...');
    updateTasksStatus();
    
    // Configurar intervalos para atualização periódica (substitui o setInterval anterior)
    // Verificar status a cada minuto
    if (window._statusUpdateInterval) {
        clearInterval(window._statusUpdateInterval);
    }
    
    window._statusUpdateInterval = setInterval(updateTasksStatus, 60 * 1000); // A cada minuto
    console.log('Verificação automática de status configurada para execução a cada minuto');
    
    // Configurar sincronização automática com o servidor a cada 10 Minutos
    if (window._serverSyncInterval) {
        clearInterval(window._serverSyncInterval);
    }
    
    window._serverSyncInterval = setInterval(() => {
        console.log('Executando sincronização automática com o servidor...');
        syncTasksWithServer().catch(error => {
            console.error('Erro na sincronização automática:', error);
        });
    }, 60* 10 * 1000); // A cada 10 Minutos
    
    // Sincronizar quando a página voltar a ficar visível
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Página voltou a ficar visível, sincronizando com o servidor...');
            syncTasksWithServer().catch(error => {
                console.error('Erro na sincronização ao retornar à página:', error);
            });
            
            // Também verificar status das tarefas quando a página volta a ficar visível
            console.log('Verificando status das tarefas após retorno à página...');
            updateTasksStatus();
        }
    });
    
    console.log('Aplicação TaskPRO inicializada com sucesso!');
}); 

// Função para simulação de teste - marcar uma tarefa como concluída há X horas (para teste)
function simulateCompletedTask(taskId, hoursAgo = 2) {
    try {
        if (!window.tasks) {
            console.error('window.tasks não está inicializado');
            return false;
        }
        
        let taskFound = false;
        
        Object.keys(window.tasks).forEach(category => {
            const taskIndex = window.tasks[category].findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                const task = window.tasks[category][taskIndex];
                
                // Definir status como completed
                task.status = 'completed';
                
                // Definir completedAt para X horas atrás
                const hoursInMs = hoursAgo * 60 * 60 * 1000;
                const completedTime = new Date(new Date().getTime() - hoursInMs);
                task.completedAt = completedTime.toISOString();
                
                console.log(`Tarefa "${task.text}" simulada como concluída há ${hoursAgo} horas (${completedTime.toLocaleString()})`);
                
                // Atualizar a tarefa
                window.tasks[category][taskIndex] = task;
                taskFound = true;
                
                // Salvar no localStorage
                saveTasks();
                
                // Renderizar tarefas
                renderTasks();
                
                // Exibir notificação
                showInfoNotification(`Tarefa "${task.text}" simulada como concluída há ${hoursAgo} horas. Aguarde a verificação automática.`);
            }
        });
        
        return taskFound;
    } catch (error) {
        console.error('Erro ao simular tarefa concluída:', error);
        return false;
    }
}

// Console helper para facilitar teste no console do navegador
window.simulateCompletedTask = simulateCompletedTask;

// Controle de menu para dispositivos móveis e responsividade
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Verificar tamanho da tela e orientação, e aplicar ajustes responsivos
    function applyResponsiveAdjustments() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isLandscape = windowWidth > windowHeight;
        
        // Ajustes para dispositivos móveis
        if (windowWidth <= 768) {
            mobileMenuToggle.style.display = 'flex';
            
            // Aplicar classes para layout mobile
            document.body.classList.add('mobile-view');
            
            // Em dispositivos muito pequenos, fazer ajustes adicionais
            if (windowWidth <= 480) {
                document.body.classList.add('small-mobile-view');
                
                // Ajustes específicos para orientação
                if (isLandscape) {
                    document.body.classList.add('landscape-view');
                    document.body.classList.remove('portrait-view');
                } else {
                    document.body.classList.add('portrait-view');
                    document.body.classList.remove('landscape-view');
                }
            } else {
                document.body.classList.remove('small-mobile-view');
            }
        } else {
            // Desktop/tablet grande
            mobileMenuToggle.style.display = 'none';
            sidebar.classList.remove('show-mobile');
            document.body.classList.remove('mobile-view', 'small-mobile-view', 'landscape-view', 'portrait-view');
            
            // Ajustar para tablets
            if (windowWidth <= 1024) {
                document.body.classList.add('tablet-view');
            } else {
                document.body.classList.remove('tablet-view');
            }
        }
        
        // Ajustar altura dos contêineres para evitar problemas em telas pequenas
        adjustContainerHeights();
    }
    
    // Função para ajustar alturas de contêineres específicos
    function adjustContainerHeights() {
        // Ajustar altura das listas de tarefas para evitar sobreposição
        const taskLists = document.querySelectorAll('.task-list');
        if (taskLists.length > 0) {
            const windowHeight = window.innerHeight;
            const headerHeight = document.querySelector('.main-header')?.offsetHeight || 0;
            const pageHeaderHeight = document.querySelector('.page-header')?.offsetHeight || 0;
            
            const availableHeight = windowHeight - headerHeight - pageHeaderHeight - 100; // 100px para margens
            taskLists.forEach(list => {
                list.style.maxHeight = `${Math.max(300, availableHeight)}px`;
            });
        }
        
        // Ajustar modais conforme tamanho da tela
        adjustModalPositions();
    }
    
    // Ajustar posições de modais
    function adjustModalPositions() {
        const modals = document.querySelectorAll('.task-form, .comments-container, .confirm-box');
        const isMobile = window.innerWidth <= 768;
        
        modals.forEach(modal => {
            if (isMobile) {
                modal.style.maxHeight = '90vh';
            }
        });
    }
    
    // Alternar exibição da sidebar em dispositivos móveis
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('show-mobile');
        
        // Alternar ícone
        const icon = this.querySelector('i');
        if (sidebar.classList.contains('show-mobile')) {
            icon.className = 'fas fa-times';
            
            // Adicionar overlay para fechar o menu ao clicar fora
            if (!document.getElementById('sidebar-overlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'sidebar-overlay';
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('show-mobile');
                    icon.className = 'fas fa-bars';
                    this.remove();
                });
                document.body.appendChild(overlay);
            }
        } else {
            icon.className = 'fas fa-bars';
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.remove();
        }
    });
    
    // Verificar tamanho inicial da tela
    applyResponsiveAdjustments();
    
    // Verificar quando a tela for redimensionada ou girada
    window.addEventListener('resize', applyResponsiveAdjustments);
    window.addEventListener('orientationchange', applyResponsiveAdjustments);
    
    // Fechar o menu ao clicar em um link (apenas em dispositivos móveis)
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show-mobile');
                mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
                
                // Remover overlay
                const overlay = document.getElementById('sidebar-overlay');
                if (overlay) overlay.remove();
            }
        });
    });
});

// Função para exibir modal de confirmação elegante
function showConfirmDialog(title, message, confirmCallback, type = 'default') {
    // Criar o modal de confirmação
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    
    // Criar a caixa de confirmação
    const confirmBox = document.createElement('div');
    confirmBox.className = 'confirm-box';
    
    // Ícone com base no tipo
    let icon = 'question-circle';
    if (type === 'delete') icon = 'trash-alt';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    // Cabeçalho
    const header = document.createElement('div');
    header.className = 'confirm-header';
    header.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <h3>${title}</h3>
    `;
    
    // Conteúdo
    const body = document.createElement('div');
    body.className = 'confirm-body';
    body.innerHTML = message;
    
    // Rodapé com botões
    const footer = document.createElement('div');
    footer.className = 'confirm-footer';
    
    // Botão Cancelar
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel-action';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Botão Confirmar
    const confirmBtn = document.createElement('button');
    confirmBtn.className = type === 'delete' ? 'btn-confirm-action delete' : 'btn-confirm-action';
    confirmBtn.textContent = type === 'delete' ? 'Excluir' : 'Confirmar';
    confirmBtn.onclick = () => {
        document.body.removeChild(modal);
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    };
    
    // Montar o modal
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    
    confirmBox.appendChild(header);
    confirmBox.appendChild(body);
    confirmBox.appendChild(footer);
    
    modal.appendChild(confirmBox);
    document.body.appendChild(modal);
    
    // Focar no botão Cancelar por segurança
    cancelBtn.focus();
}

// Função para converter a categoria da tarefa em texto legível
function getTaskPeriodText(category) {
    const periodTexts = {
        day: 'Dia',
        week: 'Semana',
        month: 'Mês',
        year: 'Ano'
    };
    
    return periodTexts[category] || category;
}

// Função para detectar tipo e modelo de dispositivo
function detectDeviceType() {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /(iPad|tablet|Tablet|PlayBook)|(Android(?!.*Mobile))/i.test(ua);
    const isIPad = /iPad/i.test(ua) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream);
    
    // Detectar iPhone modelo X ou superior (com notch)
    const isIPhoneX = /iPhone/i.test(ua) && 
                      (window.screen.height >= 812 || window.screen.width >= 812);
    
    return {
        mobile: isMobile && !isTablet,
        tablet: isTablet,
        iPad: isIPad,
        iPhoneX: isIPhoneX
    };
}

// Função para otimizar layout por dispositivo
function optimizeLayoutForDevice() {
    const device = detectDeviceType();
    const htmlElement = document.documentElement;
    
    // Adicionar classes ao HTML para CSS específico de dispositivo
    if (device.mobile) htmlElement.classList.add('device-mobile');
    if (device.tablet) htmlElement.classList.add('device-tablet');
    if (device.iPad) htmlElement.classList.add('device-ipad');
    if (device.iPhoneX) htmlElement.classList.add('device-iphonex');
    
    // Ajustes específicos para iPad
    if (device.iPad) {
        // Ajustar espaçamento para melhor uso do espaço em tela
        document.querySelectorAll('.task-list').forEach(el => {
            el.style.maxHeight = '500px';
        });
        
        // Ativar layout de duas colunas no modo paisagem para iPad
        window.addEventListener('orientationchange', adjustIPadLayout);
        adjustIPadLayout();
    }
    
    // Ajustes específicos para iPhone X e modelos com notch
    if (device.iPhoneX) {
        document.body.classList.add('has-notch');
        
        // Adicionar padding seguro nas áreas afetadas pelo notch e barras de sistema
        const safeAreaStyle = document.createElement('style');
        safeAreaStyle.innerHTML = `
            .mobile-menu-toggle {
                top: env(safe-area-inset-top, 20px);
                left: env(safe-area-inset-left, 20px);
            }
            .sidebar {
                padding-top: env(safe-area-inset-top, 32px);
            }
            .main-header {
                padding-top: env(safe-area-inset-top, 16px);
            }
            .notification {
                bottom: env(safe-area-inset-bottom, 20px);
            }
        `;
        document.head.appendChild(safeAreaStyle);
    }
}

// Ajustar layout para iPads conforme orientação
function adjustIPadLayout() {
    if (window.orientation === 90 || window.orientation === -90) {
        // Modo paisagem - duas colunas
        document.body.classList.add('ipad-landscape');
        document.body.classList.remove('ipad-portrait');
        
        // Ajustar layout de colunas no modo paisagem
        const taskColumns = document.querySelector('.task-columns');
        if (taskColumns) {
            taskColumns.style.gridTemplateColumns = 'repeat(auto-fit, minmax(350px, 1fr))';
        }
    } else {
        // Modo retrato - uma coluna
        document.body.classList.add('ipad-portrait');
        document.body.classList.remove('ipad-landscape');
        
        // Ajustar para layout vertical no modo retrato
        const taskColumns = document.querySelector('.task-columns');
        if (taskColumns) {
            taskColumns.style.gridTemplateColumns = 'minmax(280px, 1fr)';
        }
    }
}

// Inicializar otimização de layout para dispositivos
document.addEventListener('DOMContentLoaded', function() {
    // Chamar após carregar o DOM
    optimizeLayoutForDevice();
    
    // Adicionar evento de orientação
    window.addEventListener('orientationchange', function() {
        // Pequeno delay para garantir que as dimensões da janela estejam atualizadas
        setTimeout(function() {
            applyResponsiveAdjustments();
        }, 100);
    });
});

/**
 * Detecta o navegador usado e aplica classes correspondentes ao body
 * para tratamento específico de CSS para cada navegador
 */
function detectBrowser() {
    const userAgent = navigator.userAgent;
    const html = document.documentElement;
    
    // Detectar navegadores
    const isChrome = /Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isEdge = /Edge|Edg/.test(userAgent);
    const isIE = /Trident|MSIE/.test(userAgent);
    const isOpera = /OPR|Opera/.test(userAgent);
    
    // Aplicar classes ao body
    if (isChrome) document.body.classList.add('browser-chrome');
    if (isFirefox) document.body.classList.add('browser-firefox');
    if (isSafari) document.body.classList.add('browser-safari');
    if (isEdge) document.body.classList.add('browser-edge');
    if (isIE) document.body.classList.add('browser-ie');
    if (isOpera) document.body.classList.add('browser-opera');
    
    // Detectar dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    if (isMobile) {
        document.body.classList.add('mobile-device');
        
        // Detectar tipo específico de dispositivo
        if (/iPhone/.test(userAgent)) document.body.classList.add('device-iphone');
        if (/iPad/.test(userAgent)) document.body.classList.add('device-ipad');
        if (/Android/.test(userAgent)) document.body.classList.add('device-android');
        
        // Verificar se o dispositivo tem notch (para iPhones modernos)
        if (/iPhone/.test(userAgent) && (window.screen.height >= 812 || window.screen.width >= 812)) {
            document.body.classList.add('has-notch');
        }
    }
    
    console.log('Navegador detectado:', 
        isChrome ? 'Chrome' : 
        isFirefox ? 'Firefox' : 
        isSafari ? 'Safari' : 
        isEdge ? 'Edge' : 
        isIE ? 'Internet Explorer' : 
        isOpera ? 'Opera' : 'Outro');
}

/**
 * Gerencia a viewport para dispositivos móveis
 * para garantir que o conteúdo seja exibido corretamente
 */
function setupViewport() {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Ajustar viewport para dispositivo móvel
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        
        // Ajuste específico para orientação
        window.addEventListener('orientationchange', adjustForOrientation);
        adjustForOrientation();
    }
}

/**
 * Ajusta o layout baseado na orientação do dispositivo
 */
function adjustForOrientation() {
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    document.body.classList.remove('portrait-view', 'landscape-view');
    document.body.classList.add(`${orientation}-view`);
    
    // Ajustes específicos para iPad
    if (document.body.classList.contains('device-ipad')) {
        document.body.classList.remove('ipad-portrait', 'ipad-landscape');
        document.body.classList.add(`ipad-${orientation}`);
    }
    
    console.log(`Orientação ajustada: ${orientation}`);
}

/**
 * Aplica polyfills para navegadores mais antigos
 */
function applyPolyfills() {
    // Polyfill para Element.matches
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }
    
    // Polyfill para Element.closest
    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
            let el = this;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }
    
    // Polyfill para forEach em NodeList para IE
    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
}

/**
 * Corrige problemas de layout e garante que a página seja exibida corretamente
 */
function fixLayoutIssues() {
    // Ajustar largura do conteúdo principal
    const mainContent = document.querySelector('.main-content');
    const appContainer = document.querySelector('.app-container');
    
    if (mainContent && appContainer) {
        // Garantir que o conteúdo principal não seja cortado
        if (window.innerWidth <= 768) {
            mainContent.style.width = '100%';
            mainContent.style.marginLeft = '0';
            appContainer.style.flexDirection = 'column';
        } else {
            mainContent.style.width = 'calc(100% - 280px)';
            mainContent.style.marginLeft = '280px';
            appContainer.style.flexDirection = 'row';
        }
    }
    
    // Garantir que as tabelas sejam visualizáveis
    const tableContainers = document.querySelectorAll('.task-table-container');
    tableContainers.forEach(container => {
        container.style.maxWidth = '100%';
        container.style.overflowX = 'auto';
    });
    
    // Ajustar cards de análise para não causarem overflow
    const analyticsCards = document.querySelectorAll('.analytics-card');
    analyticsCards.forEach(card => {
        card.style.minWidth = window.innerWidth <= 768 ? 'auto' : '250px';
    });
    
    // Verificar se há overflow horizontal e corrigir
    const bodyWidth = document.body.scrollWidth;
    const windowWidth = window.innerWidth;
    
    if (bodyWidth > windowWidth) {
        console.log('Detectado overflow horizontal. Ajustando layout...');
        document.body.style.overflowX = 'auto';
        document.body.style.minWidth = '320px';
    }
}

// Inicializar detecção de navegador e configuração de viewport no carregamento
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar estado de carregamento
    showLoadingState();
    
    try {
        // Verificar conexão com Supabase
        // ... código existente
        
        // Adicionar novas funções de compatibilidade
        detectBrowser();
        setupViewport();
        applyPolyfills();
        fixLayoutIssues(); // Adicionar correção de layout
        
        // Adicionar listener para redimensionamento da janela
        window.addEventListener('resize', function() {
            adjustForOrientation();
            fixLayoutIssues(); // Corrigir layout também ao redimensionar
            
            // Ajusta layout para diferentes tamanhos de tela
            if (window.innerWidth <= 768) {
                document.body.classList.add('mobile-view');
            } else {
                document.body.classList.remove('mobile-view');
            }
            
            // Detecta tablets
            if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
                document.body.classList.add('device-tablet');
            } else {
                document.body.classList.remove('device-tablet');
            }
        });
        
        // Disparar evento de redimensionamento para aplicar configurações iniciais
        window.dispatchEvent(new Event('resize'));
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showErrorNotification('Ocorreu um erro ao inicializar a aplicação.');
    }
});

// Adicionar funcionalidade para a barra de pesquisa
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da barra de pesquisa
    const searchIcon = document.getElementById('search-icon');
    const headerSearch = document.getElementById('header-search');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // Ao clicar na lupa, expandir a barra de pesquisa
    if (searchIcon && headerSearch && searchInput) {
        // Função para expandir a barra de pesquisa
        function expandSearch() {
            headerSearch.classList.add('expanded');
            
            // Não mostrar o botão de pesquisa (removido)
            if (searchButton) {
                searchButton.style.display = 'none';
            }
            
            // Mostrar o input e focar
            searchInput.style.display = 'block';
            
            // Remover qualquer estilo inline que possa interferir
            headerSearch.style.border = 'none';
            headerSearch.style.backgroundColor = 'transparent';
            headerSearch.style.boxShadow = 'none';
            
            // Determinar a largura adequada com base no tamanho da tela
            const windowWidth = window.innerWidth;
            
            if (windowWidth <= 480) {
                headerSearch.style.width = '95%';
                headerSearch.style.minWidth = '180px';
            } else if (windowWidth <= 768) {
                headerSearch.style.width = '90%';
                headerSearch.style.minWidth = '200px';
            } else {
                headerSearch.style.width = '300px';
                headerSearch.style.minWidth = '250px';
            }
            
            // Focar no campo de pesquisa
            setTimeout(() => {
                searchInput.focus();
            }, 100);
        }
        
        // Função para recolher a barra de pesquisa
        function collapseSearch() {
            headerSearch.classList.remove('expanded');
            if (searchButton) {
                searchButton.style.display = 'none';
            }
            searchInput.style.display = 'none';
            headerSearch.style.width = '';
            headerSearch.style.minWidth = '';
            headerSearch.style.border = '';
            headerSearch.style.backgroundColor = '';
            headerSearch.style.boxShadow = '';
        }
        
        // Adicionar evento de clique ao ícone de lupa
        searchIcon.addEventListener('click', function(e) {
            // Evitar propagação do clique
            e.stopPropagation();
            expandSearch();
        });
        
        // Fechar a pesquisa quando clicar fora
        document.addEventListener('click', function(event) {
            // Se o clique for fora da barra de pesquisa
            if (!headerSearch.contains(event.target)) {
                // Se o campo estiver vazio, fechar
                if (!searchInput.value.trim()) {
                    collapseSearch();
                }
            }
        });
        
        // Se pressionar Escape enquanto a pesquisa está ativa, fechar
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                collapseSearch();
                searchInput.value = '';
                searchInput.blur();
            }
        });
        
        // Ajustar o tamanho da barra de pesquisa ao redimensionar a janela
        window.addEventListener('resize', function() {
            if (headerSearch.classList.contains('expanded')) {
                expandSearch();
            }
        });
    }
});

// Função para atualizar periodicamente os botões de Nova Tarefa
function setupPeriodicButtonCheck() {
    // Verificar e atualizar os botões a cada 2 segundos
    const buttonCheckInterval = setInterval(() => {
        const newTaskBtns = safeQuerySelectorAll([
            '#new-task-btn',
            '.new-task-btn',
            '#new-task-btn-calendar',
            '.new-task-button',
            '.column-add-btn'
        ].join(', '));
        
        // Verificar se há algum botão sem event listener
        newTaskBtns.forEach(button => {
            // Verificar se o botão já tem o atributo que indica que está configurado
            if (!button.hasAttribute('data-task-btn-configured')) {
                console.log('Detectado novo botão de tarefa não configurado:', button);
                
                // Remover event listeners antigos (precaução)
                button.removeEventListener('click', prepareNewTask);
                
                // Adicionar novo event listener
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Botão de nova tarefa clicado (detectado dinamicamente)');
                    prepareNewTask();
                });
                
                // Marcar o botão como configurado
                button.setAttribute('data-task-btn-configured', 'true');
            }
        });
    }, 2000);
    
    // Guardar o ID do intervalo para poder limpar posteriormente se necessário
    window._buttonCheckInterval = buttonCheckInterval;
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando a aplicação TaskPRO...');
    
    // ... código existente ...
    
    // Configurar TODOS os botões de Nova Tarefa
    setupAllTaskButtons();
    
    // Configurar verificação periódica de novos botões
    setupPeriodicButtonCheck();
    
    // Renderizar tarefas iniciais
    renderTasks();
    
    // ... código existente ...
    
    console.log('Aplicação TaskPRO inicializada com sucesso!');
});

// Função para limpar duplicações no calendário
function cleanupCalendarDuplicates() {
    console.log('Limpando duplicações no calendário...');
    
    // Verificar se há elementos duplicados na grade do calendário
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    // Remover tooltips duplicados
    const tooltips = document.querySelectorAll('#task-tooltip');
    if (tooltips.length > 1) {
        console.log(`Removendo ${tooltips.length - 1} tooltips duplicados`);
        // Manter apenas o primeiro tooltip e remover os demais
        for (let i = 1; i < tooltips.length; i++) {
            tooltips[i].remove();
        }
    }
    
    // Remover controles de calendário duplicados
    const calendarControls = document.querySelectorAll('.calendar-controls');
    if (calendarControls.length > 1) {
        console.log(`Removendo ${calendarControls.length - 1} controles de calendário duplicados`);
        for (let i = 1; i < calendarControls.length; i++) {
            calendarControls[i].remove();
        }
    }
}

// Garantir que o script carregue todas as dependências
document.addEventListener('DOMContentLoaded', function() {
    // Aplicar estilos CSS para os status das tarefas
    applyStatusStyles();
    
    // ... resto do código de inicialização
});

// Função para aplicar estilos CSS para os status
function applyStatusStyles() {
    // Verificar se já existe o estilo específico para os status
    if (!document.getElementById('task-status-styles')) {
        console.log('Aplicando estilos CSS para os status das tarefas');
        
        // Criar elemento de estilo
        const styleElement = document.createElement('style');
        styleElement.id = 'task-status-styles';
        
        // Obter cores do StatusManager, se disponível
        const pendingColor = window.StatusManager ? window.StatusManager.getColor('pending') : '#f39c12';
        const completedColor = window.StatusManager ? window.StatusManager.getColor('completed') : '#27ae60';
        const lateColor = window.StatusManager ? window.StatusManager.getColor('late') : '#e74c3c';
        
        // Definir os estilos CSS
        styleElement.textContent = `
            /* Estilos de Status - Cores e Transições */
            .status-completed, 
            .status-completed .task-status,
            .status-completed .status-text,
            .status-completed .status-select,
            select.status-completed,
            option[value="completed"],
            .calendar-task.status-completed {
                color: ${completedColor} !important;
                border-color: ${completedColor} !important;
                background-color: ${hexToRgba(completedColor, 0.1)} !important;
            }
            
            .status-pending, 
            .status-pending .task-status,
            .status-pending .status-text,
            .status-pending .status-select,
            select.status-pending,
            option[value="pending"],
            .calendar-task.status-pending {
                color: ${pendingColor} !important;
                border-color: ${pendingColor} !important;
                background-color: ${hexToRgba(pendingColor, 0.1)} !important;
            }
            
            .status-late, 
            .status-late .task-status,
            .status-late .status-text,
            .status-late .status-select,
            select.status-late,
            option[value="late"],
            .calendar-task.status-late {
                color: ${lateColor} !important;
                border-color: ${lateColor} !important;
                background-color: ${hexToRgba(lateColor, 0.1)} !important;
            }
            
            /* Transição suave para mudanças de status */
            .task-item, .calendar-task, .status-select, .task-status, tr[data-task-id] {
                transition: all 0.3s ease !important;
            }
            
            /* Destaque para mudanças de status */
            .highlight-success {
                animation: pulse-success 1.5s ease;
            }
            
            @keyframes pulse-success {
                0% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(39, 174, 96, 0); }
                100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
            }
            
            /* Ícones de status */
            .status-completed i.fas.fa-check {
                color: ${completedColor} !important;
            }
            
            .status-pending i.fas.fa-clock {
                color: ${pendingColor} !important;
            }
            
            .status-late i.fas.fa-exclamation-triangle {
                color: ${lateColor} !important;
            }
        `;
        
        // Adicionar ao cabeçalho do documento
        document.head.appendChild(styleElement);
        
        console.log('Estilos de status aplicados com sucesso');
    }
}

// Função auxiliar para converter cor hexadecimal em rgba
function hexToRgba(hex, alpha = 1) {
    // Expandir formato curto (por exemplo, #03F para #0033FF)
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    
    // Extrair os componentes RGB
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        return `rgba(0, 0, 0, ${alpha})`;
    }
    
    // Converter para decimal
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    // Retornar formato rgba
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Adicionar esta função ao dashboard-filters.js
// Você pode copiar e colar ao invés de editar isso aqui
window.dashboardFilters = window.dashboardFilters || {};
window.dashboardFilters.getActiveFilters = function() {
    return activeFilters;
};

// Esta função converte a seleção do radio em configuração para os checkboxes
window.dashboardFilters.setFiltersFromRadio = function(radioValue) {
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
    
    // Aplicar o mapeamento
    if (filterMap[radioValue]) {
        Object.keys(filterMap[radioValue]).forEach(status => {
            this.setFilter(status, filterMap[radioValue][status]);
        });
    }
};

