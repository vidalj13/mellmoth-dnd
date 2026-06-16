<?php

namespace MellmothDnd;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Gère l'interface d'administration pour attribuer le droit d'accès au Hub D&D aux utilisateurs.
 */
final class AdminUsers {

    /**
     * Initialise les hooks pour l'administration des utilisateurs.
     */
    public static function init(): void {
        // Ajouter la colonne dans la liste des utilisateurs
        add_filter( 'manage_users_columns', [ self::class, 'add_dnd_column' ] );
        add_filter( 'manage_users_custom_column', [ self::class, 'show_dnd_column_content' ], 10, 3 );

        // Ajouter un champ dans le profil utilisateur (édition par un admin)
        add_action( 'edit_user_profile', [ self::class, 'add_profile_fields' ] );
        add_action( 'show_user_profile', [ self::class, 'add_profile_fields' ] ); // Au cas où un user autorisé édite son propre profil

        // Sauvegarder la modification depuis le profil
        add_action( 'edit_user_profile_update', [ self::class, 'save_profile_fields' ] );
        add_action( 'personal_options_update', [ self::class, 'save_profile_fields' ] );
    }

    /**
     * Ajoute la colonne "Accès Hub D&D" au tableau des utilisateurs.
     *
     * @param array $columns Colonnes existantes.
     * @return array Colonnes modifiées.
     */
    public static function add_dnd_column( $columns ) {
        if ( ! is_array( $columns ) ) {
            $columns = [];
        }
        $columns['dnd_access'] = 'Accès Hub D&D';
        return $columns;
    }

    /**
     * Affiche le contenu de la colonne pour chaque utilisateur.
     *
     * @param string $val       Valeur retournée (vide par défaut).
     * @param string $column_name Nom de la colonne.
     * @param int    $user_id   ID de l'utilisateur.
     * @return string Contenu à afficher.
     */
    public static function show_dnd_column_content( $val, $column_name, $user_id ) {
        if ( 'dnd_access' === $column_name ) {
            // Empêcher les erreurs liées aux capacités si le type n'est pas bon
            $user = get_userdata( $user_id );
            if ( $user && $user->has_cap( CAPABILITY ) ) {
                return '<span style="color: green; font-weight: bold;">✔ Autorisé</span>';
            }
            return '<span style="color: grey;">✖ Non</span>';
        }
        return $val;
    }

    /**
     * Ajoute une case à cocher dans la page de profil utilisateur dans l'admin.
     *
     * @param \WP_User $user Objet utilisateur.
     */
    public static function add_profile_fields( $user ) {
        // Seul un admin (ou quelqu'un qui peut modifier les utilisateurs) devrait voir/modifier ceci
        if ( ! current_user_can( 'edit_users' ) ) {
            return;
        }

        $has_access = $user->has_cap( CAPABILITY );
        ?>
        <h3>Hub D&D</h3>
        <?php wp_nonce_field( 'mdnd_save_dnd_access', 'mdnd_dnd_access_nonce' ); ?>
        <table class="form-table">
            <tr>
                <th><label for="dnd_access">Accès au Hub</label></th>
                <td>
                    <label>
                        <input type="checkbox" name="dnd_access" id="dnd_access" value="1" <?php checked( $has_access ); ?> />
                        Autoriser cet utilisateur à accéder au Hub D&D (Table de jeu)
                    </label>
                    <p class="description">Cochez cette case si le client a acheté le produit ou doit avoir accès au hub.</p>
                </td>
            </tr>
        </table>
        <?php
    }

    /**
     * Sauvegarde la modification de la case à cocher.
     *
     * @param int $user_id ID de l'utilisateur.
     */
    public static function save_profile_fields( $user_id ) {
        if ( ! current_user_can( 'edit_users' ) ) {
            return;
        }

        // Vérification CSRF : nonce propre au plugin (défense en profondeur en plus
        // du contrôle de référent effectué par le cœur de WordPress sur le formulaire de profil).
        if ( ! isset( $_POST['mdnd_dnd_access_nonce'] )
            || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['mdnd_dnd_access_nonce'] ) ), 'mdnd_save_dnd_access' ) ) {
            return;
        }

        $user = get_userdata( $user_id );
        if ( ! $user ) {
            return;
        }

        // Si la case est cochée, accorder la capability, sinon la retirer
        if ( isset( $_POST['dnd_access'] ) && '1' === $_POST['dnd_access'] ) {
            $user->add_cap( CAPABILITY );
        } else {
            // Si on sauvegarde et que la case est décochée (elle n'est pas dans $_POST)
            // Ne pas retirer accidentellement aux administrateurs.
            if ( ! in_array( 'administrator', (array) $user->roles, true ) ) {
                 $user->remove_cap( CAPABILITY );
            }
        }
    }
}
