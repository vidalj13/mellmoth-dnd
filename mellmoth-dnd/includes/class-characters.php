<?php

if ( ! defined( 'WPINC' ) ) {
    die;
}

/**
 * Repository des fiches de personnage D&D 5e (une par ligne, possédée par un utilisateur).
 *
 * Le détail complet de la fiche est stocké en JSON dans la colonne `sheet` ;
 * name/class/race/level sont dénormalisés en colonnes pour la liste et le tri.
 * Toutes les opérations sont scopées par user_id (anti-IDOR).
 */
class Mellmoth_Dnd_Characters {

    public static function table() {
        global $wpdb;
        return $wpdb->prefix . 'dnd_characters';
    }

    /** Création / mise à jour de la table (appelée par la migration). */
    public static function create_table( $charset_collate ) {
        $t = self::table();
        $sql = "CREATE TABLE $t (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            name varchar(255) NOT NULL,
            class varchar(100) NOT NULL DEFAULT '',
            race varchar(100) NOT NULL DEFAULT '',
            level smallint(5) NOT NULL DEFAULT 1,
            sheet longtext NOT NULL,
            created_at datetime NULL,
            updated_at datetime NULL,
            PRIMARY KEY  (id),
            KEY user_id (user_id)
        ) $charset_collate;";
        dbDelta( $sql );
    }

    /** Décode la colonne sheet (JSON) en objet pour la sortie. */
    private static function hydrate( $row ) {
        if ( ! $row ) {
            return null;
        }
        $row['sheet'] = json_decode( $row['sheet'], true );
        if ( null === $row['sheet'] ) {
            $row['sheet'] = array();
        }
        return $row;
    }

    /** Toutes les fiches de l'utilisateur (avec leur sheet décodée). */
    public static function get_all( $user_id ) {
        global $wpdb;
        $t = self::table();
        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM $t WHERE user_id = %d ORDER BY updated_at DESC, id DESC", $user_id ),
            ARRAY_A
        );
        return array_map( [ __CLASS__, 'hydrate' ], $rows ?: array() );
    }

    public static function get( $user_id, $id ) {
        global $wpdb;
        $t = self::table();
        return self::hydrate( $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM $t WHERE id = %d AND user_id = %d", $id, $user_id ),
            ARRAY_A
        ) );
    }

    /**
     * @param array $fields name, class, race, level, sheet (array)
     */
    public static function add( $user_id, $fields ) {
        global $wpdb;
        $now = current_time( 'mysql' );
        $ok = $wpdb->insert( self::table(), [
            'user_id'    => $user_id,
            'name'       => $fields['name'],
            'class'      => $fields['class'],
            'race'       => $fields['race'],
            'level'      => $fields['level'],
            'sheet'      => wp_json_encode( $fields['sheet'] ),
            'created_at' => $now,
            'updated_at' => $now,
        ], [ '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s' ] );

        return $ok ? self::get( $user_id, $wpdb->insert_id ) : null;
    }

    public static function update( $user_id, $id, $fields ) {
        global $wpdb;
        $res = $wpdb->update( self::table(), [
            'name'       => $fields['name'],
            'class'      => $fields['class'],
            'race'       => $fields['race'],
            'level'      => $fields['level'],
            'sheet'      => wp_json_encode( $fields['sheet'] ),
            'updated_at' => current_time( 'mysql' ),
        ], [ 'id' => $id, 'user_id' => $user_id ],
            [ '%s', '%s', '%s', '%d', '%s', '%s' ], [ '%d', '%d' ] );

        return ( false === $res ) ? null : self::get( $user_id, $id );
    }

    public static function delete( $user_id, $id ) {
        global $wpdb;
        return (bool) $wpdb->delete( self::table(), [ 'id' => $id, 'user_id' => $user_id ], [ '%d', '%d' ] );
    }
}
