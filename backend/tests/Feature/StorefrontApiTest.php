<?php

namespace Tests\Feature;

use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorefrontApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_storefront_returns_only_active_products_and_delivery_zones(): void
    {
        $product = $this->createProduct();
        $this->createProduct(['name' => 'Article masqué', 'active' => false]);
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);
        DeliveryZone::create(['name' => 'Zone inactive', 'fee' => 3000, 'active' => false]);
        Setting::create([
            'key' => 'brand',
            'value' => ['name' => 'Fatou Shop', 'email' => 'contact@example.sn', 'phone' => '221777364427', 'origin' => 'Dakar'],
        ]);
        Setting::create(['key' => 'story', 'value' => ['headline' => 'Bonjour Fatou']]);

        $this->getJson('/api/storefront')
            ->assertOk()
            ->assertJsonPath('products.0.id', $product->id)
            ->assertJsonPath('products.0.image', 'https://example.com/product.jpg')
            ->assertJsonCount(1, 'products')
            ->assertJsonPath('delivery_zones.0.id', $zone->id)
            ->assertJsonCount(1, 'delivery_zones')
            ->assertJsonPath('settings.brand.name', 'Fatou Shop')
            ->assertJsonPath('settings.story.headline', 'Bonjour Fatou');
    }

    public function test_order_uses_server_prices_and_delivery_fees(): void
    {
        $product = $this->createProduct(['price' => 12000]);
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);

        $response = $this->post('/api/orders', [
            'customer_name' => 'Aïssatou Ndiaye',
            'customer_phone' => '771234567',
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près de la pharmacie',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('order.total', 25500)
            ->assertJsonPath('order.payment_status', 'unpaid');

        $order = Order::query()->firstOrFail();
        $this->assertSame(24000, $order->subtotal);
        $this->assertSame(1500, $order->delivery_fee);
        $this->assertSame(25500, $order->total);
        $this->assertSame(2, OrderItem::query()->where('order_id', $order->id)->value('quantity'));
    }

    public function test_uploaded_product_photo_is_served_through_the_api(): void
    {
        Storage::fake('public');
        $product = $this->createProduct([
            'image_path' => UploadedFile::fake()->createWithContent(
                'new-photo.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg=='),
            )->store('products', 'public'),
        ]);

        $this->get("/api/products/{$product->id}/image")
            ->assertOk()
            ->assertHeader('content-type', 'image/png')
            ->assertHeader('cache-control', 'max-age=3600, public');
    }

    public function test_admin_product_list_includes_the_photo_url(): void
    {
        $product = $this->createProduct([
            'image_path' => 'products/admin-photo.jpg',
        ]);
        $admin = User::create([
            'name' => 'Shop Admin',
            'email' => 'admin@example.test',
            'password' => 'a-strong-test-password',
            'is_admin' => true,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/products')
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id)
            ->assertJsonPath('data.0.image_url', route('api.products.image', $product));
    }

    public function test_admin_routes_and_payment_proofs_require_authentication(): void
    {
        $this->getJson('/api/admin/products')->assertUnauthorized();
        $this->getJson('/api/admin/orders/1/proof')->assertUnauthorized();
        $this->deleteJson('/api/admin/orders/1')->assertUnauthorized();
    }

    public function test_admin_can_update_the_store_map_pin(): void
    {
        $admin = $this->createAdmin();
        Setting::create(['key' => 'brand', 'value' => [
            'name' => 'Fatou Shop',
            'email' => 'contact@example.sn',
            'phone' => '221777364427',
            'origin' => 'Dieuppeul-Derklé, Dakar',
            'tagline' => 'Bienvenue',
        ]]);
        Setting::create(['key' => 'story', 'value' => [
            'headline' => 'Fatou Shop',
            'short' => 'Boutique',
            'description' => 'Présentation de la boutique.',
        ]]);

        $this->actingAs($admin)->putJson('/api/admin/settings', [
            'brand' => [
                'name' => 'Fatou Shop',
                'email' => 'contact@example.sn',
                'phone' => '221777364427',
                'origin' => 'Dieuppeul-Derklé, Dakar',
                'tagline' => 'Bienvenue',
            ],
            'story' => [
                'headline' => 'Fatou Shop',
                'short' => 'Boutique',
                'description' => 'Présentation de la boutique.',
            ],
            'store_location' => ['latitude' => 14.7123, 'longitude' => -17.4532],
        ])->assertOk()
            ->assertJsonPath('store_location.latitude', 14.7123)
            ->assertJsonPath('store_location.longitude', -17.4532);
    }

    public function test_admin_can_preview_or_download_a_private_payment_proof(): void
    {
        Storage::fake('local');
        $admin = $this->createAdmin();
        $proof = UploadedFile::fake()->createWithContent(
            'payment.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg=='),
        )->store('payment-proofs', 'local');
        $order = $this->createOrder(['payment_proof_path' => $proof]);

        $this->actingAs($admin)
            ->get("/api/admin/orders/{$order->id}/proof")
            ->assertOk()
            ->assertHeader('content-type', 'image/png')
            ->assertHeader('content-disposition', 'inline; filename="'.$order->reference.'-justificatif.png"');

        $this->actingAs($admin)
            ->get("/api/admin/orders/{$order->id}/proof?download=1")
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename='.$order->reference.'-justificatif.png');
    }

    public function test_admin_can_delete_an_order_and_its_private_payment_proof(): void
    {
        Storage::fake('local');
        $admin = $this->createAdmin();
        $proof = UploadedFile::fake()->createWithContent(
            'payment.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg=='),
        )->store('payment-proofs', 'local');
        $order = $this->createOrder(['payment_proof_path' => $proof]);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => null,
            'product_name' => 'Article test',
            'quantity' => 1,
            'unit_price' => 10000,
            'line_total' => 10000,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/admin/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Commande supprimée.');

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
        $this->assertDatabaseMissing('order_items', ['id' => $item->id]);
        Storage::disk('local')->assertMissing($proof);
    }

    public function test_paid_order_stores_its_image_proof_on_the_private_disk(): void
    {
        Storage::fake('local');
        $product = $this->createProduct(['price' => 12000]);
        $zone = DeliveryZone::create(['name' => 'Dieuppeul-Derklé', 'fee' => 1500, 'active' => true]);
        $proof = UploadedFile::fake()->createWithContent(
            'wave-proof.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1ZQAAAABJRU5ErkJggg=='),
        );

        $this->post('/api/orders', [
            'customer_name' => 'Aïssatou Ndiaye',
            'customer_phone' => '771234567',
            'delivery_zone_id' => $zone->id,
            'delivery_address' => 'Près de la pharmacie',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'wave',
            'payer_name' => 'Aïssatou Ndiaye',
            'payer_phone' => '771234567',
            'proof' => $proof,
        ], ['Accept' => 'application/json'])->assertCreated();

        $order = Order::query()->firstOrFail();
        $this->assertSame('submitted', $order->payment_status);
        $this->assertNotNull($order->payment_proof_path);
        Storage::disk('local')->assertExists($order->payment_proof_path);
    }

    private function createProduct(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Sac de test',
            'category' => 'Sacs',
            'description' => 'Produit de test',
            'price' => 10000,
            'image_path' => 'https://example.com/product.jpg',
            'image_alt' => 'Sac',
            'tone' => 'rose',
            'stock' => 5,
            'active' => true,
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Shop Admin',
            'email' => 'admin@example.test',
            'password' => 'a-strong-test-password',
            'is_admin' => true,
        ]);
    }

    private function createOrder(array $overrides = []): Order
    {
        return Order::create(array_merge([
            'reference' => 'FS-TEST-'.fake()->unique()->numerify('######'),
            'customer_name' => 'Client Test',
            'customer_phone' => '771234567',
            'delivery_zone_name' => 'Dieuppeul-Derklé',
            'delivery_address' => 'Adresse de test',
            'subtotal' => 10000,
            'delivery_fee' => 1500,
            'total' => 11500,
            'status' => 'pending',
            'payment_status' => 'submitted',
        ], $overrides));
    }
}
