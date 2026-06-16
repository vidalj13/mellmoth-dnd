<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Router {

    private const QUERY_VAR = 'mellmoth_dnd';

    /** Declare la route /table-de-jeu. */
    public static function register_rewrite(): void {
        add_rewrite_rule(
            '^' . ROUTE_SLUG . '/?$',
            'index.php?' . self::QUERY_VAR . '=1',
            'top'
        );
    }

    /** Autorise notre query var. */
    public static function register_query_var( array $vars ): array {
        $vars[] = self::QUERY_VAR;
        return $vars;
    }

    public static function is_hub_request(): bool {
        return (bool) get_query_var( self::QUERY_VAR );
    }

    /** Ne charge le CSS/JS du hub que sur la page du hub. */
    public static function maybe_enqueue_assets(): void {
        if ( ! self::is_hub_request() ) {
            return;
        }
        wp_enqueue_style( 'mellmoth-dnd', URL . 'assets/app.css', [], VERSION );
        wp_enqueue_script( 'mellmoth-dnd', URL . 'assets/app.js', [], VERSION, true );

        // Rend les données de la base de connaissances accessibles en JS.
        // Données communes (lecture seule) + données perso de l'utilisateur (éditables) + accès REST.
        $user_id = get_current_user_id();
        wp_localize_script('mellmoth-dnd', 'dndKnowledgeBase', [
            'spells'         => \Mellmoth_Dnd_Knowledge_Base::get_common_spells(),
            'equipment'      => \Mellmoth_Dnd_Knowledge_Base::get_common_equipment(),
            'userSpells'     => \Mellmoth_Dnd_Knowledge_Base::get_user_spells( $user_id ),
            'userEquipment'  => \Mellmoth_Dnd_Knowledge_Base::get_user_equipment( $user_id ),
            'rest'           => [
                'root'  => esc_url_raw( rest_url( 'mellmoth-dnd/v1/' ) ),
                'nonce' => wp_create_nonce( 'wp_rest' ),
            ],
        ]);
    }

    /**
     * Garde serveur. On ne se fie JAMAIS au seul masquage du menu :
     * un utilisateur sans droit qui tape l'URL est arrete ici.
     */
    public static function maybe_render(): void {
        if ( ! self::is_hub_request() ) {
            return;
        }

        if ( ! is_user_logged_in() ) {
            auth_redirect(); // Envoie vers le login puis revient sur la page.
            exit;
        }

        if ( ! current_user_can( CAPABILITY ) ) {
            wp_die(
                esc_html__( 'Vous n\'avez pas acces a cet espace.', 'mellmoth-dnd' ),
                esc_html__( 'Acces refuse', 'mellmoth-dnd' ),
                [ 'response' => 403 ]
            );
        }

        status_header( 200 );
        require PATH . 'templates/app.php';
        exit;
    }
}
