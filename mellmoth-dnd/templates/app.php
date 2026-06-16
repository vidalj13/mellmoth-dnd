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
    </nav>

    <section class="mdnd-panel is-active" id="panel-scenario" role="tabpanel">
        <p>Section <strong>Scenario</strong> &mdash; contenu a venir (increment suivant).</p>
    </section>

    <section class="mdnd-panel" id="panel-fiches" role="tabpanel" hidden>
        <p>Section <strong>Fiches perso</strong> &mdash; contenu a venir (increment suivant).</p>
    </section>

</main>
<?php
get_footer();
