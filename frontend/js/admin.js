/**
 * Admin Dashboard JavaScript
 */

(function () {
    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = '';

    // Initialize
    document.addEventListener('DOMContentLoaded', async () => {
        if (!(await checkAuth())) return;

        // Check if user is admin
        let userData = JSON.parse(localStorage.getItem('userData') || '{}');

        // If not admin in local storage, try to fetch fresh profile to be sure
        if (!userData.is_admin) {
            try {
                console.log('Checking admin status from server...');
                userData = await UserAPI.getProfile();
                localStorage.setItem('userData', JSON.stringify(userData));
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            }
        }

        if (!userData.is_admin) {
            console.log('User is not admin, redirecting...');
            window.location.href = 'dashboard.html';
            return;
        }

        // Fix: Set user initials in navbar
        if (userData.initials && typeof setUserInitials === 'function') {
            setUserInitials(userData.initials);
        }

        // Load data
        loadStats();
        loadUsers();

        // Event listeners
        document.getElementById('userSearch').addEventListener('input', debounce((e) => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadUsers();
        }, 500));

        document.getElementById('prevPage').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadUsers();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadUsers();
            }
        });

        // Modal forms
        document.getElementById('editUserForm').addEventListener('submit', handleEditUserSubmit);
        document.getElementById('resetPasswordForm').addEventListener('submit', handleResetPasswordSubmit);
    });

    async function loadStats() {
        try {
            const stats = await AdminAPI.getStats();
            document.getElementById('totalUsers').textContent = stats.user_count;
            document.getElementById('totalCustomHours').textContent = stats.custom_hour_count;
            document.getElementById('totalExams').textContent = stats.exam_count;
        } catch (error) {
            console.error('Error loading stats:', error);
            showToast('Fehler beim Laden der Statistiken', 'error');
        }
    }

    async function loadUsers() {
        try {
            const data = await AdminAPI.getUsers(currentPage, 20, currentSearch);
            renderUsers(data.users);
            updatePagination(data.meta);
        } catch (error) {
            console.error('Error loading users:', error);
            showToast('Fehler beim Laden der Nutzer', 'error');
        }
    }

    function renderUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold">
                            ${user.initials}
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.first_name} ${user.last_name}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${user.mail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col space-y-1">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${user.is_admin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${user.is_admin ? 'Admin' : 'User'}
                        </span>
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${user.verified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                            ${user.verified ? 'Verifiziert' : 'Nicht verifiziert'}
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(user.created_at).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                        <!-- Verify Toggle -->
                        <button onclick="verifyUser(${user.id}, ${!user.verified}, '${user.first_name} ${user.last_name}')" class="${user.verified ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}" title="${user.verified ? 'Verifizierung aufheben' : 'Verifizieren'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${user.verified
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>'}
                            </svg>
                        </button>

                        <!-- Edit -->
                        <button onclick='openEditUserModal(${JSON.stringify(user).replace(/'/g, "&#39;")})' class="text-blue-600 hover:text-blue-900" title="Bearbeiten">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>

                        <!-- Reset Password -->
                        <button onclick="openResetPasswordModal(${user.id}, '${user.first_name} ${user.last_name}')" class="text-orange-600 hover:text-orange-900" title="Passwort zurücksetzen">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                            </svg>
                        </button>

                        <!-- Promote/Demote (Only if not self) -->
                        ${!user.is_admin ? `
                            <button onclick="promoteUser(${user.id}, '${user.first_name} ${user.last_name}')" class="text-purple-600 hover:text-purple-900" title="Zum Admin machen">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                </svg>
                            </button>
                        ` : ''}

                        <!-- Delete -->
                        <button onclick="deleteUser(${user.id}, '${user.first_name} ${user.last_name}')" class="text-red-600 hover:text-red-900" title="Löschen">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function updatePagination(meta) {
        currentPage = meta.page;
        totalPages = meta.pages;
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
    }

    // Password Prompt Logic
    let passwordPromptCallback = null;
    let passwordPromptCancelCallback = null;

    window.showPasswordPrompt = function (callback, cancelCallback = null) {
        passwordPromptCallback = callback;
        passwordPromptCancelCallback = cancelCallback;
        document.getElementById('promptPassword').value = '';
        document.getElementById('passwordPromptModal').classList.remove('hidden');
        document.getElementById('promptPassword').focus();
    };

    window.closePasswordPromptModal = function (isConfirmed = false) {
        document.getElementById('passwordPromptModal').classList.add('hidden');

        if (!isConfirmed && passwordPromptCancelCallback) {
            passwordPromptCancelCallback();
        }

        passwordPromptCallback = null;
        passwordPromptCancelCallback = null;
    };

    document.getElementById('passwordPromptForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const password = document.getElementById('promptPassword').value;
        if (passwordPromptCallback) {
            passwordPromptCallback(password);
        }
        closePasswordPromptModal(true);
    });

    // Global Functions for UI Actions

    window.promoteUser = function (userId, userName) {
        showConfirmDialog(`Möchtest du ${userName} wirklich zum Admin befördern?`, () => {
            showPasswordPrompt(async (password) => {
                try {
                    await AdminAPI.promoteUser(userId, password);
                    showToast(`${userName} wurde zum Admin befördert`, 'success');
                    loadUsers();
                } catch (error) {
                    console.error('Error promoting user:', error);
                    showToast(error.message || 'Fehler beim Befördern', 'error');
                }
            });
        });
    };

    window.deleteUser = function (userId, userName) {
        showConfirmDialog(`Möchtest du ${userName} wirklich löschen? Dies kann nicht rückgängig gemacht werden.`, () => {
            showPasswordPrompt(async (password) => {
                try {
                    await AdminAPI.deleteUser(userId, password);
                    showToast(`${userName} wurde gelöscht`, 'success');
                    loadUsers();
                    loadStats(); // Update stats too
                } catch (error) {
                    console.error('Error deleting user:', error);
                    showToast(error.message || 'Fehler beim Löschen', 'error');
                }
            });
        });
    };

    window.verifyUser = async function (userId, verified, userName) {
        const action = verified ? 'verifizieren' : 'die Verifizierung entziehen';
        showConfirmDialog(`Möchtest du ${userName} wirklich ${action}?`, () => {
            showPasswordPrompt(async (password) => {
                try {
                    await AdminAPI.verifyUser(userId, verified, password);
                    showToast(`Status für ${userName} aktualisiert`, 'success');
                    loadUsers();
                } catch (error) {
                    console.error('Error verifying user:', error);
                    showToast(error.message || 'Fehler beim Aktualisieren', 'error');
                }
            });
        });
    };

    // Edit User Modal Logic
    window.openEditUserModal = function (user) {
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.first_name;
        document.getElementById('editLastName').value = user.last_name;
        document.getElementById('editEmail').value = user.mail;
        document.getElementById('editInitials').value = user.initials;

        document.getElementById('editUserModal').classList.remove('hidden');
    };

    window.closeEditUserModal = function () {
        document.getElementById('editUserModal').classList.add('hidden');
    };

    async function handleEditUserSubmit(e) {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const data = {
            first_name: document.getElementById('editFirstName').value,
            last_name: document.getElementById('editLastName').value,
            mail: document.getElementById('editEmail').value,
            initials: document.getElementById('editInitials').value
        };

        // Hide edit modal immediately
        closeEditUserModal();

        showConfirmDialog('Möchtest du die Änderungen an diesem Nutzer wirklich speichern?',
            // On Confirm
            () => {
                showPasswordPrompt(async (password) => {
                    try {
                        await AdminAPI.updateUser(userId, data, password);
                        showToast('Nutzer erfolgreich aktualisiert', 'success');
                        loadUsers();
                        // Modal remains closed on success
                    } catch (error) {
                        console.error('Error updating user:', error);
                        showToast(error.message || 'Fehler beim Aktualisieren', 'error');
                        // Re-open modal on error so user can fix inputs
                        openEditUserModal({
                            id: userId,
                            first_name: data.first_name,
                            last_name: data.last_name,
                            mail: data.mail,
                            initials: data.initials
                        });
                    }
                },
                    // On Password Cancel (we need to update showPasswordPrompt to support this)
                    () => {
                        openEditUserModal({
                            id: userId,
                            first_name: data.first_name,
                            last_name: data.last_name,
                            mail: data.mail,
                            initials: data.initials
                        });
                    });
            },
            // On Confirm Cancel
            () => {
                openEditUserModal({
                    id: userId,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    mail: data.mail,
                    initials: data.initials
                });
            }
        );
    }

    // Reset Password Modal Logic
    window.openResetPasswordModal = function (userId, userName) {
        document.getElementById('resetUserId').value = userId;
        document.getElementById('newPassword').value = '';
        document.getElementById('resetPasswordModal').classList.remove('hidden');
    };

    window.closeResetPasswordModal = function () {
        document.getElementById('resetPasswordModal').classList.add('hidden');
    };

    async function handleResetPasswordSubmit(e) {
        e.preventDefault();
        const userId = document.getElementById('resetUserId').value;
        const newPassword = document.getElementById('newPassword').value;

        showConfirmDialog('Möchtest du das Passwort für diesen Nutzer wirklich ändern?', () => {
            showPasswordPrompt(async (adminPassword) => {
                try {
                    await AdminAPI.resetUserPassword(userId, newPassword, adminPassword);
                    showToast('Passwort erfolgreich geändert', 'success');
                    closeResetPasswordModal();
                } catch (error) {
                    console.error('Error resetting password:', error);
                    showToast(error.message || 'Fehler beim Ändern des Passworts', 'error');
                }
            });
        });
    }

    // Helper for debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

})();
