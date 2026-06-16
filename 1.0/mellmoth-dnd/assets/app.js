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

    // --- GESTION DES TABLEAUX (Base de connaissances) ---
    if (typeof dndKnowledgeBase !== 'undefined') {

        function renderTable(tbodyId, data, columns) {
            var tbody = document.getElementById(tbodyId);
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="mdnd-empty-table">Aucune donnée trouvée.</td></tr>';
                return;
            }

            data.forEach(function(item) {
                var tr = document.createElement('tr');
                
                columns.forEach(function(col) {
                    var td = document.createElement('td');
                    // Formatage spécial pour le niveau des sorts (0 = tour de magie)
                    if (col === 'level') {
                        td.textContent = item[col] === '0' || item[col] === 0 ? 'Tour de magie' : item[col];
                    } else {
                        td.textContent = item[col] || '';
                    }
                    tr.appendChild(td);
                });
                
                // Ajout d'un attribut title pour la description au survol
                if (item.description) {
                    tr.title = item.description;
                }
                
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
        
        renderTable('spells-table-body', spellsData, spellsColumns);

        var spellsSearch = document.getElementById('spells-search');
        if (spellsSearch) {
            spellsSearch.addEventListener('input', function(e) {
                var filtered = filterData(spellsData, e.target.value, spellsColumns);
                renderTable('spells-table-body', filtered, spellsColumns);
            });
        }

        // --- ÉQUIPEMENT ---
        var equipmentData = dndKnowledgeBase.equipment || [];
        var equipmentColumns = ['name', 'type', 'category', 'cost', 'weight'];
        
        renderTable('equipment-table-body', equipmentData, equipmentColumns);

        var equipmentSearch = document.getElementById('equipment-search');
        if (equipmentSearch) {
            equipmentSearch.addEventListener('input', function(e) {
                var filtered = filterData(equipmentData, e.target.value, equipmentColumns);
                renderTable('equipment-table-body', filtered, equipmentColumns);
            });
        }
        
        // TODO: Ajouter le tri sur clic des en-têtes (th[data-sort])
    }
})();
