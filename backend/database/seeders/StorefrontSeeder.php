<?php

namespace Database\Seeders;

use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class StorefrontSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'Le sac Brooklyn', 'category' => 'Sacs', 'price' => 42500, 'old_price' => 52000, 'label' => 'Coup de cœur', 'image_path' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Sac à main brun en cuir, silhouette structurée', 'tone' => 'sand', 'description' => 'Une silhouette intemporelle et une belle capacité, choisies pour accompagner vos journées comme vos sorties.'],
            ['name' => 'L’essentiel doré', 'category' => 'Bijoux', 'price' => 18500, 'old_price' => null, 'label' => 'Édition limitée', 'image_path' => 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Bijoux dorés délicats présentés sur une surface claire', 'tone' => 'rose', 'description' => 'Une touche lumineuse et délicate, facile à porter seule ou à associer à vos bijoux préférés.'],
            ['name' => 'Veste Downtown', 'category' => 'Mode', 'price' => 39000, 'old_price' => null, 'label' => 'Nouveau', 'image_path' => 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Veste de mode américaine aux lignes contemporaines', 'tone' => 'olive', 'description' => 'Une pièce de caractère aux lignes urbaines, parfaite pour composer une tenue qui vous ressemble.'],
            ['name' => 'Lunettes Westside', 'category' => 'Accessoires', 'price' => 16500, 'old_price' => 20000, 'label' => 'En vogue', 'image_path' => 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Lunettes de soleil noires sur fond chaud', 'tone' => 'clay', 'description' => 'Une monture affirmée et facile à porter pour compléter votre allure au quotidien.'],
            ['name' => 'Le cabas SoHo', 'category' => 'Sacs', 'price' => 35000, 'old_price' => null, 'label' => 'Belle trouvaille', 'image_path' => 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Sac cabas élégant pour tous les jours', 'tone' => 'sand', 'description' => 'Le compagnon spacieux et chic pour vos journées bien remplies.'],
            ['name' => 'La veste Central Park', 'category' => 'Mode', 'price' => 45000, 'old_price' => null, 'label' => 'Style urbain', 'image_path' => 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Tenue de mode féminine élégante', 'tone' => 'rose', 'description' => 'Une silhouette soignée inspirée du style citadin américain.'],
            ['name' => 'Les créoles Madison', 'category' => 'Bijoux', 'price' => 14000, 'old_price' => null, 'label' => 'À porter partout', 'image_path' => 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Créoles dorées élégantes', 'tone' => 'clay', 'description' => 'Des créoles lumineuses pour une élégance simple du matin au soir.'],
            ['name' => 'Lunettes Manhattan', 'category' => 'Accessoires', 'price' => 19500, 'old_price' => null, 'label' => 'Nouveau', 'image_path' => 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=85', 'image_alt' => 'Lunettes de soleil de forme moderne', 'tone' => 'olive', 'description' => 'Une paire de lunettes de soleil pour apporter la touche finale à votre look.'],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(['name' => $product['name']], $product + ['stock' => 10, 'active' => true]);
        }

        $zones = [
            'Dieuppeul-Derklé' => 1500, 'Mermoz' => 2000, 'Sacré-Cœur' => 2000,
            'Ouakam' => 2500, 'Fann-Résidence' => 2500, 'Point E' => 2500,
            'HLM' => 2000, 'Liberté 6' => 2000, 'Parcelles Assainies' => 3000,
            'Pikine' => 3500, 'Guédiawaye' => 3500, 'Autre quartier de Dakar' => 3000,
        ];

        foreach ($zones as $name => $fee) {
            DeliveryZone::updateOrCreate(['name' => $name], ['fee' => $fee, 'active' => true]);
        }

        $settings = [
            'brand' => [
                'name' => 'Fatou Shop',
                'email' => 'fatoudiagnendoye75@gmail.com',
                'phone' => '221777364427',
                'origin' => 'Dieuppeul-Derklé, Dakar',
                'tagline' => 'L’Amérique, tout près de vous',
            ],
            'story' => [
                'headline' => 'Bonjour, moi c’est Fatou.',
                'short' => 'Les belles trouvailles américaines, avec un petit cœur dakarois.',
                'description' => 'De Dieuppeul-Derklé aux trouvailles américaines, Fatou Shop partage une sélection choisie avec attention.',
            ],
            'store_location' => [
                'latitude' => 14.712,
                'longitude' => -17.454,
            ],
            'referral' => [
                'threshold' => 5,
                'discount_percent' => 5,
            ],
        ];

        foreach ($settings as $key => $value) {
            Setting::firstOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
