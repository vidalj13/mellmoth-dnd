<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

get_header();
?>
<main class="mellmoth-dnd-hub" id="mellmoth-dnd-hub">

    <nav class="mdnd-tabs" role="tablist" aria-label="Navigation du hub">
        <button type="button" class="mdnd-tab is-active" role="tab"
                data-panel="characters" aria-controls="panel-characters" aria-selected="true">
            Fiches perso
        </button>
        <button type="button" class="mdnd-tab" role="tab"
                data-panel="spells" aria-controls="panel-spells" aria-selected="false">
            Sorts
        </button>
        <button type="button" class="mdnd-tab" role="tab"
                data-panel="equipment" aria-controls="panel-equipment" aria-selected="false">
            Équipement
        </button>
        <button type="button" class="mdnd-tab" role="tab"
                data-panel="dice-roller" aria-controls="panel-dice-roller" aria-selected="false">
            Lanceur de dés
        </button>
    </nav>

    <section class="mdnd-panel is-active" id="panel-characters" role="tabpanel">
        <div id="characters-list-view">
            <div class="mdnd-kb-controls">
                <h2 class="mdnd-section-title">Mes personnages</h2>
                <button type="button" class="mdnd-button mdnd-add-btn" id="character-create-btn">+ Créer un personnage</button>
            </div>
            <div id="characters-list" class="mdnd-char-list">
                <!-- Cartes de personnages générées par JS -->
            </div>
        </div>
        <div id="character-editor-view" hidden>
            <!-- Éditeur de fiche généré par JS -->
        </div>
    </section>

    <section class="mdnd-panel" id="panel-spells" role="tabpanel" hidden>
        <div class="mdnd-kb-controls">
            <input type="search" id="spells-search" placeholder="Rechercher un sort...">
            <label class="mdnd-filter-perso"><input type="checkbox" id="spells-only-user"> Perso uniquement</label>
            <button type="button" class="mdnd-button mdnd-add-btn" data-add="spell">+ Ajouter un sort</button>
        </div>
        <div class="mdnd-kb-table-wrapper">
            <table class="mdnd-kb-table" id="spells-table">
                <thead>
                    <tr>
                        <th data-sort="name">Nom</th>
                        <th data-sort="level">Niveau</th>
                        <th data-sort="school">École</th>
                        <th data-sort="casting_time">Incantation</th>
                        <th data-sort="range_desc">Portée</th>
                        <th data-sort="components">Composantes</th>
                    </tr>
                </thead>
                <tbody id="spells-table-body">
                    <!-- Contenu généré par JS -->
                </tbody>
            </table>
        </div>
        <div class="mdnd-kb-cards" id="spells-cards">
            <!-- Cartes compactes (mobile) générées par JS -->
        </div>
    </section>

    <section class="mdnd-panel" id="panel-equipment" role="tabpanel" hidden>
        <div class="mdnd-kb-controls">
            <input type="search" id="equipment-search" placeholder="Rechercher un objet...">
            <label class="mdnd-filter-perso"><input type="checkbox" id="equipment-only-user"> Perso uniquement</label>
            <button type="button" class="mdnd-button mdnd-add-btn" data-add="equipment">+ Ajouter un objet</button>
        </div>
        <div class="mdnd-kb-table-wrapper">
            <table class="mdnd-kb-table" id="equipment-table">
                <thead>
                    <tr>
                        <th data-sort="name">Nom</th>
                        <th data-sort="type">Type</th>
                        <th data-sort="category">Catégorie</th>
                        <th data-sort="cost">Coût (po)</th>
                        <th data-sort="weight">Poids (kg)</th>
                    </tr>
                </thead>
                <tbody id="equipment-table-body">
                    <!-- Contenu généré par JS -->
                </tbody>
            </table>
        </div>
        <div class="mdnd-kb-cards" id="equipment-cards">
            <!-- Cartes compactes (mobile) générées par JS -->
        </div>
    </section>

    <section class="mdnd-panel" id="panel-dice-roller" role="tabpanel" hidden>
        <div class="mdnd-dice-roller">
            <div class="mdnd-dice-controls">
                <label for="num-dice">Nombre de dés :</label>
                <input type="number" id="num-dice" value="1" min="1" max="10" class="mdnd-input-number">

                <label for="die-type">Type de dé :</label>
                <select id="die-type" class="mdnd-select">
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="20" selected>20</option>
                    <option value="100">100</option>
                </select>

                <label for="modifier">Modificateur :</label>
                <input type="number" id="modifier" value="0" class="mdnd-input-number">

                <button id="roll-dice-btn" class="mdnd-button">Lancer !</button>
            </div>

            <div class="mdnd-dice-result">
                <span id="roll-result">0</span>
            </div>

            <div class="mdnd-dice-history">
                <h3>Historique des lancers :</h3>
                <div id="roll-history" class="mdnd-history-output">
                    <!-- L'historique sera injecté ici -->
                </div>
            </div>
        </div>
    </section>

</main>

<!-- Popup de détails -->
<div id="mdnd-detail-modal" class="mdnd-modal">
    <div class="mdnd-modal-content">
        <button class="mdnd-modal-close">&times;</button>
        <div id="mdnd-modal-body">
            <!-- Les détails seront injectés ici par JS -->
        </div>
    </div>
</div>

<!-- Popup de formulaire (ajout / modification d'une entrée perso) -->
<div id="mdnd-form-modal" class="mdnd-modal">
    <div class="mdnd-modal-content">
        <button class="mdnd-modal-close" data-close="form">&times;</button>
        <h2 id="mdnd-form-title"></h2>
        <form id="mdnd-form" class="mdnd-form" novalidate>
            <div id="mdnd-form-fields">
                <!-- Champs injectés par JS selon le type -->
            </div>
            <p id="mdnd-form-error" class="mdnd-form-error" hidden></p>
            <div class="mdnd-form-actions">
                <button type="button" class="mdnd-button mdnd-button-secondary" data-close="form">Annuler</button>
                <button type="submit" class="mdnd-button" id="mdnd-form-submit">Enregistrer</button>
            </div>
        </form>
    </div>
</div>

<?php
get_footer();
