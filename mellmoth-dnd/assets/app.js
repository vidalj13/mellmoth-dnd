(function () {
    'use strict';

    var root = document.getElementById('mellmoth-dnd-hub');
    if (!root) {
        return;
    }

    // --- GESTION DES ONGLETS ---
    var tabs = root.querySelectorAll('.mdnd-tab');
    var panels = {
        scenario: root.querySelector('#panel-scenario'),
        fiches: root.querySelector('#panel-fiches'),
        spells: root.querySelector('#panel-spells'),
        equipment: root.querySelector('#panel-equipment'),
        'dice-roller': root.querySelector('#panel-dice-roller') // Nouvel onglet
    };

    // --- ÉTAT DANS L'URL ---
    // Hash = `#onglet` ou `#onglet/idItem`. Permet de conserver l'onglet (et la modale
    // ouverte) après un F5 et de partager un lien direct.
    var openKbItem = null; // Assigné plus bas, une fois les données KB disponibles.

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

        // Le hash ne pointe plus vers un élément : on revient à l'onglet seul.
        var tab = getActiveTab();
        if (tab) {
            setHash(tab);
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
                    <h2>${item.name}</h2>
                    <p class="mdnd-modal-subtitle"><em>${spellLevelLabel(item.level)} - ${item.school}</em></p>
                    <div class="mdnd-modal-meta">
                        <p><strong>Temps d'incantation :</strong> ${item.casting_time}</p>
                        <p><strong>Portée :</strong> ${item.range_desc}</p>
                        <p><strong>Composantes :</strong> ${item.components}</p>
                    </div>
                    <div class="mdnd-modal-desc">
                        <p>${item.description ? item.description.replace(/\\n/g, '<br>') : ''}</p>
                    </div>
                `;
            }

            // equipment
            var propertiesHtml = '';
            if (item.properties) propertiesHtml += `<p><strong>Propriétés :</strong> ${item.properties}</p>`;
            if (item.damage_dice) propertiesHtml += `<p><strong>Dégâts :</strong> ${item.damage_dice} ${item.damage_type ? '('+item.damage_type+')' : ''}</p>`;
            if (item.ac_bonus) propertiesHtml += `<p><strong>Bonus de CA :</strong> +${item.ac_bonus}</p>`;

            return `
                <h2>${item.name}</h2>
                <p class="mdnd-modal-subtitle"><em>${item.type} - ${item.category} (${item.rarity})</em></p>
                <div class="mdnd-modal-meta">
                    <p><strong>Coût :</strong> ${item.cost ? item.cost + ' po' : '-'}</p>
                    <p><strong>Poids :</strong> ${item.weight ? item.weight + ' kg' : '-'}</p>
                    ${propertiesHtml}
                </div>
                <div class="mdnd-modal-desc">
                    <p>${item.description ? item.description.replace(/\\n/g, '<br>') : '<em>Aucune description disponible.</em>'}</p>
                </div>
            `;
        }

        // Résumé compact affiché en carte sur mobile.
        function buildCardSummary(item, type) {
            if (type === 'spell') {
                var lvl = item.level === '0' || item.level === 0 ? 'tour de magie' : 'niv. ' + item.level;
                return `
                    <div class="mdnd-card-title">${item.name}</div>
                    <div class="mdnd-card-sub">${item.school} (${lvl})</div>
                    <div class="mdnd-card-meta">
                        <span>Portée : ${item.range_desc || '–'}</span>
                        <span>Incantation : ${item.casting_time || '–'}</span>
                    </div>
                `;
            }

            // equipment
            return `
                <div class="mdnd-card-title">${item.name}</div>
                <div class="mdnd-card-sub">${item.type} · ${item.category}</div>
                <div class="mdnd-card-meta">
                    <span>Coût : ${item.cost ? item.cost + ' po' : '–'}</span>
                    <span>Poids : ${item.weight ? item.weight + ' kg' : '–'}</span>
                </div>
            `;
        }

        function renderTable(tbodyId, data, columns, type) {
            var tbody = document.getElementById(tbodyId);
            if (!tbody) return;

            var cardsContainer = document.getElementById(tbodyId.replace('-table-body', '-cards'));
            var tabKey = tbodyId.replace('-table-body', ''); // 'spells' / 'equipment' (= clé d'onglet pour le hash).

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
                var content = buildDetailContent(item, type);

                // Ligne de tableau (desktop).
                var tr = document.createElement('tr');
                tr.style.cursor = 'pointer'; // Indique que la ligne est cliquable

                columns.forEach(function(col) {
                    var td = document.createElement('td');
                    if (col === 'level') {
                        td.textContent = item[col] === '0' || item[col] === 0 ? 'Tour de magie' : item[col];
                    } else {
                        td.textContent = item[col] || '';
                    }
                    tr.appendChild(td);
                });

                tr.addEventListener('click', function() {
                    openModal(content);
                    setHash(tabKey + '/' + item.id);
                });

                tbody.appendChild(tr);

                // Carte compacte (mobile).
                if (cardsContainer) {
                    var card = document.createElement('div');
                    card.className = 'mdnd-kb-card';
                    card.innerHTML = buildCardSummary(item, type);
                    card.addEventListener('click', function() {
                        openModal(content);
                        setHash(tabKey + '/' + item.id);
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
            return data.sort(function(a, b) {
                var valA = a[key];
                var valB = b[key];

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return order === 'asc' ? valA - valB : valB - valA;
                } else {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
            });
        }

        function setupTable(tableId, data, columns, type, searchId) {
            var table = document.getElementById(tableId);
            var tbodyId = table.querySelector('tbody').id;
            var headers = table.querySelectorAll('th[data-sort]');
            var searchInput = document.getElementById(searchId);

            var currentData = data;

            function redrawTable() {
                var query = searchInput.value;
                var filtered = filterData(currentData, query, columns);
                var sorted = sortData(filtered, sortState.key, sortState.order);
                renderTable(tbodyId, sorted, columns, type);
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

        // Ouvre la modale d'un élément depuis son onglet + son id (restauration via l'URL).
        openKbItem = function(tabKey, id) {
            var type, list;
            if (tabKey === 'spells') {
                type = 'spell';
                list = dndKnowledgeBase.spells || [];
            } else if (tabKey === 'equipment') {
                type = 'equipment';
                list = dndKnowledgeBase.equipment || [];
            } else {
                return;
            }
            var item = list.filter(function(it) { return String(it.id) === String(id); })[0];
            if (item) {
                openModal(buildDetailContent(item, type));
            }
        };

        // --- SORTS ---
        setupTable('spells-table', dndKnowledgeBase.spells || [], ['name', 'level', 'school', 'casting_time', 'range_desc', 'components'], 'spell', 'spells-search');

        // --- ÉQUIPEMENT ---
        setupTable('equipment-table', dndKnowledgeBase.equipment || [], ['name', 'type', 'category', 'cost', 'weight'], 'equipment', 'equipment-search');
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
        if (itemId && openKbItem) {
            openKbItem(tab, itemId);
        }
    })();

})();
