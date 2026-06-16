<?php

if (!defined('WPINC')) {
    die;
}

class Mellmoth_Dnd_Knowledge_Base
{
    private static $instance;

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

        self::seed_spells();
        self::seed_equipment();
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
     * Récupère tous les sorts communs.
     */
    public static function get_common_spells()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dnd_spells_reference';
        return $wpdb->get_results("SELECT * FROM $table_name ORDER BY level, name ASC", ARRAY_A);
    }

    /**
     * Récupère tout l'équipement commun.
     */
    public static function get_common_equipment()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dnd_equipment_reference';
        return $wpdb->get_results("SELECT * FROM $table_name ORDER BY type, name ASC", ARRAY_A);
    }
}
