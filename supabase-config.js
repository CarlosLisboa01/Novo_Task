// Configuração do Supabase
// A URL do Supabase deve incluir o protocolo correto e a região
const SUPABASE_URL = 'https://oqjhdbvzjtvqznmnbsvk.supabase.co'; // URL principal do projeto 
const SUPABASE_API_URL = 'https://oqjhdbvzjtvqznmnbsvk.supabase.co/rest/v1'; // URL da API REST
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xamhkYnZ6anR2cXpubW5ic3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTI0MzgsImV4cCI6MjA2MjEyODQzOH0.R8MiHOQRSS4B0d7kjEZbNECiTCE0ecaRBop7my-dhWQ'; 

// Verificar se as constantes foram definidas corretamente
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERRO CRÍTICO: URL ou chave do Supabase não definidas corretamente!');
}

// Inicializar o cliente Supabase
let supabase;
try {
    supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Cliente Supabase inicializado com sucesso');
} catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error);
    // Criar um cliente fictício para não quebrar a aplicação
    supabase = {
        from: () => ({
            select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            insert: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            update: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            delete: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }) }),
            order: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }) }),
            limit: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }) })
        }),
        auth: {
            signUp: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            signIn: () => Promise.resolve({ data: null, error: { message: 'Cliente Supabase não inicializado' } }),
            signOut: () => Promise.resolve({ error: { message: 'Cliente Supabase não inicializado' } }),
            getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Cliente Supabase não inicializado' } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        }
    };
}

// Verificação de conectividade inicial
console.log('Supabase inicializado com: URL:', SUPABASE_URL);
console.log('API REST URL:', SUPABASE_API_URL);
console.log('Chave API presente:', SUPABASE_KEY ? 'Sim' : 'Não');

// Estado global para o usuário autenticado
let currentUser = null;

// Função para verificar se o usuário está autenticado
async function isAuthenticated() {
    if (currentUser) return true;
    
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        currentUser = data.user;
        return !!currentUser;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

// Função para buscar o usuário atual
async function getCurrentUser() {
    if (currentUser) return currentUser;
    
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        currentUser = data.user;
        return currentUser;
    } catch (error) {
        console.error('Erro ao buscar usuário atual:', error);
        return null;
    }
}

// Função para registrar um novo usuário
async function registerUser(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });
        
        if (error) throw error;
        
        // O perfil será criado automaticamente pelo trigger no Supabase
        console.log('Usuário registrado com sucesso:', data);
        currentUser = data.user;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return { success: false, message: error.message };
    }
}

// Função para fazer login
async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Atualizar o timestamp de último login
        if (data.user) {
            await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.user.id);
                
            currentUser = data.user;
        }
        
        console.log('Login realizado com sucesso:', data);
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, message: error.message };
    }
}

// Função para fazer logout
async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        console.log('Logout realizado com sucesso');
        return { success: true };
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return { success: false, message: error.message };
    }
}

// Função para monitorar mudanças no estado de autenticação
function setupAuthListener(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Evento de autenticação:', event);
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            callback('SIGNED_IN', session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            callback('SIGNED_OUT', null);
        } else if (event === 'USER_UPDATED') {
            currentUser = session.user;
            callback('USER_UPDATED', session.user);
        }
    });
    
    return data.subscription;
}

// Função para buscar o perfil do usuário
async function getUserProfile() {
    if (!await isAuthenticated()) {
        console.error('Usuário não autenticado');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
    }
}

// Função para atualizar o perfil do usuário
async function updateUserProfile(updates) {
    if (!await isAuthenticated()) {
        console.error('Usuário não autenticado');
        return { success: false, message: 'Usuário não autenticado' };
    }
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id);
            
        if (error) throw error;
        
        return { success: true, profile: data };
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return { success: false, message: error.message };
    }
}

// Função para buscar as configurações do usuário
async function getUserSettings() {
    if (!await isAuthenticated()) {
        console.error('Usuário não autenticado');
        return { theme: 'light', notifications_enabled: true, default_view: 'dashboard' };
    }
    
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return { theme: 'light', notifications_enabled: true, default_view: 'dashboard' };
    }
}

// Função para atualizar as configurações do usuário
async function updateUserSettings(updates) {
    if (!await isAuthenticated()) {
        console.error('Usuário não autenticado');
        return { success: false, message: 'Usuário não autenticado' };
    }
    
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .update(updates)
            .eq('user_id', currentUser.id);
            
        if (error) throw error;
        
        return { success: true, settings: data };
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return { success: false, message: error.message };
    }
}

// Função com fallback para fazer requisições diretas via fetch caso o cliente Supabase falhe
async function directFetch(endpoint, options = {}) {
    try {
        const url = `${SUPABASE_API_URL}/${endpoint}`;
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        console.log(`Tentando requisição direta para: ${url}`);
        
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro na requisição direta (${response.status}): ${errorText}`);
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Resposta da requisição direta:', data);
        return { data, error: null };
    } catch (error) {
        console.error('Erro na requisição direta:', error);
        return { data: null, error };
    }
}

// Função para buscar todas as tarefas do usuário com fallback
async function fetchTasks(forceRefresh = false) {
    try {
        console.log(`Iniciando fetchTasks(forceRefresh: ${forceRefresh}) - Tentando buscar todas as tarefas...`);
        
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return {
                day: [],
                week: [],
                month: [],
                year: []
            };
        }
        
        // Verificar cache primeiro se não for solicitada atualização forçada
        if (!forceRefresh && window.cachedTasks && (new Date().getTime() - window.lastTaskFetch < 1000)) {
            console.log('Usando cache de tarefas (menos de 1 segundo desde última atualização)');
            return window.cachedTasks;
        }
        
        // Tentar usar o cliente Supabase primeiro
        let result;
        try {
            // Adicionar timestamp para evitar cache do navegador
            const cacheParam = forceRefresh ? `?cache=${new Date().getTime()}` : '';
            result = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('pinned', { ascending: false });
                
            if (result.error) {
                console.error('Erro ao buscar tarefas via cliente Supabase:', result.error);
                throw result.error;
            }
        } catch (supabaseError) {
            console.warn('Falha no cliente Supabase, tentando requisição direta...');
            // Tentar requisição direta como fallback
            // Adicionar timestamp para evitar cache do navegador
            const cacheParam = forceRefresh ? `&cache=${new Date().getTime()}` : '';
            result = await directFetch(`tasks?user_id=eq.${currentUser.id}&order=pinned.desc${cacheParam}`);
            
            if (result.error) {
                console.error('Erro também na requisição direta:', result.error);
                throw result.error;
            }
        }
        
        const data = result.data;
        console.log('Tarefas recebidas:', data ? data.length : 0, 'itens');
        
        // Organizar as tarefas por categoria
        const organizedTasks = {
            day: [],
            week: [],
            month: [],
            year: []
        };
        
        // Converter de snake_case para camelCase para uso na aplicação
        if (data && data.length > 0) {
            data.forEach(task => {
                const formattedTask = {
                    id: task.id,
                    text: task.text || 'Sem título',
                    category: task.category || 'day',
                    startDate: task.startdate || new Date().toISOString(),
                    endDate: task.enddate || new Date().toISOString(),
                    status: task.status || 'pending',
                    pinned: task.pinned || false,
                    createdAt: task.created_at || new Date().toISOString()
                };
                
                // Garantir que a categoria seja válida
                if (!organizedTasks[formattedTask.category]) {
                    console.warn('Categoria desconhecida na tarefa, mudando para "day":', formattedTask);
                    formattedTask.category = 'day';
                }
                
                organizedTasks[formattedTask.category].push(formattedTask);
            });
        } else {
            console.warn('Nenhuma tarefa encontrada no servidor');
        }
        
        // Armazenar em cache
        window.cachedTasks = organizedTasks;
        window.lastTaskFetch = new Date().getTime();
        
        // Contar tarefas por categoria
        Object.keys(organizedTasks).forEach(category => {
            console.log(`Categoria ${category}: ${organizedTasks[category].length} tarefas`);
        });
        
        return organizedTasks;
    } catch (error) {
        console.error('Exceção em fetchTasks():', error);
        console.error('Stack trace:', error.stack);
        
        // Retornar objeto vazio em caso de erro
        return {
            day: [],
            week: [],
            month: [],
            year: []
        };
    }
}

// Função para adicionar uma nova tarefa
async function addTask(task) {
    try {
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return null;
        }
        
        // Criar uma cópia do objeto para evitar modificar o original e converter para snake_case
        const taskToSave = { 
            user_id: currentUser.id,
            text: task.text,
            category: task.category,
            startdate: task.startDate, // Convertido para minúsculas para PostgreSQL
            enddate: task.endDate,     // Convertido para minúsculas para PostgreSQL
            status: task.status,
            pinned: task.pinned || false,
            created_at: task.createdAt || new Date().toISOString() // Convertido para snake_case
        };
        
        console.log('Enviando para o Supabase (formato ajustado):', taskToSave);
        
        // Tentar uma versão mais simples para depuração
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskToSave]);
        
        if (error) {
            console.error('Erro detalhado do Supabase:', error);
            console.error('Código:', error.code);
            console.error('Mensagem:', error.message);
            console.error('Detalhes:', error.details);
            throw error;
        }
        
        // Se a inserção foi bem-sucedida mas não retornou dados, buscar a tarefa recém-criada
        if (!data || data.length === 0) {
            // Buscar a tarefa mais recentemente criada que corresponda aos nossos critérios
            const { data: fetchedData, error: fetchError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('text', taskToSave.text)
                .order('created_at', { ascending: false })
                .limit(1);
                
            if (fetchError) {
                console.error('Erro ao buscar tarefa após inserção:', fetchError);
            } else if (fetchedData && fetchedData.length > 0) {
                // Converter de volta para o formato camelCase usado na aplicação
                const taskData = fetchedData[0];
                return {
                    id: taskData.id,
                    text: taskData.text,
                    category: taskData.category,
                    startDate: taskData.startdate, // Converter de volta para camelCase
                    endDate: taskData.enddate,     // Converter de volta para camelCase
                    status: taskData.status,
                    pinned: taskData.pinned,
                    createdAt: taskData.created_at // Converter de volta para camelCase
                };
            }
            
            // Se não conseguir recuperar a tarefa, retornar a original com um ID fictício
            return { 
                ...task, 
                id: Date.now() 
            };
        }
        
        // Converter o resultado de volta para o formato camelCase usado na aplicação
        const resultTask = data[0];
        return {
            id: resultTask.id,
            text: resultTask.text,
            category: resultTask.category,
            startDate: resultTask.startdate, // Converter de volta para camelCase
            endDate: resultTask.enddate,     // Converter de volta para camelCase
            status: resultTask.status,
            pinned: resultTask.pinned,
            createdAt: resultTask.created_at // Converter de volta para camelCase
        };
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
        return null;
    }
}

// Função para atualizar uma tarefa existente
async function updateTask(taskId, updates) {
    try {
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return null;
        }
        
        // Converter as chaves de camelCase para snake_case para o PostgreSQL
        const updatesToSave = {};
        
        if (updates.hasOwnProperty('text')) updatesToSave.text = updates.text;
        if (updates.hasOwnProperty('category')) updatesToSave.category = updates.category;
        if (updates.hasOwnProperty('startDate')) updatesToSave.startdate = updates.startDate;
        if (updates.hasOwnProperty('endDate')) updatesToSave.enddate = updates.endDate;
        if (updates.hasOwnProperty('status')) updatesToSave.status = updates.status;
        if (updates.hasOwnProperty('pinned')) updatesToSave.pinned = updates.pinned;
        if (updates.hasOwnProperty('createdAt')) updatesToSave.created_at = updates.createdAt;
        
        const { data, error } = await supabase
            .from('tasks')
            .update(updatesToSave)
            .eq('id', taskId)
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.error('Erro ao atualizar tarefa:', error);
            throw error;
        }
        
        return true;
    } catch (error) {
        console.error('Exceção ao atualizar tarefa:', error);
        return false;
    }
}

// Função para excluir uma tarefa
async function deleteTask(taskId) {
    try {
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return false;
        }
        
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.error('Erro ao excluir tarefa:', error);
            throw error;
        }
        
        return true;
    } catch (error) {
        console.error('Exceção ao excluir tarefa:', error);
        return false;
    }
}

// Função para verificar a conexão com o Supabase
async function checkSupabaseConnection() {
    try {
        // Verificar se o usuário está autenticado
        const isUserAuthenticated = await isAuthenticated();
        console.log('Estado de autenticação:', isUserAuthenticated ? 'Autenticado' : 'Não autenticado');
        
        // Tentar fazer uma consulta simples
        const { data, error } = await supabase
            .from('tasks')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('Erro ao verificar conexão com o Supabase:', error);
            return false;
        }
        
        console.log('Conexão com o Supabase estabelecida com sucesso');
        return true;
    } catch (error) {
        console.error('Exceção ao verificar conexão com o Supabase:', error);
        return false;
    }
}

// Função para buscar comentários de uma tarefa
async function fetchTaskComments(taskId) {
    try {
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return [];
        }
        
        const { data, error } = await supabase
            .from('task_comments')
            .select('*, profiles:user_id(full_name, avatar_url)')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Erro ao buscar comentários:', error);
            throw error;
        }
        
        // Formatar os comentários para uso na aplicação
        return data.map(comment => ({
            id: comment.id,
            taskId: comment.task_id,
            userId: comment.user_id,
            text: comment.text,
            createdAt: comment.created_at,
            author: {
                name: comment.profiles?.full_name || 'Usuário',
                avatar: comment.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=User'
            },
            isOwner: comment.user_id === currentUser.id
        }));
    } catch (error) {
        console.error('Exceção ao buscar comentários:', error);
        return [];
    }
}

// Função para adicionar um comentário a uma tarefa
async function addTaskComment(taskId, text) {
    try {
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return null;
        }
        
        const { data, error } = await supabase
            .from('task_comments')
            .insert([
                {
                    task_id: taskId,
                    user_id: currentUser.id,
                    text: text
                }
            ]);
        
        if (error) {
            console.error('Erro ao adicionar comentário:', error);
            throw error;
        }
        
        // Buscar os detalhes do perfil para retornar um comentário completo
        const profile = await getUserProfile();
        
        // Se não houver dados retornados, reconstruir o comentário manualmente
        return {
            id: data?.[0]?.id || Date.now(),
            taskId: taskId,
            userId: currentUser.id,
            text: text,
            createdAt: new Date().toISOString(),
            author: {
                name: profile?.full_name || currentUser.email,
                avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}`
            },
            isOwner: true
        };
    } catch (error) {
        console.error('Exceção ao adicionar comentário:', error);
        return null;
    }
}

// Função para excluir um comentário
async function deleteTaskComment(commentId) {
    try {
        // Verificar se o usuário está autenticado
        if (!await isAuthenticated()) {
            console.error('Usuário não autenticado');
            return false;
        }
        
        const { error } = await supabase
            .from('task_comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.error('Erro ao excluir comentário:', error);
            throw error;
        }
        
        return true;
    } catch (error) {
        console.error('Exceção ao excluir comentário:', error);
        return false;
    }
}

// Exportar API global do Supabase para uso em outros arquivos
window.supabaseApi = {
    // Funções de autenticação
    isAuthenticated,
    getCurrentUser,
    registerUser,
    loginUser,
    logoutUser,
    setupAuthListener,
    
    // Funções de perfil e configurações
    getUserProfile,
    updateUserProfile,
    getUserSettings,
    updateUserSettings,
    
    // Funções de tarefas
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    
    // Funções de comentários
    fetchTaskComments,
    addTaskComment,
    deleteTaskComment,
    
    // Utilitários
    checkSupabaseConnection,
    directFetch
}; 