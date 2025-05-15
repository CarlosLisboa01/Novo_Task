// Elementos do DOM
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

// Verificar se já existe um usuário autenticado
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isUserAuthenticated = await isAuthenticated();
        
        if (isUserAuthenticated) {
            // Redirecionar para o dashboard
            redirectLoggedInUser();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
    }
});

// Alternar entre as abas de login e registro
function switchToTab(tab) {
    // Remover classes active
    loginTab.classList.remove('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    
    // Adicionar classe active no tab correto
    if (tab === 'login') {
        loginTab.classList.add('active');
        loginForm.classList.add('active');
    } else {
        registerTab.classList.add('active');
        registerForm.classList.add('active');
    }
    
    // Limpar mensagens
    hideMessages();
}

// Mostrar mensagem de erro
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

// Mostrar mensagem de sucesso
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

// Esconder mensagens
function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

// Mostrar indicador de carregamento no botão
function showButtonLoading(button) {
    button.classList.add('loading');
    button.disabled = true;
}

// Esconder indicador de carregamento no botão
function hideButtonLoading(button) {
    button.classList.remove('loading');
    button.disabled = false;
}

// Redirecionar usuário logado para o dashboard
function redirectLoggedInUser() {
    window.location.href = 'task.html';
}

// Evento para alternar para o formulário de registro
goToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    switchToTab('register');
});

// Evento para alternar para o formulário de login
goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    switchToTab('login');
});

// Eventos para as abas
loginTab.addEventListener('click', () => switchToTab('login'));
registerTab.addEventListener('click', () => switchToTab('register'));

// Evento de envio do formulário de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Validar campos
    if (!email || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    // Mostrar loading no botão
    showButtonLoading(loginBtn);
    
    try {
        // Tentar fazer login
        const result = await loginUser(email, password);
        
        if (result.success) {
            showSuccess('Login realizado com sucesso! Redirecionando...');
            
            // Pequeno atraso para mostrar a mensagem de sucesso
            setTimeout(() => {
                redirectLoggedInUser();
            }, 1500);
        } else {
            showError(result.message || 'Erro ao fazer login. Verifique suas credenciais.');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showError('Ocorreu um erro ao tentar fazer login. Tente novamente mais tarde.');
    } finally {
        hideButtonLoading(loginBtn);
    }
});

// Evento de envio do formulário de registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    const fullName = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    
    // Validar campos
    if (!fullName || !email || !password || !passwordConfirm) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    // Validar confirmação de senha
    if (password !== passwordConfirm) {
        showError('As senhas não coincidem');
        return;
    }
    
    // Verificar tamanho da senha
    if (password.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    // Mostrar loading no botão
    showButtonLoading(registerBtn);
    
    try {
        // Tentar registrar o usuário
        const result = await registerUser(email, password, fullName);
        
        if (result.success) {
            showSuccess('Conta criada com sucesso! Você será redirecionado para o dashboard.');
            
            // Pequeno atraso para mostrar a mensagem de sucesso
            setTimeout(() => {
                redirectLoggedInUser();
            }, 1500);
        } else {
            showError(result.message || 'Erro ao criar conta. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        showError('Ocorreu um erro ao tentar criar sua conta. Tente novamente mais tarde.');
    } finally {
        hideButtonLoading(registerBtn);
    }
}); 