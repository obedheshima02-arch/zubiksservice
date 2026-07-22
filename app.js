document.addEventListener('DOMContentLoaded', () => {
    // --- Anti-DevTools & Anti-Right-Click Protection ---
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
        ) {
            e.preventDefault();
        }
    });

    // --- Elements ---
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    const navBtns = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('page-title');

    // Forms & Inputs
    const addMemberForm = document.getElementById('add-member-form');
    const nomIdInput = document.getElementById('nom-id');
    const partsInput = document.getElementById('parts');

    // Tables
    const membersTableBody = document.querySelector('#members-table tbody');
    const depotsTableBody = document.querySelector('#depots-table tbody');
    const retraitsTableBody = document.querySelector('#retraits-table tbody');
    const transactionsTableBody = document.querySelector('#transactions-table tbody');
    const dailyArchivesTableBody = document.querySelector('#daily-archives-table tbody');

    // Search & Filters
    const searchMemberInput = document.getElementById('search-member-input');
    const searchDepotInput = document.getElementById('search-depot-member-input');
    const searchRetraitInput = document.getElementById('search-retrait-member-input');
    const searchTransactionInput = document.getElementById('search-transaction-input');
    const filterTransactionDate = document.getElementById('filter-transaction-date');

    // Displays
    const paymentDateDisplay = document.getElementById('payment-date-display');
    const reportCurrentDate = document.getElementById('report-current-date');
    const accueilTotalMembres = document.getElementById('accueil-total-membres');
    const accueilTotalDepots = document.getElementById('accueil-total-depots');
    const accueilTotalRetraits = document.getElementById('accueil-total-retraits');

    // Report Data
    const dailyStartDisplay = document.getElementById('daily-start');
    const dailyDepotsDisplay = document.getElementById('daily-depots');
    const dailyRetraitsDisplay = document.getElementById('daily-retraits');
    const dailyRemainingDisplay = document.getElementById('daily-remaining');
    const cycleStartDisplay = document.getElementById('cycle-start');
    const cycleDepotsDisplay = document.getElementById('cycle-depots');
    const cycleRetraitsDisplay = document.getElementById('cycle-retraits');
    const cycleRemainingDisplay = document.getElementById('cycle-remaining');
    const archiveBtn = document.getElementById('archive-cycle-btn');
    const archivesTableBody = document.querySelector('#archives-table tbody');

    // Modal
    const operationModal = document.getElementById('operation-modal');
    const modalMemberName = document.getElementById('modal-member-name');
    const operationAmountInput = document.getElementById('operation-amount');
    const validateOperationBtn = document.getElementById('validate-operation-btn');
    const modalOperationTitle = document.getElementById('modal-operation-title');
    const modalAmountLabel = document.getElementById('modal-amount-label');

    // --- State Management ---
    let currentUser = null; // { role: 'admin' | 'user', ... }
    let currentJwtToken = localStorage.getItem('zubiks_jwt_token') || null;

    let state = {
        members: [], // { id, nom, postnom, sexe, email, password, role, status, parts, totalDepot, totalRetrait, dateAjout, notifications }
        dailyDepots: 0,
        dailyRetraits: 0,
        cycleDepots: 0,
        cycleRetraits: 0,
        argentDebut: 0, // Solde initial à zéro
        reglements: "",
        archives: [], // Sauvegarde des cycles passés
        dailyArchives: [], // Historique des journées
        transactions: [], // Historique des transactions
        credentials: {
            email: 'zubiksservice@gmail.com',
            password: 'Zubiks@2000'
        }
    };

    // Load State
    const loadState = async () => {
        // Fallback local storage parsing
        const loadFromLocal = () => {
            const savedState = localStorage.getItem('zubiksStateV2') || localStorage.getItem('zubixStateV2');
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    // Migration
                    state = {
                        ...state,
                        ...parsed,
                        dailyDepots: parsed.dailyDepots !== undefined ? parsed.dailyDepots : (parsed.dailyTotal || 0),
                        cycleDepots: parsed.cycleDepots !== undefined ? parsed.cycleDepots : (parsed.cycleTotal || 0),
                        dailyRetraits: parsed.dailyRetraits || 0,
                        cycleRetraits: parsed.cycleRetraits || 0,
                    };
                    state.members = (parsed.members || []).map(m => ({
                        ...m,
                        totalDepot: m.totalDepot !== undefined ? m.totalDepot : (m.totalPaye || 0),
                        totalRetrait: m.totalRetrait || 0
                    }));
                    state.archives = parsed.archives || [];
                    state.dailyArchives = parsed.dailyArchives || [];
                    state.transactions = parsed.transactions || [];
                    state.argentDebut = parsed.argentDebut !== undefined ? parsed.argentDebut : 0;
                    state.credentials = parsed.credentials || {
                        email: 'zubiksservice@gmail.com',
                        password: 'Zubiks@2000'
                    };

                    // Populate change credentials email
                    const changeEmailInput = document.getElementById('change-email');
                    if (changeEmailInput && state.credentials && state.credentials.email) {
                        changeEmailInput.value = state.credentials.email;
                    }
                } catch (error) {
                    console.error("Erreur lors du chargement des données locales :", error);
                }
            }
        };

        try {
            // Fetch from dynamic backend API
            const response = await fetch('/api/state');
            if (!response.ok) throw new Error("HTTP error " + response.status);
            const parsed = await response.json();
            
            let serverHasData = (parsed.members && parsed.members.length > 0) || (parsed.transactions && parsed.transactions.length > 0);
            
            if (!serverHasData) {
                // Serveur retourné vierge : vérifier si localStorage contient des données à restaurer/synchroniser
                const savedState = localStorage.getItem('zubiksStateV2') || localStorage.getItem('zubixStateV2');
                if (savedState) {
                    console.log("Base de données serveur vide, restauration des données du stockage local.");
                    loadFromLocal();
                    saveState(); // Synchroniser les données locales vers le serveur
                    renderAll();
                    return;
                }
            }

            state = {
                ...state,
                ...parsed,
            };
            state.members = (parsed.members || []).map(m => ({
                ...m,
                totalDepot: m.totalDepot !== undefined ? m.totalDepot : 0,
                totalRetrait: m.totalRetrait || 0
            }));
            state.archives = parsed.archives || [];
            state.dailyArchives = parsed.dailyArchives || [];
            state.transactions = parsed.transactions || [];
            state.argentDebut = parsed.argentDebut !== undefined ? parsed.argentDebut : 0;
            state.credentials = parsed.credentials || {
                email: 'zubiksservice@gmail.com',
                password: 'Zubiks@2000'
            };

            console.log("Données chargées depuis le serveur dynamique.");
            // Render rules in rules textarea if present
            const textarea = document.querySelector('.modern-textarea');
            if (textarea) textarea.value = state.reglements || "";

            // Populate change credentials email
            const changeEmailInput = document.getElementById('change-email');
            if (changeEmailInput && state.credentials && state.credentials.email) {
                changeEmailInput.value = state.credentials.email;
            }
            
            renderAll();
        } catch (err) {
            console.warn("Impossible de joindre le serveur dynamique (utilisation du stockage local) :", err);
            loadFromLocal();
            renderAll();
        }
    };

    // Save State
    const saveState = async () => {
        // Save to local storage first (instant client feedback / fallback)
        localStorage.setItem('zubiksStateV2', JSON.stringify(state));

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (currentJwtToken) {
                headers['Authorization'] = `Bearer ${currentJwtToken}`;
            }

            // Save to dynamic backend API
            const response = await fetch('/api/state', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(state)
            });
            if (!response.ok) throw new Error("HTTP error " + response.status);
            console.log("Données sauvegardées sur le serveur dynamique.");
        } catch (err) {
            console.error("Erreur de sauvegarde sur le serveur dynamique (données conservées localement) :", err);
        }
    };

    // --- Date Initialization ---
    const updateDates = () => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('fr-FR', options);

        if (paymentDateDisplay) paymentDateDisplay.textContent = dateStr;
        const paymentDateDisplayDepots = document.getElementById('payment-date-display-depots');
        if (paymentDateDisplayDepots) paymentDateDisplayDepots.textContent = dateStr;
        const paymentDateDisplayRetraits = document.getElementById('payment-date-display-retraits');
        if (paymentDateDisplayRetraits) paymentDateDisplayRetraits.textContent = dateStr;
        if (reportCurrentDate) reportCurrentDate.textContent = dateStr;
    };

    // --- Authentication & Tab Toggles ---
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnShowRegister = document.getElementById('btn-show-register');
    const loginFormWrapper = document.getElementById('login-form-wrapper');
    const registerFormWrapper = document.getElementById('register-form-wrapper');

    if (btnShowLogin && btnShowRegister) {
        btnShowLogin.addEventListener('click', () => {
            btnShowLogin.classList.add('active');
            btnShowLogin.style.background = 'white';
            btnShowLogin.style.color = 'var(--primary-color)';
            btnShowLogin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

            btnShowRegister.classList.remove('active');
            btnShowRegister.style.background = 'transparent';
            btnShowRegister.style.color = 'var(--text-muted)';
            btnShowRegister.style.boxShadow = 'none';

            loginFormWrapper.style.display = 'block';
            registerFormWrapper.style.display = 'none';
        });

        btnShowRegister.addEventListener('click', () => {
            btnShowRegister.classList.add('active');
            btnShowRegister.style.background = 'white';
            btnShowRegister.style.color = 'var(--primary-color)';
            btnShowRegister.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

            btnShowLogin.classList.remove('active');
            btnShowLogin.style.background = 'transparent';
            btnShowLogin.style.color = 'var(--text-muted)';
            btnShowLogin.style.boxShadow = 'none';

            registerFormWrapper.style.display = 'block';
            loginFormWrapper.style.display = 'none';
        });
    }

    // Formulaire d'inscription Utilisateur
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nom = document.getElementById('reg-nom').value.trim();
            const postnom = document.getElementById('reg-postnom').value.trim();
            const sexe = document.getElementById('reg-sexe').value;
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const password = document.getElementById('reg-password').value;

            if (!nom || !email || !password) {
                showToast("Veuillez remplir tous les champs obligatoires.", "error");
                return;
            }

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom, postnom, sexe, email, password })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    showToast(data.error || "Erreur lors de l'inscription.", "error");
                    return;
                }

                await loadState();
                registerForm.reset();
                showToast("Inscription réussie ! Votre compte est en attente de la validation de vos parts par l'administrateur.", "success");
                if (btnShowLogin) btnShowLogin.click();
            } catch (err) {
                console.error("Erreur inscription API, fallback local :", err);
                const fullName = `${nom} ${postnom}`.trim();
                const newUser = {
                    id: Date.now().toString(),
                    nom: fullName,
                    postnom: postnom,
                    sexe: sexe,
                    email: email,
                    role: 'user',
                    status: 'pending',
                    parts: 0,
                    totalDepot: 0,
                    totalRetrait: 0,
                    dateAjout: new Date().toISOString(),
                    notifications: [{ id: Date.now().toString(), message: "Bienvenue sur ZUBIX SERVICE !", date: new Date().toISOString(), read: false }]
                };
                state.members.push(newUser);
                saveState();
                renderAll();
                registerForm.reset();
                showToast("Inscription réussie !", "success");
                if (btnShowLogin) btnShowLogin.click();
            }
        });
    }

    // Formulaire de Connexion
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                showToast(data.error || 'Email ou mot de passe incorrect.', 'error');
                return;
            }

            currentJwtToken = data.token;
            localStorage.setItem('zubiks_jwt_token', data.token);

            currentUser = data.user;
            saveActiveSession(currentUser);

            await loadState();

            switchRoleView();
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            updateDates();
            renderAll();
            showToast(`Connexion réussie (${currentUser.role === 'admin' ? 'Administrateur' : currentUser.nom})`, 'success');
        } catch (err) {
            console.error("Erreur de connexion serveur, fallback local :", err);
            const targetAdminEmail = (state.credentials && state.credentials.email) ? state.credentials.email.toLowerCase() : 'zubiksservice@gmail.com';
            const targetAdminPassword = (state.credentials && state.credentials.password) ? state.credentials.password : 'Zubiks@2000';

            if (email === targetAdminEmail && password === targetAdminPassword) {
                currentUser = { role: 'admin', nom: 'Admin ZUBIKS', email: targetAdminEmail };
                saveActiveSession(currentUser);
                switchRoleView();
                loginScreen.classList.remove('active');
                dashboardScreen.classList.add('active');
                updateDates();
                renderAll();
                showToast('Connexion Administrateur réussie', 'success');
                return;
            }

            const userMatch = state.members.find(m => (m.email || '').toLowerCase() === email && (m.password === password || m.passwordHash));
            if (userMatch) {
                currentUser = userMatch;
                saveActiveSession(currentUser);
                switchRoleView();
                loginScreen.classList.remove('active');
                dashboardScreen.classList.add('active');
                updateDates();
                renderAll();
                showToast(`Bienvenue, ${userMatch.nom}`, 'success');
                return;
            }

            showToast('Email ou mot de passe incorrect.', 'error');
        }
    });

    const updateHeaderAvatar = (user) => {
        const loggedUserAvatar = document.getElementById('logged-user-avatar');
        if (!loggedUserAvatar) return;
        const initials = (user && user.nom ? user.nom : 'Admin').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        loggedUserAvatar.textContent = initials;
    };

    const switchRoleView = () => {
        const adminNavGroup = document.getElementById('admin-nav-group');
        const userNavGroup = document.getElementById('user-nav-group');
        const userRoleBadge = document.getElementById('user-role-badge');
        const loggedUserName = document.getElementById('logged-user-name');

        const securityPanelAdmin = document.getElementById('security-panel-admin');
        const backupPanelAdmin = document.getElementById('backup-panel-admin');

        if (currentUser && currentUser.role === 'admin') {
            if (adminNavGroup) adminNavGroup.style.display = 'flex';
            if (userNavGroup) userNavGroup.style.display = 'none';
            
            if (userRoleBadge) {
                userRoleBadge.textContent = "Administrateur";
                userRoleBadge.style.background = "var(--primary-color)";
            }
            if (loggedUserName) loggedUserName.textContent = "Admin ZUBIKS";
            updateHeaderAvatar(currentUser);

            if (securityPanelAdmin) securityPanelAdmin.style.display = 'block';
            if (backupPanelAdmin) backupPanelAdmin.style.display = 'block';

            // Activer onglet accueil admin
            const adminHomeBtn = document.querySelector('[data-target="tab-accueil"]');
            if (adminHomeBtn) adminHomeBtn.click();
        } else if (currentUser) {
            if (adminNavGroup) adminNavGroup.style.display = 'none';
            if (userNavGroup) userNavGroup.style.display = 'flex';

            if (userRoleBadge) {
                userRoleBadge.textContent = "Membre ZUBIKS";
                userRoleBadge.style.background = "var(--accent-color)";
            }
            if (loggedUserName) loggedUserName.textContent = currentUser.nom || "Membre";
            updateHeaderAvatar(currentUser);

            if (securityPanelAdmin) securityPanelAdmin.style.display = 'none';
            if (backupPanelAdmin) backupPanelAdmin.style.display = 'none';

            // Activer onglet espace membre
            const userHomeBtn = document.querySelector('[data-target="tab-user-space"]');
            if (userHomeBtn) userHomeBtn.click();
        }
    };

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        currentJwtToken = null;
        localStorage.removeItem('zubiks_jwt_token');
        saveActiveSession(null);

        // Vider tous les formulaires et champs d'entrée
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        dashboardScreen.classList.remove('active');
        loginScreen.classList.add('active');
        showToast('Vous êtes déconnecté.', 'success');
    });

    // --- Navigation (Sidebar) ---
    const tabTitles = {
        'tab-accueil': 'Accueil Administrateur',
        'tab-membres': 'Gestion des Membres & Inscriptions',
        'tab-depots': 'Gestion des Dépôts Cash',
        'tab-retraits': 'Gestion des Retraits Cash',
        'tab-transactions': 'Historique Général des Transactions',
        'tab-rapport': 'Rapports Financiers',
        'tab-apropos': 'Règlements & Paramètres',
        'tab-user-space': 'Mon Espace Membre',
        'tab-user-transactions': 'Mes Transactions',
        'tab-user-notifications': 'Centre de Notifications'
    };

    // --- Mobile Sidebar Navigation Drawer ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const appSidebar = document.getElementById('app-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const openSidebarMobile = () => {
        if (appSidebar) appSidebar.classList.add('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    };

    const closeSidebarMobile = () => {
        if (appSidebar) appSidebar.classList.remove('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    };

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebarMobile);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebarMobile);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarMobile);

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const allNavBtns = document.querySelectorAll('.nav-btn');
            const allTabPanes = document.querySelectorAll('.tab-pane');

            // Masquer explicitement tous les onglets
            allNavBtns.forEach(b => b.classList.remove('active'));
            allTabPanes.forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });

            // Afficher uniquement l'onglet ciblé
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.style.display = 'block';
            }

            // Mettre à jour le titre principal de la page
            if (pageTitle && tabTitles[targetId]) {
                pageTitle.textContent = tabTitles[targetId];
            }

            // Fermer le tiroir mobile après sélection
            closeSidebarMobile();
        });
    });

    // Add search event listeners
    if (searchMemberInput) searchMemberInput.addEventListener('input', () => renderAll());
    if (searchDepotInput) searchDepotInput.addEventListener('input', () => renderAll());
    if (searchRetraitInput) searchRetraitInput.addEventListener('input', () => renderAll());
    if (searchTransactionInput) searchTransactionInput.addEventListener('input', () => renderAll());
    if (filterTransactionDate) filterTransactionDate.addEventListener('change', () => renderAll());

    // --- Members Logic ---
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('fr-FR');
    };

    addMemberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nom = nomIdInput.value.trim();
        const parts = parseInt(partsInput.value);

        if (nom && parts > 0) {
            const existingMember = state.members.find(m => (m.nom || '').toLowerCase() === nom.toLowerCase());
            if (existingMember) {
                if (!confirm(`Un membre nommé "${nom}" existe déjà. Voulez-vous quand même l'ajouter ?`)) {
                    return;
                }
            }

            const newMember = {
                id: Date.now().toString(),
                nom: nom,
                parts: parts,
                totalDepot: 0,
                totalRetrait: 0,
                dateAjout: new Date().toISOString()
            };
            state.members.push(newMember);
            saveState();
            renderAll();
            addMemberForm.reset();
            showToast('Nouveau membre ajouté avec succès.', 'success');
        }
    });



    // --- Rendering Logic ---
    window.validateMemberParts = (id) => {
        const input = document.getElementById(`pending-parts-${id}`);
        if (!input) return;

        const parts = parseInt(input.value);
        if (isNaN(parts) || parts < 1) {
            showToast("Veuillez saisir un nombre de parts valide (minimum 1).", "error");
            return;
        }

        const member = state.members.find(m => String(m.id) === String(id));
        if (member) {
            member.parts = parts;
            member.status = 'active';

            if (!member.notifications) member.notifications = [];
            member.notifications.push({
                id: Date.now().toString(),
                message: `🎉 Votre compte a été validé par l'administrateur avec ${parts} part(s) attribuée(s). Vous pouvez désormais effectuer vos opérations cash !`,
                date: new Date().toISOString(),
                read: false
            });

            saveState();
            renderAll();
            showToast(`Compte de "${member.nom}" validé avec ${parts} part(s).`, "success");
        }
    };

    const renderAll = () => {
        const memberSearchTerm = (searchMemberInput ? searchMemberInput.value.toLowerCase() : '');
        const depotSearchTerm = (searchDepotInput ? searchDepotInput.value.toLowerCase() : '');
        const retraitSearchTerm = (searchRetraitInput ? searchRetraitInput.value.toLowerCase() : '');
        const transactionSearchTerm = (searchTransactionInput ? searchTransactionInput.value.toLowerCase() : '');
        const transactionFilterDate = (filterTransactionDate ? filterTransactionDate.value : '');

        // 1. Render Pending Registrations (Admin View)
        const pendingMembers = state.members.filter(m => m.status === 'pending');
        const pendingPanel = document.getElementById('pending-members-panel');
        const pendingBadge = document.getElementById('pending-badge');
        const pendingTableBody = document.querySelector('#pending-members-table tbody');

        if (pendingBadge) {
            if (pendingMembers.length > 0) {
                pendingBadge.textContent = pendingMembers.length;
                pendingBadge.style.display = 'inline-block';
            } else {
                pendingBadge.style.display = 'none';
            }
        }

        if (pendingPanel && pendingTableBody) {
            if (pendingMembers.length > 0) {
                pendingPanel.style.display = 'block';
                pendingTableBody.innerHTML = '';
                pendingMembers.forEach((m, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${idx + 1}</td>
                        <td><strong>${m.nom}</strong></td>
                        <td>${m.sexe || 'N/A'}</td>
                        <td>${m.email || 'N/A'}</td>
                        <td>
                            <input type="number" id="pending-parts-${m.id}" min="1" value="1" style="width: 80px; padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; text-align: center; font-weight: bold;">
                        </td>
                        <td>
                            <button class="btn-action btn-success" onclick="window.validateMemberParts('${m.id}')" style="background-color: var(--success); display: flex; align-items: center; gap: 4px;">
                                ✅ Valider les Parts
                            </button>
                        </td>
                    `;
                    pendingTableBody.appendChild(tr);
                });
            } else {
                pendingPanel.style.display = 'none';
            }
        }

        // Active members list
        const activeMembers = state.members.filter(m => m.status !== 'pending');

        // Sort active members alphabetically
        const sortedMembers = [...activeMembers].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

        // Render Members Table (tab-membres)
        if (membersTableBody) {
            membersTableBody.innerHTML = '';
            sortedMembers.filter(m => (m.nom || '').toLowerCase().includes(memberSearchTerm)).forEach((member, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><a href="#" style="color: var(--primary); text-decoration: none; font-weight: 600;" onclick="window.openMemberDetails('${member.id}'); return false;">${member.nom}</a></td>
                    <td>${member.parts}</td>
                    <td class="text-muted">${formatDate(member.dateAjout)}</td>
                    <td style="display: flex; gap: 8px;">
                        <button class="btn-action" onclick="window.openEditMemberModal('${member.id}')" style="background-color: #3182ce; color: white; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(49, 130, 206, 0.3);" title="Modifier les informations">
                            ✏️ Modifier
                        </button>
                        <button class="btn-action" onclick="window.deleteMember('${member.id}')" style="background-color: var(--danger); color: white; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(229, 62, 62, 0.3);" title="Supprimer ce membre">
                            🗑️ Supprimer
                        </button>
                    </td>
                `;
                membersTableBody.appendChild(tr);
            });
        }

        // Render Depots Table
        if (depotsTableBody) {
            depotsTableBody.innerHTML = '';
            sortedMembers.filter(m => (m.nom || '').toLowerCase().includes(depotSearchTerm)).forEach((member, index) => {
                const depot = member.totalDepot || 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${member.nom}</strong></td>
                    <td><span class="text-success">${depot.toLocaleString('fr-FR')} Fc</span></td>
                    <td>
                        <button class="btn-action btn-success" onclick="window.openOperationModal('${member.id}', '${member.nom}', 'depot')" style="background-color:var(--success);">+ Dépôt Cash</button>
                    </td>
                `;
                depotsTableBody.appendChild(tr);
            });
        }

        // Render Retraits Table
        if (retraitsTableBody) {
            retraitsTableBody.innerHTML = '';
            sortedMembers.filter(m => (m.nom || '').toLowerCase().includes(retraitSearchTerm)).forEach((member, index) => {
                const depot = member.totalDepot || 0;
                const retrait = member.totalRetrait || 0;
                const solde = depot - retrait;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${member.nom}</strong></td>
                    <td><span class="highlight-text">${solde.toLocaleString('fr-FR')} Fc</span></td>
                    <td>
                        <button class="btn-action btn-danger" onclick="window.openOperationModal('${member.id}', '${member.nom}', 'retrait')" style="background-color:var(--danger);">- Retrait Cash</button>
                    </td>
                `;
                retraitsTableBody.appendChild(tr);
            });
        }

        // Render Transactions Table
        if (transactionsTableBody) {
            transactionsTableBody.innerHTML = '';
            let filteredTx = state.transactions || [];
            
            if (transactionSearchTerm) {
                filteredTx = filteredTx.filter(tx => 
                    (tx.memberNom || '').toLowerCase().includes(transactionSearchTerm) ||
                    (tx.type === 'depot' ? 'dépôt depot'.includes(transactionSearchTerm) : 'retrait'.includes(transactionSearchTerm))
                );
            }
            if (transactionFilterDate) {
                filteredTx = filteredTx.filter(tx => tx.date === transactionFilterDate);
            }

            if (filteredTx.length > 0) {
                const reversedTransactions = [...filteredTx].reverse();
                reversedTransactions.forEach((tx, index) => {
                    const isDepot = tx.type === 'depot';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${reversedTransactions.length - index}</td>
                        <td>${new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                        <td class="text-muted">${new Date(tx.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td><span class="btn-action ${isDepot ? 'btn-success' : 'btn-danger'}" style="background-color:var(--${isDepot ? 'success' : 'danger'}); padding: 3px 8px; font-size: 0.75rem;">${isDepot ? 'Dépôt Cash' : 'Retrait Cash'}</span></td>
                        <td><strong>${tx.memberNom}</strong></td>
                        <td><span class="${isDepot ? 'text-success' : 'text-danger'}"><strong>${isDepot ? '+' : '-'}${tx.amount.toLocaleString('fr-FR')} Fc</strong></span></td>
                    `;
                    transactionsTableBody.appendChild(tr);
                });
            } else {
                transactionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">Aucune transaction correspondante.</td></tr>';
            }
        }

        // --- Render User Specific Space (if logged in as regular user) ---
        if (currentUser && currentUser.role !== 'admin') {
            // Refresh currentUser state from state.members
            const liveUser = state.members.find(m => String(m.id) === String(currentUser.id)) || currentUser;
            currentUser = liveUser;

            const userWelcomeName = document.getElementById('user-welcome-name');
            const userPartsVal = document.getElementById('user-parts-val');
            const userSoldeVal = document.getElementById('user-solde-val');
            const userTotalDepotsVal = document.getElementById('user-total-depots-val');
            const userTotalRetraitsVal = document.getElementById('user-total-retraits-val');
            const userStatusBanner = document.getElementById('user-status-banner');

            if (userWelcomeName) userWelcomeName.textContent = currentUser.nom;
            if (userPartsVal) userPartsVal.textContent = currentUser.parts || 0;
            
            const userSolde = (currentUser.totalDepot || 0) - (currentUser.totalRetrait || 0);
            if (userSoldeVal) userSoldeVal.textContent = userSolde.toLocaleString('fr-FR');
            if (userTotalDepotsVal) userTotalDepotsVal.textContent = (currentUser.totalDepot || 0).toLocaleString('fr-FR');
            if (userTotalRetraitsVal) userTotalRetraitsVal.textContent = (currentUser.totalRetrait || 0).toLocaleString('fr-FR');

            if (userStatusBanner) {
                if (currentUser.status === 'pending') {
                    userStatusBanner.innerHTML = `<span style="color: #c05621; font-weight: 600;">⚠️ Votre compte est en attente de la validation du nombre de vos parts par l'administrateur.</span>`;
                } else {
                    userStatusBanner.textContent = "Suivez vos ristournes, vos parts et l'historique de vos versements cash.";
                }
            }

            // User Personal Transactions Table
            const userTxTableBody = document.querySelector('#user-transactions-table tbody');
            if (userTxTableBody) {
                userTxTableBody.innerHTML = '';
                const myTx = (state.transactions || []).filter(tx => String(tx.memberId) === String(currentUser.id));
                if (myTx.length > 0) {
                    const rev = [...myTx].reverse();
                    rev.forEach((tx, idx) => {
                        const isDepot = tx.type === 'depot';
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${rev.length - idx}</td>
                            <td>${new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                            <td class="text-muted">${new Date(tx.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                            <td><span class="btn-action ${isDepot ? 'btn-success' : 'btn-danger'}" style="background-color:var(--${isDepot ? 'success' : 'danger'}); padding: 3px 8px; font-size: 0.75rem;">${isDepot ? 'Dépôt Cash' : 'Retrait Cash'}</span></td>
                            <td><span class="${isDepot ? 'text-success' : 'text-danger'}"><strong>${isDepot ? '+' : '-'}${tx.amount.toLocaleString('fr-FR')} Fc</strong></span></td>
                        `;
                        userTxTableBody.appendChild(tr);
                    });
                } else {
                    userTxTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">Aucune transaction enregistrée pour votre compte.</td></tr>';
                }
            }

            // User Notifications
            const userNotifList = document.getElementById('user-notifications-list');
            const unreadBadge = document.getElementById('unread-notif-badge');
            
            const notifs = currentUser.notifications || [];
            const unreadCount = notifs.filter(n => !n.read).length;

            if (unreadBadge) {
                if (unreadCount > 0) {
                    unreadBadge.textContent = unreadCount;
                    unreadBadge.style.display = 'inline-block';
                } else {
                    unreadBadge.style.display = 'none';
                }
            }

            if (userNotifList) {
                userNotifList.innerHTML = '';
                if (notifs.length > 0) {
                    [...notifs].reverse().forEach(n => {
                        const div = document.createElement('div');
                        div.className = 'glass-inner';
                        div.style.borderLeft = n.read ? '4px solid #cbd5e0' : '4px solid var(--accent-color)';
                        div.style.background = n.read ? '#f8fafc' : '#f0fdf4';
                        div.style.padding = '15px';
                        div.style.borderRadius = 'var(--radius-sm)';
                        div.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                                <strong style="color: var(--primary-dark); font-size: 0.95rem;">${n.read ? '🔔 Notification' : '🟢 Nouvelle Notification'}</strong>
                                <small class="text-muted">${new Date(n.date).toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</small>
                            </div>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">${n.message}</p>
                        `;
                        userNotifList.appendChild(div);
                    });
                } else {
                    userNotifList.innerHTML = '<div class="text-center text-muted" style="padding: 20px;">Aucune notification reçue pour le moment.</div>';
                }
            }
        }

        // Update Dashboard Home Stats (Admin)
        accueilTotalMembres.textContent = activeMembers.length;
        if (accueilTotalDepots) accueilTotalDepots.textContent = (state.cycleDepots || 0).toLocaleString('fr-FR');
        if (accueilTotalRetraits) accueilTotalRetraits.textContent = (state.cycleRetraits || 0).toLocaleString('fr-FR');

        // Update Reports
        const dailySolde = (state.dailyDepots || 0) - (state.dailyRetraits || 0);
        const cycleSolde = (state.cycleDepots || 0) - (state.cycleRetraits || 0);

        if (dailyDepotsDisplay) dailyDepotsDisplay.textContent = (state.dailyDepots || 0).toLocaleString('fr-FR');
        if (dailyRetraitsDisplay) dailyRetraitsDisplay.textContent = (state.dailyRetraits || 0).toLocaleString('fr-FR');
        if (dailyRemainingDisplay) dailyRemainingDisplay.textContent = dailySolde.toLocaleString('fr-FR');

        if (cycleDepotsDisplay) cycleDepotsDisplay.textContent = (state.cycleDepots || 0).toLocaleString('fr-FR');
        if (cycleRetraitsDisplay) cycleRetraitsDisplay.textContent = (state.cycleRetraits || 0).toLocaleString('fr-FR');
        if (cycleRemainingDisplay) cycleRemainingDisplay.textContent = cycleSolde.toLocaleString('fr-FR');

        // Render Archives Table
        if (archivesTableBody) {
            archivesTableBody.innerHTML = '';
            if (state.archives && state.archives.length > 0) {
                // Sort to have the most recent first
                const reversedArchives = [...state.archives].reverse();
                reversedArchives.forEach(archive => {
                    const dateStr = archive.date ? new Date(archive.date).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'N/A';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${dateStr}</td>
                        <td><span class="text-success">${(archive.cycleDepots || 0).toLocaleString('fr-FR')} Fc</span></td>
                        <td><span class="text-danger">${(archive.cycleRetraits || 0).toLocaleString('fr-FR')} Fc</span></td>
                        <td><strong>${(archive.solde || 0).toLocaleString('fr-FR')} Fc</strong></td>
                    `;
                    archivesTableBody.appendChild(tr);
                });
            } else {
                archivesTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 20px;">Aucun cycle archivé pour le moment.</td></tr>';
            }
        }

        // Render Daily Archives Table
        if (dailyArchivesTableBody) {
            dailyArchivesTableBody.innerHTML = '';
            if (state.dailyArchives && state.dailyArchives.length > 0) {
                const reversedDailyArchives = [...state.dailyArchives].reverse();
                reversedDailyArchives.forEach(archive => {
                    const dateStr = archive.date ? new Date(archive.date).toLocaleDateString('fr-FR') : 'N/A';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${dateStr}</td>
                        <td><span class="text-success">${(archive.dailyDepots || 0).toLocaleString('fr-FR')} Fc</span></td>
                        <td><span class="text-danger">${(archive.dailyRetraits || 0).toLocaleString('fr-FR')} Fc</span></td>
                    `;
                    dailyArchivesTableBody.appendChild(tr);
                });
            } else {
                dailyArchivesTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 10px;">Aucune journée archivée.</td></tr>';
            }
        }
    };

    let currentOperationMemberId = null;
    let currentOperationType = null;
    const operationDateInput = document.getElementById('operation-date');

    const showToast = (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = type === 'success' ? `✅ ${message}` : `❌ ${message}`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    window.openOperationModal = (id, nom, type) => {
        currentOperationMemberId = id;
        currentOperationType = type;

        modalMemberName.textContent = nom;
        modalOperationTitle.textContent = type === 'depot' ? 'Nouveau Dépôt' : 'Nouveau Retrait';
        modalAmountLabel.textContent = type === 'depot' ? 'Montant du dépôt (Fc) :' : 'Montant du retrait (Fc) :';

        validateOperationBtn.className = type === 'depot' ? 'btn-success' : 'btn-danger';
        validateOperationBtn.textContent = type === 'depot' ? 'Confirmer le dépôt' : 'Confirmer le retrait';
        validateOperationBtn.style.width = '100%';

        const memberIndex = state.members.findIndex(m => String(m.id) === String(id));
        const memberParts = memberIndex !== -1 ? state.members[memberIndex].parts : 1;

        if (type === 'depot') {
            operationAmountInput.value = memberParts * 1000;
        } else {
            operationAmountInput.value = '';
        }
        
        const today = new Date().toISOString().split('T')[0];
        operationDateInput.value = today;
        
        operationModal.classList.add('active');
        setTimeout(() => operationAmountInput.focus(), 100);
    };

    const editMemberModal = document.getElementById('edit-member-modal');
    const memberDetailsModal = document.getElementById('member-details-modal');

    document.body.addEventListener('click', (e) => {
        if (e.target) {
            if (
                e.target.classList.contains('modal') ||
                (typeof e.target.closest === 'function' && (e.target.closest('.close-modal') || e.target.closest('.close-modal-btn')))
            ) {
                if (operationModal) operationModal.classList.remove('active');
                if (editMemberModal) editMemberModal.classList.remove('active');
                if (memberDetailsModal) memberDetailsModal.classList.remove('active');
            }
        }
    });

    validateOperationBtn.addEventListener('click', () => {
        const amount = parseFloat(operationAmountInput.value);
        const opDate = operationDateInput.value;
        
        if (!opDate) {
            showToast('Veuillez sélectionner une date.', 'error');
            return;
        }

        if (!isNaN(amount) && amount > 0) {
            const memberIndex = state.members.findIndex(m => String(m.id) === String(currentOperationMemberId));
            if (memberIndex !== -1) {
                const member = state.members[memberIndex];
                const typeName = currentOperationType === 'depot' ? 'dépôt' : 'retrait';
                
                // Confirmation insistante
                const isConfirmed = confirm(`Voulez-vous vraiment confirmer le ${typeName} de ${amount.toLocaleString('fr-FR')} Fc pour le membre ${member.nom} le ${new Date(opDate).toLocaleDateString('fr-FR')} ?\n\nCette action mettra à jour le solde.`);
                
                if (isConfirmed) {
                    if (currentOperationType === 'depot') {
                        member.totalDepot = (member.totalDepot || 0) + amount;
                        state.dailyDepots = (state.dailyDepots || 0) + amount;
                        state.cycleDepots = (state.cycleDepots || 0) + amount;
                    } else {
                        member.totalRetrait = (member.totalRetrait || 0) + amount;
                        state.dailyRetraits = (state.dailyRetraits || 0) + amount;
                        state.cycleRetraits = (state.cycleRetraits || 0) + amount;
                    }
                    
                    // Log the transaction
                    if (!state.transactions) state.transactions = [];
                    state.transactions.push({
                        id: Date.now().toString(),
                        memberId: member.id,
                        memberNom: member.nom,
                        type: currentOperationType,
                        amount: amount,
                        date: opDate,
                        timestamp: new Date().toISOString()
                    });

                    // Add Notification to user account
                    if (!member.notifications) member.notifications = [];
                    const notifMsg = currentOperationType === 'depot' 
                        ? `💵 Dépôt de ${amount.toLocaleString('fr-FR')} Fc enregistré en cash (liquidité) par l'administrateur le ${new Date(opDate).toLocaleDateString('fr-FR')}.`
                        : `📤 Retrait de ${amount.toLocaleString('fr-FR')} Fc enregistré en cash (liquidité) par l'administrateur le ${new Date(opDate).toLocaleDateString('fr-FR')}.`;

                    member.notifications.push({
                        id: Date.now().toString(),
                        message: notifMsg,
                        date: new Date().toISOString(),
                        read: false
                    });

                    saveState();
                    renderAll();
                    operationModal.classList.remove('active');
                    
                    // Message de succès non-bloquant
                    showToast(`Le ${typeName} de ${amount.toLocaleString('fr-FR')} Fc (Cash) a été enregistré.`, 'success');
                }
            }
        } else {
            showToast('Veuillez entrer un montant valide supérieur à 0.', 'error');
        }
    });

    // --- Member Edit, Delete & Details ---
    window.deleteMember = (id) => {
        const member = state.members.find(m => String(m.id) === String(id));
        if (member && confirm(`Voulez-vous vraiment supprimer le membre "${member.nom}" ?`)) {
            state.members = state.members.filter(m => String(m.id) !== String(id));
            saveState();
            renderAll();
            showToast('Membre supprimé.', 'success');
        }
    };

    const editNomIdInput = document.getElementById('edit-nom-id');
    const editPartsInput = document.getElementById('edit-parts');
    const editMemberIdInput = document.getElementById('edit-member-id');
    const saveEditMemberBtn = document.getElementById('save-edit-member-btn');

    window.openEditMemberModal = (id) => {
        const member = state.members.find(m => String(m.id) === String(id));
        if (member && editMemberModal) {
            editMemberIdInput.value = member.id;
            editNomIdInput.value = member.nom;
            editPartsInput.value = member.parts;
            editMemberModal.classList.add('active');
        }
    };

    if (saveEditMemberBtn) {
        saveEditMemberBtn.addEventListener('click', () => {
            const id = editMemberIdInput.value;
            const newNom = editNomIdInput.value.trim();
            const newParts = parseInt(editPartsInput.value);

            if (newNom && newParts > 0) {
                const memberIndex = state.members.findIndex(m => String(m.id) === String(id));
                if (memberIndex !== -1) {
                    state.members[memberIndex].nom = newNom;
                    state.members[memberIndex].parts = newParts;
                    saveState();
                    renderAll();
                    if (currentUser && currentUser.id === id) {
                        currentUser = state.members[memberIndex];
                        switchRoleView();
                    }
                    if (editMemberModal) editMemberModal.classList.remove('active');
                    showToast('Membre mis à jour.', 'success');
                }
            }
        });
    }

    window.openMemberDetails = (id) => {
        const member = state.members.find(m => String(m.id) === String(id));
        if (member && memberDetailsModal) {
            document.getElementById('details-nom-id').textContent = member.nom;
            document.getElementById('details-parts').textContent = member.parts;
            const depot = member.totalDepot || 0;
            const retrait = member.totalRetrait || 0;
            const solde = depot - retrait;
            
            document.getElementById('details-total-depots').textContent = depot.toLocaleString('fr-FR') + ' Fc';
            document.getElementById('details-total-retraits').textContent = retrait.toLocaleString('fr-FR') + ' Fc';
            document.getElementById('details-solde').textContent = solde.toLocaleString('fr-FR') + ' Fc';
            
            memberDetailsModal.classList.add('active');
        }
    };

    // --- Export & Import Logic ---
    const btnExportDb = document.getElementById('btn-export-db');
    const btnImportDb = document.getElementById('btn-import-db');
    const importFileInput = document.getElementById('import-file-input');

    if (btnExportDb) {
        btnExportDb.addEventListener('click', () => {
            const dataStr = JSON.stringify(state, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `zubix_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Base de données exportée avec succès.', 'success');
        });
    }

    if (btnImportDb && importFileInput) {
        btnImportDb.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedState = JSON.parse(event.target.result);
                    
                    if (confirm('Souhaitez-vous FUSIONNER les données importées avec vos données actuelles ?\n\n- OK = Fusionner sans écraser\n- Annuler = Remplacer toutes les données')) {
                        // MERGE
                        const incomingMembers = importedState.members || [];
                        incomingMembers.forEach(incM => {
                            const existing = state.members.find(m => m.id === incM.id || m.nom === incM.nom);
                            if (existing) {
                                existing.totalDepot = (existing.totalDepot || 0) + (incM.totalDepot || 0);
                                existing.totalRetrait = (existing.totalRetrait || 0) + (incM.totalRetrait || 0);
                            } else {
                                state.members.push(incM);
                            }
                        });
                        
                        state.transactions = [...(state.transactions || []), ...(importedState.transactions || [])];
                        state.archives = [...(state.archives || []), ...(importedState.archives || [])];
                        state.dailyArchives = [...(state.dailyArchives || []), ...(importedState.dailyArchives || [])];
                        
                        state.dailyDepots = (state.dailyDepots || 0) + (importedState.dailyDepots || 0);
                        state.dailyRetraits = (state.dailyRetraits || 0) + (importedState.dailyRetraits || 0);
                        state.cycleDepots = (state.cycleDepots || 0) + (importedState.cycleDepots || 0);
                        state.cycleRetraits = (state.cycleRetraits || 0) + (importedState.cycleRetraits || 0);
                        
                        saveState();
                        showToast('Données fusionnées avec succès.', 'success');
                    } else {
                        if (confirm('Êtes-vous sûr de vouloir REMPLACER toutes vos données actuelles ? (Action irréversible)')) {
                            state = importedState;
                            if (!state.credentials) {
                                state.credentials = {
                                    email: 'zubiksservice@gmail.com',
                                    password: 'Zubiks@2000'
                                };
                            }
                            saveState();
                            showToast('Base de données remplacée avec succès.', 'success');
                        } else {
                            importFileInput.value = '';
                            return;
                        }
                    }
                    
                    renderAll();
                    
                    // Switch to home tab to refresh view smoothly
                    document.querySelector('[data-target="tab-accueil"]').click();
                } catch (error) {
                    showToast('Erreur lors de la lecture du fichier de sauvegarde.', 'error');
                }
                // Reset input
                importFileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    // --- Archive Logic ---
    const archiveDailyBtn = document.getElementById('archive-daily-btn');
    if (archiveDailyBtn) {
        archiveDailyBtn.addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment archiver la journée ? Cela remettra à zéro les compteurs journaliers.')) {
                if (!state.dailyArchives) state.dailyArchives = [];
                
                state.dailyArchives.push({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    dailyDepots: state.dailyDepots || 0,
                    dailyRetraits: state.dailyRetraits || 0
                });
                
                state.dailyDepots = 0;
                state.dailyRetraits = 0;
                
                saveState();
                renderAll();
                showToast('Journée archivée avec succès.', 'success');
            }
        });
    }
    if (archiveBtn) {
        archiveBtn.addEventListener('click', () => {
            const confirmArchive = confirm('ARCHIVAGE : Cette action va sauvegarder le cycle actuel et réinitialiser les compteurs.\n\nVoulez-vous continuer ?');
            if (!confirmArchive) return;

            const wishBackup = confirm('Voulez-vous télécharger une sauvegarde (.json) avant la réinitialisation ?');
            if (wishBackup && btnExportDb) {
                btnExportDb.click();
            }

            // Sauvegarder le cycle dans les archives
            const cycleSolde = (state.cycleDepots || 0) - (state.cycleRetraits || 0);
            
            const newArchive = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                cycleDepots: state.cycleDepots || 0,
                cycleRetraits: state.cycleRetraits || 0,
                solde: cycleSolde,
                membersSnapshot: JSON.parse(JSON.stringify(state.members)) // save snapshot of members state
            };
            
            if (!state.archives) state.archives = [];
            state.archives.push(newArchive);

            // Reset totals
            state.dailyDepots = 0;
            state.cycleDepots = 0;
            state.dailyRetraits = 0;
            state.cycleRetraits = 0;
            state.transactions = []; // On reset aussi les transactions pour le nouveau cycle

            // Reset members operations
            state.members.forEach(m => {
                m.totalDepot = 0;
                m.totalRetrait = 0;
            });

            saveState();
            renderAll();
            showToast('Cycle sauvegardé avec succès. Nouveau cycle démarré.', 'success');
        });
    }

    // --- Reset Database Logic ---
    const resetDatabaseBtn = document.getElementById('reset-database-btn');
    if (resetDatabaseBtn) {
        resetDatabaseBtn.addEventListener('click', () => {
            const doubleConfirm = confirm("⚠️ ATTENTION : Êtes-vous sûr de vouloir réinitialiser COMPLÈTEMENT toutes les données ?\n\nCette action supprimera définitivement tous les membres, les transactions et tous les historiques d'archives.");
            
            if (doubleConfirm) {
                const passwordConfirm = prompt("Sécurité : Veuillez entrer le mot de passe administrateur pour confirmer la réinitialisation :");
                
                const targetPassword = (state.credentials && state.credentials.password) ? state.credentials.password : 'Zubiks@2000';
                if (passwordConfirm === targetPassword) {
                    // Reset to empty state template while keeping rules and credentials
                    const currentReglements = state.reglements || "";
                    const currentCredentials = state.credentials || {
                        email: 'zubiksservice@gmail.com',
                        password: 'Zubiks@2000'
                    };
                    state = {
                        members: [],
                        dailyDepots: 0,
                        dailyRetraits: 0,
                        cycleDepots: 0,
                        cycleRetraits: 0,
                        argentDebut: 0,
                        reglements: currentReglements,
                        archives: [],
                        dailyArchives: [],
                        transactions: [],
                        credentials: currentCredentials
                    };
                    
                    saveState();
                    renderAll();
                    showToast("Toutes les données ont été réinitialisées avec succès.", "success");
                    
                    // Force refresh rules text area value
                    const textarea = document.querySelector('.modern-textarea');
                    if (textarea) textarea.value = currentReglements;

                    // Populate change credentials email
                    const changeEmailInput = document.getElementById('change-email');
                    if (changeEmailInput) {
                        changeEmailInput.value = currentCredentials.email;
                    }
                } else if (passwordConfirm !== null) {
                    showToast("Mot de passe incorrect. Réinitialisation annulée.", "error");
                }
            }
        });
    }

    // --- Change Credentials ---
    const changeCredentialsForm = document.getElementById('change-credentials-form');
    if (changeCredentialsForm) {
        changeCredentialsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('change-email').value.trim();
            const newPassword = document.getElementById('change-password').value;

            if (!newEmail || !newPassword) {
                showToast("Veuillez remplir tous les champs.", "error");
                return;
            }

            try {
                const res = await fetch('/api/auth/credentials', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentJwtToken}`
                    },
                    body: JSON.stringify({ newEmail, newPassword })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    showToast(data.error || "Erreur lors de la mise à jour.", "error");
                    return;
                }
                showToast("Identifiants de connexion mis à jour avec succès !", "success");
                document.getElementById('change-password').value = '';
            } catch (err) {
                if (!state.credentials) state.credentials = {};
                state.credentials.email = newEmail;
                saveState();
                showToast("Identifiants de connexion mis à jour (mode local) !", "success");
                document.getElementById('change-password').value = '';
            }
        });
    }

    // --- Textarea Save logic (A propos) ---
    const textarea = document.querySelector('.modern-textarea');
    if (textarea) {
        textarea.value = state.reglements || "";
        textarea.addEventListener('input', (e) => {
            state.reglements = e.target.value;
            saveState();
        });
    }

    // --- Mark all notifications read ---
    const btnMarkAllRead = document.getElementById('btn-mark-all-read');
    if (btnMarkAllRead) {
        btnMarkAllRead.addEventListener('click', () => {
            if (currentUser && currentUser.role !== 'admin' && currentUser.notifications) {
                currentUser.notifications.forEach(n => n.read = true);
                saveState();
                renderAll();
                showToast("Toutes vos notifications ont été marquées comme lues.", "success");
            }
        });
    }

    // --- Persistent Session Management ---
    const SESSION_KEY = 'zubiks_active_session_v1';

    const saveActiveSession = (user) => {
        if (!user) {
            localStorage.removeItem(SESSION_KEY);
        } else {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                role: user.role,
                id: user.id || null,
                email: user.email || null
            }));
        }
    };

    const checkAndRestoreSession = () => {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
            try {
                const sess = JSON.parse(savedSession);
                if (sess.role === 'admin') {
                    currentUser = {
                        role: 'admin',
                        nom: 'Admin ZUBIKS',
                        email: (state.credentials && state.credentials.email) ? state.credentials.email : 'zubiksservice@gmail.com'
                    };
                } else if (sess.id || sess.email) {
                    const userMatch = state.members.find(m => String(m.id) === String(sess.id) || (m.email && m.email.toLowerCase() === (sess.email || '').toLowerCase()));
                    if (userMatch) {
                        currentUser = userMatch;
                    }
                }

                if (currentUser) {
                    switchRoleView();
                    if (loginScreen) loginScreen.classList.remove('active');
                    if (dashboardScreen) dashboardScreen.classList.add('active');
                    updateDates();
                    renderAll();
                    console.log("Session restaurée automatiquement.");
                }
            } catch (e) {
                console.error("Erreur lors de la restauration de la session :", e);
                localStorage.removeItem(SESSION_KEY);
            }
        }
    };

    // Initialize
    loadState().then(() => {
        checkAndRestoreSession();
    }).catch(() => {
        checkAndRestoreSession();
    });
});
