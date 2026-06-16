(function () {
    'use strict';

    var root = document.getElementById('mellmoth-dnd-hub');
    if (!root) {
        return;
    }

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
})();
