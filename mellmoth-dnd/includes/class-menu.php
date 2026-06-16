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

        $items .= '<li class="menu-item menu-item-mellmoth-dnd">'
            . '<a href="' . $url . '">' . $label . '</a></li>';

        return $items;
    }
}
