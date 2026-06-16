<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Capabilities {

    /**
     * Accorde la capability aux roles voulus (appele a l'activation).
     *
     * Inc. 1 : seul l'administrateur l'obtient. Le role "joueur" et
     * l'attribution par campagne viendront dans un increment ulterieur.
     */
    public static function grant(): void {
        $roles = [ 'administrator' ];

        foreach ( $roles as $role_name ) {
            $role = get_role( $role_name );
            if ( $role && ! $role->has_cap( CAPABILITY ) ) {
                $role->add_cap( CAPABILITY );
            }
        }
    }
}
