<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Menu {

    /**
     * Ajoute dynamiquement l'entree de menu, seulement :
     *  - sur l'emplacement de menu cible (MENU_LOCATION),
     *  - si l'utilisateur est connecte ET possede le droit.
     *
     * @param string $items  Le HTML des <li> deja construits.
     * @param object $args    Les arguments de wp_nav_menu (stdClass).
     */
    public static function maybe_add_item( string $items, $args ): string {
        if ( ! isset( $args->theme_location ) || MENU_LOCATION !== $args->theme_location ) {
            return $items;
        }

        if ( ! is_user_logged_in() || ! current_user_can( CAPABILITY ) ) {
            return $items;
        }

        $url   = esc_url( home_url( '/' . ROUTE_SLUG . '/' ) );
        $label = esc_html( MENU_LABEL );

        // Sur la page du hub elle-même : on calque le thème pour l'entrée active
        // (pas de classe "menu-link", état "current" + aria-current).
        if ( Router::is_hub_request() ) {
            $items .= '<li class="menu-item menu-item-mellmoth-dnd current-menu-item">'
                . '<a href="' . $url . '" aria-current="page">' . $label . '</a></li>';
        } else {
            $items .= '<li class="menu-item menu-item-mellmoth-dnd">'
                . '<a class="menu-link" href="' . $url . '">' . $label . '</a></li>';
        }

        return $items;
    }
}
