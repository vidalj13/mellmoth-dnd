<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

get_header();

$current_user = wp_get_current_user();

// Charger les données
$common_spells = \Mellmoth_Dnd_Knowledge_Base::get_common_spells();
$common_equipment = \Mellmoth_Dnd_Knowledge_Base::get_common_equipment();
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
        <h2>Base de Connaissances - Sorts</h2>
        
        <?php if ( ! empty( $common_spells ) ) : ?>
            <ul class="mdnd-spells-list">
                <?php foreach ( $common_spells as $spell ) : ?>
                    <li>
                        <strong><?php echo esc_html( $spell['name'] ); ?></strong> 
                        (Niveau <?php echo esc_html( $spell['level'] ); ?> - <?php echo esc_html( $spell['school'] ); ?>)<br>
                        <em>Temps d'incantation :</em> <?php echo esc_html( $spell['casting_time'] ); ?> | 
                        <em>Portée :</em> <?php echo esc_html( $spell['range_desc'] ); ?> | 
                        <em>Composantes :</em> <?php echo esc_html( $spell['components'] ); ?><br>
                        <p><?php echo esc_html( $spell['description'] ); ?></p>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php else : ?>
            <p>Aucun sort trouvé dans la base de connaissances commune.</p>
        <?php endif; ?>
    </section>

    <section class="mdnd-panel" id="panel-equipment" role="tabpanel" hidden>
        <h2>Base de Connaissances - Équipement</h2>
        
        <?php if ( ! empty( $common_equipment ) ) : ?>
            <ul class="mdnd-equipment-list">
                <?php foreach ( $common_equipment as $item ) : ?>
                    <li>
                        <strong><?php echo esc_html( $item['name'] ); ?></strong> 
                        (<?php echo esc_html( $item['type'] ); ?> - <?php echo esc_html( $item['category'] ); ?>)<br>
                        <em>Coût :</em> <?php echo esc_html( $item['cost'] ); ?> po | 
                        <em>Poids :</em> <?php echo esc_html( $item['weight'] ); ?> kg<br>
                        <p><?php echo esc_html( $item['description'] ); ?></p>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php else : ?>
            <p>Aucun équipement trouvé dans la base de connaissances commune.</p>
        <?php endif; ?>
    </section>

</main>
<?php
get_footer();
