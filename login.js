/**
 * ============================================================================
 * VANTAGE SPORT — CONTROLADOR FRONT-END DE LOGIN Y REGISTRO
 * ============================================================================
 * Módulo 100% Front-End:
 * - Cambio dinámico entre Iniciar Sesión y Registro
 * - Botón interactivo de Registrarse
 * - Medidor de seguridad de contraseña en tiempo real
 * - Alternar visibilidad de contraseña (ojo show/hide)
 * - Botones de acceso rápido Demo (Marketing / Atleta)
 * - Persistencia de sesión local simulada (localStorage)
 * - Alertas y feedback instantáneo tipo Toast
 * ============================================================================
 */

(function () {
  'use strict';

  // Ejecución segura al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    initAuthApp();
  });

  function initAuthApp() {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const panelLogin = document.getElementById('panelLogin');
    const panelRegister = document.getElementById('panelRegister');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    const btnToRegister = document.getElementById('btnToRegister');
    const btnToLogin = document.getElementById('btnToLogin');

    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginRemember = document.getElementById('loginRemember');

    const regName = document.getElementById('regName');
    const regEmail = document.getElementById('regEmail');
    const regRole = document.getElementById('regRole');
    const regPassword = document.getElementById('regPassword');
    const regConfirmPassword = document.getElementById('regConfirmPassword');
    const regTerms = document.getElementById('regTerms');

    const forgotModal = document.getElementById('forgotModal');
    const forgotForm = document.getElementById('forgotForm');
    const forgotEmailInput = document.getElementById('forgotEmailInput');

    // Recuperar parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect') || 'tienda.html';
    const initialMode = urlParams.get('mode');

    // Cambiar a pestaña
    function switchToTab(mode) {
      if (mode === 'register') {
        if (tabLogin) {
          tabLogin.classList.remove('active');
          tabLogin.setAttribute('aria-selected', 'false');
        }
        if (tabRegister) {
          tabRegister.classList.add('active');
          tabRegister.setAttribute('aria-selected', 'true');
        }
        if (panelLogin) panelLogin.classList.remove('active-panel');
        if (panelRegister) panelRegister.classList.add('active-panel');
      } else {
        if (tabRegister) {
          tabRegister.classList.remove('active');
          tabRegister.setAttribute('aria-selected', 'false');
        }
        if (tabLogin) {
          tabLogin.classList.add('active');
          tabLogin.setAttribute('aria-selected', 'true');
        }
        if (panelRegister) panelRegister.classList.remove('active-panel');
        if (panelLogin) panelLogin.classList.add('active-panel');
      }
    }

    // Exponer switchToTab para botones externos
    window.vantageSwitchTab = switchToTab;

    if (tabLogin) tabLogin.addEventListener('click', () => switchToTab('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchToTab('register'));

    // Botón directo "Crear Cuenta / Registrarse" en el formulario de Login
    if (btnToRegister) {
      btnToRegister.addEventListener('click', () => {
        switchToTab('register');
        if (regName) regName.focus();
      });
    }

    // Botón directo "Iniciar Sesión" en el formulario de Registro
    if (btnToLogin) {
      btnToLogin.addEventListener('click', () => {
        switchToTab('login');
        if (loginEmail) loginEmail.focus();
      });
    }

    // Inicializar según parámetro
    if (initialMode === 'register') {
      switchToTab('register');
    } else {
      switchToTab('login');
    }

    // Comprobar correo recordado
    const rememberedEmail = localStorage.getItem('vantage_remembered_email');
    if (rememberedEmail && loginEmail) {
      loginEmail.value = rememberedEmail;
      if (loginRemember) loginRemember.checked = true;
    }

    // Listener para fuerza de contraseña
    if (regPassword) {
      regPassword.addEventListener('input', updatePasswordStrength);
    }

    // Listener para confirmación de contraseña
    if (regConfirmPassword) {
      regConfirmPassword.addEventListener('input', checkPasswordMatch);
    }

    // Submit de Login
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = loginEmail ? loginEmail.value.trim() : '';
        const password = loginPassword ? loginPassword.value : '';
        const remember = loginRemember ? loginRemember.checked : false;

        if (!email || !password) {
          showToast('error', 'Campos incompletos', 'Por favor ingresa tu correo y tu contraseña.');
          return;
        }

        const submitBtn = document.getElementById('btnLoginSubmit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>⏳ Verificando credenciales...</span>`;
        }

        setTimeout(() => {
          const userName = email.split('@')[0].toUpperCase();
          const isMarketing = email.toLowerCase().includes('marketing') || email.toLowerCase().includes('admin');
          const userObj = {
            name: userName || 'Usuario Vantage',
            email: email,
            role: isMarketing ? 'Marketing Specialist' : 'Atleta Oficial',
            avatar: userName.substring(0, 2).toUpperCase() || 'VS',
            isLoggedIn: true,
            loginTime: new Date().toISOString()
          };

          const storeUser = {
            name: userObj.name,
            email: userObj.email,
            avatar: userObj.avatar,
            role: userObj.role
          };

          localStorage.setItem('vantage_store_user', JSON.stringify(storeUser));
          localStorage.setItem('vantage_current_user', JSON.stringify(userObj));

          if (remember) {
            localStorage.setItem('vantage_remembered_email', email);
          } else {
            localStorage.removeItem('vantage_remembered_email');
          }

          if (submitBtn) submitBtn.innerHTML = `<span>✓ ¡Acceso correcto!</span>`;
          showToast('success', '¡Bienvenido a Vantage!', `Hola ${userObj.name}, ingresando a tu espacio...`);

          setTimeout(() => {
            let dest = redirectTarget;
            if (dest.includes('index.html') || isMarketing) {
              dest = 'index.html';
            }
            window.location.href = dest;
          }, 1000);
        }, 650);
      });
    }

    // Submit de Registro
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = regName ? regName.value.trim() : '';
        const email = regEmail ? regEmail.value.trim() : '';
        const role = regRole ? regRole.value : 'Atleta / Comprador';
        const password = regPassword ? regPassword.value : '';
        const confirm = regConfirmPassword ? regConfirmPassword.value : '';
        const termsAccepted = regTerms ? regTerms.checked : false;

        if (!name || !email || !password || !confirm) {
          showToast('error', 'Campos requeridos', 'Completa todos los campos para crear tu cuenta.');
          return;
        }

        if (password.length < 6) {
          showToast('error', 'Contraseña débil', 'La contraseña debe tener un mínimo de 6 caracteres.');
          return;
        }

        if (password !== confirm) {
          showToast('error', 'No coinciden', 'Las dos contraseñas escritas deben ser idénticas.');
          return;
        }

        if (!termsAccepted) {
          showToast('error', 'Términos', 'Debes aceptar los términos y el espíritu de Vantage Sport.');
          return;
        }

        const submitBtn = document.getElementById('btnRegisterSubmit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>⚡ Creando cuenta de atleta...</span>`;
        }

        setTimeout(() => {
          const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'VA';
          const userObj = {
            name: name,
            email: email,
            role: role,
            avatar: initials,
            isLoggedIn: true,
            registeredAt: new Date().toISOString()
          };

          const storeUser = {
            name: userObj.name,
            email: userObj.email,
            avatar: userObj.avatar,
            role: userObj.role
          };

          localStorage.setItem('vantage_store_user', JSON.stringify(storeUser));
          localStorage.setItem('vantage_current_user', JSON.stringify(userObj));

          if (submitBtn) submitBtn.innerHTML = `<span>✓ ¡Cuenta creada!</span>`;
          showToast('success', '¡Registro Exitoso!', `¡Bienvenido al equipo Vantage, ${name}!`);

          setTimeout(() => {
            let dest = role.includes('Marketing') ? 'index.html' : 'tienda.html';
            window.location.href = dest;
          }, 1100);
        }, 800);
      });
    }

    // Submit de Recuperar Clave
    if (forgotForm) {
      forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = forgotEmailInput ? forgotEmailInput.value.trim() : '';
        if (!email) return;

        closeForgotModal();
        showToast('info', 'Enlace enviado', `Hemos enviado un enlace de recuperación a ${email} (Simulación Front-End).`);
      });
    }
  }

  // Medidor de Fortaleza de Contraseña
  function updatePasswordStrength() {
    const regPassword = document.getElementById('regPassword');
    const seg1 = document.getElementById('pwdSeg1');
    const seg2 = document.getElementById('pwdSeg2');
    const seg3 = document.getElementById('pwdSeg3');
    const label = document.getElementById('pwdStrengthText');

    if (!regPassword || !seg1 || !seg2 || !seg3 || !label) return;
    const val = regPassword.value;

    seg1.className = 'meter-segment';
    seg2.className = 'meter-segment';
    seg3.className = 'meter-segment';

    if (val.length === 0) {
      label.textContent = 'Seguridad requerida';
      label.style.color = '#7b8777';
      return;
    }

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (val.length >= 10 && /[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 1) {
      seg1.classList.add('active-weak');
      label.textContent = 'Nivel: Débil (mínimo 6 caracteres)';
      label.style.color = 'var(--orange)';
    } else if (score === 2) {
      seg1.classList.add('active-med');
      seg2.classList.add('active-med');
      label.textContent = 'Nivel: Buena (letras y números)';
      label.style.color = '#ffc83b';
    } else {
      seg1.classList.add('active-strong');
      seg2.classList.add('active-strong');
      seg3.classList.add('active-strong');
      label.textContent = 'Nivel: Óptima y Segura';
      label.style.color = 'var(--lime)';
    }
  }

  // Verificador de Coincidencia de Contraseña
  function checkPasswordMatch() {
    const regPassword = document.getElementById('regPassword');
    const regConfirm = document.getElementById('regConfirmPassword');
    const hint = document.getElementById('pwdMatchHint');

    if (!regPassword || !regConfirm || !hint) return;
    const pwd = regPassword.value;
    const confirm = regConfirm.value;

    if (!confirm) {
      hint.textContent = '';
      return;
    }

    if (pwd === confirm) {
      hint.textContent = '✓ Las contraseñas coinciden';
      hint.style.color = 'var(--lime)';
    } else {
      hint.textContent = '✕ Las contraseñas no coinciden';
      hint.style.color = 'var(--orange)';
    }
  }

  // Alternar Visibilidad de Contraseña (Ojo)
  window.togglePasswordVisibility = function (inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      btnEl.innerHTML = '🙈';
      btnEl.setAttribute('aria-label', 'Ocultar contraseña');
    } else {
      input.type = 'password';
      btnEl.innerHTML = '👁️';
      btnEl.setAttribute('aria-label', 'Mostrar contraseña');
    }
  };

  // Botones de Relleno Rápido Demo
  window.fillDemoCredentials = function (roleType) {
    if (window.vantageSwitchTab) window.vantageSwitchTab('login');
    const emailInput = document.getElementById('loginEmail');
    const pwdInput = document.getElementById('loginPassword');

    if (roleType === 'marketing') {
      if (emailInput) emailInput.value = 'marketing.lead@vantage.com';
      if (pwdInput) pwdInput.value = 'VantageHQ2026!';
      showToast('info', 'Demo Marketing', 'Credenciales de Marketing cargadas. Presiona "Iniciar Sesión".');
    } else {
      if (emailInput) emailInput.value = 'atleta.pro@vantage.com';
      if (pwdInput) pwdInput.value = 'SportFit2026!';
      showToast('info', 'Demo Atleta', 'Credenciales de Cliente/Atleta cargadas. Presiona "Iniciar Sesión".');
    }
    if (emailInput) emailInput.focus();
  };

  // Modal Olvidé mi Contraseña
  window.openForgotModal = function () {
    const forgotModal = document.getElementById('forgotModal');
    const forgotEmailInput = document.getElementById('forgotEmailInput');
    const loginEmail = document.getElementById('loginEmail');

    if (forgotModal) {
      forgotModal.classList.add('is-active');
      if (forgotEmailInput && loginEmail) {
        forgotEmailInput.value = loginEmail.value || '';
        forgotEmailInput.focus();
      }
    }
  };

  window.closeForgotModal = function () {
    const forgotModal = document.getElementById('forgotModal');
    if (forgotModal) forgotModal.classList.remove('is-active');
  };

  // Toast Notification
  function showToast(type, title, message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `vantage-toast ${type === 'error' ? 'toast-error' : type === 'info' ? 'toast-info' : ''}`;

    let icon = '⚡';
    if (type === 'error') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button type="button" class="toast-close-btn" aria-label="Cerrar">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => toast.remove());
    }

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

})();

