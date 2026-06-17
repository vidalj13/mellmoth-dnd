<?php

if (!defined('WPINC')) {
    die;
}

class Mellmoth_Dnd_Knowledge_Base
{
    private static $instance;

    /**
     * Version du schéma BDD. À incrémenter à chaque changement de table/colonne
     * pour déclencher la migration auto (cf. maybe_upgrade()).
     */
    const DB_VERSION = '3';

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct()
    {
        // Constructeur
    }

    /**
     * Migration auto : (re)joue dbDelta si la version de schéma stockée diffère.
     * Appelée à chaque chargement (hook plugins_loaded) mais ne fait rien une fois à jour.
     * Évite d'avoir à désactiver/réactiver le plugin après une mise à jour qui ajoute une table.
     */
    public static function maybe_upgrade()
    {
        if (get_option('mdnd_db_version') === self::DB_VERSION) {
            return;
        }
        self::on_activation(); // dbDelta est idempotent ; le seed est protégé par un COUNT.
    }

    /**
     * Crée ou met à jour les tables de la base de données lors de l'activation du plugin.
     */
    public static function on_activation()
    {
        global $wpdb;
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        $charset_collate = $wpdb->get_charset_collate();

        // Table pour les sorts communs
        $table_name_spells = $wpdb->prefix . 'dnd_spells_reference';
        $sql_spells = "CREATE TABLE $table_name_spells (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            level tinyint(2) NOT NULL,
            school varchar(100) NOT NULL,
            casting_time varchar(255) NOT NULL,
            range_desc varchar(255) NOT NULL,
            components varchar(255) NOT NULL,
            description text NOT NULL,
            isEditable tinyint(1) NOT NULL DEFAULT 0,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_spells);

        // Table pour les sorts personnels des utilisateurs
        $table_name_user_spells = $wpdb->prefix . 'dnd_user_spells_reference';
        $sql_user_spells = "CREATE TABLE $table_name_user_spells (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            name varchar(255) NOT NULL,
            level tinyint(2) NOT NULL,
            school varchar(100) NOT NULL,
            casting_time varchar(255) NOT NULL,
            range_desc varchar(255) NOT NULL,
            components varchar(255) NOT NULL,
            description text NOT NULL,
            PRIMARY KEY  (id),
            KEY user_id (user_id)
        ) $charset_collate;";
        dbDelta($sql_user_spells);

        // Table pour l'équipement commun
        $table_name_equipment = $wpdb->prefix . 'dnd_equipment_reference';
        $sql_equipment = "CREATE TABLE $table_name_equipment (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            type varchar(100) NOT NULL,
            category varchar(100) NOT NULL,
            rarity varchar(100) NOT NULL,
            weight float,
            cost float,
            description text,
            properties text,
            damage_dice varchar(50),
            damage_type varchar(50),
            ac_bonus int,
            isEditable tinyint(1) NOT NULL DEFAULT 0,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta($sql_equipment);

        // Table pour l'équipement personnel des utilisateurs (custom, éditable par son propriétaire)
        $table_name_user_equipment = $wpdb->prefix . 'dnd_user_equipment_reference';
        $sql_user_equipment = "CREATE TABLE $table_name_user_equipment (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            name varchar(255) NOT NULL,
            type varchar(100) NOT NULL,
            category varchar(100) NOT NULL,
            rarity varchar(100) NOT NULL,
            weight float,
            cost float,
            description text,
            properties text,
            damage_dice varchar(50),
            damage_type varchar(50),
            ac_bonus int,
            PRIMARY KEY  (id),
            KEY user_id (user_id)
        ) $charset_collate;";
        dbDelta($sql_user_equipment);

        // Table des fiches de personnage (repository dédié).
        if ( class_exists( 'Mellmoth_Dnd_Characters' ) ) {
            Mellmoth_Dnd_Characters::create_table( $charset_collate );
        }

        self::seed_spells();
        self::seed_equipment();

        update_option('mdnd_db_version', self::DB_VERSION); // Marque le schéma comme à jour.
    }

    /**
     * Ajoute les sorts de base à la table commune.
     */
    private static function seed_spells()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dnd_spells_reference';

        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
        if ($count > 0) {
            return; // Déjà peuplé
        }

        $spells = json_decode(file_get_contents(plugin_dir_path(__FILE__) . '../data/spells.json'), true);

        foreach ($spells as $spell) {
            $wpdb->insert($table_name, [
                'name' => $spell['name'],
                'level' => $spell['level'],
                'school' => $spell['school'],
                'casting_time' => $spell['actionType'],
                'range_desc' => $spell['range'],
                'components' => $spell['components'],
                'description' => $spell['description'],
            ]);
        }
    }

    /**
     * Ajoute l'équipement de base à la table commune.
     */
    private static function seed_equipment()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dnd_equipment_reference';

        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
        if ($count > 0) {
            return; // Déjà peuplé
        }

        $equipment = json_decode(file_get_contents(plugin_dir_path(__FILE__) . '../data/equipment.json'), true);


        foreach ($equipment as $item) {
            $wpdb->insert($table_name, [
                'name' => $item['Nom'],
                'type' => $item['Type'],
                'category' => $item['Categorie'],
                'rarity' => $item['Rarete'],
                'weight' => $item['Poids'],
                'cost' => $item['Cout'],
                'description' => $item['Description'],
                'properties' => $item['Proprietes'],
                'damage_dice' => $item['DegatsDe'],
                'damage_type' => $item['TypeDegats'],
                'ac_bonus' => $item['BonusCA'],
            ]);
        }
    }

    /**
     * Récupère tous les sorts communs (lecture seule, source = common).
     */
    public static function get_common_spells()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dnd_spells_reference';
        return $wpdb->get_results("SELECT *, 'common' AS source FROM $table_name ORDER BY level, name ASC", ARRAY_A);
    }

    /**
     * Récupère tout l'équipement commun (lecture seule, source = common).
     */
    public static function get_common_equipment()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dnd_equipment_reference';
        return $wpdb->get_results("SELECT *, 'common' AS source FROM $table_name ORDER BY type, name ASC", ARRAY_A);
    }

    /* ---------------------------------------------------------------------
     *  Sorts personnels (custom) — toujours scoping par user_id (anti-IDOR)
     * ------------------------------------------------------------------ */

    public static function get_user_spells($user_id)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_spells_reference';
        return $wpdb->get_results(
            $wpdb->prepare("SELECT *, 'user' AS source, 1 AS isEditable FROM $t WHERE user_id = %d ORDER BY level, name ASC", $user_id),
            ARRAY_A
        );
    }

    public static function get_user_spell($user_id, $id)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_spells_reference';
        return $wpdb->get_row(
            $wpdb->prepare("SELECT *, 'user' AS source, 1 AS isEditable FROM $t WHERE id = %d AND user_id = %d", $id, $user_id),
            ARRAY_A
        );
    }

    public static function add_user_spell($user_id, $data)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_spells_reference';
        $ok = $wpdb->insert($t, [
            'user_id'      => $user_id,
            'name'         => $data['name'],
            'level'        => $data['level'],
            'school'       => $data['school'],
            'casting_time' => $data['casting_time'],
            'range_desc'   => $data['range_desc'],
            'components'   => $data['components'],
            'description'  => $data['description'],
        ], ['%d', '%s', '%d', '%s', '%s', '%s', '%s', '%s']);

        return $ok ? self::get_user_spell($user_id, $wpdb->insert_id) : null;
    }

    public static function update_user_spell($user_id, $id, $data)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_spells_reference';
        $res = $wpdb->update($t, [
            'name'         => $data['name'],
            'level'        => $data['level'],
            'school'       => $data['school'],
            'casting_time' => $data['casting_time'],
            'range_desc'   => $data['range_desc'],
            'components'   => $data['components'],
            'description'  => $data['description'],
        ], [ 'id' => $id, 'user_id' => $user_id ],
            ['%s', '%d', '%s', '%s', '%s', '%s', '%s'], ['%d', '%d']);

        return ( false === $res ) ? null : self::get_user_spell($user_id, $id);
    }

    public static function delete_user_spell($user_id, $id)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_spells_reference';
        return (bool) $wpdb->delete($t, [ 'id' => $id, 'user_id' => $user_id ], ['%d', '%d']);
    }

    /* ---------------------------------------------------------------------
     *  Équipement personnel (custom) — scoping par user_id
     * ------------------------------------------------------------------ */

    public static function get_user_equipment($user_id)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_equipment_reference';
        return $wpdb->get_results(
            $wpdb->prepare("SELECT *, 'user' AS source, 1 AS isEditable FROM $t WHERE user_id = %d ORDER BY type, name ASC", $user_id),
            ARRAY_A
        );
    }

    public static function get_user_equipment_item($user_id, $id)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_equipment_reference';
        return $wpdb->get_row(
            $wpdb->prepare("SELECT *, 'user' AS source, 1 AS isEditable FROM $t WHERE id = %d AND user_id = %d", $id, $user_id),
            ARRAY_A
        );
    }

    public static function add_user_equipment($user_id, $data)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_equipment_reference';
        $ok = $wpdb->insert($t, [
            'user_id'     => $user_id,
            'name'        => $data['name'],
            'type'        => $data['type'],
            'category'    => $data['category'],
            'rarity'      => $data['rarity'],
            'weight'      => $data['weight'],
            'cost'        => $data['cost'],
            'description' => $data['description'],
            'properties'  => $data['properties'],
            'damage_dice' => $data['damage_dice'],
            'damage_type' => $data['damage_type'],
            'ac_bonus'    => $data['ac_bonus'],
        ], ['%d', '%s', '%s', '%s', '%s', '%f', '%f', '%s', '%s', '%s', '%s', '%d']);

        return $ok ? self::get_user_equipment_item($user_id, $wpdb->insert_id) : null;
    }

    public static function update_user_equipment($user_id, $id, $data)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_equipment_reference';
        $res = $wpdb->update($t, [
            'name'        => $data['name'],
            'type'        => $data['type'],
            'category'    => $data['category'],
            'rarity'      => $data['rarity'],
            'weight'      => $data['weight'],
            'cost'        => $data['cost'],
            'description' => $data['description'],
            'properties'  => $data['properties'],
            'damage_dice' => $data['damage_dice'],
            'damage_type' => $data['damage_type'],
            'ac_bonus'    => $data['ac_bonus'],
        ], [ 'id' => $id, 'user_id' => $user_id ],
            ['%s', '%s', '%s', '%s', '%f', '%f', '%s', '%s', '%s', '%s', '%d'], ['%d', '%d']);

        return ( false === $res ) ? null : self::get_user_equipment_item($user_id, $id);
    }

    public static function delete_user_equipment($user_id, $id)
    {
        global $wpdb;
        $t = $wpdb->prefix . 'dnd_user_equipment_reference';
        return (bool) $wpdb->delete($t, [ 'id' => $id, 'user_id' => $user_id ], ['%d', '%d']);
    }
}
