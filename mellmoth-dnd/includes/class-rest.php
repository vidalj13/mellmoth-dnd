<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * API REST pour les sorts/équipements personnels (custom) de l'utilisateur connecté.
 *
 * Sécurité :
 *  - permission_callback sur chaque route (connecté + capability access_dnd_hub) ;
 *  - nonce REST (X-WP-Nonce) vérifié par le cœur de WordPress (auth cookie) ;
 *  - toutes les écritures sont scopées par user_id côté repository (anti-IDOR) ;
 *  - entrées sanitizées avant insertion ; sortie échappée côté JS.
 */
final class Rest {

    private const NS = 'mellmoth-dnd/v1';

    public static function register_routes(): void {
        // Sorts
        register_rest_route( self::NS, '/spells', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'create_spell' ],
            'permission_callback' => [ self::class, 'can_edit' ],
        ] );
        register_rest_route( self::NS, '/spells/(?P<id>\d+)', [
            [
                'methods'             => 'PUT, PATCH',
                'callback'            => [ self::class, 'update_spell' ],
                'permission_callback' => [ self::class, 'can_edit' ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ self::class, 'delete_spell' ],
                'permission_callback' => [ self::class, 'can_edit' ],
            ],
        ] );

        // Équipement
        register_rest_route( self::NS, '/equipment', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'create_equipment' ],
            'permission_callback' => [ self::class, 'can_edit' ],
        ] );
        register_rest_route( self::NS, '/equipment/(?P<id>\d+)', [
            [
                'methods'             => 'PUT, PATCH',
                'callback'            => [ self::class, 'update_equipment' ],
                'permission_callback' => [ self::class, 'can_edit' ],
            ],
            [
                'methods'             => 'DELETE',
                'callback'            => [ self::class, 'delete_equipment' ],
                'permission_callback' => [ self::class, 'can_edit' ],
            ],
        ] );
    }

    /** Garde : connecté ET porteur du droit d'accès au hub. */
    public static function can_edit(): bool {
        return is_user_logged_in() && current_user_can( CAPABILITY );
    }

    /* --------------------------- Sorts --------------------------- */

    private static function spell_data( $request ): array {
        return [
            'name'         => sanitize_text_field( (string) $request['name'] ),
            'level'        => max( 0, min( 9, (int) $request['level'] ) ),
            'school'       => sanitize_text_field( (string) $request['school'] ),
            'casting_time' => sanitize_text_field( (string) $request['casting_time'] ),
            'range_desc'   => sanitize_text_field( (string) $request['range_desc'] ),
            'components'   => sanitize_text_field( (string) $request['components'] ),
            'description'  => sanitize_textarea_field( (string) $request['description'] ),
        ];
    }

    public static function create_spell( $request ) {
        $data = self::spell_data( $request );
        if ( '' === $data['name'] ) {
            return new \WP_Error( 'mdnd_missing_name', 'Le nom du sort est obligatoire.', [ 'status' => 400 ] );
        }
        $row = \Mellmoth_Dnd_Knowledge_Base::add_user_spell( get_current_user_id(), $data );
        if ( ! $row ) {
            return new \WP_Error( 'mdnd_db_error', 'Création impossible.', [ 'status' => 500 ] );
        }
        return new \WP_REST_Response( $row, 201 );
    }

    public static function update_spell( $request ) {
        $data = self::spell_data( $request );
        if ( '' === $data['name'] ) {
            return new \WP_Error( 'mdnd_missing_name', 'Le nom du sort est obligatoire.', [ 'status' => 400 ] );
        }
        $row = \Mellmoth_Dnd_Knowledge_Base::update_user_spell( get_current_user_id(), (int) $request['id'], $data );
        if ( ! $row ) {
            return new \WP_Error( 'mdnd_not_found', 'Sort introuvable ou non autorisé.', [ 'status' => 404 ] );
        }
        return new \WP_REST_Response( $row, 200 );
    }

    public static function delete_spell( $request ) {
        $ok = \Mellmoth_Dnd_Knowledge_Base::delete_user_spell( get_current_user_id(), (int) $request['id'] );
        if ( ! $ok ) {
            return new \WP_Error( 'mdnd_not_found', 'Sort introuvable ou non autorisé.', [ 'status' => 404 ] );
        }
        return new \WP_REST_Response( [ 'deleted' => true, 'id' => (int) $request['id'] ], 200 );
    }

    /* ------------------------ Équipement ------------------------ */

    private static function equipment_data( $request ): array {
        return [
            'name'        => sanitize_text_field( (string) $request['name'] ),
            'type'        => sanitize_text_field( (string) $request['type'] ),
            'category'    => sanitize_text_field( (string) $request['category'] ),
            'rarity'      => sanitize_text_field( (string) $request['rarity'] ),
            'weight'      => (float) $request['weight'],
            'cost'        => (float) $request['cost'],
            'description' => sanitize_textarea_field( (string) $request['description'] ),
            'properties'  => sanitize_textarea_field( (string) $request['properties'] ),
            'damage_dice' => sanitize_text_field( (string) $request['damage_dice'] ),
            'damage_type' => sanitize_text_field( (string) $request['damage_type'] ),
            'ac_bonus'    => (int) $request['ac_bonus'],
        ];
    }

    public static function create_equipment( $request ) {
        $data = self::equipment_data( $request );
        if ( '' === $data['name'] ) {
            return new \WP_Error( 'mdnd_missing_name', 'Le nom de l\'objet est obligatoire.', [ 'status' => 400 ] );
        }
        $row = \Mellmoth_Dnd_Knowledge_Base::add_user_equipment( get_current_user_id(), $data );
        if ( ! $row ) {
            return new \WP_Error( 'mdnd_db_error', 'Création impossible.', [ 'status' => 500 ] );
        }
        return new \WP_REST_Response( $row, 201 );
    }

    public static function update_equipment( $request ) {
        $data = self::equipment_data( $request );
        if ( '' === $data['name'] ) {
            return new \WP_Error( 'mdnd_missing_name', 'Le nom de l\'objet est obligatoire.', [ 'status' => 400 ] );
        }
        $row = \Mellmoth_Dnd_Knowledge_Base::update_user_equipment( get_current_user_id(), (int) $request['id'], $data );
        if ( ! $row ) {
            return new \WP_Error( 'mdnd_not_found', 'Objet introuvable ou non autorisé.', [ 'status' => 404 ] );
        }
        return new \WP_REST_Response( $row, 200 );
    }

    public static function delete_equipment( $request ) {
        $ok = \Mellmoth_Dnd_Knowledge_Base::delete_user_equipment( get_current_user_id(), (int) $request['id'] );
        if ( ! $ok ) {
            return new \WP_Error( 'mdnd_not_found', 'Objet introuvable ou non autorisé.', [ 'status' => 404 ] );
        }
        return new \WP_REST_Response( [ 'deleted' => true, 'id' => (int) $request['id'] ], 200 );
    }
}
