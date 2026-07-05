(function () {
    'use strict';

    var root = document.getElementById('mellmoth-dnd-hub');
    if (!root) {
        return;
    }

    // Échappe le HTML avant injection via innerHTML (prévention XSS stocké :
    // les champs de la base de connaissances pourront à terme être saisis par les utilisateurs).
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Description : échappée d'abord, puis les sauts de ligne littéraux "\n" deviennent des <br>.
    function formatDescription(value) {
        return escapeHtml(value).replace(/\\n/g, '<br>');
    }

    // Badge "perso" pour distinguer les entrées custom de l'utilisateur des entrées de référence.
    function userBadge(item) {
        return String(item.source) === 'user' ? ' <span class="mdnd-badge">perso</span>' : '';
    }

    // --- GESTION DES ONGLETS ---
    var tabs = root.querySelectorAll('.mdnd-tab');
    var panels = {
        characters: root.querySelector('#panel-characters'),
        spells: root.querySelector('#panel-spells'),
        equipment: root.querySelector('#panel-equipment'),
        combat: root.querySelector('#panel-combat'),
        'dice-roller': root.querySelector('#panel-dice-roller')
    };

    // --- ÉTAT DANS L'URL ---
    // Hash = `#onglet` ou `#onglet/idItem`. Permet de conserver l'onglet (et la modale
    // ouverte) après un F5 et de partager un lien direct.
    var openKbItem = null; // Assigné plus bas, une fois les données KB disponibles.
    var openCharacterById = null; // Idem pour rouvrir une fiche de perso depuis l'URL.
    var openCharacterHash = null; // Hash de la fiche actuellement ouverte (ex. "characters/5"), sinon null.

    function getActiveTab() {
        var active = root.querySelector('.mdnd-tab.is-active');
        return active ? active.dataset.panel : null;
    }

    // Met à jour le hash sans empiler d'entrée d'historique ni provoquer de scroll.
    function setHash(value) {
        var newHash = '#' + value;
        if (location.hash !== newHash) {
            history.replaceState(null, '', newHash);
        }
    }

    function activateTab(target) {
        if (!panels[target]) {
            return false; // Onglet inconnu : on ne touche à rien.
        }

        tabs.forEach(function (t) {
            var isTarget = (t.dataset.panel === target);
            t.classList.toggle('is-active', isTarget);
            t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        });

        Object.keys(panels).forEach(function (key) {
            var panel = panels[key];
            if (!panel) {
                return;
            }
            var active = (key === target);
            panel.classList.toggle('is-active', active);
            panel.hidden = !active;
        });

        return true;
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var target = tab.dataset.panel;
            openCharacterHash = null; // On quitte le contexte fiche.
            activateTab(target);
            setHash(target); // L'URL reflète l'onglet courant.
        });
    });

    // --- GESTION DU POPUP MODAL ---
    var modal = document.getElementById('mdnd-detail-modal');
    var modalCloseBtn = modal ? modal.querySelector('.mdnd-modal-close') : null;
    var modalBody = document.getElementById('mdnd-modal-body');

    function openModal(content) {
        if (!modal || !modalBody) return;
        modalBody.innerHTML = content;
        modal.classList.add('is-active'); // Utilise la classe CSS
        document.body.style.overflow = 'hidden'; // Empêcher le défilement du corps de la page
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('is-active'); // Utilise la classe CSS
        modalBody.innerHTML = '';
        document.body.style.overflow = ''; // Réactiver le défilement

        // Le hash ne pointe plus vers un élément : on revient au contexte courant
        // (fiche de perso ouverte le cas échéant, sinon l'onglet seul).
        var base = openCharacterHash || getActiveTab();
        if (base) {
            setHash(base);
        }
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.classList.contains('is-active')) {
                closeModal();
            }
        });
    }

    // --- GESTION DES TABLEAUX (Base de connaissances) ---
    if (typeof dndKnowledgeBase !== 'undefined') {

        var sortState = { key: 'name', order: 'asc' };

        // Étiquette de niveau d'un sort (0 = tour de magie).
        function spellLevelLabel(level) {
            return level === '0' || level === 0 ? 'Tour de magie' : 'Niveau ' + level;
        }

        // Contenu complet affiché dans la modale de détail (ligne ET carte).
        function buildDetailContent(item, type) {
            if (type === 'spell') {
                return `
                    <h2>${escapeHtml(item.name)}</h2>
                    <p class="mdnd-modal-subtitle"><em>${escapeHtml(spellLevelLabel(item.level))} - ${escapeHtml(item.school)}</em></p>
                    <div class="mdnd-modal-meta">
                        <p><strong>Temps d'incantation :</strong> ${escapeHtml(item.casting_time)}</p>
                        <p><strong>Portée :</strong> ${escapeHtml(item.range_desc)}</p>
                        <p><strong>Composantes :</strong> ${escapeHtml(item.components)}</p>
                    </div>
                    <div class="mdnd-modal-desc">
                        <p>${item.description ? formatDescription(item.description) : ''}</p>
                    </div>
                `;
            }

            // equipment — stats de combat dans le bloc meta, propriétés dans leur propre bloc au-dessus de la description.
            var statsHtml = '';
            if (item.damage_dice) statsHtml += `<p><strong>Dégâts :</strong> ${escapeHtml(item.damage_dice)} ${item.damage_type ? '('+escapeHtml(item.damage_type)+')' : ''}</p>`;
            if (item.ac_bonus) statsHtml += `<p><strong>Bonus de CA :</strong> +${escapeHtml(item.ac_bonus)}</p>`;

            return `
                <h2>${escapeHtml(item.name)}</h2>
                <p class="mdnd-modal-subtitle"><em>${escapeHtml(item.type)} - ${escapeHtml(item.category)} (${escapeHtml(item.rarity)})</em></p>
                <div class="mdnd-modal-meta">
                    <p><strong>Coût :</strong> ${item.cost ? escapeHtml(item.cost) + ' po' : '-'}</p>
                    <p><strong>Poids :</strong> ${item.weight ? escapeHtml(item.weight) + ' kg' : '-'}</p>
                    ${statsHtml}
                </div>
                <div class="mdnd-modal-props">
                    <p><strong>Propriétés :</strong> ${item.properties ? escapeHtml(item.properties) : '–'}</p>
                </div>
                <div class="mdnd-modal-desc">
                    <p>${item.description ? formatDescription(item.description) : '<em>Aucune description disponible.</em>'}</p>
                </div>
            `;
        }

        // Résumé compact affiché en carte sur mobile.
        function buildCardSummary(item, type) {
            if (type === 'spell') {
                var lvl = item.level === '0' || item.level === 0 ? 'tour de magie' : 'niv. ' + item.level;
                return `
                    <div class="mdnd-card-title">${escapeHtml(item.name)}${userBadge(item)}</div>
                    <div class="mdnd-card-sub">${escapeHtml(item.school)} (${escapeHtml(lvl)})</div>
                    <div class="mdnd-card-meta">
                        <span>Portée : ${escapeHtml(item.range_desc || '–')}</span>
                        <span>Incantation : ${escapeHtml(item.casting_time || '–')}</span>
                    </div>
                `;
            }

            // equipment
            return `
                <div class="mdnd-card-title">${escapeHtml(item.name)}${userBadge(item)}</div>
                <div class="mdnd-card-sub">${escapeHtml(item.type)} · ${escapeHtml(item.category)}</div>
                <div class="mdnd-card-meta">
                    <span>Coût : ${item.cost ? escapeHtml(item.cost) + ' po' : '–'}</span>
                    <span>Poids : ${item.weight ? escapeHtml(item.weight) + ' kg' : '–'}</span>
                </div>
            `;
        }

        // État : référence commune (lecture seule) + entrées perso de l'utilisateur (éditables).
        var datasets = {
            spells: (dndKnowledgeBase.spells || []).concat(dndKnowledgeBase.userSpells || []),
            equipment: (dndKnowledgeBase.equipment || []).concat(dndKnowledgeBase.userEquipment || [])
        };
        var redrawers = {}; // tabKey -> fonction de redraw (pour rafraîchir après une mutation).
        var rest = dndKnowledgeBase.rest || {};

        // Appel REST authentifié (cookie + nonce). Renvoie une promesse résolue avec le JSON.
        function apiFetch(path, method, body) {
            return fetch(rest.root + path, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': rest.nonce },
                credentials: 'same-origin',
                body: body ? JSON.stringify(body) : undefined
            }).then(function(res) {
                return res.json().then(function(data) {
                    if (!res.ok) {
                        throw new Error(data && data.message ? data.message : 'Erreur serveur');
                    }
                    return data;
                });
            });
        }

        function renderTable(tbodyId, data, columns, type) {
            var tbody = document.getElementById(tbodyId);
            if (!tbody) return;

            var cardsContainer = document.getElementById(tbodyId.replace('-table-body', '-cards'));
            var tabKey = tbodyId.replace('-table-body', ''); // 'spells' / 'equipment'.

            tbody.innerHTML = '';
            if (cardsContainer) cardsContainer.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="mdnd-empty-table">Aucune donnée trouvée.</td></tr>';
                if (cardsContainer) {
                    cardsContainer.innerHTML = '<p class="mdnd-empty-table">Aucune donnée trouvée.</p>';
                }
                return;
            }

            data.forEach(function(item) {
                // Ligne de tableau (desktop).
                var tr = document.createElement('tr');
                tr.style.cursor = 'pointer';

                columns.forEach(function(col, index) {
                    var td = document.createElement('td');
                    if (col === 'level') {
                        td.textContent = item[col] === '0' || item[col] === 0 ? 'Tour de magie' : item[col];
                    } else {
                        td.textContent = item[col] || '';
                    }
                    // Badge "perso" sur la première colonne (le nom) pour les entrées custom.
                    if (index === 0 && String(item.source) === 'user') {
                        td.innerHTML = escapeHtml(td.textContent) + userBadge(item);
                    }
                    tr.appendChild(td);
                });

                tr.addEventListener('click', function() {
                    openDetail(item, type, tabKey);
                });

                tbody.appendChild(tr);

                // Carte compacte (mobile).
                if (cardsContainer) {
                    var card = document.createElement('div');
                    card.className = 'mdnd-kb-card';
                    card.innerHTML = buildCardSummary(item, type);
                    card.addEventListener('click', function() {
                        openDetail(item, type, tabKey);
                    });
                    cardsContainer.appendChild(card);
                }
            });
        }

        function filterData(data, query, searchableColumns) {
            if (!query) return data;
            query = query.toLowerCase();
            return data.filter(function(item) {
                return searchableColumns.some(function(col) {
                    return item[col] && item[col].toString().toLowerCase().includes(query);
                });
            });
        }

        function sortData(data, key, order) {
            return data.slice().sort(function(a, b) {
                var valA = a[key];
                var valB = b[key];

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return order === 'asc' ? valA - valB : valB - valA;
                }
                return order === 'asc'
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            });
        }

        function setupTable(tableId, tabKey, columns, type, searchId) {
            var table = document.getElementById(tableId);
            var tbodyId = table.querySelector('tbody').id;
            var headers = table.querySelectorAll('th[data-sort]');
            var searchInput = document.getElementById(searchId);
            var onlyUserCheckbox = document.getElementById(tabKey + '-only-user');

            function redrawTable() {
                var query = searchInput ? searchInput.value : '';
                var data = datasets[tabKey]; // état courant (live).
                if (onlyUserCheckbox && onlyUserCheckbox.checked) {
                    data = data.filter(function(it) { return String(it.source) === 'user'; });
                }
                var filtered = filterData(data, query, columns);
                var sorted = sortData(filtered, sortState.key, sortState.order);
                renderTable(tbodyId, sorted, columns, type);
            }
            redrawers[tabKey] = redrawTable;

            if (onlyUserCheckbox) {
                onlyUserCheckbox.addEventListener('change', redrawTable);
            }

            headers.forEach(function(th) {
                th.addEventListener('click', function() {
                    var sortKey = th.dataset.sort;
                    if (sortState.key === sortKey) {
                        sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortState.key = sortKey;
                        sortState.order = 'asc';
                    }
                    headers.forEach(function(header) {
                        header.classList.remove('sort-asc', 'sort-desc');
                    });
                    th.classList.add('sort-' + sortState.order);
                    redrawTable();
                });
            });

            if (searchInput) {
                searchInput.addEventListener('input', redrawTable);
            }

            redrawTable();
        }

        // --- MODALE DE DÉTAIL (avec actions Modifier/Supprimer pour les entrées perso) ---
        function openDetail(item, type, tabKey) {
            var content = buildDetailContent(item, type);
            if (String(item.source) === 'user') {
                content += '<div class="mdnd-modal-actions">'
                    + '<button type="button" class="mdnd-button mdnd-button-secondary" data-action="edit">Modifier</button>'
                    + '<button type="button" class="mdnd-button mdnd-button-danger" data-action="delete">Supprimer</button>'
                    + '</div>';
            }
            openModal(content);
            setHash(tabKey + '/' + item.source + ':' + item.id);

            if (String(item.source) === 'user') {
                var editBtn = modalBody.querySelector('[data-action="edit"]');
                var delBtn = modalBody.querySelector('[data-action="delete"]');
                if (editBtn) editBtn.addEventListener('click', function() { openForm(type, tabKey, item); });
                if (delBtn) delBtn.addEventListener('click', function() { deleteUserItem(tabKey, type, item); });
            }
        }

        // --- MODALE DE FORMULAIRE (ajout / modification) ---
        var formModal = document.getElementById('mdnd-form-modal');
        var formTitle = document.getElementById('mdnd-form-title');
        var formFields = document.getElementById('mdnd-form-fields');
        var formError = document.getElementById('mdnd-form-error');
        var formEl = document.getElementById('mdnd-form');
        var formSubmit = document.getElementById('mdnd-form-submit');
        var formCtx = { type: null, tabKey: null, editId: null };

        var FIELD_CONFIGS = {
            spell: [
                { key: 'name', label: 'Nom', type: 'text', required: true },
                { key: 'level', label: 'Niveau (0 = tour de magie)', type: 'number', min: 0, max: 9 },
                { key: 'school', label: 'École', type: 'text' },
                { key: 'casting_time', label: 'Temps d\'incantation', type: 'text' },
                { key: 'range_desc', label: 'Portée', type: 'text' },
                { key: 'components', label: 'Composantes', type: 'text' },
                { key: 'description', label: 'Description', type: 'textarea' }
            ],
            equipment: [
                { key: 'name', label: 'Nom', type: 'text', required: true },
                { key: 'type', label: 'Type', type: 'text' },
                { key: 'category', label: 'Catégorie', type: 'text' },
                { key: 'rarity', label: 'Rareté', type: 'text' },
                { key: 'cost', label: 'Coût (po)', type: 'number', step: 'any' },
                { key: 'weight', label: 'Poids (kg)', type: 'number', step: 'any' },
                { key: 'damage_dice', label: 'Dés de dégâts', type: 'text' },
                { key: 'damage_type', label: 'Type de dégâts', type: 'text' },
                { key: 'ac_bonus', label: 'Bonus de CA', type: 'number' },
                { key: 'properties', label: 'Propriétés', type: 'textarea' },
                { key: 'description', label: 'Description', type: 'textarea' }
            ]
        };

        function buildFormFields(type, item) {
            return FIELD_CONFIGS[type].map(function(f) {
                var id = 'mdnd-field-' + f.key;
                var val = item && item[f.key] != null ? item[f.key] : '';
                var control;
                if (f.type === 'textarea') {
                    control = '<textarea id="' + id + '" name="' + f.key + '" class="mdnd-input" rows="4">' + escapeHtml(val) + '</textarea>';
                } else {
                    var attrs = 'type="' + f.type + '"';
                    if (f.type === 'number') {
                        if (f.min != null) attrs += ' min="' + f.min + '"';
                        if (f.max != null) attrs += ' max="' + f.max + '"';
                        if (f.step) attrs += ' step="' + f.step + '"';
                    }
                    if (f.required) attrs += ' required';
                    control = '<input id="' + id + '" name="' + f.key + '" class="mdnd-input" ' + attrs + ' value="' + escapeHtml(val) + '">';
                }
                return '<div class="mdnd-field"><label for="' + id + '">' + escapeHtml(f.label) + (f.required ? ' *' : '') + '</label>' + control + '</div>';
            }).join('');
        }

        function openFormModal() {
            formModal.classList.add('is-active');
            document.body.style.overflow = 'hidden';
        }

        function closeFormModal() {
            formModal.classList.remove('is-active');
            document.body.style.overflow = '';
            formError.hidden = true;
            formError.textContent = '';
        }

        function showFormError(msg) {
            formError.textContent = msg;
            formError.hidden = false;
        }

        function openForm(type, tabKey, item) {
            formCtx.type = type;
            formCtx.tabKey = tabKey;
            formCtx.editId = item ? item.id : null;
            formTitle.textContent = (item ? 'Modifier' : 'Ajouter') + (type === 'spell' ? ' un sort' : ' un objet');
            formFields.innerHTML = buildFormFields(type, item);
            formError.hidden = true;
            closeModal();      // ferme la modale détail si on vient d'un "Modifier"
            openFormModal();
        }

        function upsertItem(tabKey, row, editId) {
            var arr = datasets[tabKey];
            if (editId) {
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].source === 'user' && String(arr[i].id) === String(editId)) {
                        arr[i] = row;
                        break;
                    }
                }
            } else {
                arr.push(row);
            }
            if (redrawers[tabKey]) redrawers[tabKey]();
        }

        function deleteUserItem(tabKey, type, item) {
            if (!window.confirm('Supprimer « ' + item.name + ' » ? Cette action est définitive.')) {
                return;
            }
            var base = type === 'spell' ? 'spells' : 'equipment';
            apiFetch(base + '/' + item.id, 'DELETE').then(function() {
                datasets[tabKey] = datasets[tabKey].filter(function(it) {
                    return !(it.source === 'user' && String(it.id) === String(item.id));
                });
                if (redrawers[tabKey]) redrawers[tabKey]();
                closeModal();
            }).catch(function(err) {
                window.alert(err.message || 'Suppression impossible.');
            });
        }

        if (formEl) {
            formEl.addEventListener('submit', function(e) {
                e.preventDefault();
                var payload = {};
                FIELD_CONFIGS[formCtx.type].forEach(function(f) {
                    var el = document.getElementById('mdnd-field-' + f.key);
                    payload[f.key] = el ? el.value : '';
                });
                if (!payload.name || !payload.name.trim()) {
                    showFormError('Le nom est obligatoire.');
                    return;
                }
                var base = formCtx.type === 'spell' ? 'spells' : 'equipment';
                var path = formCtx.editId ? base + '/' + formCtx.editId : base;
                var method = formCtx.editId ? 'PUT' : 'POST';

                formSubmit.disabled = true;
                apiFetch(path, method, payload).then(function(row) {
                    upsertItem(formCtx.tabKey, row, formCtx.editId);
                    closeFormModal();
                }).catch(function(err) {
                    showFormError(err.message || 'Enregistrement impossible.');
                }).finally(function() {
                    formSubmit.disabled = false;
                });
            });

            formModal.querySelectorAll('[data-close="form"]').forEach(function(btn) {
                btn.addEventListener('click', closeFormModal);
            });
            formModal.addEventListener('click', function(e) {
                if (e.target === formModal) closeFormModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && formModal.classList.contains('is-active')) closeFormModal();
            });
        }

        // Boutons "Ajouter".
        root.querySelectorAll('.mdnd-add-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = btn.dataset.add; // 'spell' / 'equipment'
                openForm(type, type === 'spell' ? 'spells' : 'equipment', null);
            });
        });

        // Ouvre la modale d'un élément depuis son onglet + son uid (restauration via l'URL).
        // uid = "source:id" (ex. "user:5") ; un id nu reste accepté (rétro-compat).
        openKbItem = function(tabKey, uid) {
            var type = tabKey === 'spells' ? 'spell' : (tabKey === 'equipment' ? 'equipment' : null);
            if (!type) return;
            var source = null, id = uid;
            if (uid.indexOf(':') !== -1) {
                var parts = uid.split(':');
                source = parts[0];
                id = parts[1];
            }
            var item = (datasets[tabKey] || []).filter(function(it) {
                return String(it.id) === String(id) && (source === null || String(it.source) === source);
            })[0];
            if (item) {
                openDetail(item, type, tabKey);
            }
        };

        // --- SORTS ---
        setupTable('spells-table', 'spells', ['name', 'level', 'school', 'casting_time', 'range_desc', 'components'], 'spell', 'spells-search');

        // --- ÉQUIPEMENT ---
        setupTable('equipment-table', 'equipment', ['name', 'type', 'category', 'cost', 'weight'], 'equipment', 'equipment-search');

        /* =====================================================================
         *  FICHES DE PERSONNAGE D&D 5e
         * ================================================================== */
        var characters = (dndKnowledgeBase.characters || []).slice();

        var charListView      = document.getElementById('characters-list-view');
        var charEditorView    = document.getElementById('character-editor-view');
        var charListContainer = document.getElementById('characters-list');
        var charCreateBtn     = document.getElementById('character-create-btn');

        if (charListContainer && charEditorView) {

            var current = { id: null, equipRefs: [], spellRefs: [] };

            var ABILITIES = [
                ['str', 'Force'], ['dex', 'Dextérité'], ['con', 'Constitution'],
                ['int', 'Intelligence'], ['wis', 'Sagesse'], ['cha', 'Charisme']
            ];
            var SKILLS = [
                ['acrobatics', 'Acrobaties', 'dex'], ['animalHandling', 'Dressage', 'wis'],
                ['arcana', 'Arcanes', 'int'], ['athletics', 'Athlétisme', 'str'],
                ['deception', 'Tromperie', 'cha'], ['history', 'Histoire', 'int'],
                ['insight', 'Perspicacité', 'wis'], ['intimidation', 'Intimidation', 'cha'],
                ['investigation', 'Investigation', 'int'], ['medicine', 'Médecine', 'wis'],
                ['nature', 'Nature', 'int'], ['perception', 'Perception', 'wis'],
                ['performance', 'Représentation', 'cha'], ['persuasion', 'Persuasion', 'cha'],
                ['religion', 'Religion', 'int'], ['sleightOfHand', 'Escamotage', 'dex'],
                ['stealth', 'Discrétion', 'dex'], ['survival', 'Survie', 'wis']
            ];

            function abilityMod(score) { return Math.floor(((parseInt(score, 10) || 10) - 10) / 2); }
            function fmtMod(m) { return (m >= 0 ? '+' : '') + m; }
            function profBonus(level) {
                var l = Math.max(1, Math.min(20, parseInt(level, 10) || 1));
                return 2 + Math.floor((l - 1) / 4);
            }

            function getNested(obj, path) {
                return path.split('.').reduce(function (o, k) { return (o == null) ? undefined : o[k]; }, obj);
            }
            function setNested(obj, path, value) {
                var parts = path.split('.'), o = obj, i;
                for (i = 0; i < parts.length - 1; i++) {
                    if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) { o[parts[i]] = {}; }
                    o = o[parts[i]];
                }
                o[parts[parts.length - 1]] = value;
            }

            function emptySheet() {
                return {
                    identity: { name: '', class: '', level: 1, race: '', background: '', alignment: '', xp: '', playerName: '' },
                    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                    abilityModOverride: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
                    saves: {}, skills: {}, inspiration: false, proficiencyBonusOverride: '',
                    combat: { ac: '', initiativeOverride: '', speed: '', hpMax: '', hpCurrent: '', hpTemp: '', hitDice: '', deathSuccess: 0, deathFail: 0 },
                    attacks: [],
                    personality: { traits: '', ideals: '', bonds: '', flaws: '' },
                    features: '', proficiencies: '',
                    equipment: { refs: [], freeText: '', money: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 } },
                    spells: { ability: '', refs: [], slots: '', notes: '' },
                    notes: ''
                };
            }

            // Fusionne la fiche stockée avec une fiche vide (champs manquants par défaut).
            function mergeSheet(stored) {
                var base = emptySheet();
                if (!stored || typeof stored !== 'object') { return base; }
                ['identity', 'abilities', 'abilityModOverride', 'combat', 'personality'].forEach(function (grp) {
                    if (stored[grp]) {
                        Object.keys(base[grp]).forEach(function (k) {
                            if (stored[grp][k] != null) { base[grp][k] = stored[grp][k]; }
                        });
                    }
                });
                base.saves = stored.saves || {};
                base.skills = stored.skills || {};
                base.inspiration = !!stored.inspiration;
                base.proficiencyBonusOverride = (stored.proficiencyBonusOverride != null) ? stored.proficiencyBonusOverride : '';
                base.attacks = Array.isArray(stored.attacks) ? stored.attacks : [];
                base.features = stored.features || '';
                base.proficiencies = stored.proficiencies || '';
                base.notes = stored.notes || '';
                if (stored.equipment) {
                    base.equipment.refs = Array.isArray(stored.equipment.refs) ? stored.equipment.refs : [];
                    base.equipment.freeText = stored.equipment.freeText || '';
                    base.equipment.money = stored.equipment.money || base.equipment.money;
                }
                if (stored.spells) {
                    base.spells.refs = Array.isArray(stored.spells.refs) ? stored.spells.refs : [];
                    base.spells.ability = stored.spells.ability || '';
                    base.spells.slots = stored.spells.slots || '';
                    base.spells.notes = stored.spells.notes || '';
                }
                return base;
            }

            /* ---------- Liste ---------- */
            function renderCharacterList() {
                if (!characters.length) {
                    charListContainer.innerHTML = '<p class="mdnd-empty-table">Aucun personnage pour l\'instant. Créez-en un !</p>';
                    return;
                }
                charListContainer.innerHTML = '';
                characters.forEach(function (c) {
                    var sub = [c.class, c.race].filter(Boolean).join(' · ');
                    var card = document.createElement('div');
                    card.className = 'mdnd-char-card';
                    card.innerHTML = '<div class="mdnd-char-card-name">' + escapeHtml(c.name) + '</div>'
                        + '<div class="mdnd-char-card-sub">' + escapeHtml(sub) + (sub ? ' — ' : '') + 'niv. ' + escapeHtml(c.level) + '</div>';
                    card.addEventListener('click', function () { openEditor(c); });
                    charListContainer.appendChild(card);
                });
            }

            /* ---------- Helpers de rendu de champs ---------- */
            function chField(label, path, type, value, extra) {
                return '<label class="mdnd-field"><span>' + escapeHtml(label) + '</span>'
                    + '<input class="mdnd-input" type="' + type + '" data-path="' + path + '" value="' + escapeHtml(value == null ? '' : value) + '" ' + (extra || '') + '></label>';
            }
            function chArea(label, path, value) {
                return '<label class="mdnd-field mdnd-field-wide"><span>' + escapeHtml(label) + '</span>'
                    + '<textarea class="mdnd-input" rows="3" data-path="' + path + '">' + escapeHtml(value == null ? '' : value) + '</textarea></label>';
            }
            // Normalisation pour le filtre : minuscules + suppression des accents.
            function comboNorm(s) {
                s = String(s).toLowerCase();
                try { if (s.normalize) { s = s.normalize('NFD').replace(/\p{Diacritic}/gu, ''); } } catch (e) {}
                return s;
            }

            // Combobox filtrable pour ajouter un sort/objet depuis la lib.
            function setupCombo(tabKey) {
                var combo = charEditorView.querySelector('.mdnd-combo[data-combo="' + tabKey + '"]');
                if (!combo) { return; }
                var input = combo.querySelector('.mdnd-combo-input');
                var list = combo.querySelector('.mdnd-combo-list');
                var refs = (tabKey === 'equipment') ? current.equipRefs : current.spellRefs;

                function renderList() {
                    var q = comboNorm(input.value);
                    var matches = (datasets[tabKey] || []).filter(function (it) {
                        return !q || comboNorm(it.name).indexOf(q) !== -1;
                    }).slice(0, 50); // borne pour rester fluide
                    list.innerHTML = '';
                    if (!matches.length) {
                        list.innerHTML = '<div class="mdnd-combo-empty">Aucun résultat</div>';
                    } else {
                        matches.forEach(function (it) {
                            var opt = document.createElement('button');
                            opt.type = 'button';
                            opt.className = 'mdnd-combo-item';
                            opt.textContent = it.name + (it.source === 'user' ? ' (perso)' : '');
                            // mousedown (pas click) pour s'exécuter avant le blur du champ.
                            opt.addEventListener('mousedown', function (e) {
                                e.preventDefault();
                                refs.push({ source: it.source, id: it.id });
                                input.value = '';
                                list.hidden = true;
                                renderRefChips(tabKey);
                            });
                            list.appendChild(opt);
                        });
                    }
                    list.hidden = false;
                }

                input.addEventListener('focus', renderList);
                input.addEventListener('input', renderList);
                input.addEventListener('blur', function () {
                    setTimeout(function () { list.hidden = true; }, 150);
                });
            }
            function attackRow(atk) {
                atk = atk || {};
                return '<div class="mdnd-attack-row">'
                    + '<input class="mdnd-input" placeholder="Nom" data-attack="name" value="' + escapeHtml(atk.name || '') + '">'
                    + '<input class="mdnd-input" placeholder="Bonus" data-attack="bonus" value="' + escapeHtml(atk.bonus || '') + '">'
                    + '<input class="mdnd-input" placeholder="Dégâts / type" data-attack="damage" value="' + escapeHtml(atk.damage || '') + '">'
                    + '<button type="button" class="mdnd-button mdnd-button-danger mdnd-attack-del" title="Retirer">×</button>'
                    + '</div>';
            }

            /* ---------- Construction de l'éditeur ---------- */
            function buildEditorHtml(sheet, isEditing) {
                var g = function (p) { return getNested(sheet, p); };

                var abilitiesHtml = ABILITIES.map(function (a) {
                    var score = g('abilities.' + a[0]);
                    return '<div class="mdnd-ability">'
                        + '<div class="mdnd-ability-name">' + a[1] + '</div>'
                        + '<input class="mdnd-input mdnd-ability-score" type="number" data-path="abilities.' + a[0] + '" value="' + escapeHtml(score == null ? 10 : score) + '">'
                        + '<div class="mdnd-ability-modcap">modif.</div>'
                        + '<input class="mdnd-input mdnd-ability-mod-input" type="number" data-path="abilityModOverride.' + a[0] + '" data-mod-input="' + a[0] + '" value="' + escapeHtml(g('abilityModOverride.' + a[0])) + '" placeholder="+0" title="Vide = auto (calculé depuis la caractéristique)">'
                        + '</div>';
                }).join('');

                var savesHtml = ABILITIES.map(function (a) {
                    var checked = g('saves.' + a[0]) ? ' checked' : '';
                    return '<label class="mdnd-line"><input type="checkbox" data-path="saves.' + a[0] + '"' + checked + '>'
                        + '<span class="mdnd-line-total" data-save-total="' + a[0] + '">+0</span> ' + a[1] + '</label>';
                }).join('');

                var skillsHtml = SKILLS.map(function (s) {
                    var checked = g('skills.' + s[0]) ? ' checked' : '';
                    return '<label class="mdnd-line"><input type="checkbox" data-path="skills.' + s[0] + '" data-skill-ability="' + s[2] + '"' + checked + '>'
                        + '<span class="mdnd-line-total" data-skill-total="' + s[0] + '">+0</span> ' + s[1] + ' <em>(' + s[2].toUpperCase() + ')</em></label>';
                }).join('');

                var attacksHtml = (sheet.attacks || []).map(attackRow).join('');

                var abilityOptions = '<option value="">—</option>' + ABILITIES.map(function (a) {
                    return '<option value="' + a[0] + '"' + (g('spells.ability') === a[0] ? ' selected' : '') + '>' + a[1] + '</option>';
                }).join('');

                return ''
                    + '<div class="mdnd-char-toolbar">'
                    +   '<button type="button" class="mdnd-button mdnd-button-secondary" id="char-cancel">← Retour</button>'
                    +   '<div class="mdnd-char-toolbar-right">'
                    +     (isEditing ? '<button type="button" class="mdnd-button mdnd-button-danger" id="char-delete">Supprimer</button>' : '')
                    +     '<button type="button" class="mdnd-button" id="char-save">Enregistrer</button>'
                    +   '</div>'
                    + '</div>'

                    + '<section class="mdnd-char-section"><h3>Identité</h3><div class="mdnd-grid">'
                    +   chField('Nom du personnage', 'identity.name', 'text', g('identity.name'))
                    +   chField('Classe', 'identity.class', 'text', g('identity.class'))
                    +   chField('Niveau', 'identity.level', 'number', g('identity.level'), 'min="1" max="20"')
                    +   chField('Race', 'identity.race', 'text', g('identity.race'))
                    +   chField('Historique', 'identity.background', 'text', g('identity.background'))
                    +   chField('Alignement', 'identity.alignment', 'text', g('identity.alignment'))
                    +   chField('Points d\'expérience', 'identity.xp', 'text', g('identity.xp'))
                    +   chField('Nom du joueur', 'identity.playerName', 'text', g('identity.playerName'))
                    + '</div></section>'

                    + '<section class="mdnd-char-section"><h3>Caractéristiques</h3>'
                    +   '<div class="mdnd-abilities">' + abilitiesHtml + '</div>'
                    +   '<div class="mdnd-derived">'
                    +     '<div class="mdnd-derived-box"><input class="mdnd-input mdnd-derived-input" type="number" data-path="proficiencyBonusOverride" data-prof-input value="' + escapeHtml(g('proficiencyBonusOverride')) + '" placeholder="+0"><span>Bonus de maîtrise <em>(vide = auto)</em></span></div>'
                    +     '<div class="mdnd-derived-box"><span class="mdnd-derived-val" data-passive-perception>10</span><span>Perception passive</span></div>'
                    +     '<label class="mdnd-derived-box mdnd-derived-check"><input type="checkbox" data-path="inspiration"' + (g('inspiration') ? ' checked' : '') + '><span>Inspiration</span></label>'
                    +   '</div>'
                    + '</section>'

                    + '<div class="mdnd-two-col">'
                    +   '<section class="mdnd-char-section"><h3>Jets de sauvegarde</h3><div class="mdnd-lines">' + savesHtml + '</div></section>'
                    +   '<section class="mdnd-char-section"><h3>Compétences</h3><div class="mdnd-lines">' + skillsHtml + '</div></section>'
                    + '</div>'

                    + '<section class="mdnd-char-section"><h3>Combat</h3><div class="mdnd-grid">'
                    +   chField('Classe d\'armure (CA)', 'combat.ac', 'number', g('combat.ac'))
                    +   '<label class="mdnd-field"><span>Initiative <em>(vide = auto)</em></span><input class="mdnd-input" type="number" data-path="combat.initiativeOverride" data-init-input value="' + escapeHtml(g('combat.initiativeOverride')) + '" placeholder="+0"></label>'
                    +   chField('Vitesse', 'combat.speed', 'text', g('combat.speed'))
                    +   chField('PV max', 'combat.hpMax', 'number', g('combat.hpMax'))
                    +   chField('PV actuels', 'combat.hpCurrent', 'number', g('combat.hpCurrent'))
                    +   chField('PV temporaires', 'combat.hpTemp', 'number', g('combat.hpTemp'))
                    +   chField('Dé de vie', 'combat.hitDice', 'text', g('combat.hitDice'))
                    +   chField('Jets de mort — réussites', 'combat.deathSuccess', 'number', g('combat.deathSuccess'), 'min="0" max="3"')
                    +   chField('Jets de mort — échecs', 'combat.deathFail', 'number', g('combat.deathFail'), 'min="0" max="3"')
                    + '</div></section>'

                    + '<section class="mdnd-char-section"><h3>Attaques</h3>'
                    +   '<div id="char-attacks">' + attacksHtml + '</div>'
                    +   '<button type="button" class="mdnd-button mdnd-button-secondary" id="char-attack-add">+ Ajouter une attaque</button>'
                    + '</section>'

                    + '<section class="mdnd-char-section"><h3>Personnalité</h3><div class="mdnd-grid">'
                    +   chArea('Traits de personnalité', 'personality.traits', g('personality.traits'))
                    +   chArea('Idéaux', 'personality.ideals', g('personality.ideals'))
                    +   chArea('Liens', 'personality.bonds', g('personality.bonds'))
                    +   chArea('Défauts', 'personality.flaws', g('personality.flaws'))
                    + '</div></section>'

                    + '<section class="mdnd-char-section"><h3>Capacités & traits</h3>' + chArea('Capacités de classe, dons, traits raciaux…', 'features', g('features')) + '</section>'
                    + '<section class="mdnd-char-section"><h3>Maîtrises & langues</h3>' + chArea('Armures, armes, outils, langues…', 'proficiencies', g('proficiencies')) + '</section>'

                    + '<section class="mdnd-char-section"><h3>Équipement</h3>'
                    +   '<div class="mdnd-combo mdnd-ref-picker" data-combo="equipment"><input type="search" class="mdnd-input mdnd-combo-input" placeholder="Ajouter un objet — tapez pour filtrer…"><div class="mdnd-combo-list" hidden></div></div>'
                    +   '<div class="mdnd-chips" id="char-equip-chips"></div>'
                    +   chArea('Autre équipement (texte libre)', 'equipment.freeText', g('equipment.freeText'))
                    +   '<div class="mdnd-money">'
                    +     chField('PO', 'equipment.money.gp', 'number', g('equipment.money.gp'))
                    +     chField('PA', 'equipment.money.sp', 'number', g('equipment.money.sp'))
                    +     chField('PC', 'equipment.money.cp', 'number', g('equipment.money.cp'))
                    +     chField('PP', 'equipment.money.pp', 'number', g('equipment.money.pp'))
                    +     chField('PE', 'equipment.money.ep', 'number', g('equipment.money.ep'))
                    +   '</div>'
                    + '</section>'

                    + '<section class="mdnd-char-section"><h3>Sorts</h3>'
                    +   '<div class="mdnd-grid">'
                    +     '<label class="mdnd-field"><span>Caractéristique d\'incantation</span><select class="mdnd-input" data-path="spells.ability">' + abilityOptions + '</select></label>'
                    +     '<label class="mdnd-field"><span>DD de sauvegarde des sorts</span><div class="mdnd-input mdnd-readonly" data-spell-dc>—</div></label>'
                    +     '<label class="mdnd-field"><span>Bonus d\'attaque des sorts</span><div class="mdnd-input mdnd-readonly" data-spell-atk>—</div></label>'
                    +   '</div>'
                    +   '<div class="mdnd-combo mdnd-ref-picker" data-combo="spells"><input type="search" class="mdnd-input mdnd-combo-input" placeholder="Ajouter un sort — tapez pour filtrer…"><div class="mdnd-combo-list" hidden></div></div>'
                    +   '<div class="mdnd-chips" id="char-spell-chips"></div>'
                    +   chArea('Emplacements de sorts (par niveau)', 'spells.slots', g('spells.slots'))
                    +   chArea('Notes de sorts', 'spells.notes', g('spells.notes'))
                    + '</section>'

                    + '<section class="mdnd-char-section"><h3>Notes</h3>' + chArea('Notes diverses', 'notes', g('notes')) + '</section>';
            }

            /* ---------- Calculs auto ---------- */
            function recompute() {
                // Modificateur effectif par carac : override manuel si rempli, sinon auto (depuis le score).
                var mods = {};
                ABILITIES.forEach(function (a) {
                    var scoreInp = charEditorView.querySelector('[data-path="abilities.' + a[0] + '"]');
                    var auto = abilityMod(parseInt(scoreInp.value, 10) || 10);
                    var ovInp = charEditorView.querySelector('[data-mod-input="' + a[0] + '"]');
                    ovInp.placeholder = fmtMod(auto);
                    mods[a[0]] = (ovInp.value !== '') ? (parseInt(ovInp.value, 10) || 0) : auto;
                });

                var level = parseInt(charEditorView.querySelector('[data-path="identity.level"]').value, 10) || 1;
                var autoPb = profBonus(level);
                var pbInput = charEditorView.querySelector('[data-prof-input]');
                pbInput.placeholder = fmtMod(autoPb); // indique l'auto quand le champ est vide
                var pb = (pbInput.value !== '') ? (parseInt(pbInput.value, 10) || 0) : autoPb;

                ABILITIES.forEach(function (a) {
                    var prof = charEditorView.querySelector('[data-path="saves.' + a[0] + '"]').checked;
                    charEditorView.querySelector('[data-save-total="' + a[0] + '"]').textContent = fmtMod(mods[a[0]] + (prof ? pb : 0));
                });
                SKILLS.forEach(function (s) {
                    var prof = charEditorView.querySelector('[data-path="skills.' + s[0] + '"]').checked;
                    charEditorView.querySelector('[data-skill-total="' + s[0] + '"]').textContent = fmtMod(mods[s[2]] + (prof ? pb : 0));
                });

                // Initiative : auto = mod de Dex (le champ override affiche l'auto en placeholder).
                charEditorView.querySelector('[data-init-input]').placeholder = fmtMod(mods.dex);

                var percProf = charEditorView.querySelector('[data-path="skills.perception"]').checked;
                charEditorView.querySelector('[data-passive-perception]').textContent = 10 + mods.wis + (percProf ? pb : 0);

                var ab = charEditorView.querySelector('[data-path="spells.ability"]').value;
                if (ab && mods[ab] != null) {
                    charEditorView.querySelector('[data-spell-dc]').textContent = 8 + pb + mods[ab];
                    charEditorView.querySelector('[data-spell-atk]').textContent = fmtMod(pb + mods[ab]);
                } else {
                    charEditorView.querySelector('[data-spell-dc]').textContent = '—';
                    charEditorView.querySelector('[data-spell-atk]').textContent = '—';
                }
            }

            /* ---------- Pickers liés à la lib ---------- */
            function resolveRef(tabKey, ref) {
                return (datasets[tabKey] || []).filter(function (it) {
                    return String(it.id) === String(ref.id) && String(it.source) === String(ref.source);
                })[0];
            }
            function renderRefChips(tabKey) {
                var refs = (tabKey === 'equipment') ? current.equipRefs : current.spellRefs;
                var container = charEditorView.querySelector(tabKey === 'equipment' ? '#char-equip-chips' : '#char-spell-chips');
                container.innerHTML = '';
                var type = (tabKey === 'equipment') ? 'equipment' : 'spell';
                refs.forEach(function (ref, idx) {
                    var item = resolveRef(tabKey, ref);
                    var chip = document.createElement('span');
                    chip.className = 'mdnd-chip';

                    if (item) {
                        // Nom cliquable : ouvre la fiche de détail (lecture seule) en popup.
                        var nameBtn = document.createElement('button');
                        nameBtn.type = 'button';
                        nameBtn.className = 'mdnd-chip-name';
                        nameBtn.textContent = item.name;
                        nameBtn.addEventListener('click', function () {
                            openModal(buildDetailContent(item, type));
                        });
                        chip.appendChild(nameBtn);
                    } else {
                        var miss = document.createElement('span');
                        miss.className = 'mdnd-chip-name mdnd-chip-missing';
                        miss.textContent = '(supprimé)';
                        chip.appendChild(miss);
                    }

                    var del = document.createElement('button');
                    del.type = 'button';
                    del.className = 'mdnd-chip-del';
                    del.textContent = '×';
                    del.addEventListener('click', function () {
                        refs.splice(idx, 1);
                        renderRefChips(tabKey);
                    });
                    chip.appendChild(del);

                    container.appendChild(chip);
                });
            }

            /* ---------- Collecte ---------- */
            function collectSheet() {
                var sheet = emptySheet();
                charEditorView.querySelectorAll('[data-path]').forEach(function (el) {
                    var path = el.getAttribute('data-path');
                    var val;
                    if (el.type === 'checkbox') { val = el.checked; }
                    else if (el.type === 'number') { val = (el.value === '') ? '' : (parseFloat(el.value) || 0); }
                    else { val = el.value; }
                    setNested(sheet, path, val);
                });
                sheet.attacks = [].map.call(charEditorView.querySelectorAll('.mdnd-attack-row'), function (row) {
                    return {
                        name: row.querySelector('[data-attack="name"]').value,
                        bonus: row.querySelector('[data-attack="bonus"]').value,
                        damage: row.querySelector('[data-attack="damage"]').value
                    };
                }).filter(function (a) { return a.name || a.bonus || a.damage; });
                sheet.equipment.refs = current.equipRefs.slice();
                sheet.spells.refs = current.spellRefs.slice();
                return sheet;
            }

            /* ---------- Ouverture / fermeture / sauvegarde ---------- */
            function openEditor(character) {
                var sheet = mergeSheet(character ? character.sheet : null);
                current.id = character ? character.id : null;
                current.equipRefs = sheet.equipment.refs.slice();
                current.spellRefs = sheet.spells.refs.slice();

                charEditorView.innerHTML = buildEditorHtml(sheet, !!current.id);
                charListView.hidden = true;
                charEditorView.hidden = false;
                bindEditor();
                renderRefChips('equipment');
                renderRefChips('spells');
                recompute();
                window.scrollTo(0, 0);

                // Persistance au refresh : seules les fiches déjà enregistrées (avec id)
                // peuvent être restaurées par l'URL.
                openCharacterHash = current.id ? ('characters/' + current.id) : null;
                setHash(openCharacterHash || 'characters');
            }

            function closeEditor() {
                charEditorView.hidden = true;
                charEditorView.innerHTML = '';
                charListView.hidden = false;
                openCharacterHash = null;
                setHash('characters');
            }

            // Exposé pour la restauration via l'URL (#characters/<id>).
            openCharacterById = function (id) {
                var c = characters.filter(function (x) { return String(x.id) === String(id); })[0];
                if (c) { openEditor(c); }
            };

            function upsertCharacter(row) {
                for (var i = 0; i < characters.length; i++) {
                    if (String(characters[i].id) === String(row.id)) { characters[i] = row; return; }
                }
                characters.unshift(row);
            }

            function saveCharacter() {
                var body = { sheet: collectSheet() };
                var path = current.id ? 'characters/' + current.id : 'characters';
                var method = current.id ? 'PUT' : 'POST';
                var btn = charEditorView.querySelector('#char-save');
                btn.disabled = true;
                apiFetch(path, method, body).then(function (row) {
                    upsertCharacter(row);
                    renderCharacterList();
                    closeEditor();
                }).catch(function (err) {
                    window.alert(err.message || 'Enregistrement impossible.');
                }).finally(function () { btn.disabled = false; });
            }

            function deleteCharacter() {
                if (!current.id) { closeEditor(); return; }
                if (!window.confirm('Supprimer cette fiche ? Cette action est définitive.')) { return; }
                apiFetch('characters/' + current.id, 'DELETE').then(function () {
                    characters = characters.filter(function (c) { return String(c.id) !== String(current.id); });
                    renderCharacterList();
                    closeEditor();
                }).catch(function (err) { window.alert(err.message || 'Suppression impossible.'); });
            }

            function bindEditor() {
                charEditorView.addEventListener('input', recompute);
                charEditorView.addEventListener('change', recompute);

                charEditorView.querySelector('#char-cancel').addEventListener('click', closeEditor);
                charEditorView.querySelector('#char-save').addEventListener('click', saveCharacter);
                var delBtn = charEditorView.querySelector('#char-delete');
                if (delBtn) { delBtn.addEventListener('click', deleteCharacter); }

                charEditorView.querySelector('#char-attack-add').addEventListener('click', function () {
                    charEditorView.querySelector('#char-attacks').insertAdjacentHTML('beforeend', attackRow());
                });
                charEditorView.addEventListener('click', function (e) {
                    if (e.target.classList.contains('mdnd-attack-del')) {
                        e.target.closest('.mdnd-attack-row').remove();
                    }
                });

                setupCombo('equipment');
                setupCombo('spells');
            }

            charCreateBtn.addEventListener('click', function () { openEditor(null); });
            renderCharacterList();
        }
    }

    // --- GESTION DU LANCEUR DE DÉS ---
    var numDiceInput = document.getElementById('num-dice');
    var dieTypeSelect = document.getElementById('die-type');
    var modifierInput = document.getElementById('modifier');
    var rollDiceBtn = document.getElementById('roll-dice-btn');
    var rollResultSpan = document.getElementById('roll-result');
    var rollHistoryDiv = document.getElementById('roll-history');

    if (rollDiceBtn) {
        rollDiceBtn.addEventListener('click', function() {
            var numDice = parseInt(numDiceInput.value);
            var dieType = parseInt(dieTypeSelect.value);
            var modifier = parseInt(modifierInput.value);

            var rolls = [];
            var total = 0;

            for (var i = 0; i < numDice; i++) {
                var roll = Math.floor(Math.random() * dieType) + 1;
                rolls.push(roll);
                total += roll;
            }

            var finalResult = total + modifier;
            rollResultSpan.textContent = finalResult;

            // Ajout à l'historique
            var historyEntry = document.createElement('p');
            var rollDetails = rolls.join(' + ');
            var modifierText = modifier !== 0 ? (modifier > 0 ? ' + ' + modifier : ' - ' + Math.abs(modifier)) : '';
            
            historyEntry.innerHTML = `<strong>${finalResult}</strong> = ${numDice}d${dieType} (${rollDetails})${modifierText}`;
            
            // Ajoute en haut de l'historique
            if (rollHistoryDiv.firstChild) {
                rollHistoryDiv.insertBefore(historyEntry, rollHistoryDiv.firstChild);
            } else {
                rollHistoryDiv.appendChild(historyEntry);
            }
        });
    }

    // --- TRACKER DE COMBAT (éphémère, persisté dans le navigateur) ---
    // Logique round/tour + PV + conditions + persistance localStorage, rendu au
    // markup de la maquette (.mdnd-init-row). window.mdndCombat.addCombatant() reste
    // exposé pour un futur ajout direct depuis une fiche de personnage.
    (function combatTracker() {
        var listEl = document.getElementById('combat-list');
        if (!listEl) { return; }

        var STORAGE_KEY = 'mdnd_combat';
        var toolbarEl = document.getElementById('combat-toolbar');
        var roundNumEl = document.getElementById('combat-round');
        var activeEl = document.getElementById('combat-active');
        var activeNameEl = document.getElementById('combat-active-name');
        var emptyEl = document.getElementById('combat-empty');
        var nextBtn = document.getElementById('combat-next-btn');
        var resetBtn = document.getElementById('combat-reset-btn');
        var addBtns = [document.getElementById('combat-add-btn'), document.getElementById('combat-empty-add')];

        // Modale d'ajout (réutilise la structure .mdnd-modal partagée).
        var addModal = document.getElementById('mdnd-combat-modal');
        var sheetSelect = document.getElementById('combat-add-sheet');
        var fName = document.getElementById('combat-add-name');
        var fInit = document.getElementById('combat-add-init');
        var fHp = document.getElementById('combat-add-hp');
        var fCa = document.getElementById('combat-add-ca');
        var addConfirmBtn = document.getElementById('combat-add-confirm');

        // Fiches de perso disponibles (localisées côté serveur).
        var CHARACTERS = (typeof dndKnowledgeBase !== 'undefined' && dndKnowledgeBase.characters)
            ? dndKnowledgeBase.characters : [];

        var CONDITIONS = [
            { name: 'À terre', desc: "Se déplace en rampant ; désavantage aux attaques. Attaques de mêlée subies avec avantage, à distance avec désavantage." },
            { name: 'Agrippé', desc: "Vitesse réduite à 0, aucun bonus de vitesse." },
            { name: 'Assourdi', desc: "N'entend plus ; rate les jets nécessitant l'ouïe." },
            { name: 'Aveuglé', desc: "Ne voit plus ; désavantage aux attaques, les attaquants ont l'avantage." },
            { name: 'Charmé', desc: "Ne peut cibler le charmeur ; celui-ci a l'avantage aux interactions sociales." },
            { name: 'Concentration', desc: "Maintien d'un sort : jet de Constitution (DD 10 ou ½ des dégâts subis) à chaque dégât, sinon le sort cesse." },
            { name: 'Effrayé', desc: "Désavantage tant que la source est visible ; ne peut s'en approcher volontairement." },
            { name: 'Empoisonné', desc: "Désavantage aux jets d'attaque et aux tests de caractéristique." },
            { name: 'Entravé', desc: "Vitesse 0 ; désavantage aux attaques et à la Dextérité ; attaquants avantagés." },
            { name: 'Épuisé', desc: "Niveaux d'épuisement cumulatifs (1 à 6), du désavantage aux tests jusqu'à la mort." },
            { name: 'Étourdi', desc: "Ne peut agir ni bouger ; rate Force et Dextérité ; attaquants avantagés." },
            { name: 'Inconscient', desc: "Ne peut agir, tombe à terre et lâche tout ; rate Force/Dex ; coups en mêlée = critiques." },
            { name: 'Invisible', desc: "Indétectable à vue ; avantage aux attaques, les attaquants ont le désavantage." },
            { name: 'Paralysé', desc: "Ne peut agir ni bouger ; rate Force/Dex ; attaquants avantagés, coups à ≤ 1,5 m = critiques." },
            { name: 'Pétrifié', desc: "Changé en pierre, inconscient ; résistance à tous les dégâts ; immunisé poison et maladie." }
        ];
        function condDesc(name) {
            var c = CONDITIONS.filter(function (x) { return x.name === name; })[0];
            return c ? c.desc : '';
        }

        // État : { round, turnIndex, combatants: [{ id, name, type:'pc'|'monster',
        //          initiative, ac, hpMax, hpCurrent, conditions:[] }] }
        function defaultState() {
            return { round: 1, turnIndex: 0, combatants: [] };
        }

        function loadState() {
            try {
                var raw = window.localStorage.getItem(STORAGE_KEY);
                if (!raw) { return defaultState(); }
                var parsed = JSON.parse(raw);
                if (!parsed || !Array.isArray(parsed.combatants)) { return defaultState(); }
                parsed.round = parsed.round || 1;
                parsed.turnIndex = parsed.turnIndex || 0;
                return parsed;
            } catch (e) {
                return defaultState();
            }
        }

        function saveState() {
            try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
        }

        var state = loadState();

        function uid() {
            return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        }
        function abilityMod(score) { return Math.floor(((parseInt(score, 10) || 10) - 10) / 2); }
        function byId(id) {
            return state.combatants.filter(function (c) { return c.id === id; })[0];
        }
        function sortByInitiative() {
            state.combatants.sort(function (a, b) { return (b.initiative || 0) - (a.initiative || 0); });
        }
        function persistAndRender() {
            saveState();
            render();
        }

        // Ajout d'un combattant (fiche perso ou saisie ad-hoc).
        function addCombatant(data) {
            data = data || {};
            var hpMax = parseInt(data.hpMax, 10) || 0;
            var hpCurrent = (data.hpCurrent != null && data.hpCurrent !== '')
                ? (parseInt(data.hpCurrent, 10) || 0) : hpMax;
            state.combatants.push({
                id: uid(),
                name: data.name || 'Sans nom',
                type: data.type === 'pc' ? 'pc' : 'monster',
                initiative: parseInt(data.initiative, 10) || 0,
                ac: (data.ac != null && data.ac !== '') ? data.ac : '',
                hpMax: hpMax,
                hpCurrent: hpCurrent,
                hpTemp: parseInt(data.hpTemp, 10) || 0,
                conditions: Array.isArray(data.conditions) ? data.conditions : []
            });
            sortByInitiative();
            persistAndRender();
        }

        // Dérive un combattant (type Héros) depuis une fiche de personnage.
        function fromSheet(character) {
            var sheet = character.sheet || {};
            var ab = sheet.abilities || {};
            var mo = sheet.abilityModOverride || {};
            var combat = sheet.combat || {};
            var dexMod = (mo.dex !== '' && mo.dex != null) ? (parseInt(mo.dex, 10) || 0) : abilityMod(ab.dex);
            var init = (combat.initiativeOverride !== '' && combat.initiativeOverride != null)
                ? (parseInt(combat.initiativeOverride, 10) || 0) : dexMod;
            return {
                name: character.name,
                type: 'pc',
                initiative: init,
                ac: (combat.ac != null && combat.ac !== '') ? combat.ac : '',
                hpMax: combat.hpMax,
                hpCurrent: (combat.hpCurrent != null && combat.hpCurrent !== '') ? combat.hpCurrent : combat.hpMax,
                hpTemp: combat.hpTemp
            };
        }

        function removeCombatant(id) {
            state.combatants = state.combatants.filter(function (c) { return c.id !== id; });
            if (state.turnIndex >= state.combatants.length) { state.turnIndex = 0; }
            persistAndRender();
        }

        function adjustHp(id, delta) {
            var c = byId(id);
            if (!c) { return; }
            if (delta < 0) {
                // Les dégâts sont d'abord absorbés par les PV temporaires (règle 5e).
                var dmg = -delta;
                var temp = c.hpTemp || 0;
                if (temp > 0) {
                    var absorbed = Math.min(temp, dmg);
                    c.hpTemp = temp - absorbed;
                    dmg -= absorbed;
                }
                c.hpCurrent = Math.max(0, (c.hpCurrent || 0) - dmg);
            } else {
                // Les soins ne restaurent pas les PV temporaires et ne dépassent pas le max.
                var v = (c.hpCurrent || 0) + delta;
                if (c.hpMax > 0) { v = Math.min(c.hpMax, v); }
                c.hpCurrent = Math.max(0, v);
            }
            persistAndRender();
        }
        function setTemp(id, value) {
            var c = byId(id);
            if (!c) { return; }
            c.hpTemp = Math.max(0, parseInt(value, 10) || 0);
            persistAndRender();
        }

        // Menu déroulant des 15 états (réutilise le style .mdnd-combo-list).
        function closeConditionMenu() {
            var m = listEl.querySelector('.mdnd-cond-menu');
            if (m) { m.remove(); }
            document.removeEventListener('click', onDocClickCond, true);
        }
        function onDocClickCond(e) {
            var m = listEl.querySelector('.mdnd-cond-menu');
            if (m && !m.contains(e.target) && !e.target.closest('[data-action="add-condition"]')) {
                closeConditionMenu();
            }
        }
        function openConditionMenu(c, row) {
            var open = listEl.querySelector('.mdnd-cond-menu');
            closeConditionMenu();
            if (open) { return; } // Un clic sur « + État » alors qu'il est ouvert le referme.

            var chipList = row.querySelector('.mdnd-chip-list');
            var avail = CONDITIONS.filter(function (cond) { return c.conditions.indexOf(cond.name) === -1; });
            var menu = document.createElement('div');
            menu.className = 'mdnd-combo-list mdnd-cond-menu';
            if (!avail.length) {
                menu.innerHTML = '<div class="mdnd-combo-empty">Tous les états sont appliqués</div>';
            } else {
                menu.innerHTML = avail.map(function (cond) {
                    return '<button type="button" class="mdnd-combo-item mdnd-cond-item" data-cond="' + escapeHtml(cond.name) + '" title="' + escapeHtml(cond.desc) + '">'
                        + '<span class="mdnd-cond-item__name">' + escapeHtml(cond.name) + '</span>'
                        + '<span class="mdnd-cond-item__desc">' + escapeHtml(cond.desc) + '</span>'
                        + '</button>';
                }).join('');
            }
            chipList.appendChild(menu);
            menu.addEventListener('click', function (e) {
                var it = e.target.closest('[data-cond]');
                if (!it) { return; }
                var cond = it.getAttribute('data-cond');
                closeConditionMenu();
                if (c.conditions.indexOf(cond) === -1) { c.conditions.push(cond); }
                persistAndRender();
            });
            // Différé pour ne pas être refermé par le clic « + État » courant.
            setTimeout(function () { document.addEventListener('click', onDocClickCond, true); }, 0);
        }
        function removeCondition(c, cond) {
            c.conditions = c.conditions.filter(function (x) { return x !== cond; });
            persistAndRender();
        }

        function nextTurn() {
            if (!state.combatants.length) { return; }
            state.turnIndex += 1;
            if (state.turnIndex >= state.combatants.length) {
                state.turnIndex = 0;
                state.round += 1;
            }
            persistAndRender();
        }

        function resetCombat() {
            if (state.combatants.length &&
                !window.confirm('Démarrer un nouveau combat ? Les combattants actuels seront retirés.')) {
                return;
            }
            state = defaultState();
            persistAndRender();
        }

        // --- Rendu (markup maquette : .mdnd-init-row) ---
        function rowHtml(c, isActive) {
            var pvMax = c.hpMax || 0;
            var pct = pvMax > 0 ? Math.max(0, Math.min(100, Math.round(c.hpCurrent / pvMax * 100))) : 0;
            var bar = pvMax > 0 && pct <= 25 ? ' is-low' : (pvMax > 0 && pct <= 50 ? ' is-mid' : '');
            var ko = pvMax > 0 && c.hpCurrent <= 0;
            var isPc = c.type === 'pc';
            var typeBadge = isPc
                ? '<span class="mdnd-badge mdnd-badge-info">Héros</span>'
                : '<span class="mdnd-badge">Monstre</span>';
            var koBadge = ko ? '<span class="mdnd-badge mdnd-badge-danger">K.O.</span>' : '';

            var hpTemp = c.hpTemp || 0;
            var chips = (c.conditions || []).map(function (cond) {
                return '<span class="mdnd-chip" data-desc="' + escapeHtml(condDesc(cond)) + '">' + escapeHtml(cond)
                    + '<button class="mdnd-chip-del" type="button" data-action="del-condition" data-cond="'
                    + escapeHtml(cond) + '" aria-label="Retirer ' + escapeHtml(cond) + '">×</button></span>';
            }).join('');

            return '<div class="mdnd-init-row' + (isActive ? ' is-active' : '') + (ko ? ' is-ko' : '') + '" data-id="' + escapeHtml(c.id) + '">'
                + '<div class="mdnd-init-num"><input class="mdnd-input" type="number" value="' + escapeHtml(c.initiative) + '" data-action="init" aria-label="Initiative de ' + escapeHtml(c.name) + '"></div>'
                + '<div class="mdnd-init-main">'
                +   '<div class="mdnd-init-name"><span class="mdnd-init-name__text">' + escapeHtml(c.name) + '</span>' + typeBadge + koBadge + '</div>'
                +   '<div class="mdnd-chip-list">' + chips + '<button class="mdnd-chip-add" type="button" data-action="add-condition">+ État</button></div>'
                + '</div>'
                + '<div class="mdnd-hp">'
                +   '<div class="mdnd-hp-total"><span class="mdnd-hp-total__label">PV</span>'
                +     '<span class="mdnd-hp-total__value">' + escapeHtml(c.hpCurrent) + ' / ' + escapeHtml(pvMax) + '</span>'
                +     (hpTemp > 0 ? '<span class="mdnd-hp-total__temp" title="PV temporaires">+' + escapeHtml(hpTemp) + '</span>' : '')
                +   '</div>'
                +   '<div class="mdnd-hp-bar' + bar + '"><i style="width:' + pct + '%"></i></div>'
                +   '<div class="mdnd-hp-actions">'
                +     '<button class="mdnd-button mdnd-button-danger" type="button" data-action="dmg" aria-label="Dégâts">−</button>'
                +     '<input class="mdnd-input mdnd-hp-input" type="number" placeholder="0" data-action="amount" aria-label="Montant">'
                +     '<button class="mdnd-button mdnd-button-secondary" type="button" data-action="heal" aria-label="Soin">+</button>'
                +     '<label class="mdnd-hp-temp"><span>PVT</span><input class="mdnd-input" type="number" min="0" placeholder="0" value="' + (hpTemp > 0 ? escapeHtml(hpTemp) : '') + '" data-action="temp" aria-label="PV temporaires"></label>'
                +   '</div>'
                + '</div>'
                + '<div class="mdnd-stat"><span class="mdnd-stat__label">CA</span><span class="mdnd-stat__value">' + escapeHtml(c.ac || '—') + '</span></div>'
                + '<div class="mdnd-init-actions"><button class="mdnd-button mdnd-button-secondary" type="button" data-action="remove" title="Retirer" aria-label="Retirer ' + escapeHtml(c.name) + '">✕</button></div>'
                + '</div>';
        }

        function render() {
            var has = state.combatants.length > 0;
            if (state.turnIndex >= state.combatants.length) { state.turnIndex = 0; }
            var active = has ? state.combatants[state.turnIndex] : null;

            if (toolbarEl) { toolbarEl.hidden = !has; }
            if (emptyEl) { emptyEl.hidden = has; }
            if (roundNumEl) { roundNumEl.textContent = state.round; }
            if (activeEl) { activeEl.hidden = !active; }
            if (activeNameEl && active) { activeNameEl.textContent = active.name; }

            listEl.innerHTML = state.combatants.map(function (c, idx) {
                return rowHtml(c, idx === state.turnIndex);
            }).join('');
        }

        // Délégation des actions sur les lignes.
        listEl.addEventListener('click', function (e) {
            var actionEl = e.target.closest('[data-action]');
            if (!actionEl) { return; }
            var row = e.target.closest('.mdnd-init-row');
            if (!row) { return; }
            var c = byId(row.getAttribute('data-id'));
            if (!c) { return; }
            var action = actionEl.getAttribute('data-action');
            if (action === 'remove') {
                removeCombatant(c.id);
            } else if (action === 'dmg' || action === 'heal') {
                var amt = parseInt(row.querySelector('[data-action="amount"]').value, 10);
                if (!amt || amt < 0) { amt = 1; }
                adjustHp(c.id, action === 'dmg' ? -amt : amt);
            } else if (action === 'add-condition') {
                openConditionMenu(c, row);
            } else if (action === 'del-condition') {
                removeCondition(c, actionEl.getAttribute('data-cond'));
            }
        });

        // Édition au blur des champs de la ligne (initiative, PV temporaires).
        listEl.addEventListener('change', function (e) {
            var actionEl = e.target.closest('[data-action="init"], [data-action="temp"]');
            if (!actionEl) { return; }
            var row = e.target.closest('.mdnd-init-row');
            var c = row ? byId(row.getAttribute('data-id')) : null;
            if (!c) { return; }
            if (actionEl.getAttribute('data-action') === 'temp') {
                setTemp(c.id, actionEl.value);
            } else {
                c.initiative = parseInt(actionEl.value, 10) || 0;
                sortByInitiative();
                persistAndRender();
            }
        });

        // Info-bulle custom au survol d'un état (détail de la condition).
        var condTip = null;
        function hideTip() { if (condTip) { condTip.hidden = true; } }
        listEl.addEventListener('mouseover', function (e) {
            var chip = e.target.closest('.mdnd-chip[data-desc]');
            if (!chip) { return; }
            var desc = chip.getAttribute('data-desc');
            if (!desc) { return; }
            if (!condTip) {
                condTip = document.createElement('div');
                condTip.className = 'mdnd-tip';
                document.body.appendChild(condTip);
            }
            condTip.textContent = desc;
            condTip.hidden = false;
            var r = chip.getBoundingClientRect();
            var left = Math.max(8, Math.min(r.left, window.innerWidth - condTip.offsetWidth - 8));
            condTip.style.left = Math.round(left) + 'px';
            condTip.style.top = Math.round(r.top) + 'px';
        });
        listEl.addEventListener('mouseout', function (e) {
            if (e.target.closest('.mdnd-chip[data-desc]')) { hideTip(); }
        });

        // --- Modale d'ajout ---
        function fillSheetSelect() {
            if (!sheetSelect) { return; }
            sheetSelect.innerHTML = '<option value="">— Choisir un personnage —</option>'
                + CHARACTERS.map(function (c, i) {
                    return '<option value="' + i + '">' + escapeHtml(c.name) + '</option>';
                }).join('');
        }
        function openAddModal() {
            if (!addModal) { return; }
            if (sheetSelect) { sheetSelect.value = ''; }
            [fName, fInit, fHp, fCa].forEach(function (el) { if (el) { el.value = ''; } });
            addModal.classList.add('is-active');
            document.body.style.overflow = 'hidden';
        }
        function closeAddModal() {
            if (!addModal) { return; }
            addModal.classList.remove('is-active');
            document.body.style.overflow = '';
        }
        function confirmAdd() {
            var idx = sheetSelect ? sheetSelect.value : '';
            if (idx !== '') {
                var ch = CHARACTERS[parseInt(idx, 10)];
                if (ch) { addCombatant(fromSheet(ch)); }
            } else {
                if (!fName.value.trim()) { fName.focus(); return; }
                addCombatant({
                    name: fName.value, type: 'monster',
                    initiative: fInit.value, hpMax: fHp.value, ac: fCa.value
                });
            }
            closeAddModal();
        }

        addBtns.forEach(function (b) { if (b) { b.addEventListener('click', openAddModal); } });
        if (nextBtn) { nextBtn.addEventListener('click', nextTurn); }
        if (resetBtn) { resetBtn.addEventListener('click', resetCombat); }
        if (addConfirmBtn) { addConfirmBtn.addEventListener('click', confirmAdd); }
        if (addModal) {
            addModal.querySelectorAll('[data-close="combat"]').forEach(function (b) {
                b.addEventListener('click', closeAddModal);
            });
            addModal.addEventListener('click', function (e) { if (e.target === addModal) { closeAddModal(); } });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && addModal.classList.contains('is-active')) { closeAddModal(); }
            });
        }

        // Point d'entrée exposé pour un futur ajout direct depuis une fiche.
        window.mdndCombat = { addCombatant: addCombatant, getState: function () { return state; } };

        fillSheetSelect();
        sortByInitiative();
        render();
    })();

    // --- RESTAURATION DEPUIS L'URL (au chargement / F5) ---
    // Hash attendu : `#onglet` ou `#onglet/idItem`.
    (function routeFromHash() {
        var raw = (location.hash || '').replace(/^#/, '');
        if (!raw) {
            return; // Pas de hash : onglet par défaut du HTML.
        }
        var parts = raw.split('/');
        var tab = parts[0];
        var itemId = parts[1];

        if (!activateTab(tab)) {
            return; // Hash invalide : on garde l'onglet par défaut.
        }
        if (tab === 'characters') {
            if (itemId && openCharacterById) { openCharacterById(itemId); }
        } else if (itemId && openKbItem) {
            openKbItem(tab, itemId);
        }
    })();

})();
