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
        equipment: root.querySelector('#panel-equipment')
    };

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) {
                t.classList.remove('is-active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('is-active');
            tab.setAttribute('aria-selected', 'true');

            var target = tab.dataset.panel;
            Object.keys(panels).forEach(function (key) {
                var panel = panels[key];
                if (!panel) {
                    return;
                }
                var active = (key === target);
                panel.classList.toggle('is-active', active);
                panel.hidden = !active;
            });
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
        // Empêcher le défilement du corps de la page
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('is-active'); // Utilise la classe CSS
        modalBody.innerHTML = '';
        // Réactiver le défilement
        document.body.style.overflow = '';
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        // Fermer au clic en dehors du contenu
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });

        // Fermer avec la touche Échap
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.classList.contains('is-active')) { // Vérifie la classe
                closeModal();
            }
        });
    }

    // --- GESTION DES TABLEAUX (Base de connaissances) ---
    if (typeof dndKnowledgeBase !== 'undefined') {

        function renderTable(tbodyId, data, columns, type) {
            var tbody = document.getElementById(tbodyId);
            if (!tbody) return;

            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="mdnd-empty-table">Aucune donnée trouvée.</td></tr>';
                return;
            }

            data.forEach(function(item) {
                var tr = document.createElement('tr');
                tr.style.cursor = 'pointer'; // Indique que la ligne est cliquable

                columns.forEach(function(col) {
                    var td = document.createElement('td');
                    // Formatage spécial pour le niveau des sorts
                    if (col === 'level') {
                        td.textContent = item[col] === '0' || item[col] === 0 ? 'Tour de magie' : item[col];
                    } else {
                        td.textContent = item[col] || '';
                    }
                    tr.appendChild(td);
                });

                // Ajouter l'événement de clic pour ouvrir le popup
                tr.addEventListener('click', function() {
                    var content = '';
                    if (type === 'spell') {
                        var levelText = item.level === '0' || item.level === 0 ? 'Tour de magie' : 'Niveau ' + item.level;
                        content = `
                            <h2>${item.name}</h2>
                            <p class="mdnd-modal-subtitle"><em>${levelText} - ${item.school}</em></p>
                            <div class="mdnd-modal-meta">
                                <p><strong>Temps d'incantation :</strong> ${item.casting_time}</p>
                                <p><strong>Portée :</strong> ${item.range_desc}</p>
                                <p><strong>Composantes :</strong> ${item.components}</p>
                            </div>
                            <div class="mdnd-modal-desc">
                                <p>${item.description ? item.description.replace(/\\n/g, '<br>') : ''}</p>
                            </div>
                        `;
                    } else if (type === 'equipment') {
                        var propertiesHtml = '';
                        if (item.properties) propertiesHtml += `<p><strong>Propriétés :</strong> ${item.properties}</p>`;
                        if (item.damage_dice) propertiesHtml += `<p><strong>Dégâts :</strong> ${item.damage_dice} ${item.damage_type ? '('+item.damage_type+')' : ''}</p>`;
                        if (item.ac_bonus) propertiesHtml += `<p><strong>Bonus de CA :</strong> +${item.ac_bonus}</p>`;

                        content = `
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
                    openModal(content);
                });

                tbody.appendChild(tr);
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

        // --- SORTS ---
        var spellsData = dndKnowledgeBase.spells || [];
        var spellsColumns = ['name', 'level', 'school', 'casting_time', 'range_desc', 'components'];

        renderTable('spells-table-body', spellsData, spellsColumns, 'spell');

        var spellsSearch = document.getElementById('spells-search');
        if (spellsSearch) {
            spellsSearch.addEventListener('input', function(e) {
                var filtered = filterData(spellsData, e.target.value, spellsColumns);
                renderTable('spells-table-body', filtered, spellsColumns, 'spell');
            });
        }

        // --- ÉQUIPEMENT ---
        var equipmentData = dndKnowledgeBase.equipment || [];
        var equipmentColumns = ['name', 'type', 'category', 'cost', 'weight'];

        renderTable('equipment-table-body', equipmentData, equipmentColumns, 'equipment');

        var equipmentSearch = document.getElementById('equipment-search');
        if (equipmentSearch) {
            equipmentSearch.addEventListener('input', function(e) {
                var filtered = filterData(equipmentData, e.target.value, equipmentColumns);
                renderTable('equipment-table-body', filtered, equipmentColumns, 'equipment');
            });
        }
    }
})();