<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Menu {

    /**
     * Cible-t-on un menu d'en-tête ?
     *
     * Astra (Header Builder) rend le menu plusieurs fois (desktop + off-canvas mobile)
     * avec des theme_location différents, mais les <ul> portent la classe
     * "main-header-menu". On accepte donc l'emplacement primaire OU cette classe,
     * ce qui couvre le burger sans toucher au menu de pied de page.
     *
     * @param object $args Arguments de wp_nav_menu / wp_page_menu (stdClass).
     */
    private static function is_header_menu( $args ): bool {
        $location   = isset( $args->theme_location ) ? (string) $args->theme_location : '';
        $menu_class = isset( $args->menu_class ) ? (string) $args->menu_class : '';

        return ( MENU_LOCATION === $location )
            || ( false !== strpos( $menu_class, 'main-header-menu' ) );
    }

    /** L'utilisateur courant a-t-il le droit de voir l'entrée ? */
    private static function user_can_see(): bool {
        return is_user_logged_in() && current_user_can( CAPABILITY );
    }

    /**
     * Construit le <li> de l'entrée. Sur la page du hub : état "current" (pas de
     * classe menu-link, aria-current) ; sinon lien normal avec la classe du thème.
     *
     * @param string $extra_li_class Classe(s) supplémentaire(s) pour le <li> (ex. "page_item ").
     */
    private static function build_item( string $extra_li_class = '' ): string {
        $url      = esc_url( home_url( '/' . ROUTE_SLUG . '/' ) );
        $label    = esc_html( MENU_LABEL );
        $li_class = $extra_li_class . 'menu-item menu-item-type-custom menu-item-mellmoth-dnd';

        // Sur la page du hub : état actif, en calquant exactement le rendu du thème
        // (l'item actif d'Astra garde "menu-link" sur le <a> et ajoute aria-current).
        if ( Router::is_hub_request() ) {
            return '<li class="' . $li_class . ' current-menu-item">'
                . '<a class="menu-link" href="' . $url . '" aria-current="page">' . $label . '</a></li>';
        }

        return '<li class="' . $li_class . '">'
            . '<a class="menu-link" href="' . $url . '">' . $label . '</a></li>';
    }

    /**
     * Cas standard : menu assigné, rendu par wp_nav_menu.
     * Filtre `wp_nav_menu_items`.
     *
     * @param string $items HTML des <li> déjà construits.
     * @param object $args  Arguments de wp_nav_menu (stdClass).
     */
    public static function maybe_add_item( string $items, $args ): string {
        if ( ! self::is_header_menu( $args ) || ! self::user_can_see() ) {
            return $items;
        }
        return $items . self::build_item();
    }

    /**
     * Cas du fallback : aucun menu assigné à l'emplacement → WordPress liste les pages
     * via wp_page_menu (le filtre wp_nav_menu_items ne se déclenche alors PAS).
     * On injecte notre entrée avant la fermeture du <ul>.
     * Filtre `wp_page_menu`.
     *
     * @param string       $menu HTML complet du menu de pages.
     * @param array|object $args Arguments (tableau, hérités de wp_nav_menu lors du fallback).
     */
    public static function maybe_add_item_to_page_menu( $menu, $args ) {
        $args_obj = (object) $args;

        if ( ! self::is_header_menu( $args_obj ) || ! self::user_can_see() ) {
            return $menu;
        }

        $pos = strrpos( $menu, '</ul>' );
        if ( false === $pos ) {
            return $menu;
        }

        return substr( $menu, 0, $pos ) . self::build_item( 'page_item ' ) . substr( $menu, $pos );
    }
}
