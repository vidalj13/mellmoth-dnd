<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

get_header();

$current_user = wp_get_current_user();
?>
<main class="mellmoth-dnd-hub" id="mellmoth-dnd-hub">

    <header class="mdnd-header">
        <h1><?php echo esc_html( MENU_LABEL ); ?></h1>
        <p class="mdnd-greeting">
            <?php echo esc_html( sprintf( 'Bienvenue, %s.', $current_user->display_name ) ); ?>
        </p>
    </header>

    <nav class="mdnd-tabs" role="tablist" aria-label="Navigation du hub">
        <button type="button" class="mdnd-tab is-active" role="tab"
                data-panel="scenario" aria-controls="panel-scenario" aria-selected="true">
            Scenario
        </button>
        <button type="button" class="mdnd-tab" role="tab"
                data-panel="fiches" aria-controls="panel-fiches" aria-selected="false">
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
    </nav>

    <section class="mdnd-panel is-active" id="panel-scenario" role="tabpanel">
        <p>Section <strong>Scenario</strong> &mdash; contenu a venir (increment suivant).</p>
    </section>

    <section class="mdnd-panel" id="panel-fiches" role="tabpanel" hidden>
        <p>Section <strong>Fiches perso</strong> &mdash; contenu a venir (increment suivant).</p>
    </section>

    <section class="mdnd-panel" id="panel-spells" role="tabpanel" hidden>
        <div class="mdnd-kb-controls">
            <input type="search" id="spells-search" placeholder="Rechercher un sort...">
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
    </section>

    <section class="mdnd-panel" id="panel-equipment" role="tabpanel" hidden>
        <div class="mdnd-kb-controls">
            <input type="search" id="equipment-search" placeholder="Rechercher un objet...">
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
    </section>

</main>
<?php
get_footer();
