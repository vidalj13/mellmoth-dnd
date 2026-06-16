<?php
/**
 * Plugin Name: Mellmoth D&D Hub
 * Description: Espace de jeu D&D reserve aux membres autorises.
 * Version:     1.0.5
 * Author:      Mellmoth Forge
 * Requires PHP: 8.0
 * Text Domain: mellmoth-dnd
 */

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Pas d'acces direct.
}

/* -------------------------------------------------------------------------
 *  Constantes / reglages  (les seuls "boutons" que tu touches)
 * ---------------------------------------------------------------------- */
const VERSION       = '1.0.5';
const CAPABILITY    = 'access_dnd_hub'; // Droit requis pour voir le hub.
const ROUTE_SLUG    = 'table-de-jeu';   // URL publique : /table-de-jeu
const MENU_LABEL    = 'Table de jeu';   // Libelle affiche dans le menu.
const MENU_LOCATION = 'primary';        // Emplacement de menu du theme (a verifier).

define( __NAMESPACE__ . '\\PATH', plugin_dir_path( __FILE__ ) );
define( __NAMESPACE__ . '\\URL', plugin_dir_url( __FILE__ ) );

require_once PATH . 'includes/class-capabilities.php';
require_once PATH . 'includes/class-router.php';
require_once PATH . 'includes/class-menu.php';
require_once PATH . 'includes/class-admin-users.php';
require_once PATH . 'includes/class-knowledge-base.php'; // Nouvel import pour la base de connaissances
require_once PATH . 'includes/class-rest.php';           // API REST des sorts/équipements personnels

/* -------------------------------------------------------------------------
 *  Activation / desactivation
 * ---------------------------------------------------------------------- */
register_activation_hook( __FILE__, static function (): void {
    Capabilities::grant();
    Router::register_rewrite();
    \Mellmoth_Dnd_Knowledge_Base::on_activation(); // Création des tables de base de données
    flush_rewrite_rules(); // Pour que /table-de-jeu reponde immediatement.
} );

register_deactivation_hook( __FILE__, static function (): void {
    flush_rewrite_rules();
} );

/* -------------------------------------------------------------------------
 *  Bootstrap
 * ---------------------------------------------------------------------- */
add_action( 'plugins_loaded', [ \Mellmoth_Dnd_Knowledge_Base::class, 'maybe_upgrade' ] );
add_action( 'init', [ Router::class, 'register_rewrite' ] );
add_filter( 'query_vars', [ Router::class, 'register_query_var' ] );
add_action( 'template_redirect', [ Router::class, 'maybe_render' ] );
add_action( 'wp_enqueue_scripts', [ Router::class, 'maybe_enqueue_assets' ] );
add_action( 'rest_api_init', [ Rest::class, 'register_routes' ] );
add_filter( 'wp_nav_menu_items', [ Menu::class, 'maybe_add_item' ], 10, 2 );

// Initialisation de l'administration des utilisateurs
AdminUsers::init();
